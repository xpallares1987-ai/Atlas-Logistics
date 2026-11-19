/**
 * @file carrier-booking-dispatch.service.ts
 * @description Outbox-driven electronic booking dispatch (DCSA JSON / EDI 301), confirmation handling, and Dead-Letter Queue alerting.
 * @module @atlas/services/carrier/carrier-booking-dispatch
 * @see {@link docs/adr/0027-carrier-integrations-ocean-schedules-ebl-lifecycle.md}
 */

import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  scmOutboxMessages,
  shipments,
  addresses,
  vessels,
  voyages,
  portCalls,
} from "../../db/schema/index.js";
import {
  buildDcsaOceanBookingPayload,
  buildEdi301Payload,
  parseEdi997Acknowledgment,
  buildM365DeadLetterAdaptiveCard,
  DcsaOceanBookingPayload,
} from "@atlas/shared";
import { logger } from "../../config/logger.js";

// ============================================================================
// TYPES & CONTRACTS
// ============================================================================

export interface DispatchBookingInput {
  shipmentId: string;
  carrierId: string;
  carrierScac?: string;
  contractReference: string;
  format?: "DCSA_JSON" | "EDI_301";
  vesselId: string;
  voyageNumber: string;
  originUnlocode: string;
  destinationUnlocode: string;
  grossWeightKg: number;
  volumeCbm?: number;
  containerIsoType?: string;
  containerQuantity?: number;
  actorUserId?: string;
  correlationId?: string;
}

export interface BookingDispatchResult {
  outboxEventId: string;
  format: "DCSA_JSON" | "EDI_301";
  status: "PENDING";
  payload: string | DcsaOceanBookingPayload;
  queuedAt: Date;
}

export interface CarrierConfirmationInput {
  outboxEventId: string;
  carrierBookingNumber: string;
  status: "CONFIRMED" | "REJECTED";
  rejectionReason?: string;
  edi997Content?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class CarrierBookingDispatchService {
  /**
   * Dispatches an electronic booking to a carrier via the transactional outbox pattern.
   * Ensures zero synchronous external HTTP/SOAP calls during database transactions.
   */
  public static async dispatchBooking(
    input: DispatchBookingInput,
  ): Promise<BookingDispatchResult> {
    const vessel = (
      await db
        .select()
        .from(vessels)
        .where(eq(vessels.id, input.vesselId))
        .limit(1)
    )[0];
    if (!vessel) {
      throw new Error(`Vessel with id '${input.vesselId}' not found`);
    }

    const carrier = (
      await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, input.carrierId))
        .limit(1)
    )[0];
    const carrierName = carrier
      ? carrier.tradeName || carrier.companyName
      : "Ocean Carrier";

    const format = input.format || "DCSA_JSON";
    let payloadString: string;
    let payloadObj: string | DcsaOceanBookingPayload;

    if (format === "EDI_301") {
      const edi301 = buildEdi301Payload({
        transactionControlNumber: uuidv4().slice(0, 4),
        bookingNumber: `BKG-${input.shipmentId.slice(0, 8).toUpperCase()}`,
        contractNumber: input.contractReference,
        scac: input.carrierScac || "MAEU",
        vesselName: vessel.vesselName,
        voyageNumber: input.voyageNumber,
        originUnlocode: input.originUnlocode,
        destinationUnlocode: input.destinationUnlocode,
        shipperName: "Atlas Forwarding Corp",
        consigneeName: "Global Consignee Logistics",
        grossWeightKg: input.grossWeightKg,
      });
      payloadString = edi301;
      payloadObj = edi301;
    } else {
      const dcsaPayload = buildDcsaOceanBookingPayload({
        bookingReference: `BKG-${input.shipmentId.slice(0, 8).toUpperCase()}`,
        contractReference: input.contractReference,
        vesselImo: vessel.imoNumber,
        vesselName: vessel.vesselName,
        voyageNumber: input.voyageNumber,
        shipperName: "Atlas Forwarding Corp",
        consigneeName: "Global Consignee Logistics",
        carrierName,
        carrierScac: input.carrierScac,
        originLocode: input.originUnlocode,
        destinationLocode: input.destinationUnlocode,
        containerIsoType: input.containerIsoType,
        containerQuantity: input.containerQuantity,
        grossWeightKg: input.grossWeightKg,
        volumeCbm: input.volumeCbm,
      });
      payloadString = JSON.stringify(dcsaPayload);
      payloadObj = dcsaPayload;
    }

    const now = new Date();
    const eventId = `evt_${uuidv4().replace(/-/g, "").slice(0, 20)}`;
    const correlationId = input.correlationId || `corr_${uuidv4().slice(0, 8)}`;

    await db.insert(scmOutboxMessages).values({
      eventId,
      eventType: "CARRIER_BOOKING_REQUESTED",
      schemaVersion: 1,
      producerContext: "CARRIER_INTEGRATION_GATEWAY",
      aggregateType: "CARRIER_BOOKING",
      aggregateId: input.shipmentId,
      aggregateVersion: 1,
      correlationId,
      causationId: `cmd_${uuidv4().slice(0, 8)}`,
      actorContextJson: JSON.stringify({
        userId: input.actorUserId || "system",
        channel: "OUTBOX_B2B_GATEWAY",
      }),
      payloadJson: JSON.stringify({
        format,
        carrierId: input.carrierId,
        carrierName,
        carrierScac: input.carrierScac,
        vesselId: input.vesselId,
        voyageNumber: input.voyageNumber,
        content: payloadString,
      }),
      status: "PENDING",
      retryCount: 0,
      occurredAt: now,
      publishedAt: null,
      lastError: null,
    });

    logger.info(
      { eventId, shipmentId: input.shipmentId, format, carrierName },
      "Enqueued electronic booking to carrier outbox",
    );

    return {
      outboxEventId: eventId,
      format,
      status: "PENDING",
      payload: payloadObj,
      queuedAt: now,
    };
  }

  /**
   * Processes carrier responses: EDI 997 Functional Acknowledgment, EDI 301, or DCSA Confirmation.
   */
  public static async processConfirmation(
    input: CarrierConfirmationInput,
  ): Promise<{
    success: boolean;
    outboxEventId: string;
    carrierBookingNumber: string;
    status: string;
    dlqCardPayload?: any;
  }> {
    const existing = (
      await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.eventId, input.outboxEventId))
        .limit(1)
    )[0];

    if (!existing) {
      throw new Error(
        `Outbox message with id '${input.outboxEventId}' not found`,
      );
    }

    if (input.edi997Content) {
      const ack = parseEdi997Acknowledgment(input.edi997Content);
      if (!ack.isAcknowledged) {
        input.status = "REJECTED";
        input.rejectionReason = `EDI 997 rejection: ${ack.rawSyntaxErrors.join("; ") || "Syntax error"}`;
      }
    }

    if (input.status === "CONFIRMED") {
      await db
        .update(scmOutboxMessages)
        .set({
          status: "PROCESSED",
          publishedAt: new Date(),
          lastError: null,
        })
        .where(eq(scmOutboxMessages.eventId, input.outboxEventId));

      return {
        success: true,
        outboxEventId: input.outboxEventId,
        carrierBookingNumber: input.carrierBookingNumber,
        status: "CONFIRMED",
      };
    } else {
      // Rejection / DLQ Handling
      const errorMsg =
        input.rejectionReason || "Carrier declined booking request";
      await db
        .update(scmOutboxMessages)
        .set({
          status: "FAILED",
          lastError: errorMsg,
          retryCount: (existing.retryCount || 0) + 1,
        })
        .where(eq(scmOutboxMessages.eventId, input.outboxEventId));

      // Generate M365 Adaptive Card alert payload for Dead-Letter Queue
      const parsedPayload = JSON.parse(existing.payloadJson || "{}");
      const dlqCard = buildM365DeadLetterAdaptiveCard({
        bookingReference: input.carrierBookingNumber || existing.aggregateId,
        carrierName: parsedPayload.carrierName || "Carrier",
        errorMessage: errorMsg,
        attemptCount: (existing.retryCount || 0) + 1,
        timestamp: new Date(),
        outboxEventId: input.outboxEventId,
      });

      logger.warn(
        { eventId: input.outboxEventId, error: errorMsg },
        "Carrier booking failed; generated M365 Adaptive Card DLQ alert",
      );

      return {
        success: false,
        outboxEventId: input.outboxEventId,
        carrierBookingNumber: input.carrierBookingNumber,
        status: "FAILED",
        dlqCardPayload: dlqCard,
      };
    }
  }
}

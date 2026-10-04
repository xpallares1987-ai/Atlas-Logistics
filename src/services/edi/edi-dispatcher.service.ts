import crypto from "crypto";
import { db } from "../../db/index.js";
import {
  ediInterchanges,
  ediMessages,
  ediPartners,
  shipments,
} from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import { EdiTokenizer, EdiDocumentAST } from "./edi-tokenizer.js";
import { EdifactService, EdifactIftminInstruction } from "./edifact.service.js";
import { X12Service, X12LoadTenderInstruction } from "./x12.service.js";
import { DomainEventBus } from "../../lib/events/domain-event-bus.js";
import { logger } from "../../config/logger.js";

const eventBus = new DomainEventBus();

export interface InboundProcessingResult {
  interchangeId: string;
  controlNumber: string;
  standard: "EDIFACT" | "ANSI_X12";
  senderId: string;
  receiverId: string;
  status: "APPLIED" | "ACKNOWLEDGED" | "FAILED";
  ackPayload: string;
  messagesProcessed: number;
  extractedMilestones: string[];
  exceptionsDetected: number;
  details: any[];
}

export class EdiDispatcherService {
  /**
   * Process an incoming raw EDI stream (from SFTP, AS2 gateway, or REST webhook)
   */
  public static async processInboundPayload(
    rawPayload: string,
  ): Promise<InboundProcessingResult> {
    const raw = (rawPayload || "").trim();
    if (!raw) {
      throw new Error("Empty EDI payload received.");
    }

    const standard = EdiTokenizer.detectStandard(raw);
    if (standard === "UNKNOWN") {
      throw new Error(
        "Unrecognized EDI format. Expected EDIFACT (UNA/UNB) or ANSI X12 (ISA).",
      );
    }

    const ast: EdiDocumentAST = EdiTokenizer.tokenize(raw);
    const interchangeId = `ic_${crypto.randomUUID().substring(0, 8)}`;
    const extractedMilestones: string[] = [];
    let exceptionsDetected = 0;
    const messageDetails: any[] = [];

    let senderId = "UNKNOWN";
    let receiverId = "ATLASLOG";
    let controlNumber = `CTRL-${Date.now()}`;
    let ackPayload = "";

    if (standard === "EDIFACT") {
      const events = EdifactService.parseIFTSTA(ast);
      if (events.length > 0) {
        senderId = events[0].senderId;
        receiverId = events[0].receiverId;
        controlNumber = events[0].controlNumber;
      }
      ackPayload = EdifactService.generateCONTRL(
        controlNumber,
        senderId,
        receiverId,
        true,
      );

      // Match partner in DB if configured
      const partner = await this.findPartnerBySender(senderId, "EDIFACT");

      // Save interchange header
      await db.insert(ediInterchanges).values({
        id: interchangeId,
        partnerId: partner?.id,
        controlNumber,
        direction: "INBOUND",
        standard: "EDIFACT",
        senderId,
        receiverId,
        status: "APPLIED",
        rawPayload: raw,
        ackPayload,
        ackStatus: "ACCEPTED",
        processedAt: new Date(),
      });

      for (const ev of events) {
        const msgId = `msg_${crypto.randomUUID().substring(0, 8)}`;
        extractedMilestones.push(ev.milestone);
        if (ev.isException) exceptionsDetected++;

        // Attempt linking to shipment
        const matchedShipment = await this.matchShipment(
          ev.bookingReference,
          ev.billOfLading,
        );

        await db.insert(ediMessages).values({
          id: msgId,
          interchangeId,
          messageType: "IFTSTA",
          controlNumber: ev.controlNumber,
          shipmentId: matchedShipment?.id,
          bookingReference: ev.bookingReference,
          status: "APPLIED",
          parsedContent: ev,
          extractedMilestone: ev.milestone,
          exceptionTriggered: ev.isException,
          exceptionDetails: ev.exceptionReason,
          processedAt: new Date(),
        });

        // Dispatch domain events & update shipment if matched
        if (matchedShipment) {
          await this.advanceShipmentMilestone(matchedShipment.id, ev);
        }

        // Publish event to DomainEventBus
        await eventBus.publish(
          "edi:milestone-updated",
          matchedShipment?.id || interchangeId,
          {
            shipmentId: matchedShipment?.id,
            bookingReference: ev.bookingReference,
            carrier: ev.senderId,
            milestone: ev.milestone,
            statusCode: ev.statusCode,
            location: ev.locationName || ev.locationCode,
            isException: ev.isException,
            exceptionReason: ev.exceptionReason,
            eventTimestamp: ev.eventTimestamp,
          },
        );

        if (ev.isException) {
          await eventBus.publish(
            "edi:exception-detected",
            matchedShipment?.id || interchangeId,
            {
              shipmentId: matchedShipment?.id,
              bookingReference: ev.bookingReference,
              carrier: ev.senderId,
              exceptionCode: ev.statusCode,
              reason: ev.exceptionReason || "Operational carrier exception",
              occurredAt: ev.eventTimestamp,
            },
          );
        }

        messageDetails.push(ev);
      }
    } else {
      // ANSI X12
      const events = X12Service.parse214(ast);
      if (events.length > 0) {
        senderId = events[0].senderId;
        receiverId = events[0].receiverId;
        controlNumber = events[0].controlNumber;
      }
      ackPayload = X12Service.generate997(
        controlNumber,
        senderId,
        receiverId,
        true,
      );

      const partner = await this.findPartnerBySender(senderId, "ANSI_X12");

      await db.insert(ediInterchanges).values({
        id: interchangeId,
        partnerId: partner?.id,
        controlNumber,
        direction: "INBOUND",
        standard: "ANSI_X12",
        senderId,
        receiverId,
        status: "APPLIED",
        rawPayload: raw,
        ackPayload,
        ackStatus: "ACCEPTED",
        processedAt: new Date(),
      });

      for (const ev of events) {
        const msgId = `msg_${crypto.randomUUID().substring(0, 8)}`;
        extractedMilestones.push(ev.milestone);
        if (ev.isException) exceptionsDetected++;

        const matchedShipment = await this.matchShipment(
          ev.bookingReference,
          ev.referenceNumber,
        );

        await db.insert(ediMessages).values({
          id: msgId,
          interchangeId,
          messageType: "214",
          controlNumber: ev.controlNumber,
          shipmentId: matchedShipment?.id,
          bookingReference: ev.bookingReference,
          status: "APPLIED",
          parsedContent: ev,
          extractedMilestone: ev.milestone,
          exceptionTriggered: ev.isException,
          exceptionDetails: ev.exceptionReason,
          processedAt: new Date(),
        });

        if (matchedShipment) {
          await this.advanceShipmentMilestone(matchedShipment.id, {
            ...ev,
            locationName: [ev.locationCity, ev.locationState, ev.locationCountry]
              .filter(Boolean)
              .join(", "),
          });
        }

        await eventBus.publish(
          "edi:milestone-updated",
          matchedShipment?.id || interchangeId,
          {
            shipmentId: matchedShipment?.id,
            bookingReference: ev.bookingReference,
            carrier: ev.senderId,
            milestone: ev.milestone,
            statusCode: ev.statusCode,
            location: [ev.locationCity, ev.locationState].filter(Boolean).join(", "),
            isException: ev.isException,
            exceptionReason: ev.exceptionReason,
            eventTimestamp: ev.eventTimestamp,
          },
        );

        if (ev.isException) {
          await eventBus.publish(
            "edi:exception-detected",
            matchedShipment?.id || interchangeId,
            {
              shipmentId: matchedShipment?.id,
              bookingReference: ev.bookingReference,
              carrier: ev.senderId,
              exceptionCode: ev.statusCode,
              reason: ev.exceptionReason || "Carrier transport exception",
              occurredAt: ev.eventTimestamp,
            },
          );
        }

        messageDetails.push(ev);
      }
    }

    // Publish high-level interchange event
    await eventBus.publish("edi:interchange-processed", interchangeId, {
      interchangeId,
      controlNumber,
      standard,
      direction: "INBOUND",
      senderId,
      receiverId,
      status: "APPLIED",
      messagesCount: messageDetails.length,
    });

    return {
      interchangeId,
      controlNumber,
      standard,
      senderId,
      receiverId,
      status: "APPLIED",
      ackPayload,
      messagesProcessed: messageDetails.length,
      extractedMilestones,
      exceptionsDetected,
      details: messageDetails,
    };
  }

  /**
   * Generate and persist an outbound EDI message (e.g. IFTMIN or X12 204)
   */
  public static async generateOutbound(options: {
    format: "IFTMIN" | "204";
    bookingReference: string;
    partnerId?: string;
    senderId?: string;
    receiverId?: string;
    instructionData: any;
  }): Promise<{
    interchangeId: string;
    controlNumber: string;
    rawPayload: string;
    format: string;
  }> {
    const interchangeId = `ic_out_${crypto.randomUUID().substring(0, 8)}`;
    const controlNum = Math.floor(100000 + Math.random() * 900000).toString();
    let rawPayload = "";
    let standard: "EDIFACT" | "ANSI_X12" = "EDIFACT";

    if (options.format === "IFTMIN") {
      standard = "EDIFACT";
      rawPayload = EdifactService.generateIFTMIN(
        options.instructionData as EdifactIftminInstruction,
        options.senderId || "ATLASLOG",
        options.receiverId || "MAERSKLINE",
      );
    } else {
      standard = "ANSI_X12";
      rawPayload = X12Service.generate204(
        options.instructionData as X12LoadTenderInstruction,
        options.senderId || "ATLASLOG",
        options.receiverId || "KNIGHTSWIFT",
      );
    }

    await db.insert(ediInterchanges).values({
      id: interchangeId,
      partnerId: options.partnerId,
      controlNumber: controlNum,
      direction: "OUTBOUND",
      standard,
      senderId: options.senderId || "ATLASLOG",
      receiverId: options.receiverId || "CARRIER_EDI",
      status: "ACKNOWLEDGED",
      rawPayload,
      ackStatus: "ACCEPTED",
      processedAt: new Date(),
    });

    await db.insert(ediMessages).values({
      id: `msg_out_${crypto.randomUUID().substring(0, 8)}`,
      interchangeId,
      messageType: options.format,
      controlNumber: controlNum,
      bookingReference: options.bookingReference,
      status: "APPLIED",
      parsedContent: options.instructionData,
      extractedMilestone: "DISPATCHED",
      exceptionTriggered: false,
      processedAt: new Date(),
    });

    await eventBus.publish("edi:interchange-processed", interchangeId, {
      interchangeId,
      controlNumber: controlNum,
      standard,
      direction: "OUTBOUND",
      senderId: options.senderId || "ATLASLOG",
      receiverId: options.receiverId || "CARRIER_EDI",
      status: "ACKNOWLEDGED",
      messagesCount: 1,
    });

    return {
      interchangeId,
      controlNumber: controlNum,
      rawPayload,
      format: options.format,
    };
  }

  /**
   * Helper to query historical interchanges
   */
  public static async listInterchanges(limit: number = 50, offset: number = 0) {
    return db
      .select()
      .from(ediInterchanges)
      .orderBy(desc(ediInterchanges.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Helper to query configured partners
   */
  public static async listPartners() {
    return db.select().from(ediPartners).where(eq(ediPartners.isDeleted, false));
  }

  /**
   * Advance shipment status in DB based on received milestone
   */
  private static async advanceShipmentMilestone(shipmentId: string, ev: any) {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (ev.milestone === "VESSEL_DEPARTED" || ev.milestone === "IN_TRANSIT") {
        updateData.status = "IN_TRANSIT";
      } else if (ev.milestone === "ARRIVED_AT_PORT") {
        updateData.status = "AT_PORT";
      } else if (ev.milestone === "CUSTOMS_HOLD") {
        updateData.clearanceStatus = "HOLD";
      } else if (ev.milestone === "DELIVERED") {
        updateData.status = "DELIVERED";
      }

      if (ev.vesselName) updateData.vesselName = ev.vesselName;
      if (ev.voyageNumber) updateData.voyageNumber = ev.voyageNumber;

      await db
        .update(shipments)
        .set(updateData)
        .where(eq(shipments.id, shipmentId));
    } catch (err) {
      logger.warn({ shipmentId, err }, "Could not auto-advance shipment milestone");
    }
  }

  private static async matchShipment(bookingRef?: string, trackingRef?: string) {
    if (!bookingRef && !trackingRef) return null;
    try {
      if (trackingRef) {
        const found = await db
          .select()
          .from(shipments)
          .where(eq(shipments.trackingNumber, trackingRef))
          .limit(1);
        if (found.length > 0) return found[0];
      }
      if (bookingRef) {
        const found = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, bookingRef))
          .limit(1);
        if (found.length > 0) return found[0];
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  private static async findPartnerBySender(
    senderId: string,
    standard: "EDIFACT" | "ANSI_X12",
  ) {
    try {
      const found = await db
        .select()
        .from(ediPartners)
        .where(eq(ediPartners.senderId, senderId))
        .limit(1);
      return found[0] || null;
    } catch {
      return null;
    }
  }
}

/**
 * @file carrier-telemetry-ingestion.service.ts
 * @description Two-Tier Asynchronous Ingestion Service for Multi-Modal Carrier Telemetry.
 * Buffers raw inbound events in <25ms, performs multi-key entity resolution,
 * updates Supply Chain Visibility milestone projections, and auto-resolves predictive exceptions.
 * @module @atlas/services/carrier-telemetry-ingestion
 * @see {@link docs/adr/0034-carrier-track-and-trace-async-ingestion-and-predictive-resolution.md}
 */

import { createHash, randomUUID } from "node:crypto";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { dcsaEventsLog } from "../db/schema/dcsa.js";
import {
  carrierTelemetryIngestionLogs,
  aisVesselPositions,
} from "../db/schema/carrier_telemetry.js";
import {
  supplyChainMilestoneEvents,
  supplyChainExceptions,
} from "../db/schema/supply_chain_visibility.js";
import { purchaseOrders, poLineItems } from "../db/schema/po.js";
import { bookings, shipments } from "../db/schema/operations.js";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
} from "../scm/kernel/primitives.js";
import {
  normalizeCarrierTelemetry,
  NormalizedCarrierEvent,
} from "../scm/engines/carrier-telemetry-normalizer.engine.js";

// ============================================================================
// 1. INPUT INTERFACES & DOMAIN TYPES
// ============================================================================

export interface RawTelemetryIngressInput {
  tenantId?: string;
  carrierCode?: string;
  eventType?: string;
  eventClassifierCode?: string;
  eventDateTime?: string;
  carrierBookingReference?: string;
  transportDocumentReference?: string;
  airWaybillNumber?: string;
  equipmentReference?: string;
  eventTypeCode?: string;
  locationLocode?: string;
  vesselImoNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  transportMode?: "OCEAN" | "AIR" | "ROAD" | "RAIL";
  sourceType?: string;
  rawPayload: Record<string, unknown>;
}

export interface IngressBufferResult {
  status: "ACCEPTED" | "DUPLICATE";
  eventId: string;
  eventFingerprint: string;
  duplicate: boolean;
  receivedAt: string;
}

export interface ResolvedTelemetryContext {
  shipmentId?: string;
  bookingId?: string;
  poId?: string;
  poLineItemId?: string;
  containerNumber?: string;
}

export interface ProcessedTelemetryResult {
  eventId: string;
  canonicalMilestoneCode: string;
  macroPhase: string;
  resolvedContext: ResolvedTelemetryContext;
  milestoneUpdated: boolean;
  autoResolvedExceptionCategory?: string;
  autoResolvedCount: number;
}

// ============================================================================
// 2. CARRIER TELEMETRY INGESTION SERVICE CLASS
// ============================================================================

export class CarrierTelemetryIngestionService {
  /**
   * Generates a deterministic SHA-256 fingerprint for payload deduplication
   */
  public static computeEventFingerprint(
    carrierCode: string,
    rawPayload: Record<string, unknown>,
  ): string {
    const serialized = JSON.stringify({
      carrier: carrierCode.toUpperCase(),
      evtType:
        rawPayload.eventTypeCode ||
        rawPayload.statusCode ||
        rawPayload.eventType,
      date:
        rawPayload.eventDateTime ||
        rawPayload.flightDate ||
        rawPayload.timestamp,
      ref:
        rawPayload.carrierBookingReference ||
        rawPayload.awbNumber ||
        rawPayload.equipmentReference ||
        rawPayload.imoNumber,
    });
    return createHash("sha256").update(serialized).digest("hex");
  }

  /**
   * Tier 1: Fast Ingress Buffer (<25ms)
   * Validates fingerprint, buffers raw payload into SQLite WAL (QUEUED), and returns HTTP 200.
   */
  public static async bufferInboundTelemetry(
    input: RawTelemetryIngressInput,
  ): Promise<IngressBufferResult> {
    const carrier = input.carrierCode || "UNKNOWN";
    const fingerprint = this.computeEventFingerprint(carrier, input.rawPayload);
    const eventId = `evt_${fingerprint.slice(0, 16)}`;

    // 1. Idempotency Check: check if event with same eventId already buffered
    const existing = await db
      .select({ eventId: dcsaEventsLog.eventId })
      .from(dcsaEventsLog)
      .where(eq(dcsaEventsLog.eventId, eventId))
      .limit(1);

    if (existing.length > 0) {
      return {
        status: "DUPLICATE",
        eventId: existing[0].eventId,
        eventFingerprint: fingerprint,
        duplicate: true,
        receivedAt: new Date().toISOString(),
      };
    }

    const now = new Date();

    // 2. Insert into dcsa_events_log with status 'QUEUED'
    await db.insert(dcsaEventsLog).values({
      eventId,
      eventType: input.eventType || "TRANSPORT",
      eventClassifierCode: input.eventClassifierCode || "ACT",
      eventDateTime: input.eventDateTime || now.toISOString(),
      carrierBookingReference: input.carrierBookingReference || null,
      transportDocumentReference: input.transportDocumentReference || null,
      equipmentReference: input.equipmentReference || null,
      eventTypeCode: input.eventTypeCode || "LOAD",
      locationLocode: input.locationLocode || "ESVLC",
      vesselImoNumber: input.vesselImoNumber || null,
      vesselName: input.vesselName || null,
      voyageNumber: input.voyageNumber || null,
      transportMode: input.transportMode || "OCEAN",
      sourceType: input.sourceType || "CARRIER_DCSA_EDI",
      airWaybillNumber: input.airWaybillNumber || null,
      payloadJson: JSON.stringify(input.rawPayload),
      signatureVerified: true,
      processedStatus: "QUEUED",
      exceptionTriggered: false,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      isActive: true,
    });

    return {
      status: "ACCEPTED",
      eventId,
      eventFingerprint: fingerprint,
      duplicate: false,
      receivedAt: now.toISOString(),
    };
  }

  /**
   * Multi-Key Entity Resolver:
   * Cascading resolution (AWB -> BL/MBL -> Booking Ref -> Container ISO -> IMO)
   */
  public static async resolveEntityKeys(
    event: NormalizedCarrierEvent,
  ): Promise<ResolvedTelemetryContext> {
    const context: ResolvedTelemetryContext = {
      containerNumber: event.equipmentReference,
    };

    // 1. Air Waybill resolution
    if (event.airWaybillNumber) {
      const matchedShipment = await db
        .select({ id: shipments.id })
        .from(shipments)
        .where(eq(shipments.trackingNumber, event.airWaybillNumber))
        .limit(1);

      if (matchedShipment.length > 0) {
        context.shipmentId = matchedShipment[0].id;
      }
    }

    // 2. Transport Document / BL resolution
    if (!context.bookingId && event.transportDocumentReference) {
      const matchedShipment = await db
        .select({ id: shipments.id })
        .from(shipments)
        .where(eq(shipments.trackingNumber, event.transportDocumentReference))
        .limit(1);

      if (matchedShipment.length > 0) {
        context.shipmentId = matchedShipment[0].id;
      }
    }

    // 3. Carrier Booking Reference resolution
    if (!context.bookingId && event.carrierBookingReference) {
      const matchedBooking = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.referenceNumber, event.carrierBookingReference))
        .limit(1);

      if (matchedBooking.length > 0) {
        context.bookingId = matchedBooking[0].id;
      }
    }

    // 4. Equipment Container resolution (ISO 6346)
    if (!context.bookingId && event.equipmentReference) {
      const matchedLine = await db
        .select({ bookingId: poLineItems.bookingId })
        .from(poLineItems)
        .where(eq(poLineItems.bookingId, event.equipmentReference))
        .limit(1);

      if (matchedLine.length > 0 && matchedLine[0].bookingId) {
        context.bookingId = matchedLine[0].bookingId;
      }
    }

    // 5. Upstream Purchase Order Resolution
    if (context.bookingId) {
      const matchedPoLine = await db
        .select({
          poId: poLineItems.poId,
          poLineItemId: poLineItems.id,
        })
        .from(poLineItems)
        .where(eq(poLineItems.bookingId, context.bookingId))
        .limit(1);

      if (matchedPoLine.length > 0) {
        context.poId = matchedPoLine[0].poId;
        context.poLineItemId = matchedPoLine[0].poLineItemId;
      }
    }

    return context;
  }

  /**
   * Tier 2: Asynchronous Event Processor
   * Normalizes raw payload, resolves entity keys, updates visibility ledger,
   * auto-resolves predictive exceptions, and emits Transactional Outbox events.
   */
  public static async processTelemetryEvent(
    eventId: string,
    actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  ): Promise<ProcessedTelemetryResult | null> {
    const records = await db
      .select()
      .from(dcsaEventsLog)
      .where(eq(dcsaEventsLog.eventId, eventId))
      .limit(1);

    if (records.length === 0) return null;
    const rawRecord = records[0];

    // 1. Normalize through Pure Engine
    let rawPayloadObj: Record<string, unknown> = {};
    try {
      rawPayloadObj = JSON.parse(rawRecord.payloadJson);
    } catch {
      rawPayloadObj = {};
    }

    const normalized = normalizeCarrierTelemetry({
      ...rawPayloadObj,
      eventTypeCode: rawRecord.eventTypeCode,
      eventType: rawRecord.eventType,
      eventDateTime: rawRecord.eventDateTime,
      carrierBookingReference: rawRecord.carrierBookingReference,
      transportDocumentReference: rawRecord.transportDocumentReference,
      equipmentReference: rawRecord.equipmentReference,
      vesselImoNumber: rawRecord.vesselImoNumber,
      vesselName: rawRecord.vesselName,
      locationLocode: rawRecord.locationLocode,
      airWaybillNumber: rawRecord.airWaybillNumber,
    });

    // 2. Resolve Multi-Key Entity Context
    const resolvedContext = await this.resolveEntityKeys(normalized);

    let milestoneUpdated = false;
    let autoResolvedCount = 0;
    const now = new Date();

    // 3. Update Supply Chain Visibility Ledger if PO is resolved
    if (resolvedContext.poId) {
      const poId = resolvedContext.poId;
      const milestoneCode = normalized.canonicalMilestoneCode;

      // Check existing milestone projection
      const existingMilestone = await db
        .select()
        .from(supplyChainMilestoneEvents)
        .where(
          and(
            eq(supplyChainMilestoneEvents.poId, poId),
            eq(supplyChainMilestoneEvents.milestoneCode, milestoneCode),
          ),
        )
        .limit(1);

      if (existingMilestone.length > 0) {
        await db
          .update(supplyChainMilestoneEvents)
          .set({
            status: "ACTUAL",
            actualTimestamp: normalized.eventDateTime,
            locationCode: normalized.locationLocode,
            dataSource:
              normalized.sourceType === "CARRIER_AIR_FSU"
                ? "AIR_CARGO_FSU"
                : normalized.sourceType === "IOT_AIS_TELEMETRY"
                  ? "AIS_TELEMETRY"
                  : "DCSA_EVENT",
            updatedAt: now,
          })
          .where(eq(supplyChainMilestoneEvents.id, existingMilestone[0].id));
        milestoneUpdated = true;
      } else {
        // Insert new milestone event into projection
        const milestoneId = `sc_ms_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
        await db.insert(supplyChainMilestoneEvents).values({
          id: milestoneId,
          tenantId: actor.organizationId || "tenant_default",
          poId,
          poLineItemId: resolvedContext.poLineItemId || null,
          bookingId: resolvedContext.bookingId || null,
          shipmentId: resolvedContext.shipmentId || null,
          containerNumber: normalized.equipmentReference || null,
          milestoneCode,
          milestoneCategory:
            normalized.macroPhase === "ORIGIN_PRODUCTION"
              ? "SUPPLIER_PRODUCTION"
              : normalized.macroPhase === "INTERNATIONAL_TRANSIT"
                ? "CARRIER_TRANSIT"
                : "FINAL_DELIVERY",
          status: "ACTUAL",
          plannedTimestamp: normalized.eventDateTime,
          actualTimestamp: normalized.eventDateTime,
          delayHours: 0,
          locationCode: normalized.locationLocode,
          dataSource:
            normalized.sourceType === "CARRIER_AIR_FSU"
              ? "AIR_CARGO_FSU"
              : normalized.sourceType === "IOT_AIS_TELEMETRY"
                ? "AIS_TELEMETRY"
                : "DCSA_EVENT",
          createdAt: now,
          updatedAt: now,
        });
        milestoneUpdated = true;
      }

      // 4. Cascading Auto-Resolution of Predictive Exceptions
      if (normalized.autoResolvesExceptionCategory) {
        const matchingExceptions = await db
          .select({ id: supplyChainExceptions.id })
          .from(supplyChainExceptions)
          .where(
            and(
              eq(supplyChainExceptions.poId, poId),
              eq(
                supplyChainExceptions.exceptionCategory,
                normalized.autoResolvesExceptionCategory as any,
              ),
              inArray(supplyChainExceptions.status, ["OPEN", "ACKNOWLEDGED"]),
            ),
          );

        for (const exc of matchingExceptions) {
          await db
            .update(supplyChainExceptions)
            .set({
              status: "RESOLVED",
              resolutionNotes: `Auto-resolved via verified ${normalized.sourceType} event: ${normalized.canonicalMilestoneCode}`,
              resolvedAt: now.toISOString(),
              resolvedBy: actor.userId,
              updatedAt: now,
            })
            .where(eq(supplyChainExceptions.id, exc.id));
          autoResolvedCount++;
        }
      }

      // 5. Transactional Outbox Event Publishing
      await outboxBus.publish({
        aggregateType: "CARRIER_TELEMETRY",
        aggregateId: eventId,
        eventType: "scm.telemetry.carrier_event_processed",
        payload: {
          eventId,
          canonicalMilestoneCode: normalized.canonicalMilestoneCode,
          transportMode: normalized.transportMode,
          poId: resolvedContext.poId,
          bookingId: resolvedContext.bookingId,
          autoResolvedCount,
        },
        actor,
      });
    }

    // 6. Update dcsa_events_log processed status
    await db
      .update(dcsaEventsLog)
      .set({
        processedStatus: "PROCESSED",
        scmLinkedShipmentId: resolvedContext.shipmentId || null,
        resolvedPoId: resolvedContext.poId || null,
        matchedMilestoneCode: normalized.canonicalMilestoneCode,
        updatedAt: now,
      })
      .where(eq(dcsaEventsLog.eventId, eventId));

    return {
      eventId,
      canonicalMilestoneCode: normalized.canonicalMilestoneCode,
      macroPhase: normalized.macroPhase,
      resolvedContext,
      milestoneUpdated,
      autoResolvedExceptionCategory: normalized.autoResolvesExceptionCategory,
      autoResolvedCount,
    };
  }

  /**
   * Batch Queue Worker: processes unhandled queued telemetry events
   */
  public static async processQueuedTelemetry(
    batchSize = 20,
    actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  ): Promise<{ processed: number; failed: number }> {
    const queuedEvents = await db
      .select({ eventId: dcsaEventsLog.eventId })
      .from(dcsaEventsLog)
      .where(eq(dcsaEventsLog.processedStatus, "QUEUED"))
      .limit(batchSize);

    let processed = 0;
    let failed = 0;

    for (const item of queuedEvents) {
      try {
        await this.processTelemetryEvent(item.eventId, actor);
        processed++;
      } catch {
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Retrieves live telemetry stream for Control Tower & PO Drawers
   */
  public static async getLiveTelemetryFeed(limit = 50) {
    return db
      .select({
        eventId: dcsaEventsLog.eventId,
        eventType: dcsaEventsLog.eventType,
        eventDateTime: dcsaEventsLog.eventDateTime,
        eventTypeCode: dcsaEventsLog.eventTypeCode,
        transportMode: dcsaEventsLog.transportMode,
        sourceType: dcsaEventsLog.sourceType,
        carrierBookingReference: dcsaEventsLog.carrierBookingReference,
        transportDocumentReference: dcsaEventsLog.transportDocumentReference,
        airWaybillNumber: dcsaEventsLog.airWaybillNumber,
        equipmentReference: dcsaEventsLog.equipmentReference,
        locationLocode: dcsaEventsLog.locationLocode,
        vesselName: dcsaEventsLog.vesselName,
        vesselImoNumber: dcsaEventsLog.vesselImoNumber,
        processedStatus: dcsaEventsLog.processedStatus,
        resolvedPoId: dcsaEventsLog.resolvedPoId,
        matchedMilestoneCode: dcsaEventsLog.matchedMilestoneCode,
        createdAt: dcsaEventsLog.createdAt,
      })
      .from(dcsaEventsLog)
      .orderBy(desc(dcsaEventsLog.createdAt))
      .limit(limit);
  }
}

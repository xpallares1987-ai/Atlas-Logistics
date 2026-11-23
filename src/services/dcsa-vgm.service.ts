/**
 * @file dcsa-vgm.service.ts
 * @description Service for DCSA v3.0 Container Lifecycle Events and SOLAS Verified Gross Mass (VGM) declarations.
 * Handles ISO 6346 validation, Method 1/2 weighing, EDIFACT VERMAS transmission, and asynchronous acknowledgment processing.
 * @module @atlas/services/dcsa-vgm
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  containers,
  containerVgm,
  equipmentLifecycle,
} from "../db/schema/containers.js";
import { dcsaEventsLog } from "../db/schema/dcsa.js";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
} from "../scm/kernel/primitives.js";
import {
  validateIso6346,
  calculateVgmWeight,
  synthesizeEdifactVermas,
  synthesizeDcsaJsonVgm,
  parseVermasAck,
  type VgmWeighingMethod,
} from "../scm/engines/dcsa-vgm.engine.js";

// ============================================================================
// 1. DATA CONTRACTS & INTERFACES
// ============================================================================

export interface DeclareVgmInput {
  tenantId?: string;
  containerId: string;
  shipmentId?: string;
  containerNumber: string;
  isoSizeType?: string;
  bookingReference: string;
  weighingMethod: VgmWeighingMethod;
  tareWeightKg: number;
  scaleGrossWeightKg?: number;
  cargoNetMassKg?: number;
  packagingMassKg?: number;
  securingDunnageMassKg?: number;
  maxPayloadKg?: number;
  authorizedPerson: string;
  weighingPartyName: string;
  certifiedScaleId?: string;
  solasApprovalNumber?: string;
  actor?: SecurityActorContext;
}

export interface IngestDcsaEventInput {
  eventType: "EQUIPMENT" | "TRANSPORT" | "SHIPMENT";
  eventClassifierCode?: "ACT" | "EST" | "PLN";
  eventDateTime: string;
  carrierBookingReference?: string;
  transportDocumentReference?: string;
  equipmentReference?: string;
  eventTypeCode: string;
  locationLocode: string;
  vesselImoNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  payloadJson?: string;
  actor?: SecurityActorContext;
}

export interface ListVgmFilters {
  tenantId?: string;
  containerId?: string;
  containerNumber?: string;
  shipmentId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// 2. DCSA VGM SERVICE IMPLEMENTATION
// ============================================================================

export class DcsaVgmService {
  /**
   * Declares container Verified Gross Mass (SOLAS VGM) and synthesizes EDIFACT VERMAS.
   */
  async declareVgm(input: DeclareVgmInput) {
    const tenantId = input.tenantId ?? null;
    const actor = input.actor ?? DEFAULT_OPERATOR_ACTOR;

    // 1. Validate container ISO 6346 check digit
    const isoValidation = validateIso6346(input.containerNumber);
    if (!isoValidation.isValid) {
      throw new Error(
        `Invalid ISO 6346 container number: ${input.containerNumber}. Calculated check digit: ${isoValidation.calculatedCheckDigit}`,
      );
    }

    // 2. Calculate VGM weight and verify payload capacity limits
    const calc = calculateVgmWeight(input.weighingMethod, {
      weighingMethod: input.weighingMethod,
      tareWeightKg: input.tareWeightKg,
      scaleGrossWeightKg: input.scaleGrossWeightKg,
      cargoNetMassKg: input.cargoNetMassKg,
      packagingMassKg: input.packagingMassKg,
      securingDunnageMassKg: input.securingDunnageMassKg,
      maxPayloadKg: input.maxPayloadKg,
    });

    if (!calc.isValid) {
      throw new Error(
        `SOLAS VGM calculation failed: ${calc.validationErrors.join(", ")}`,
      );
    }

    const vgmId = `vgm_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date();
    const declarationRef = `VGM-${now.getFullYear()}-${input.containerNumber}-${Date.now().toString().slice(-4)}`;

    // 3. Synthesize EDIFACT VERMAS & DCSA JSON payloads
    const edifactVermas = synthesizeEdifactVermas({
      declarationReference: declarationRef,
      bookingReference: input.bookingReference,
      containerNumber: input.containerNumber,
      isoSizeType: input.isoSizeType,
      verifiedGrossMassKg: calc.verifiedGrossMassKg,
      weighingMethod: input.weighingMethod,
      weighingDateTime: now.toISOString(),
      authorizedPersonName: input.authorizedPerson,
      weighingPartyName: input.weighingPartyName,
      certifiedScaleId: input.certifiedScaleId,
      solasApprovalNumber: input.solasApprovalNumber,
    });

    const dcsaJson = synthesizeDcsaJsonVgm({
      declarationReference: declarationRef,
      bookingReference: input.bookingReference,
      containerNumber: input.containerNumber,
      isoSizeType: input.isoSizeType,
      verifiedGrossMassKg: calc.verifiedGrossMassKg,
      weighingMethod: input.weighingMethod,
      weighingDateTime: now.toISOString(),
      authorizedPersonName: input.authorizedPerson,
      weighingPartyName: input.weighingPartyName,
      certifiedScaleId: input.certifiedScaleId,
      solasApprovalNumber: input.solasApprovalNumber,
    });

    // 4. Upsert container record tare weight
    await db
      .update(containers)
      .set({
        tareWeightKg: input.tareWeightKg,
        maxPayloadKg: input.maxPayloadKg ?? 28000,
        updatedAt: now,
      })
      .where(eq(containers.id, input.containerId));

    // 5. Insert container_vgm record in SQLite WAL
    const [created] = await db
      .insert(containerVgm)
      .values({
        id: vgmId,
        tenantId,
        containerId: input.containerId,
        shipmentId: input.shipmentId,
        containerNumber: input.containerNumber,
        vgmWeightKg: calc.verifiedGrossMassKg,
        weighingMethod: input.weighingMethod,
        authorizedPerson: input.authorizedPerson,
        signatureDate: now,
        ediTransmittedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 6. Publish Transactional Outbox Event
    await outboxBus.publish({
      eventType: "scm.vgm.vermas_transmitted.v1",
      aggregateType: "ContainerVgm",
      aggregateId: created.id,
      actor,
      payload: {
        vgmId: created.id,
        containerId: input.containerId,
        containerNumber: input.containerNumber,
        bookingReference: input.bookingReference,
        verifiedGrossMassKg: calc.verifiedGrossMassKg,
        weighingMethod: input.weighingMethod,
        declarationReference: declarationRef,
        edifactVermasSnippet: edifactVermas.slice(0, 120),
      },
    });

    return {
      vgmRecord: created,
      declarationReference: declarationRef,
      edifactVermas,
      dcsaJson,
    };
  }

  /**
   * Processes inbound carrier VERMAS EDIFACT or JSON acknowledgment.
   */
  async processVermasAck(
    vgmId: string,
    rawPayload: string,
    actor = DEFAULT_OPERATOR_ACTOR,
  ) {
    const [vgm] = await db
      .select()
      .from(containerVgm)
      .where(eq(containerVgm.id, vgmId));

    if (!vgm) {
      throw new Error(`Container VGM record not found: ${vgmId}`);
    }

    const ack = parseVermasAck(rawPayload);
    const now = new Date();

    const [updated] = await db
      .update(containerVgm)
      .set({
        ediTransmittedAt: now,
        updatedAt: now,
      })
      .where(eq(containerVgm.id, vgmId))
      .returning();

    await outboxBus.publish({
      eventType: "scm.vgm.status_updated.v1",
      aggregateType: "ContainerVgm",
      aggregateId: updated.id,
      actor,
      payload: {
        vgmId: updated.id,
        containerNumber: updated.containerNumber,
        ackStatus: ack.status,
        rejectionReason: ack.rejectionReason,
        acknowledgedAt: ack.acknowledgedAt,
      },
    });

    return {
      updatedRecord: updated,
      ack,
    };
  }

  /**
   * Ingests a standard DCSA v3.0 operational telemetry event.
   */
  async ingestDcsaEvent(input: IngestDcsaEventInput) {
    const actor = input.actor ?? DEFAULT_OPERATOR_ACTOR;
    const eventId = `dcsa_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date();

    // 1. Insert into dcsa_events_log
    const [event] = await db
      .insert(dcsaEventsLog)
      .values({
        eventId,
        eventType: input.eventType,
        eventClassifierCode: input.eventClassifierCode ?? "ACT",
        eventDateTime: input.eventDateTime,
        carrierBookingReference: input.carrierBookingReference,
        transportDocumentReference: input.transportDocumentReference,
        equipmentReference: input.equipmentReference,
        eventTypeCode: input.eventTypeCode,
        locationLocode: input.locationLocode,
        vesselImoNumber: input.vesselImoNumber,
        vesselName: input.vesselName,
        voyageNumber: input.voyageNumber,
        payloadJson: input.payloadJson ?? "{}",
        signatureVerified: true,
        transportMode: "OCEAN",
        sourceType: "CARRIER_DCSA_EDI",
        processedStatus: "PROCESSED",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 2. If equipment event and matching container exists, record in equipmentLifecycle
    if (input.eventType === "EQUIPMENT" && input.equipmentReference) {
      const [container] = await db
        .select()
        .from(containers)
        .where(eq(containers.containerNumber, input.equipmentReference));

      if (container) {
        const lifecycleEventType =
          input.eventTypeCode === "GTIN"
            ? "GATE_IN_LADEN"
            : input.eventTypeCode === "GTOT"
              ? "GATE_OUT_LADEN"
              : input.eventTypeCode === "DISC"
                ? "DISCHARGED"
                : "GATE_IN_LADEN";

        await db
          .insert(equipmentLifecycle)
          .values({
            id: `eql_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
            containerId: container.id,
            containerNumber: container.containerNumber,
            shipmentId: container.shipmentId,
            eventType: lifecycleEventType,
            eventTimestamp: new Date(input.eventDateTime),
            reportedBy: "DCSA_TELEMETRY",
            notes: input.locationLocode
              ? `Facility: ${input.locationLocode}`
              : null,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
    }

    // 3. Emit Transactional Outbox Event
    await outboxBus.publish({
      eventType: "scm.dcsa.event_ingested.v1",
      aggregateType: "DcsaEvent",
      aggregateId: event.eventId,
      actor,
      payload: {
        eventId: event.eventId,
        eventType: event.eventType,
        eventClassifierCode: event.eventClassifierCode,
        eventDateTime: event.eventDateTime,
        equipmentReference: event.equipmentReference,
        locationLocode: event.locationLocode,
      },
    });

    return event;
  }

  /**
   * Queries VGM declarations.
   */
  async listVgmDeclarations(filters: ListVgmFilters = {}) {
    const conditions = [];

    if (filters.containerId) {
      conditions.push(eq(containerVgm.containerId, filters.containerId));
    }
    if (filters.containerNumber) {
      conditions.push(
        eq(containerVgm.containerNumber, filters.containerNumber),
      );
    }
    if (filters.shipmentId) {
      conditions.push(eq(containerVgm.shipmentId, filters.shipmentId));
    }

    return db
      .select()
      .from(containerVgm)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(containerVgm.createdAt))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
  }
}

export const dcsaVgmService = new DcsaVgmService();

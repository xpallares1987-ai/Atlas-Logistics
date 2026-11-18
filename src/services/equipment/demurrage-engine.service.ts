/**
 * @file demurrage-engine.service.ts
 * @description Equipment Control, Demurrage & Detention (D&D) Engine, and SOLAS VGM Compliance Service.
 * Implements decoupled equipment lifecycle state machine, free days clock calculation,
 * idempotent daily penalty accruals posting to costs, and SOLAS VGM certification.
 * @module @atlas/services/equipment/demurrage-engine
 * @see {@link docs/adr/0026-equipment-control-and-demurrage-engine.md}
 */

import crypto from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  containers,
  containerVgm,
  equipmentLifecycle,
  demurrageAccruals,
  EquipmentEventType,
} from "../../db/schema/containers.js";
import { costs } from "../../db/schema/finance.js";
import { shipments } from "../../db/schema/operations.js";
import {
  isValidIso6346,
  validateEquipmentTransition,
  evaluateDemurrageAndDetention,
  verifyAndCalculateSolasVgm,
  DemurrageTariffTier,
  SolasVgmParams,
  EquipmentDAndDResult,
  SolasVgmValidationResult,
  ClockSuspension,
  EquipmentLifecycleEvent,
} from "@atlas/shared";

// ============================================================================
// 1. INPUT INTERFACES
// ============================================================================

export interface RecordEquipmentEventInput {
  shipmentId: string;
  containerNumber: string;
  eventType: EquipmentEventType;
  eventTimestamp?: Date | string | number;
  locationId?: string;
  reportedBy: string;
  notes?: string;
  tenantId?: string;
}

export interface CalculateDAndDOptions {
  asOfDate?: Date | string;
  demurrageFreeDays?: number;
  detentionFreeDays?: number;
  demurrageTiers?: DemurrageTariffTier[];
  detentionTiers?: DemurrageTariffTier[];
  defaultDemurrageDailyRate?: number;
  defaultDetentionDailyRate?: number;
}

export interface GenerateDailyAccrualsOptions {
  asOfDate?: string; // YYYY-MM-DD
  tenantId?: string;
}

export interface DailyAccrualSummary {
  accrualsGenerated: number;
  costsPosted: number;
  processedContainers: number;
  accrualDate: string;
  details: Array<{
    containerNumber: string;
    shipmentId: string;
    chargeType: "DEMURRAGE" | "DETENTION";
    daysExceeded: number;
    dailyRate: number;
    accrualAmount: number;
    costId: string;
  }>;
}

export interface CertifySolasVgmInput extends SolasVgmParams {
  shipmentId: string;
  tenantId?: string;
}

// ============================================================================
// 2. DEMURRAGE & EQUIPMENT ENGINE SERVICE
// ============================================================================

export class DemurrageEngineService {
  /**
   * Records a physical equipment milestone and validates state machine transitions.
   */
  public static async recordEquipmentEvent(
    input: RecordEquipmentEventInput,
  ): Promise<{
    event: typeof equipmentLifecycle.$inferSelect;
    container: typeof containers.$inferSelect;
    status: EquipmentEventType;
  }> {
    const cleanContainerNumber = input.containerNumber.trim().toUpperCase();

    // 1. Validate ISO 6346 Check Digit
    if (!isValidIso6346(cleanContainerNumber)) {
      throw new Error(
        `Invalid container number '${cleanContainerNumber}': fails ISO 6346 check digit validation`,
      );
    }

    // 2. Find or auto-initialize container entity
    let [container] = await db
      .select()
      .from(containers)
      .where(eq(containers.containerNumber, cleanContainerNumber))
      .limit(1);

    if (!container) {
      const containerId = crypto.randomUUID();
      const [newContainer] = await db
        .insert(containers)
        .values({
          id: containerId,
          tenantId: input.tenantId || null,
          shipmentId: input.shipmentId,
          containerNumber: cleanContainerNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      container = newContainer;
    }

    // 3. Retrieve prior event to validate state transition
    const [lastEvent] = await db
      .select()
      .from(equipmentLifecycle)
      .where(eq(equipmentLifecycle.containerNumber, cleanContainerNumber))
      .orderBy(desc(equipmentLifecycle.eventTimestamp))
      .limit(1);

    const transition = validateEquipmentTransition(
      lastEvent?.eventType as EquipmentEventType | undefined,
      input.eventType,
    );

    if (!transition.valid) {
      throw new Error(transition.reason);
    }

    // 4. Record equipment milestone
    const eventId = crypto.randomUUID();
    const eventTime = input.eventTimestamp
      ? new Date(input.eventTimestamp)
      : new Date();

    const [recordedEvent] = await db
      .insert(equipmentLifecycle)
      .values({
        id: eventId,
        tenantId: input.tenantId || container.tenantId || null,
        containerId: container.id,
        containerNumber: cleanContainerNumber,
        shipmentId: input.shipmentId || container.shipmentId,
        eventType: input.eventType,
        eventTimestamp: eventTime,
        locationId: input.locationId || null,
        reportedBy: input.reportedBy || "MANUAL",
        notes: input.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      event: recordedEvent,
      container,
      status: input.eventType,
    };
  }

  /**
   * Retrieves complete lifecycle history for a container.
   */
  public static async getContainerLifecycle(
    containerNumber: string,
  ): Promise<Array<typeof equipmentLifecycle.$inferSelect>> {
    const cleanNumber = containerNumber.trim().toUpperCase();
    return db
      .select()
      .from(equipmentLifecycle)
      .where(eq(equipmentLifecycle.containerNumber, cleanNumber))
      .orderBy(equipmentLifecycle.eventTimestamp);
  }

  /**
   * Evaluates Demurrage and Detention clocks, dwell times, and charges for a container.
   */
  public static async calculateEquipmentDAndD(
    containerNumber: string,
    options: CalculateDAndDOptions = {},
  ): Promise<EquipmentDAndDResult> {
    const cleanNumber = containerNumber.trim().toUpperCase();

    // 1. Fetch lifecycle events
    const rawEvents = await this.getContainerLifecycle(cleanNumber);

    const events: EquipmentLifecycleEvent[] = rawEvents.map((e) => ({
      id: e.id,
      containerId: e.containerId,
      containerNumber: e.containerNumber,
      eventType: e.eventType as EquipmentEventType,
      eventTimestamp: e.eventTimestamp,
      locationId: e.locationId || undefined,
      reportedBy: e.reportedBy,
      notes: e.notes || undefined,
    }));

    // 2. Fetch suspensions if any recorded
    const suspensions: ClockSuspension[] = [];

    return evaluateDemurrageAndDetention({
      containerNumber: cleanNumber,
      events,
      demurrageFreeDays: options.demurrageFreeDays,
      detentionFreeDays: options.detentionFreeDays,
      demurrageTiers: options.demurrageTiers,
      detentionTiers: options.detentionTiers,
      defaultDemurrageDailyRate: options.defaultDemurrageDailyRate,
      defaultDetentionDailyRate: options.defaultDetentionDailyRate,
      suspensions,
      asOfDate: options.asOfDate,
    });
  }

  /**
   * Automated Daily Accruals Worker (Idempotent).
   * Evaluates all active containers, calculates penalties exceeding free time,
   * inserts daily records into demurrage_accruals, and posts cost records to costs table.
   */
  public static async generateDailyDemurrageAccruals(
    options: GenerateDailyAccrualsOptions = {},
  ): Promise<DailyAccrualSummary> {
    const todayStr = options.asOfDate || new Date().toISOString().split("T")[0];

    // 1. Query all containers with active equipment milestones
    const allContainers = await db.select().from(containers);

    let accrualsGenerated = 0;
    let costsPosted = 0;
    const details: DailyAccrualSummary["details"] = [];

    for (const cont of allContainers) {
      if (
        options.tenantId &&
        cont.tenantId &&
        cont.tenantId !== options.tenantId
      ) {
        continue;
      }

      const dAndD = await this.calculateEquipmentDAndD(cont.containerNumber, {
        asOfDate: todayStr,
      });

      // Process Demurrage Accrual if active and free time exceeded
      if (
        dAndD.demurrage.started &&
        !dAndD.demurrage.completed &&
        dAndD.demurrage.billableDays > 0
      ) {
        const existing = await db
          .select()
          .from(demurrageAccruals)
          .where(
            and(
              eq(demurrageAccruals.containerNumber, cont.containerNumber),
              eq(demurrageAccruals.chargeType, "DEMURRAGE"),
              eq(demurrageAccruals.accrualDate, todayStr),
            ),
          )
          .limit(1);

        if (existing.length === 0) {
          const accrualId = crypto.randomUUID();
          const costId = crypto.randomUUID();
          const dailyRate =
            dAndD.demurrage.tierBreakdown[
              dAndD.demurrage.tierBreakdown.length - 1
            ]?.rate || 150;
          const accrualAmount = dailyRate;

          // 1. Post to costs table
          await db.insert(costs).values({
            id: costId,
            shipmentId: cont.shipmentId,
            amount: accrualAmount,
            currency: dAndD.currency,
            description: `[D&D Demurrage Accrual] Container ${cont.containerNumber} on ${todayStr} (Day ${dAndD.demurrage.billableDays} billable)`,
            createdAt: new Date(),
          });
          costsPosted++;

          // 2. Insert into demurrage_accruals with costId
          await db.insert(demurrageAccruals).values({
            id: accrualId,
            tenantId: cont.tenantId,
            containerId: cont.id,
            containerNumber: cont.containerNumber,
            shipmentId: cont.shipmentId,
            chargeType: "DEMURRAGE",
            accrualDate: todayStr,
            daysExceeded: dAndD.demurrage.billableDays,
            dailyRate,
            accrualAmount,
            currency: dAndD.currency,
            status: "POSTED_TO_COSTS",
            costId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          accrualsGenerated++;

          details.push({
            containerNumber: cont.containerNumber,
            shipmentId: cont.shipmentId,
            chargeType: "DEMURRAGE",
            daysExceeded: dAndD.demurrage.billableDays,
            dailyRate,
            accrualAmount,
            costId,
          });
        }
      }

      // Process Detention Accrual if active and free time exceeded
      if (
        dAndD.detention.started &&
        !dAndD.detention.completed &&
        dAndD.detention.billableDays > 0
      ) {
        const existing = await db
          .select()
          .from(demurrageAccruals)
          .where(
            and(
              eq(demurrageAccruals.containerNumber, cont.containerNumber),
              eq(demurrageAccruals.chargeType, "DETENTION"),
              eq(demurrageAccruals.accrualDate, todayStr),
            ),
          )
          .limit(1);

        if (existing.length === 0) {
          const accrualId = crypto.randomUUID();
          const costId = crypto.randomUUID();
          const dailyRate =
            dAndD.detention.tierBreakdown[
              dAndD.detention.tierBreakdown.length - 1
            ]?.rate || 100;
          const accrualAmount = dailyRate;

          // 1. Post to costs table
          await db.insert(costs).values({
            id: costId,
            shipmentId: cont.shipmentId,
            amount: accrualAmount,
            currency: dAndD.currency,
            description: `[D&D Detention Accrual] Container ${cont.containerNumber} on ${todayStr} (Day ${dAndD.detention.billableDays} billable)`,
            createdAt: new Date(),
          });
          costsPosted++;

          // 2. Insert into demurrage_accruals with costId
          await db.insert(demurrageAccruals).values({
            id: accrualId,
            tenantId: cont.tenantId,
            containerId: cont.id,
            containerNumber: cont.containerNumber,
            shipmentId: cont.shipmentId,
            chargeType: "DETENTION",
            accrualDate: todayStr,
            daysExceeded: dAndD.detention.billableDays,
            dailyRate,
            accrualAmount,
            currency: dAndD.currency,
            status: "POSTED_TO_COSTS",
            costId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          accrualsGenerated++;

          details.push({
            containerNumber: cont.containerNumber,
            shipmentId: cont.shipmentId,
            chargeType: "DETENTION",
            daysExceeded: dAndD.detention.billableDays,
            dailyRate,
            accrualAmount,
            costId,
          });
        }
      }
    }

    return {
      accrualsGenerated,
      costsPosted,
      processedContainers: allContainers.length,
      accrualDate: todayStr,
      details,
    };
  }

  /**
   * Certifies and records a SOLAS Verified Gross Mass (VGM) declaration.
   */
  public static async certifySolasVgm(input: CertifySolasVgmInput): Promise<{
    certificate: typeof containerVgm.$inferSelect;
    validation: SolasVgmValidationResult;
  }> {
    const cleanNumber = input.containerNumber.trim().toUpperCase();

    // 1. Perform domain calculation and validation
    const validation = verifyAndCalculateSolasVgm({
      ...input,
      containerNumber: cleanNumber,
    });

    if (!validation.isValid) {
      throw new Error(
        `SOLAS VGM Certification Rejected: ${validation.errors.join("; ")}`,
      );
    }

    // 2. Ensure container record exists
    let [container] = await db
      .select()
      .from(containers)
      .where(eq(containers.containerNumber, cleanNumber))
      .limit(1);

    if (!container) {
      const containerId = crypto.randomUUID();
      const [newCont] = await db
        .insert(containers)
        .values({
          id: containerId,
          tenantId: input.tenantId || null,
          shipmentId: input.shipmentId,
          containerNumber: cleanNumber,
          tareWeightKg: input.tareWeightKg,
          maxPayloadKg: validation.maxGrossWeightKg - input.tareWeightKg,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      container = newCont;
    } else {
      // Update tare weight on container
      await db
        .update(containers)
        .set({
          tareWeightKg: input.tareWeightKg,
          maxPayloadKg: validation.maxGrossWeightKg - input.tareWeightKg,
          updatedAt: new Date(),
        })
        .where(eq(containers.id, container.id));
    }

    // 3. Persist SOLAS VGM certificate
    const certId = crypto.randomUUID();
    const [certificate] = await db
      .insert(containerVgm)
      .values({
        id: certId,
        tenantId: input.tenantId || container.tenantId || null,
        containerId: container.id,
        shipmentId: input.shipmentId || container.shipmentId,
        containerNumber: cleanNumber,
        vgmWeightKg: validation.vgmWeightKg,
        weighingMethod: input.weighingMethod,
        authorizedPerson: input.authorizedPerson,
        signatureDate: new Date(input.signatureDate),
        certificateBlobUrl: input.certificateBlobUrl || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      certificate,
      validation,
    };
  }
}

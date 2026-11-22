/**
 * @file supply-chain-visibility.service.ts
 * @description Database service for Supply Chain Visibility, unified milestone event tracking,
 * predictive exception evaluation, and transactional outbox event publishing (ADR 0033).
 * @module @atlas/services/supply-chain-visibility
 * @see {@link docs/adr/0033-supply-chain-visibility-and-predictive-milestone-tracking.md}
 */

import { randomUUID } from "node:crypto";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  supplyChainMilestoneEvents,
  supplyChainExceptions,
  MilestoneCategory,
  MilestoneStatus,
  MilestoneDataSource,
  ExceptionCategory,
  ExceptionSeverity,
  ExceptionStatus,
  SupplyChainMilestoneEvent,
  SupplyChainException,
} from "../db/schema/supply_chain_visibility.js";
import { purchaseOrders, poLineItems } from "../db/schema/po.js";
import { bookings } from "../db/schema/operations.js";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
} from "../scm/kernel/primitives.js";
import {
  evaluateMilestoneDelay,
  analyzeSupplyChainExceptions,
  EvaluatedException,
} from "../scm/engines/predictive-exceptions.engine.js";

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export type ActorContext = SecurityActorContext;

export interface IngestVisibilityEventInput {
  tenantId?: string;
  poId: string;
  poLineItemId?: string | null;
  bookingId?: string | null;
  shipmentId?: string | null;
  containerNumber?: string | null;
  milestoneCode: string;
  milestoneCategory: MilestoneCategory;
  status?: MilestoneStatus;
  plannedTimestamp: string;
  estimatedTimestamp?: string | null;
  actualTimestamp?: string | null;
  locationCode?: string | null;
  locationName?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  carrierCode?: string | null;
  dataSource?: MilestoneDataSource;
  notes?: string | null;
}

export interface ListExceptionsFilter {
  tenantId?: string;
  poId?: string;
  bookingId?: string;
  status?: ExceptionStatus;
  severity?: ExceptionSeverity;
  category?: ExceptionCategory;
  limit?: number;
}

export interface ResolveExceptionInput {
  resolvedBy?: string;
  resolutionNotes: string;
}

// ============================================================================
// 2. TIMELINE & MILESTONES
// ============================================================================

/**
 * Retrieves the complete chronological visibility timeline and active exceptions for a Purchase Order.
 */
export async function getPurchaseOrderTimeline(
  poId: string,
  tenantId: string = "tenant_default",
) {
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId)),
    );

  if (!po) {
    throw new Error(`Purchase order ${poId} not found in tenant ${tenantId}.`);
  }

  const milestones = await db
    .select()
    .from(supplyChainMilestoneEvents)
    .where(
      and(
        eq(supplyChainMilestoneEvents.poId, poId),
        eq(supplyChainMilestoneEvents.tenantId, tenantId),
      ),
    )
    .orderBy(asc(supplyChainMilestoneEvents.plannedTimestamp));

  const exceptions = await db
    .select()
    .from(supplyChainExceptions)
    .where(
      and(
        eq(supplyChainExceptions.poId, poId),
        eq(supplyChainExceptions.tenantId, tenantId),
      ),
    )
    .orderBy(desc(supplyChainExceptions.createdAt));

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(
    (m) => m.status === "ACTUAL",
  ).length;
  const openExceptions = exceptions.filter(
    (e) => e.status === "OPEN" || e.status === "ACKNOWLEDGED",
  );
  const criticalExceptions = openExceptions.filter(
    (e) => e.severity === "CRITICAL",
  );

  return {
    po,
    milestones,
    exceptions,
    metrics: {
      totalMilestones,
      completedMilestones,
      progressPercentage:
        totalMilestones > 0
          ? Math.round((completedMilestones / totalMilestones) * 100)
          : 0,
      activeExceptionsCount: openExceptions.length,
      criticalExceptionsCount: criticalExceptions.length,
    },
  };
}

/**
 * Ingests a new milestone visibility event, computes delay hours, checks for predictive exceptions,
 * and publishes transactional outbox events atomically.
 */
export async function ingestVisibilityEvent(
  input: IngestVisibilityEventInput,
  actorContext: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<{
  milestone: SupplyChainMilestoneEvent;
  triggeredException: SupplyChainException | null;
}> {
  const tenantId = input.tenantId || "tenant_default";
  const now = new Date();

  // Validate PO existence
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, input.poId),
        eq(purchaseOrders.tenantId, tenantId),
      ),
    );

  if (!po) {
    throw new Error(
      `Cannot ingest visibility event: PO ${input.poId} not found.`,
    );
  }

  const delayHours = evaluateMilestoneDelay({
    plannedTimestamp: input.plannedTimestamp,
    estimatedTimestamp: input.estimatedTimestamp,
    actualTimestamp: input.actualTimestamp,
  });

  const milestoneId = `scme_${randomUUID().slice(0, 12)}`;
  let createdMilestone: SupplyChainMilestoneEvent | null = null;
  let createdException: SupplyChainException | null = null;

  await db.transaction(async (tx) => {
    // 1. Insert Milestone Event
    const [inserted] = await tx
      .insert(supplyChainMilestoneEvents)
      .values({
        id: milestoneId,
        tenantId,
        poId: input.poId,
        poLineItemId: input.poLineItemId || null,
        bookingId: input.bookingId || null,
        shipmentId: input.shipmentId || null,
        containerNumber: input.containerNumber || null,
        milestoneCode: input.milestoneCode,
        milestoneCategory: input.milestoneCategory,
        status: input.status || "PLANNED",
        plannedTimestamp: input.plannedTimestamp,
        estimatedTimestamp: input.estimatedTimestamp || null,
        actualTimestamp: input.actualTimestamp || null,
        delayHours: Math.round(delayHours),
        locationCode: input.locationCode || null,
        locationName: input.locationName || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        vesselName: input.vesselName || null,
        voyageNumber: input.voyageNumber || null,
        carrierCode: input.carrierCode || null,
        dataSource: input.dataSource || "SYSTEM_DERIVED",
        notes: input.notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    createdMilestone = inserted;

    // 2. Outbox Event for Milestone Ingestion
    await outboxBus.publish(
      {
        eventType: "scm.visibility.milestone_recorded",
        aggregateType: "SupplyChainMilestone",
        aggregateId: milestoneId,
        actor: actorContext,
        payload: {
          milestoneId,
          poId: input.poId,
          milestoneCode: input.milestoneCode,
          category: input.milestoneCategory,
          status: inserted.status,
          delayHours,
          locationCode: input.locationCode,
          dataSource: inserted.dataSource,
          timestamp: now.toISOString(),
        },
      },
      tx,
    );

    // 3. Exception detection if actual/estimated delay exceeds 12h
    if (delayHours > 12) {
      const exceptionId = `scex_${randomUUID().slice(0, 12)}`;
      const severity: ExceptionSeverity =
        delayHours > 72 ? "CRITICAL" : delayHours > 24 ? "HIGH" : "MEDIUM";
      const financialRisk = (
        Math.max(1, Math.ceil(delayHours / 24)) * 180
      ).toFixed(2);

      const [exc] = await tx
        .insert(supplyChainExceptions)
        .values({
          id: exceptionId,
          tenantId,
          poId: input.poId,
          bookingId: input.bookingId || null,
          shipmentId: input.shipmentId || null,
          milestoneEventId: milestoneId,
          exceptionCode: "EXC_CARRIER_DELAY",
          exceptionCategory: "CARRIER_DELAY",
          severity,
          status: "OPEN",
          title: `Transit Milestone Delayed (+${delayHours}h)`,
          description: `Milestone ${input.milestoneCode} reported a delay of ${delayHours} hours against original scheduled plan.`,
          impactSummary: `Estimated carrier delay impact: $${financialRisk} USD in detention/operational costs.`,
          delayEstimateHours: Math.round(delayHours),
          financialRiskAmount: financialRisk,
          financialRiskCurrency: "USD",
          suggestedMitigations: [
            {
              code: "NOTIFY_STAKEHOLDERS",
              label: "Broadcast Milestone ETA Update",
              description:
                "Notify consignee and destination clearance team of delayed arrival.",
              estimatedSavingsHours: 12,
              estimatedCostUsd: 0,
              recommended: true,
              rank: 1,
            },
          ],
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      createdException = exc;

      // Outbox Event for Exception Detection
      await outboxBus.publish(
        {
          eventType: "scm.visibility.exception_detected",
          aggregateType: "SupplyChainException",
          aggregateId: exceptionId,
          actor: actorContext,
          payload: {
            exceptionId,
            poId: input.poId,
            milestoneId,
            exceptionCode: exc.exceptionCode,
            severity,
            delayEstimateHours: delayHours,
            financialRiskAmount: financialRisk,
            timestamp: now.toISOString(),
          },
        },
        tx,
      );
    }
  });

  if (!createdMilestone) {
    throw new Error("Failed to insert milestone record.");
  }

  return {
    milestone: createdMilestone,
    triggeredException: createdException,
  };
}

// ============================================================================
// 3. EXCEPTIONS & RESOLUTION
// ============================================================================

/**
 * Lists supply chain exceptions with optional filtering by tenant, PO, status, or severity.
 */
export async function listSupplyChainExceptions(
  filters: ListExceptionsFilter = {},
) {
  const tenantId = filters.tenantId || "tenant_default";
  const conditions = [eq(supplyChainExceptions.tenantId, tenantId)];

  if (filters.poId) {
    conditions.push(eq(supplyChainExceptions.poId, filters.poId));
  }
  if (filters.bookingId) {
    conditions.push(eq(supplyChainExceptions.bookingId, filters.bookingId));
  }
  if (filters.status) {
    conditions.push(eq(supplyChainExceptions.status, filters.status));
  }
  if (filters.severity) {
    conditions.push(eq(supplyChainExceptions.severity, filters.severity));
  }
  if (filters.category) {
    conditions.push(
      eq(supplyChainExceptions.exceptionCategory, filters.category),
    );
  }

  const limit = filters.limit || 50;

  const rows = await db
    .select({
      exc: supplyChainExceptions,
      poNumber: sql<string>`(SELECT po_number FROM purchase_orders WHERE purchase_orders.id = "supply_chain_exceptions"."po_id")`,
      bookingNumber: sql<string>`(SELECT reference_number FROM bookings WHERE bookings.id = "supply_chain_exceptions"."booking_id")`,
    })
    .from(supplyChainExceptions)
    .where(and(...conditions))
    .orderBy(desc(supplyChainExceptions.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.exc,
    poNumber: r.poNumber || null,
    bookingNumber: r.bookingNumber || null,
    suggestedMitigations:
      typeof r.exc.suggestedMitigations === "string"
        ? JSON.parse(r.exc.suggestedMitigations)
        : r.exc.suggestedMitigations || [],
  }));
}

/**
 * Resolves a supply chain exception with operator mitigation notes and outbox event publishing.
 */
export async function resolveSupplyChainException(
  exceptionId: string,
  tenantId: string,
  input: ResolveExceptionInput,
  actorContext: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<SupplyChainException> {
  const [exc] = await db
    .select()
    .from(supplyChainExceptions)
    .where(
      and(
        eq(supplyChainExceptions.id, exceptionId),
        eq(supplyChainExceptions.tenantId, tenantId),
      ),
    );

  if (!exc) {
    throw new Error(
      `Exception ${exceptionId} not found in tenant ${tenantId}.`,
    );
  }

  const now = new Date();
  const resolvedBy = input.resolvedBy || actorContext.userId || "operator";

  let updated: SupplyChainException | null = null;

  await db.transaction(async (tx) => {
    const [result] = await tx
      .update(supplyChainExceptions)
      .set({
        status: "RESOLVED",
        resolvedBy,
        resolvedAt: now.toISOString(),
        resolutionNotes: input.resolutionNotes,
        updatedAt: now,
      })
      .where(
        and(
          eq(supplyChainExceptions.id, exceptionId),
          eq(supplyChainExceptions.tenantId, tenantId),
        ),
      )
      .returning();

    updated = result;

    await outboxBus.publish(
      {
        eventType: "scm.visibility.exception_resolved",
        aggregateType: "SupplyChainException",
        aggregateId: exceptionId,
        actor: actorContext,
        payload: {
          exceptionId,
          poId: exc.poId,
          resolvedBy,
          resolutionNotes: input.resolutionNotes,
          timestamp: now.toISOString(),
        },
      },
      tx,
    );
  });

  if (!updated) {
    throw new Error("Failed to update exception.");
  }

  return updated;
}

/**
 * Automated sweeper: Scans active POs, their allocated bookings, and milestones,
 * running the pure predictive exception engine and upserting detected exceptions.
 */
export async function scanSupplyChainExceptions(
  tenantId: string = "tenant_default",
  actorContext: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<{
  scannedPosCount: number;
  detectedExceptionsCount: number;
  exceptions: SupplyChainException[];
}> {
  const now = new Date();

  // 1. Fetch active POs
  const activePos = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.tenantId, tenantId),
        sql`"purchase_orders"."status" NOT IN ('DELIVERED', 'CANCELLED')`,
      ),
    );

  const detectedResults: SupplyChainException[] = [];

  for (const po of activePos) {
    // Fetch allocated bookings
    const allocations = await db
      .select({
        bookingId: poLineItems.bookingId,
        referenceNumber: bookings.referenceNumber,
        estimatedDeparture: bookings.estimatedDeparture,
      })
      .from(poLineItems)
      .leftJoin(bookings, eq(poLineItems.bookingId, bookings.id))
      .where(
        and(
          eq(poLineItems.poId, po.id),
          eq(poLineItems.tenantId, tenantId),
          sql`"po_line_items"."booking_id" IS NOT NULL`,
        ),
      );

    const bookingContexts = allocations.map((a) => ({
      bookingId: a.bookingId || "unknown_booking",
      bookingNumber: a.referenceNumber || "UNKNOWN",
      cargoCutOffDate: a.estimatedDeparture
        ? new Date(
            a.estimatedDeparture.getTime() - 48 * 3600 * 1000,
          ).toISOString()
        : null,
      departureDate: a.estimatedDeparture
        ? a.estimatedDeparture.toISOString()
        : null,
      estimatedArrival: a.estimatedDeparture
        ? new Date(
            a.estimatedDeparture.getTime() + 14 * 24 * 3600 * 1000,
          ).toISOString()
        : null,
      containersCount: 1,
    }));

    // Fetch milestones
    const milestones = await db
      .select()
      .from(supplyChainMilestoneEvents)
      .where(
        and(
          eq(supplyChainMilestoneEvents.poId, po.id),
          eq(supplyChainMilestoneEvents.tenantId, tenantId),
        ),
      );

    // Run pure engine
    const evaluated: EvaluatedException[] = analyzeSupplyChainExceptions({
      poId: po.id,
      poNumber: po.poNumber,
      expectedCargoReadyDate: po.expectedCargoReadyDate,
      requiredDeliveryDate: po.expectedCargoReadyDate, // Fallback to CRD + buffer if RDD not set
      totalCargoValue: 50000,
      allocatedBookings: bookingContexts,
      milestones: milestones.map((m) => ({
        id: m.id,
        milestoneCode: m.milestoneCode,
        status: m.status,
        plannedTimestamp: m.plannedTimestamp,
        estimatedTimestamp: m.estimatedTimestamp,
        actualTimestamp: m.actualTimestamp,
        category: m.milestoneCategory,
        locationCode: m.locationCode,
      })),
    });

    for (const item of evaluated) {
      // Check if open exception already exists for this PO and code
      const [existing] = await db
        .select()
        .from(supplyChainExceptions)
        .where(
          and(
            eq(supplyChainExceptions.tenantId, tenantId),
            eq(supplyChainExceptions.poId, po.id),
            eq(supplyChainExceptions.exceptionCode, item.code),
            eq(supplyChainExceptions.status, "OPEN"),
          ),
        );

      if (!existing) {
        const exceptionId = `scex_${randomUUID().slice(0, 12)}`;
        const [inserted] = await db
          .insert(supplyChainExceptions)
          .values({
            id: exceptionId,
            tenantId,
            poId: po.id,
            bookingId: bookingContexts[0]?.bookingId || null,
            exceptionCode: item.code,
            exceptionCategory: item.category,
            severity: item.severity,
            status: "OPEN",
            title: item.title,
            description: item.description,
            impactSummary: item.impactSummary,
            delayEstimateHours: Math.round(item.delayEstimateHours),
            financialRiskAmount: item.financialRiskAmount,
            financialRiskCurrency: item.financialRiskCurrency,
            suggestedMitigations: item.suggestedMitigations,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        detectedResults.push(inserted);

        await outboxBus.publish({
          eventType: "scm.visibility.exception_detected",
          aggregateType: "SupplyChainException",
          aggregateId: exceptionId,
          actor: actorContext,
          payload: {
            exceptionId,
            poId: po.id,
            exceptionCode: item.code,
            severity: item.severity,
            delayEstimateHours: item.delayEstimateHours,
            financialRiskAmount: item.financialRiskAmount,
            timestamp: now.toISOString(),
          },
        });
      }
    }
  }

  return {
    scannedPosCount: activePos.length,
    detectedExceptionsCount: detectedResults.length,
    exceptions: detectedResults,
  };
}

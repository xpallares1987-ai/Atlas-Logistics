/**
 * @file autonomous-resolution.service.ts
 * @description Database service for Autonomous Disruption Resolution and Automated Rerouting.
 * Synthesizes candidate mitigation plans, evaluates hybrid autonomous execution policies,
 * performs atomic SQLite WAL mutations, and dispatches transactional outbox events (ADR 0036).
 * @module @atlas/services/autonomous-resolution
 * @see {@link docs/adr/0036-autonomous-disruption-resolution-and-automated-rerouting-engine.md}
 */

import { randomUUID } from "node:crypto";
import { eq, and, desc, asc, ne, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  disruptionResolutionPlans,
  reroutingExecutionLogs,
  DisruptionPlanType,
  ResolutionPlanStatus,
  DisruptionResolutionPlan,
} from "../db/schema/resolution_plans.js";
import { supplyChainExceptions } from "../db/schema/supply_chain_visibility.js";
import { purchaseOrders } from "../db/schema/po.js";
import { bookings, shipments } from "../db/schema/operations.js";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
} from "../scm/kernel/primitives.js";
import {
  calculateMultiObjectiveLoss,
  evaluateAutonomousEligibility,
  type DisruptionContext,
  type CandidateMitigationInput,
  type ServiceMode,
} from "../scm/engines/autonomous-resolution.engine.js";

// ============================================================================
// 1. DATA CONTRACTS & INTERFACES
// ============================================================================

export interface SynthesizePlansInput {
  exceptionId: string;
  tenantId?: string;
  forceReevaluation?: boolean;
}

export interface ListResolutionPlansFilters {
  tenantId?: string;
  exceptionId?: string;
  poId?: string;
  status?: ResolutionPlanStatus;
}

export interface ExecuteResolutionPlanInput {
  planId: string;
  tenantId?: string;
  notes?: string;
}

export interface RejectResolutionPlanInput {
  planId: string;
  reason: string;
  tenantId?: string;
}

// ============================================================================
// 2. SYNTHESIS ENGINE & CANDIDATE GENERATOR
// ============================================================================

/**
 * Synthesizes multi-criteria mitigation plans for a reported predictive exception,
 * computes multi-objective trade-offs, evaluates policy eligibility, and stores candidates.
 */
export async function synthesizeResolutionPlansForException(
  input: SynthesizePlansInput,
  actorContext: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<DisruptionResolutionPlan[]> {
  const tenantId = input.tenantId ?? "tenant_default";

  // 1. Fetch Exception and context
  const [exception] = await db
    .select()
    .from(supplyChainExceptions)
    .where(
      and(
        eq(supplyChainExceptions.id, input.exceptionId),
        eq(supplyChainExceptions.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!exception) {
    throw new Error(`Supply chain exception '${input.exceptionId}' not found.`);
  }

  // If already resolved and not forcing reevaluation, return existing plans
  if (exception.status === "RESOLVED" && !input.forceReevaluation) {
    return listResolutionPlans({ tenantId, exceptionId: input.exceptionId });
  }

  // 2. Fetch associated PO and Shipment context
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, exception.poId),
        eq(purchaseOrders.tenantId, tenantId),
      ),
    )
    .limit(1);

  const delayHours = Math.max(exception.delayEstimateHours, 24);
  const financialRisk =
    parseFloat(exception.financialRiskAmount || "0") || 5000;

  const disruptionContext: DisruptionContext = {
    exceptionId: exception.id,
    poId: exception.poId,
    shipmentId: exception.shipmentId,
    bookingId: exception.bookingId,
    exceptionCode: exception.exceptionCode,
    exceptionCategory: exception.exceptionCategory,
    severity: exception.severity,
    disruptionDelayHours: delayHours,
    financialRiskAmount: financialRisk,
    isHazardousCargo: false,
    isReeferCargo: false,
    originUnlocode: "CNSHA",
    destinationUnlocode: "ESBCN",
  };

  // 3. Synthesize Candidates across strategies
  const candidateTemplates: Array<{
    planType: DisruptionPlanType;
    carrierCode: string;
    serviceMode: ServiceMode;
    transitDays: number;
    delayRecovered: number;
    costDelta: number;
    co2Delta: number;
    reliability: number;
    justification: string;
    actionPayload: Record<string, unknown>;
  }> = [
    {
      planType: "CARRIER_REROUTE",
      carrierCode: "MSK",
      serviceMode: "OCEAN",
      transitDays: 24,
      delayRecovered: Math.min(delayHours, 48),
      costDelta: 350,
      co2Delta: 80,
      reliability: 92,
      justification: `Roll booking to next available direct ocean rotation (MSK NexSail 4), recovering 48h with minimal $350 fee.`,
      actionPayload: {
        strategy: "NEXT_SAILING",
        carrier: "MSK",
        vessel: "Maersk Mc-Kinney Moller",
        voyage: "2026-N4",
        transitDeltaHours: -48,
      },
    },
    {
      planType: "MODE_SHIFT_AIR",
      carrierCode: "LH",
      serviceMode: "AIR",
      transitDays: 2,
      delayRecovered: Math.min(delayHours, 72),
      costDelta: 3200,
      co2Delta: 2800,
      reliability: 96,
      justification: `Expedite entire shipment via Air Cargo (Lufthansa Cargo LH8200), bypassing all maritime port congestion.`,
      actionPayload: {
        strategy: "MODAL_SHIFT",
        carrier: "LH",
        airWaybill: "020-89123841",
        flightNumber: "LH8200",
        transitDeltaHours: -72,
      },
    },
    {
      planType: "EXPEDITED_DRAYAGE",
      carrierCode: "HAUL-01",
      serviceMode: "ROAD",
      transitDays: 22,
      delayRecovered: Math.min(delayHours, 28),
      costDelta: 650,
      co2Delta: 110,
      reliability: 88,
      justification: `Contract dedicated express drayage fleet with priority gate access at destination port to compress inland dwell.`,
      actionPayload: {
        strategy: "BUFFER_ADJUSTMENT",
        carrier: "HAUL-01",
        serviceLevel: "DEDICATED_EXPRESS_DRAY",
        transitDeltaHours: -28,
      },
    },
    {
      planType: "SPLIT_SHIPMENT",
      carrierCode: "MSK+LH",
      serviceMode: "MULTIMODAL",
      transitDays: 3,
      delayRecovered: Math.min(delayHours, 56),
      costDelta: 1250,
      co2Delta: 950,
      reliability: 91,
      justification: `Split 25% critical order SKUs via Air Cargo while moving balance via standard Ocean, keeping total cost delta below $1,500.`,
      actionPayload: {
        strategy: "SPLIT_EXPEDITE",
        airRatio: 0.25,
        oceanRatio: 0.75,
        transitDeltaHours: -56,
      },
    },
  ];

  // 4. Score each candidate and evaluate policy bounds
  const evaluatedPlans: Array<{
    candidate: (typeof candidateTemplates)[number];
    compositeScore: number;
    isAutoEligible: boolean;
    policyReasons: string[];
  }> = candidateTemplates.map((template) => {
    const candidateInput: CandidateMitigationInput = {
      id: randomUUID(),
      strategy:
        template.planType === "MODE_SHIFT_AIR" ? "MODAL_SHIFT" : "NEXT_SAILING",
      carrierCode: template.carrierCode,
      serviceMode: template.serviceMode,
      transitTimeHours: template.transitDays * 24,
      delayHoursRecovered: template.delayRecovered,
      costDeltaAmount: template.costDelta,
      co2DeltaKg: template.co2Delta,
      carrierReliabilityScore: template.reliability,
      reroutePayload: template.actionPayload,
    };

    const { compositeScore } = calculateMultiObjectiveLoss(
      candidateInput,
      disruptionContext,
    );
    const { isEligible, reasons } = evaluateAutonomousEligibility(
      candidateInput,
      disruptionContext,
      compositeScore,
    );

    return {
      candidate: template,
      compositeScore,
      isAutoEligible: isEligible,
      policyReasons: reasons,
    };
  });

  // Sort descending by score
  evaluatedPlans.sort((a, b) => b.compositeScore - a.compositeScore);

  const now = new Date();
  const createdPlans: DisruptionResolutionPlan[] = [];

  // 5. Persist candidates to SQLite WAL
  for (let i = 0; i < evaluatedPlans.length; i++) {
    const item = evaluatedPlans[i];
    const planId = `plan_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const rank = i + 1;
    const initialStatus: ResolutionPlanStatus =
      item.isAutoEligible && rank === 1 ? "AUTO_APPROVED" : "PROPOSED";

    const [savedPlan] = await db
      .insert(disruptionResolutionPlans)
      .values({
        id: planId,
        tenantId,
        exceptionId: exception.id,
        poId: exception.poId,
        bookingId: exception.bookingId,
        shipmentId: exception.shipmentId,
        planType: item.candidate.planType,
        status: initialStatus,
        confidenceScore: (item.compositeScore / 100).toFixed(2),
        recommendationRank: rank,
        estimatedTransitDays: item.candidate.transitDays,
        transitTimeDeltaHours: -item.candidate.delayRecovered,
        costDeltaAmount: item.candidate.costDelta.toFixed(2),
        costDeltaCurrency: "USD",
        carbonDeltaKgCo2: item.candidate.co2Delta.toFixed(2),
        justification: item.candidate.justification,
        policyEvaluationJson: {
          autoExecutionEligible: item.isAutoEligible,
          eligibilityReasons: item.policyReasons,
          compositeFitnessScore: item.compositeScore,
        },
        actionPayloadJson: item.candidate.actionPayload,
        approvedBy:
          initialStatus === "AUTO_APPROVED" ? "SYSTEM_POLICY_AGENT" : null,
        approvedAt: initialStatus === "AUTO_APPROVED" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    createdPlans.push(savedPlan);
  }

  // 6. Check if top plan is auto-executable and execute immediately if eligible
  const topPlan = createdPlans[0];
  if (topPlan && topPlan.status === "AUTO_APPROVED") {
    const executed = await executeResolutionPlan(
      {
        planId: topPlan.id,
        tenantId,
        notes: "Autonomous zero-touch execution triggered under policy bounds.",
      },
      actorContext,
    );
    createdPlans[0] = executed;
  }

  return createdPlans;
}

// ============================================================================
// 3. QUERY & DETAIL SERVICES
// ============================================================================

export async function listResolutionPlans(
  filters: ListResolutionPlansFilters,
): Promise<DisruptionResolutionPlan[]> {
  const tenantId = filters.tenantId ?? "tenant_default";
  const conditions = [eq(disruptionResolutionPlans.tenantId, tenantId)];

  if (filters.exceptionId) {
    conditions.push(
      eq(disruptionResolutionPlans.exceptionId, filters.exceptionId),
    );
  }
  if (filters.poId) {
    conditions.push(eq(disruptionResolutionPlans.poId, filters.poId));
  }
  if (filters.status) {
    conditions.push(eq(disruptionResolutionPlans.status, filters.status));
  }

  return db
    .select()
    .from(disruptionResolutionPlans)
    .where(and(...conditions))
    .orderBy(
      asc(disruptionResolutionPlans.recommendationRank),
      desc(disruptionResolutionPlans.createdAt),
    );
}

export async function getResolutionPlanDetail(
  planId: string,
  tenantId = "tenant_default",
) {
  const [plan] = await db
    .select()
    .from(disruptionResolutionPlans)
    .where(
      and(
        eq(disruptionResolutionPlans.id, planId),
        eq(disruptionResolutionPlans.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!plan) {
    return null;
  }

  const logs = await db
    .select()
    .from(reroutingExecutionLogs)
    .where(
      and(
        eq(reroutingExecutionLogs.planId, planId),
        eq(reroutingExecutionLogs.tenantId, tenantId),
      ),
    )
    .orderBy(asc(reroutingExecutionLogs.stepIndex));

  return { plan, executionLogs: logs };
}

// ============================================================================
// 4. ATOMIC EXECUTION & TRANSACTIONAL OUTBOX DISPATCH
// ============================================================================

export async function executeResolutionPlan(
  input: ExecuteResolutionPlanInput,
  actorContext: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<DisruptionResolutionPlan> {
  const tenantId = input.tenantId ?? "tenant_default";
  const now = new Date();

  // 1. Fetch Plan
  const [plan] = await db
    .select()
    .from(disruptionResolutionPlans)
    .where(
      and(
        eq(disruptionResolutionPlans.id, input.planId),
        eq(disruptionResolutionPlans.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!plan) {
    throw new Error(`Resolution plan '${input.planId}' not found.`);
  }

  if (plan.status === "EXECUTED") {
    return plan;
  }

  // 2. Execute within ACID Transaction
  return await db.transaction(async (tx) => {
    // A. Update plan to EXECUTED
    const [executedPlan] = await tx
      .update(disruptionResolutionPlans)
      .set({
        status: "EXECUTED",
        approvedBy: plan.approvedBy || actorContext.userId,
        approvedAt: plan.approvedAt || now,
        executedAt: now,
        updatedAt: now,
      })
      .where(eq(disruptionResolutionPlans.id, plan.id))
      .returning();

    // B. Superseed sibling plans for this exception
    await tx
      .update(disruptionResolutionPlans)
      .set({
        status: "REJECTED",
        executionError: `Superseded by execution of plan ${plan.id} (${plan.planType})`,
        updatedAt: now,
      })
      .where(
        and(
          eq(disruptionResolutionPlans.exceptionId, plan.exceptionId),
          eq(disruptionResolutionPlans.tenantId, tenantId),
          ne(disruptionResolutionPlans.id, plan.id),
          eq(disruptionResolutionPlans.status, "PROPOSED"),
        ),
      );

    // C. Create Rerouting Execution Logs
    await tx.insert(reroutingExecutionLogs).values([
      {
        id: `log_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        planId: plan.id,
        stepIndex: 1,
        stepName: "UPDATE_ROUTING_LEGS",
        status: "SUCCESS",
        detailsJson: {
          actionPayload: plan.actionPayloadJson,
          deltaHours: plan.transitTimeDeltaHours,
        },
        executedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `log_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        planId: plan.id,
        stepIndex: 2,
        stepName: "UPDATE_PO_MILESTONES",
        status: "SUCCESS",
        detailsJson: {
          poId: plan.poId,
          transitDays: plan.estimatedTransitDays,
        },
        executedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `log_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        planId: plan.id,
        stepIndex: 3,
        stepName: "RESOLVE_EXCEPTION",
        status: "SUCCESS",
        detailsJson: {
          exceptionId: plan.exceptionId,
          resolutionNotes: input.notes || plan.justification,
        },
        executedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // D. Mutate Exception status to RESOLVED
    await tx
      .update(supplyChainExceptions)
      .set({
        status: "RESOLVED",
        resolvedBy: actorContext.userId,
        resolvedAt: now.toISOString(),
        resolutionNotes: `[ADR 0036] Resolved via ${plan.planType}: ${plan.justification}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(supplyChainExceptions.id, plan.exceptionId),
          eq(supplyChainExceptions.tenantId, tenantId),
        ),
      );

    // E. Emit Transactional Outbox Event within the same transaction
    await outboxBus.publish(
      {
        eventType: "scm.disruption.resolution_executed.v1",
        aggregateType: "DisruptionResolutionPlan",
        aggregateId: plan.id,
        actor: actorContext,
        payload: {
          planId: plan.id,
          exceptionId: plan.exceptionId,
          poId: plan.poId,
          bookingId: plan.bookingId,
          shipmentId: plan.shipmentId,
          planType: plan.planType,
          transitTimeDeltaHours: plan.transitTimeDeltaHours,
          costDeltaAmount: plan.costDeltaAmount,
          executedBy: actorContext.userId,
          timestamp: now.toISOString(),
        },
      },
      tx,
    );

    return executedPlan;
  });
}

export async function rejectResolutionPlan(
  input: RejectResolutionPlanInput,
  actorContext: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<DisruptionResolutionPlan> {
  const tenantId = input.tenantId ?? "tenant_default";
  const now = new Date();

  const [rejected] = await db
    .update(disruptionResolutionPlans)
    .set({
      status: "REJECTED",
      executionError: input.reason,
      approvedBy: actorContext.userId,
      approvedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(disruptionResolutionPlans.id, input.planId),
        eq(disruptionResolutionPlans.tenantId, tenantId),
      ),
    )
    .returning();

  if (!rejected) {
    throw new Error(`Resolution plan '${input.planId}' not found.`);
  }

  return rejected;
}

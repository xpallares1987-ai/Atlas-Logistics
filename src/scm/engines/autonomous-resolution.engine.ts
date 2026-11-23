/**
 * @file autonomous-resolution.engine.ts
 * @description Pure algorithmic domain engine for autonomous disruption resolution,
 * multi-objective loss-scoring, Pareto optimization, and hybrid policy evaluation (ADR 0036).
 * Strictly zero database, fastify, or network dependencies.
 * @module @atlas/scm/engines/autonomous-resolution
 * @see {@link docs/adr/0036-autonomous-disruption-resolution-and-automated-rerouting-engine.md}
 */

// ============================================================================
// 1. DATA CONTRACTS & TYPE DEFINITIONS
// ============================================================================

export type ResolutionStrategy =
  "NEXT_SAILING" | "MODAL_SHIFT" | "SPLIT_EXPEDITE" | "BUFFER_ADJUSTMENT";

export type ResolutionPlanStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "AUTO_EXECUTED"
  | "MANUALLY_APPROVED"
  | "REJECTED";

export type ResolutionOptionStatus =
  "CANDIDATE" | "SELECTED" | "EXECUTED" | "SUPERSEDED" | "REJECTED";

export type ServiceMode = "OCEAN" | "AIR" | "RAIL" | "ROAD" | "MULTIMODAL";

export interface DisruptionContext {
  exceptionId: string;
  poId: string;
  shipmentId?: string | null;
  bookingId?: string | null;
  exceptionCode: string;
  exceptionCategory: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  disruptionDelayHours: number;
  financialRiskAmount?: number;
  financialRiskCurrency?: string;
  isHazardousCargo?: boolean;
  isReeferCargo?: boolean;
  originUnlocode?: string;
  destinationUnlocode?: string;
  grossWeightKg?: number;
  volumeCbm?: number;
  criticalSkuCount?: number;
  totalSkuCount?: number;
}

export interface CandidateMitigationInput {
  id: string;
  strategy: ResolutionStrategy;
  carrierCode: string;
  carrierName?: string;
  serviceMode: ServiceMode;
  transitTimeHours: number;
  delayHoursRecovered: number; // Positive number of hours recovered from delay
  costDeltaAmount: number; // Positive: extra cost incurred; Negative: cost savings
  costDeltaCurrency?: string;
  co2DeltaKg: number; // Positive: additional CO2; Negative: reduction
  carrierReliabilityScore: number; // 0 - 100 percentage
  reroutePayload: Record<string, unknown>;
}

export interface ScoredResolutionOption extends CandidateMitigationInput {
  compositeLoss: number; // Lower is better: [0.00, 1.00]
  compositeScore: number; // Higher is better: [1, 99]
  rankOrder: number; // 1 = optimal Pareto recommendation
  status: ResolutionOptionStatus;
  autoExecutionEligible: boolean;
  eligibilityReasons: string[];
}

export interface EvaluationWeights {
  eta: number; // default: 0.40
  cost: number; // default: 0.35
  reliability: number; // default: 0.15
  co2: number; // default: 0.10
}

export interface AutonomousExecutionPolicy {
  maxCostDeltaAmount: number; // default: 1500 USD
  minDelayRecoveredHours: number; // default: 24 hours
  minConfidenceScore: number; // default: 85 (out of 100)
  allowHazardousCargo: boolean; // default: false
  allowReeferCargo: boolean; // default: false
}

export interface GeneratedResolutionPlan {
  planId: string;
  exceptionId: string;
  poId: string;
  shipmentId?: string | null;
  status: ResolutionPlanStatus;
  policyApplied: string;
  autoExecutionEligible: boolean;
  recommendedOptionId: string | null;
  recommendedStrategy: ResolutionStrategy | null;
  options: ScoredResolutionOption[];
  evaluatedAt: string;
}

// ============================================================================
// 2. DEFAULT GOVERNANCE CONFIGURATIONS
// ============================================================================

export const DEFAULT_EVALUATION_WEIGHTS: EvaluationWeights = {
  eta: 0.4,
  cost: 0.35,
  reliability: 0.15,
  co2: 0.1,
};

export const DEFAULT_AUTONOMOUS_POLICY: AutonomousExecutionPolicy = {
  maxCostDeltaAmount: 1500,
  minDelayRecoveredHours: 24,
  minConfidenceScore: 85,
  allowHazardousCargo: false,
  allowReeferCargo: false,
};

// ============================================================================
// 3. CORE LOSS FUNCTION & SCORING MATHEMATICS
// ============================================================================

/**
 * Calculates normalized multi-objective loss for a candidate mitigation option.
 * Loss is bounded in [0.00, 1.00], where 0 is perfect and 1 is worst.
 *
 * Loss Formula:
 * L = w_eta * Norm(UnrecoveredDelay)
 *   + w_cost * Norm(CostDelta)
 *   + w_rel * (1 - Reliability / 100)
 *   + w_co2 * Norm(CO2Delta)
 */
export function calculateMultiObjectiveLoss(
  candidate: CandidateMitigationInput,
  disruption: DisruptionContext,
  weights: EvaluationWeights = DEFAULT_EVALUATION_WEIGHTS,
): { loss: number; compositeScore: number } {
  const totalWeight =
    weights.eta + weights.cost + weights.reliability + weights.co2;
  const wEta = weights.eta / (totalWeight || 1);
  const wCost = weights.cost / (totalWeight || 1);
  const wRel = weights.reliability / (totalWeight || 1);
  const wCo2 = weights.co2 / (totalWeight || 1);

  // 1. Unrecovered Delay Normalization [0, 1]
  const originalDelay = Math.max(disruption.disruptionDelayHours, 1);
  const unrecoveredHours = Math.max(
    0,
    originalDelay - candidate.delayHoursRecovered,
  );
  const normEta = Math.min(1, Math.max(0, unrecoveredHours / originalDelay));

  // 2. Cost Delta Normalization [0, 1] (Benchmark ceiling: $10,000 USD)
  const normCost = Math.min(
    1,
    Math.max(0, Math.max(0, candidate.costDeltaAmount) / 10000),
  );

  // 3. Reliability Loss [0, 1] (Inverse of 0-100% score)
  const clampedRel = Math.min(
    100,
    Math.max(0, candidate.carrierReliabilityScore),
  );
  const normRel = 1 - clampedRel / 100;

  // 4. CO2 Delta Normalization [0, 1] (Benchmark ceiling: 5,000 kg CO2)
  const normCo2 = Math.min(
    1,
    Math.max(0, Math.max(0, candidate.co2DeltaKg) / 5000),
  );

  // Multi-objective linear composite loss
  const rawLoss =
    wEta * normEta + wCost * normCost + wRel * normRel + wCo2 * normCo2;
  const loss = Number(Math.min(1, Math.max(0, rawLoss)).toFixed(4));

  // Score is [1, 99], higher is better
  const score = Math.round(Math.min(99, Math.max(1, (1 - loss) * 100)));

  return { loss, compositeScore: score };
}

// ============================================================================
// 4. HYBRID AUTONOMOUS POLICY EVALUATOR
// ============================================================================

/**
 * Assesses whether a specific mitigation option complies with strict tenant risk bounds
 * for zero-touch autonomous execution without human operator pre-approval.
 */
export function evaluateAutonomousEligibility(
  candidate: CandidateMitigationInput,
  disruption: DisruptionContext,
  compositeScore: number,
  policy: AutonomousExecutionPolicy = DEFAULT_AUTONOMOUS_POLICY,
): { isEligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 1. Financial Ceiling Check
  if (candidate.costDeltaAmount > policy.maxCostDeltaAmount) {
    reasons.push(
      `Cost delta $${candidate.costDeltaAmount.toFixed(2)} exceeds autonomous limit $${policy.maxCostDeltaAmount.toFixed(2)}`,
    );
  }

  // 2. Minimum Recovery Delay Check
  if (candidate.delayHoursRecovered < policy.minDelayRecoveredHours) {
    reasons.push(
      `Delay recovered (${candidate.delayHoursRecovered}h) is below minimum threshold (${policy.minDelayRecoveredHours}h)`,
    );
  }

  // 3. Confidence / Composite Fitness Score Check
  if (compositeScore < policy.minConfidenceScore) {
    reasons.push(
      `Composite score ${compositeScore} is below minimum autonomous threshold ${policy.minConfidenceScore}`,
    );
  }

  // 4. Hazardous Cargo Gating
  if (disruption.isHazardousCargo && !policy.allowHazardousCargo) {
    reasons.push(
      "Dangerous/Hazardous goods require mandatory human dispatcher confirmation",
    );
  }

  // 5. Temperature-Controlled Reefer Gating
  if (disruption.isReeferCargo && !policy.allowReeferCargo) {
    reasons.push(
      "Temperature-controlled (Reefer) shipments require mandatory human confirmation",
    );
  }

  // 6. Strategy Specific Sanity
  if (
    candidate.strategy === "SPLIT_EXPEDITE" &&
    disruption.criticalSkuCount === 0
  ) {
    reasons.push(
      "SPLIT_EXPEDITE requested but no critical SKU breakdown defined in disruption context",
    );
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}

// ============================================================================
// 5. PARETO RANKING & PLAN COMPILATION
// ============================================================================

/**
 * Evaluates candidate mitigations, computes loss, assigns Pareto ranks (1..N),
 * and compiles the complete actionable resolution plan.
 */
export function compileResolutionPlan(
  planId: string,
  disruption: DisruptionContext,
  candidates: CandidateMitigationInput[],
  options?: {
    weights?: EvaluationWeights;
    policy?: AutonomousExecutionPolicy;
    policyName?: string;
  },
): GeneratedResolutionPlan {
  const weights = options?.weights ?? DEFAULT_EVALUATION_WEIGHTS;
  const policy = options?.policy ?? DEFAULT_AUTONOMOUS_POLICY;
  const policyApplied = options?.policyName ?? "HYBRID_AUTONOMOUS_V1";

  if (!candidates || candidates.length === 0) {
    return {
      planId,
      exceptionId: disruption.exceptionId,
      poId: disruption.poId,
      shipmentId: disruption.shipmentId ?? null,
      status: "DRAFT",
      policyApplied,
      autoExecutionEligible: false,
      recommendedOptionId: null,
      recommendedStrategy: null,
      options: [],
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 1. Calculate Loss, Scores, and Eligibility
  const scoredOptions: ScoredResolutionOption[] = candidates.map(
    (candidate) => {
      const { loss, compositeScore } = calculateMultiObjectiveLoss(
        candidate,
        disruption,
        weights,
      );
      const { isEligible, reasons } = evaluateAutonomousEligibility(
        candidate,
        disruption,
        compositeScore,
        policy,
      );

      return {
        ...candidate,
        compositeLoss: loss,
        compositeScore,
        rankOrder: 1, // temporary, assigned below after sort
        status: "CANDIDATE",
        autoExecutionEligible: isEligible,
        eligibilityReasons: reasons,
      };
    },
  );

  // 2. Sort by Composite Score descending (or Loss ascending)
  scoredOptions.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    return a.costDeltaAmount - b.costDeltaAmount;
  });

  // 3. Assign 1-based ranks
  scoredOptions.forEach((opt, idx) => {
    opt.rankOrder = idx + 1;
  });

  // 4. Determine Recommended Option (Rank 1)
  const topOption = scoredOptions[0];
  const isPlanAutoExecutable = topOption.autoExecutionEligible;

  return {
    planId,
    exceptionId: disruption.exceptionId,
    poId: disruption.poId,
    shipmentId: disruption.shipmentId ?? null,
    status: isPlanAutoExecutable ? "PENDING_APPROVAL" : "PENDING_APPROVAL",
    policyApplied,
    autoExecutionEligible: isPlanAutoExecutable,
    recommendedOptionId: topOption.id,
    recommendedStrategy: topOption.strategy,
    options: scoredOptions,
    evaluatedAt: new Date().toISOString(),
  };
}

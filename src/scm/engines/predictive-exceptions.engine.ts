/**
 * @file predictive-exceptions.engine.ts
 * @description Pure domain calculation engine for Supply Chain Predictive Exceptions,
 * SLA breach detection (CRD cut-off, ETA vs RDD, transshipment dwell), financial risk quantification,
 * and ranked mitigation strategy generation.
 * Strictly decoupled from Drizzle ORM, libSQL, and Fastify HTTP (ADR 0033).
 * @module @atlas/scm/engines/predictive-exceptions
 * @see {@link docs/adr/0033-supply-chain-visibility-and-predictive-milestone-tracking.md}
 */

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export type ExceptionCategory =
  | "CRD_CUTOFF_BREACH"
  | "ETA_RDD_BREACH"
  | "TRANSSHIPMENT_DWELL"
  | "ROLLOVER_RISK"
  | "CUSTOMS_HOLD"
  | "CARRIER_DELAY";

export type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface MitigationStrategy {
  code: string;
  label: string;
  description: string;
  estimatedSavingsHours: number;
  estimatedCostUsd: number;
  recommended: boolean;
  rank: number;
}

export interface EvaluatedException {
  code: string;
  category: ExceptionCategory;
  severity: ExceptionSeverity;
  title: string;
  description: string;
  impactSummary: string;
  delayEstimateHours: number;
  financialRiskAmount: string; // 2 decimal places e.g. "450.00"
  financialRiskCurrency: string; // "USD"
  suggestedMitigations: MitigationStrategy[];
}

export interface CrdCutoffInput {
  crd: string | Date;
  cutoffDate: string | Date;
  vesselDepartureDate?: string | Date | null;
  cargoValue?: number;
  containerCount?: number;
}

export interface EtaRddInput {
  estimatedArrival: string | Date;
  requiredDeliveryDate: string | Date;
  cargoValue?: number;
  dailyPenaltyRate?: number;
  containerCount?: number;
}

export interface TransshipmentDwellInput {
  dischargedDate: string | Date;
  currentTime?: string | Date;
  connectingDepartureDate?: string | Date | null;
  thresholdHours?: number;
  dailyDemurrageRate?: number;
  containerCount?: number;
}

export interface MilestoneEvaluationInput {
  plannedTimestamp: string | Date;
  estimatedTimestamp?: string | Date | null;
  actualTimestamp?: string | Date | null;
}

export interface AllocatedBookingContext {
  bookingId: string;
  bookingNumber: string;
  cargoCutOffDate?: string | Date | null;
  departureDate?: string | Date | null;
  estimatedArrival?: string | Date | null;
  containersCount?: number;
}

export interface MilestoneContext {
  id?: string;
  milestoneCode: string;
  status: string;
  plannedTimestamp: string | Date;
  estimatedTimestamp?: string | Date | null;
  actualTimestamp?: string | Date | null;
  category?: string;
  locationCode?: string | null;
}

export interface PoContextExceptionAnalysisInput {
  poId: string;
  poNumber: string;
  expectedCargoReadyDate: string | Date;
  requiredDeliveryDate?: string | Date | null;
  totalCargoValue?: number;
  allocatedBookings?: AllocatedBookingContext[];
  milestones?: MilestoneContext[];
}

// ============================================================================
// 2. TEMPORAL HELPER UTILITIES
// ============================================================================

/**
 * Normalizes string or Date to millisecond timestamp.
 */
export function toTimestampMs(dateVal: string | Date): number {
  if (dateVal instanceof Date) {
    return dateVal.getTime();
  }
  const parsed = new Date(dateVal).getTime();
  if (isNaN(parsed)) {
    throw new Error(`Invalid date format for calculation: "${dateVal}"`);
  }
  return parsed;
}

/**
 * Calculates hours difference between two dates (dateA - dateB).
 * Positive if dateA is later than dateB, negative if earlier.
 */
export function calculateHoursDifference(
  dateA: string | Date,
  dateB: string | Date,
): number {
  const msA = toTimestampMs(dateA);
  const msB = toTimestampMs(dateB);
  const diffHours = (msA - msB) / (1000 * 60 * 60);
  return Math.round(diffHours * 10) / 10;
}

/**
 * Evaluates delay in hours between planned and actual/estimated timestamps.
 */
export function evaluateMilestoneDelay(
  input: MilestoneEvaluationInput,
): number {
  const plannedMs = toTimestampMs(input.plannedTimestamp);
  if (input.actualTimestamp) {
    const actualMs = toTimestampMs(input.actualTimestamp);
    return Math.round(((actualMs - plannedMs) / (1000 * 60 * 60)) * 10) / 10;
  }
  if (input.estimatedTimestamp) {
    const estimatedMs = toTimestampMs(input.estimatedTimestamp);
    return Math.round(((estimatedMs - plannedMs) / (1000 * 60 * 60)) * 10) / 10;
  }
  return 0;
}

// ============================================================================
// 3. PURE EXCEPTION EVALUATORS
// ============================================================================

/**
 * Evaluates whether Cargo Ready Date (CRD) exceeds Booking Cargo Cut-off.
 * Δ_cut = Date(Cut-Off) - Date(CRD). If Δ_cut < 0, triggers EXC_CRD_AFTER_CUTOFF.
 */
export function evaluateCrdCutoffBreach(
  input: CrdCutoffInput,
): EvaluatedException | null {
  const crdMs = toTimestampMs(input.crd);
  const cutoffMs = toTimestampMs(input.cutoffDate);
  const delayHours =
    Math.round(((crdMs - cutoffMs) / (1000 * 60 * 60)) * 10) / 10;

  if (delayHours <= 0) {
    return null;
  }

  // Check proximity to vessel departure
  let vesselDepartingSoon = false;
  if (input.vesselDepartureDate) {
    const vesselMs = toTimestampMs(input.vesselDepartureDate);
    const hoursToDeparture = (vesselMs - cutoffMs) / (1000 * 60 * 60);
    vesselDepartingSoon = hoursToDeparture <= 48;
  }

  // Derive severity
  let severity: ExceptionSeverity = "MEDIUM";
  if (delayHours > 72 || (vesselDepartingSoon && delayHours > 24)) {
    severity = "CRITICAL";
  } else if (delayHours > 24) {
    severity = "HIGH";
  } else if (delayHours <= 8) {
    severity = "LOW";
  }

  // Calculate financial risk exposure
  const containers = input.containerCount || 1;
  const demurragePerDay = 150;
  const delayDays = Math.max(1, Math.ceil(delayHours / 24));
  const directCarrierRisk = containers * demurragePerDay * delayDays;
  const cargoPenalty = input.cargoValue
    ? Math.round(input.cargoValue * 0.015 * (delayHours / 168) * 100) / 100
    : 0;
  const totalFinancialRisk = (directCarrierRisk + cargoPenalty).toFixed(2);

  // Suggested mitigation alternatives
  const mitigations: MitigationStrategy[] = [
    {
      code: "EXPEDITE_SUPPLIER_OVERTIME",
      label: "Expedite Supplier Overtime Shift",
      description:
        "Request factory authorize weekend overtime to compress finishing & packing by 24-48 hours.",
      estimatedSavingsHours: Math.min(delayHours, 48),
      estimatedCostUsd: 450,
      recommended: delayHours <= 48,
      rank: 1,
    },
    {
      code: "ROLL_BOOKING_NEXT_VESSEL",
      label: "Roll Booking to Following Feeder / Mother Vessel",
      description:
        "Coordinate with carrier liner agency to roll booking to next voyage without dead-freight penalties.",
      estimatedSavingsHours: 0,
      estimatedCostUsd: 250,
      recommended: delayHours > 48,
      rank: 2,
    },
    {
      code: "AIR_FREIGHT_EMERGENCY_SPLIT",
      label: "Emergency Air Freight Conversion (Split SKUs)",
      description:
        "Extract critical Tier-1 SKUs and convert to air cargo; dispatch remaining balance via ocean.",
      estimatedSavingsHours: 144,
      estimatedCostUsd: 2200,
      recommended: severity === "CRITICAL" && (input.cargoValue || 0) > 50000,
      rank: 3,
    },
  ];

  return {
    code: "EXC_CRD_AFTER_CUTOFF",
    category: "CRD_CUTOFF_BREACH",
    severity,
    title: `Cargo Ready Date Exceeds Booking Cut-Off (${delayHours}h Breach)`,
    description: `Supplier Cargo Ready Date (${new Date(crdMs).toISOString()}) is scheduled ${delayHours} hours after the carrier booking cut-off (${new Date(cutoffMs).toISOString()}). Risk of vessel rollover or missing container gate-in.`,
    impactSummary: `Potential container missing planned departure. Estimated direct financial exposure: $${totalFinancialRisk} USD.`,
    delayEstimateHours: delayHours,
    financialRiskAmount: totalFinancialRisk,
    financialRiskCurrency: "USD",
    suggestedMitigations: mitigations,
  };
}

/**
 * Evaluates whether Estimated Time of Arrival (ETA) exceeds Required Delivery Date (RDD).
 * Δ_rdd = Date(ETA) - Date(RDD). If Δ_rdd > 0, triggers EXC_ETA_PAST_RDD.
 */
export function evaluateEtaRddBreach(
  input: EtaRddInput,
): EvaluatedException | null {
  const etaMs = toTimestampMs(input.estimatedArrival);
  const rddMs = toTimestampMs(input.requiredDeliveryDate);
  const delayHours = Math.round(((etaMs - rddMs) / (1000 * 60 * 60)) * 10) / 10;

  if (delayHours <= 0) {
    return null;
  }

  // Derive severity
  let severity: ExceptionSeverity = "MEDIUM";
  if (delayHours > 120) {
    severity = "CRITICAL";
  } else if (delayHours > 48) {
    severity = "HIGH";
  } else if (delayHours <= 12) {
    severity = "LOW";
  }

  // Calculate financial risk exposure
  const containers = input.containerCount || 1;
  const penaltyPerDay = input.dailyPenaltyRate || 250;
  const delayDays = Math.max(1, Math.ceil(delayHours / 24));
  const lateDeliveryPenalties = containers * penaltyPerDay * delayDays;
  const cargoPenalty = input.cargoValue
    ? Math.round(input.cargoValue * 0.02 * (delayHours / 168) * 100) / 100
    : 0;
  const totalFinancialRisk = (lateDeliveryPenalties + cargoPenalty).toFixed(2);

  // Suggested mitigation alternatives
  const mitigations: MitigationStrategy[] = [
    {
      code: "PRIORITY_CUSTOMS_PRE_CLEARANCE",
      label: "File Import Customs Pre-Clearance (AEO Lane)",
      description:
        "Lodge customs entry and clearance documentation while vessel is at sea to bypass terminal inspection queues.",
      estimatedSavingsHours: 36,
      estimatedCostUsd: 150,
      recommended: true,
      rank: 1,
    },
    {
      code: "DEDICATED_EXPEDITED_DRAYAGE",
      label: "Dedicated Expedited Hot-Shot Drayage",
      description:
        "Replace standard intermodal rail ramp connection with dedicated dual-driver direct trucking haulage.",
      estimatedSavingsHours: 48,
      estimatedCostUsd: 550,
      recommended: delayHours > 36,
      rank: 2,
    },
    {
      code: "INTERMODAL_AIR_SEA_TRANSFER",
      label: "Intermodal Sea-Air Transshipment Diversion",
      description:
        "Divert container at primary transshipment hub for immediate air transfer to destination gateway.",
      estimatedSavingsHours: 120,
      estimatedCostUsd: 3100,
      recommended: severity === "CRITICAL",
      rank: 3,
    },
  ];

  return {
    code: "EXC_ETA_PAST_RDD",
    category: "ETA_RDD_BREACH",
    severity,
    title: `Estimated Arrival Breaches Required Delivery Date (+${delayHours}h SLA Delay)`,
    description: `Estimated shipment delivery (${new Date(etaMs).toISOString()}) is ${delayHours} hours behind commercial Required Delivery Date (${new Date(rddMs).toISOString()}).`,
    impactSummary: `Delivery SLA violation. Financial exposure including line-down or SLA breach claims: $${totalFinancialRisk} USD.`,
    delayEstimateHours: delayHours,
    financialRiskAmount: totalFinancialRisk,
    financialRiskCurrency: "USD",
    suggestedMitigations: mitigations,
  };
}

/**
 * Evaluates transshipment terminal dwell time anomalies.
 * If discharged at transshipment hub and dwell exceeds threshold without connecting departure.
 */
export function evaluateTransshipmentDwell(
  input: TransshipmentDwellInput,
): EvaluatedException | null {
  const dischargedMs = toTimestampMs(input.dischargedDate);
  const nowMs = input.currentTime
    ? toTimestampMs(input.currentTime)
    : Date.now();
  const dwellHours =
    Math.round(((nowMs - dischargedMs) / (1000 * 60 * 60)) * 10) / 10;
  const threshold = input.thresholdHours || 72;

  const excessHours = Math.round((dwellHours - threshold) * 10) / 10;
  if (excessHours <= 0) {
    return null;
  }

  // Derive severity
  let severity: ExceptionSeverity = "MEDIUM";
  if (excessHours > 96) {
    severity = "CRITICAL";
  } else if (excessHours > 48) {
    severity = "HIGH";
  } else if (excessHours <= 12) {
    severity = "LOW";
  }

  const containers = input.containerCount || 1;
  const dailyDemurrage = input.dailyDemurrageRate || 180;
  const excessDays = Math.max(1, Math.ceil(excessHours / 24));
  const totalFinancialRisk = (containers * dailyDemurrage * excessDays).toFixed(
    2,
  );

  const mitigations: MitigationStrategy[] = [
    {
      code: "CARRIER_EXPEDITE_REQUEST",
      label: "Carrier Liner Agency Priority Stacking Request",
      description:
        "Transmit urgent EDI/API priority dispatch notice to liner operator for immediate stowage on next feeder call.",
      estimatedSavingsHours: 24,
      estimatedCostUsd: 75,
      recommended: true,
      rank: 1,
    },
    {
      code: "FEEDER_REALLOCATION",
      label: "Reroute via Alternate Regional Feeder Operator",
      description:
        "Transfer container from primary ocean line feeder to common regional feeder vessel slot.",
      estimatedSavingsHours: 72,
      estimatedCostUsd: 400,
      recommended: excessHours > 48,
      rank: 2,
    },
  ];

  return {
    code: "EXC_TRANSSHIPMENT_DWELL",
    category: "TRANSSHIPMENT_DWELL",
    severity,
    title: `Transshipment Terminal Dwell Exceeded (${dwellHours}h vs ${threshold}h Target)`,
    description: `Container has dwelled at transshipment facility for ${dwellHours} hours, exceeding the standard ${threshold}-hour connection window by ${excessHours} hours without vessel departure confirmation.`,
    impactSummary: `Accruing port storage and transshipment dwell penalties: $${totalFinancialRisk} USD.`,
    delayEstimateHours: excessHours,
    financialRiskAmount: totalFinancialRisk,
    financialRiskCurrency: "USD",
    suggestedMitigations: mitigations,
  };
}

// ============================================================================
// 4. COMPREHENSIVE PURCHASE ORDER & BOOKING ANALYZER
// ============================================================================

/**
 * Analyzes a full PO context, its allocated bookings, and related milestones
 * to detect all deterministic predictive exceptions.
 */
export function analyzeSupplyChainExceptions(
  input: PoContextExceptionAnalysisInput,
): EvaluatedException[] {
  const exceptions: EvaluatedException[] = [];

  // 1. Evaluate allocated bookings against PO Cargo Ready Date
  if (input.allocatedBookings && input.allocatedBookings.length > 0) {
    for (const booking of input.allocatedBookings) {
      if (booking.cargoCutOffDate) {
        const crdException = evaluateCrdCutoffBreach({
          crd: input.expectedCargoReadyDate,
          cutoffDate: booking.cargoCutOffDate,
          vesselDepartureDate: booking.departureDate,
          cargoValue: input.totalCargoValue,
          containerCount: booking.containersCount || 1,
        });
        if (crdException) {
          exceptions.push(crdException);
        }
      }

      // 2. Evaluate booking ETA against PO Required Delivery Date (RDD)
      if (input.requiredDeliveryDate && booking.estimatedArrival) {
        const etaException = evaluateEtaRddBreach({
          estimatedArrival: booking.estimatedArrival,
          requiredDeliveryDate: input.requiredDeliveryDate,
          cargoValue: input.totalCargoValue,
          containerCount: booking.containersCount || 1,
        });
        if (etaException) {
          exceptions.push(etaException);
        }
      }
    }
  }

  // 3. Evaluate milestone delays
  if (input.milestones && input.milestones.length > 0) {
    for (const ms of input.milestones) {
      if (
        ms.milestoneCode === "TRANSSHIPMENT_DISCHARGED" &&
        ms.actualTimestamp &&
        ms.status === "ACTUAL"
      ) {
        const dwellException = evaluateTransshipmentDwell({
          dischargedDate: ms.actualTimestamp,
          thresholdHours: 72,
        });
        if (dwellException) {
          exceptions.push(dwellException);
        }
      }
    }
  }

  return exceptions;
}

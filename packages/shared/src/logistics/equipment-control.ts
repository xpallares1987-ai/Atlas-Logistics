/**
 * @file equipment-control.ts
 * @description Equipment Control, Demurrage & Detention (D&D) Clock Engine, and SOLAS VGM Compliance.
 * Pure TypeScript domain engine decoupled from database/framework dependencies.
 * @module @atlas/shared/logistics/equipment-control
 * @see {@link docs/adr/0026-equipment-control-and-demurrage-engine.md}
 */

import { isValidIso6346 } from "../iso6346.js";
import type {
  ClockSuspension,
  DemurrageTariffTier,
} from "../demurrage-dispute.js";

// ============================================================================
// 1. TYPES & ENUMS
// ============================================================================

export type EquipmentEventType =
  | "GATE_OUT_EMPTY"
  | "GATE_IN_LADEN"
  | "DISCHARGED"
  | "GATE_OUT_LADEN"
  | "GATE_IN_EMPTY";

export type DAndDChargeType = "DEMURRAGE" | "DETENTION";

export type VgmWeighingMethod = "METHOD_1" | "METHOD_2";

export type IsoSizeType =
  "20DC" | "40DC" | "40HQ" | "20RF" | "40RF" | "20OT" | "40OT" | "40FR";

export type { ClockSuspension, DemurrageTariffTier };

export interface EquipmentLifecycleEvent {
  id?: string;
  containerId: string;
  containerNumber: string;
  eventType: EquipmentEventType;
  eventTimestamp: Date | string | number;
  locationId?: string;
  reportedBy: string;
  notes?: string;
}

export interface DemurrageCalculationParams {
  containerNumber: string;
  events: EquipmentLifecycleEvent[];
  demurrageFreeDays?: number;
  detentionFreeDays?: number;
  demurrageTiers?: DemurrageTariffTier[];
  detentionTiers?: DemurrageTariffTier[];
  defaultDemurrageDailyRate?: number;
  defaultDetentionDailyRate?: number;
  suspensions?: ClockSuspension[];
  asOfDate?: Date | string;
  currency?: string;
}

export interface TierSubtotal {
  tierFrom: number;
  tierTo?: number;
  daysInTier: number;
  rate: number;
  subtotal: number;
}

export interface DAndDClockResult {
  chargeType: DAndDChargeType;
  started: boolean;
  completed: boolean;
  startDate: string | null;
  endDate: string | null;
  grossCalendarDays: number;
  suspendedDays: number;
  netDwellDays: number;
  freeDaysAllowed: number;
  freeDaysRemaining: number;
  billableDays: number;
  accruedAmount: number;
  currency: string;
  tierBreakdown: TierSubtotal[];
}

export interface EquipmentDAndDResult {
  containerNumber: string;
  currentStatus: EquipmentEventType | "UNKNOWN";
  demurrage: DAndDClockResult;
  detention: DAndDClockResult;
  totalAccruedAmount: number;
  currency: string;
  isOverdue: boolean;
  actionRequired: string;
}

export interface SolasVgmParams {
  containerNumber: string;
  weighingMethod: VgmWeighingMethod;
  tareWeightKg: number;
  maxGrossWeightKg?: number;
  scaleGrossWeightKg?: number; // Required for Method 1
  cargoPackagesWeightKg?: number; // Required for Method 2
  dunnageAndSecuringWeightKg?: number; // Optional for Method 2
  authorizedPerson: string;
  signatureDate: Date | string;
  certificateBlobUrl?: string;
}

export interface SolasVgmValidationResult {
  isValid: boolean;
  vgmWeightKg: number;
  tareWeightKg: number;
  netCargoWeightKg: number;
  maxGrossWeightKg: number;
  weighingMethod: VgmWeighingMethod;
  authorizedPerson: string;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// 2. EQUIPMENT STATE MACHINE & LIFECYCLE TRANSITIONS
// ============================================================================

/**
 * Valid transitions between physical equipment events.
 * Models both export (empty dispatch -> laden return) and import (discharged -> laden outgate -> empty return).
 */
const ALLOWED_TRANSITIONS: Record<EquipmentEventType, EquipmentEventType[]> = {
  GATE_OUT_EMPTY: ["GATE_IN_LADEN"],
  GATE_IN_LADEN: ["DISCHARGED"],
  DISCHARGED: ["GATE_OUT_LADEN"],
  GATE_OUT_LADEN: ["GATE_IN_EMPTY"],
  GATE_IN_EMPTY: ["GATE_OUT_EMPTY"], // Allows re-use in continuous fleet cycles
};

const INITIAL_ALLOWED_EVENTS: EquipmentEventType[] = [
  "GATE_OUT_EMPTY", // Standard export workflow start
  "GATE_IN_LADEN", // Direct shipper-packed gate-in
  "DISCHARGED", // Standard import workflow start at port of discharge
];

/**
 * Validates whether an equipment milestone transition is legally sequential.
 */
export function validateEquipmentTransition(
  currentType: EquipmentEventType | null | undefined,
  nextType: EquipmentEventType,
): { valid: boolean; reason?: string } {
  if (!currentType) {
    if (INITIAL_ALLOWED_EVENTS.includes(nextType)) {
      return { valid: true };
    }
    return {
      valid: false,
      reason: `Initial equipment event cannot be '${nextType}'. Allowed starting events: ${INITIAL_ALLOWED_EVENTS.join(", ")}`,
    };
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentType] || [];
  if (allowedNext.includes(nextType)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Invalid lifecycle transition from '${currentType}' to '${nextType}'. Allowed subsequent events: ${allowedNext.join(", ") || "none"}`,
  };
}

/**
 * Returns allowed next events for a given equipment status.
 */
export function getExpectedNextEvents(
  currentType: EquipmentEventType | null | undefined,
): EquipmentEventType[] {
  if (!currentType) return [...INITIAL_ALLOWED_EVENTS];
  return ALLOWED_TRANSITIONS[currentType] || [];
}

// ============================================================================
// 3. FREE DAYS & DEMURRAGE / DETENTION CLOCK ENGINE
// ============================================================================

/**
 * Parses date input to Date object.
 */
function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d);
}

/**
 * Calculates calendar day difference (floor of days elapsed).
 */
export function calculateCalendarDays(
  from: Date | string | number,
  to: Date | string | number,
): number {
  const fromMs = toDate(from).getTime();
  const toMs = toDate(to).getTime();
  if (toMs <= fromMs) return 0;
  return Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates tiered penalties across fee brackets.
 */
export function calculateTieredPenalty(
  billableDays: number,
  tiers?: DemurrageTariffTier[],
  defaultRate: number = 150,
): { total: number; breakdown: TierSubtotal[] } {
  if (billableDays <= 0) {
    return { total: 0, breakdown: [] };
  }

  // If no custom tiers provided, apply single default tier
  if (!tiers || tiers.length === 0) {
    const subtotal = Math.round(billableDays * defaultRate * 100) / 100;
    return {
      total: subtotal,
      breakdown: [
        {
          tierFrom: 1,
          daysInTier: billableDays,
          rate: defaultRate,
          subtotal,
        },
      ],
    };
  }

  const sortedTiers = [...tiers].sort((a, b) => a.fromDay - b.fromDay);
  const breakdown: TierSubtotal[] = [];
  let total = 0;

  for (const tier of sortedTiers) {
    if (billableDays < tier.fromDay) continue;

    const maxDayInTier = tier.toDay
      ? Math.min(billableDays, tier.toDay)
      : billableDays;
    const daysInTier = maxDayInTier - tier.fromDay + 1;

    if (daysInTier > 0) {
      const subtotal = Math.round(daysInTier * tier.dailyRate * 100) / 100;
      total += subtotal;
      breakdown.push({
        tierFrom: tier.fromDay,
        tierTo: tier.toDay,
        daysInTier,
        rate: tier.dailyRate,
        subtotal,
      });
    }
  }

  return {
    total: Math.round(total * 100) / 100,
    breakdown,
  };
}

/**
 * Evaluates Demurrage and Detention clocks separately according to FMC and standard port rules.
 * Demurrage Clock: DISCHARGED -> GATE_OUT_LADEN
 * Detention Clock: GATE_OUT_LADEN -> GATE_IN_EMPTY
 */
export function evaluateDemurrageAndDetention(
  params: DemurrageCalculationParams,
): EquipmentDAndDResult {
  const asOf = params.asOfDate ? toDate(params.asOfDate) : new Date();
  const currency = params.currency || "USD";
  const demFreeDays = params.demurrageFreeDays ?? 5;
  const detFreeDays = params.detentionFreeDays ?? 7;
  const defaultDemRate = params.defaultDemurrageDailyRate ?? 150;
  const defaultDetRate = params.defaultDetentionDailyRate ?? 100;

  // Sort events chronologically
  const sortedEvents = [...params.events].sort(
    (a, b) =>
      toDate(a.eventTimestamp).getTime() - toDate(b.eventTimestamp).getTime(),
  );

  const eventMap = new Map<EquipmentEventType, Date>();
  for (const ev of sortedEvents) {
    eventMap.set(ev.eventType, toDate(ev.eventTimestamp));
  }

  const currentStatus: EquipmentEventType | "UNKNOWN" =
    sortedEvents.length > 0
      ? sortedEvents[sortedEvents.length - 1].eventType
      : "UNKNOWN";

  // Calculate total approved suspended days
  const totalApprovedSuspensions = (params.suspensions || [])
    .filter((s) => s.approved)
    .reduce((sum, s) => sum + s.suspendedDays, 0);

  // --------------------------------------------------------------------------
  // 1. DEMURRAGE EVALUATION (Inside Port: DISCHARGED -> GATE_OUT_LADEN)
  // --------------------------------------------------------------------------
  const dischargedAt = eventMap.get("DISCHARGED");
  const gateOutLadenAt = eventMap.get("GATE_OUT_LADEN");

  let demStarted = false;
  let demCompleted = false;
  let demGrossDays = 0;
  let demStartDate: string | null = null;
  let demEndDate: string | null = null;

  if (dischargedAt) {
    demStarted = true;
    demStartDate = dischargedAt.toISOString();
    if (gateOutLadenAt) {
      demCompleted = true;
      demEndDate = gateOutLadenAt.toISOString();
      demGrossDays = calculateCalendarDays(dischargedAt, gateOutLadenAt);
    } else {
      demGrossDays = calculateCalendarDays(dischargedAt, asOf);
    }
  }

  // Suspensions apply primarily to demurrage (terminal closures, customs holds)
  const demSuspendedDays = demStarted ? totalApprovedSuspensions : 0;
  const demNetDwellDays = Math.max(0, demGrossDays - demSuspendedDays);
  const demBillableDays = demStarted
    ? Math.max(0, demNetDwellDays - demFreeDays)
    : 0;
  const demFreeRemaining = demStarted
    ? Math.max(0, demFreeDays - demNetDwellDays)
    : demFreeDays;

  const demPenalty = calculateTieredPenalty(
    demBillableDays,
    params.demurrageTiers,
    defaultDemRate,
  );

  const demurrageClock: DAndDClockResult = {
    chargeType: "DEMURRAGE",
    started: demStarted,
    completed: demCompleted,
    startDate: demStartDate,
    endDate: demEndDate,
    grossCalendarDays: demGrossDays,
    suspendedDays: demSuspendedDays,
    netDwellDays: demNetDwellDays,
    freeDaysAllowed: demFreeDays,
    freeDaysRemaining: demFreeRemaining,
    billableDays: demBillableDays,
    accruedAmount: demPenalty.total,
    currency,
    tierBreakdown: demPenalty.breakdown,
  };

  // --------------------------------------------------------------------------
  // 2. DETENTION EVALUATION (Outside Port: GATE_OUT_LADEN -> GATE_IN_EMPTY)
  // --------------------------------------------------------------------------
  const gateInEmptyAt = eventMap.get("GATE_IN_EMPTY");

  let detStarted = false;
  let detCompleted = false;
  let detGrossDays = 0;
  let detStartDate: string | null = null;
  let detEndDate: string | null = null;

  if (gateOutLadenAt) {
    detStarted = true;
    detStartDate = gateOutLadenAt.toISOString();
    if (gateInEmptyAt) {
      detCompleted = true;
      detEndDate = gateInEmptyAt.toISOString();
      detGrossDays = calculateCalendarDays(gateOutLadenAt, gateInEmptyAt);
    } else {
      detGrossDays = calculateCalendarDays(gateOutLadenAt, asOf);
    }
  }

  const detSuspendedDays = 0; // Detention rarely gets terminal suspensions
  const detNetDwellDays = Math.max(0, detGrossDays - detSuspendedDays);
  const detBillableDays = detStarted
    ? Math.max(0, detNetDwellDays - detFreeDays)
    : 0;
  const detFreeRemaining = detStarted
    ? Math.max(0, detFreeDays - detNetDwellDays)
    : detFreeDays;

  const detPenalty = calculateTieredPenalty(
    detBillableDays,
    params.detentionTiers,
    defaultDetRate,
  );

  const detentionClock: DAndDClockResult = {
    chargeType: "DETENTION",
    started: detStarted,
    completed: detCompleted,
    startDate: detStartDate,
    endDate: detEndDate,
    grossCalendarDays: detGrossDays,
    suspendedDays: detSuspendedDays,
    netDwellDays: detNetDwellDays,
    freeDaysAllowed: detFreeDays,
    freeDaysRemaining: detFreeRemaining,
    billableDays: detBillableDays,
    accruedAmount: detPenalty.total,
    currency,
    tierBreakdown: detPenalty.breakdown,
  };

  const totalAccruedAmount =
    Math.round((demPenalty.total + detPenalty.total) * 100) / 100;
  const isOverdue = demBillableDays > 0 || detBillableDays > 0;

  let actionRequired = "Equipment dwell is within allowed free time.";
  if (demBillableDays > 0 && !demCompleted) {
    actionRequired = `URGENT: Demurrage clock running! Gate out container ${params.containerNumber} to prevent further daily penalties of ${currency} ${defaultDemRate}/day.`;
  } else if (detBillableDays > 0 && !detCompleted) {
    actionRequired = `URGENT: Detention clock running! Return empty container ${params.containerNumber} to depot to avoid escalating per diem penalties.`;
  } else if (demBillableDays > 0 || detBillableDays > 0) {
    actionRequired = `Dwell completed with overdue charges: Total ${currency} ${totalAccruedAmount}. Review invoice against audited billable days.`;
  }

  return {
    containerNumber: params.containerNumber,
    currentStatus,
    demurrage: demurrageClock,
    detention: detentionClock,
    totalAccruedAmount,
    currency,
    isOverdue,
    actionRequired,
  };
}

// ============================================================================
// 4. SOLAS VERIFIED GROSS MASS (VGM) COMPLIANCE
// ============================================================================

const STANDARD_MAX_GROSS_WEIGHT_KG = 30480; // Standard ISO 668 rating (67,200 lbs)
const MINIMUM_TARE_WEIGHT_KG = 1500; // Lightweight 20ft container min tare

/**
 * Validates and calculates SOLAS VGM weight declaration.
 * Method 1: Calibrated weighbridge/crane weighing of fully packed container.
 * Method 2: Sum of all cargo packages, pallets, dunnage + container tare weight.
 */
export function verifyAndCalculateSolasVgm(
  params: SolasVgmParams,
): SolasVgmValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxGross = params.maxGrossWeightKg || STANDARD_MAX_GROSS_WEIGHT_KG;

  // 1. ISO 6346 Container Number Validation
  if (!params.containerNumber || !isValidIso6346(params.containerNumber)) {
    errors.push(
      `Container number '${params.containerNumber}' fails ISO 6346 modulus-11 check digit verification`,
    );
  }

  // 2. Tare Weight Sanity Check
  if (!params.tareWeightKg || params.tareWeightKg < MINIMUM_TARE_WEIGHT_KG) {
    errors.push(
      `Tare weight (${params.tareWeightKg} kg) is below minimum structural limit (${MINIMUM_TARE_WEIGHT_KG} kg)`,
    );
  }

  // 3. Authorized Person Signature
  if (!params.authorizedPerson || params.authorizedPerson.trim().length < 2) {
    errors.push(
      "SOLAS Chapter VI Reg 2 requires an authorized representative signatory name",
    );
  }

  let vgmWeightKg = 0;
  let netCargoWeightKg = 0;

  if (params.weighingMethod === "METHOD_1") {
    // Method 1: Scale weight of packed container
    if (!params.scaleGrossWeightKg || params.scaleGrossWeightKg <= 0) {
      errors.push(
        "Method 1 requires certified scaleGrossWeightKg greater than zero",
      );
    } else {
      vgmWeightKg = params.scaleGrossWeightKg;
      netCargoWeightKg = vgmWeightKg - params.tareWeightKg;
      if (vgmWeightKg <= params.tareWeightKg) {
        errors.push(
          `VGM scale weight (${vgmWeightKg} kg) cannot be less than or equal to empty tare weight (${params.tareWeightKg} kg)`,
        );
      }
    }
  } else if (params.weighingMethod === "METHOD_2") {
    // Method 2: Sum of packages + dunnage + tare
    if (
      params.cargoPackagesWeightKg === undefined ||
      params.cargoPackagesWeightKg <= 0
    ) {
      errors.push("Method 2 requires cargoPackagesWeightKg greater than zero");
    } else {
      const dunnage = params.dunnageAndSecuringWeightKg || 0;
      netCargoWeightKg = params.cargoPackagesWeightKg + dunnage;
      vgmWeightKg = params.tareWeightKg + netCargoWeightKg;
    }
  } else {
    errors.push(`Unsupported weighingMethod '${params.weighingMethod}'`);
  }

  // 4. Maximum Permissible Gross Mass (CSC Safety Convention)
  if (vgmWeightKg > maxGross) {
    errors.push(
      `Overweight container: VGM (${vgmWeightKg} kg) exceeds maximum permissible gross rating (${maxGross} kg) under IMO/CSC conventions`,
    );
  }

  // 5. Margin warning (>95% max payload)
  if (vgmWeightKg > maxGross * 0.95 && errors.length === 0) {
    warnings.push(
      `VGM (${vgmWeightKg} kg) is within 5% of maximum gross payload (${maxGross} kg)`,
    );
  }

  return {
    isValid: errors.length === 0,
    vgmWeightKg: Math.round(vgmWeightKg * 1000) / 1000,
    tareWeightKg: params.tareWeightKg,
    netCargoWeightKg: Math.round(netCargoWeightKg * 1000) / 1000,
    maxGrossWeightKg: maxGross,
    weighingMethod: params.weighingMethod,
    authorizedPerson: params.authorizedPerson,
    errors,
    warnings,
  };
}

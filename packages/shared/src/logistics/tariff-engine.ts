/**
 * @file tariff-engine.ts
 * @description Dynamic commercial tariff resolution, multi-currency rating, and formula-based freight surcharge engine.
 * @module @atlas/shared/logistics/tariff-engine
 * @see {@link docs/architecture/tariff-engine.md}
 */

// ============================================================================
// 1. TYPES & ENUMS
// ============================================================================

export type ChargeCategory =
  "FREIGHT" | "ORIGIN_LOCAL" | "DESTINATION_LOCAL" | "CUSTOMS" | "ADMIN";

export type SurchargeCalculationMethod =
  | "PER_CONTAINER"
  | "PER_TEU"
  | "PER_CBM"
  | "PER_KG"
  | "FLAT"
  | "PERCENTAGE"
  | "DYNAMIC_JSON";

export interface DynamicSurchargeRule {
  ruleType:
    | "BAF_FUEL_INDEX"
    | "PEAK_SEASON_SURGE"
    | "EU_ETS_MARITIME"
    | "CUSTOM_FORMULA";
  baselineBunkerPrice?: number;
  currentBunkerPrice?: number;
  peakSeasonStart?: string; // YYYY-MM-DD
  peakSeasonEnd?: string; // YYYY-MM-DD
  peakSeasonSurgeAmount?: number;
  co2FactorPerTeu?: number;
  carbonPriceEurPerTon?: number;
  multiplier?: number;
}

export interface SurchargeDefinition {
  id: string;
  chargeCode: string;
  chargeName: string;
  category: ChargeCategory;
  calculationMethod: SurchargeCalculationMethod;
  originalAmount: number;
  originalCurrency: string;
  exchangeRate?: number; // Rate against accounting base currency
  dynamicRules?: DynamicSurchargeRule | null;
}

export interface CommercialContractRate {
  id: string;
  contractReference: string;
  companyId: string;
  carrierId: string;
  carrierName?: string;
  originLocationId: string;
  destinationLocationId: string;
  containerType: string; // "20GP" | "40GP" | "40HC" | "LCL"
  transportMode: "SEA_FCL" | "SEA_LCL" | "AIR" | "ROAD" | "RAIL";
  baseRate: number;
  currency: string;
  effectiveDate: Date | string;
  expirationDate: Date | string;
  transitDays: number;
  surcharges?: SurchargeDefinition[];
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
}

export interface RatingContext {
  etd: Date | string;
  containerType: string;
  containerCount?: number;
  teuCount?: number;
  volumeCbm?: number;
  chargeableWeightKg?: number;
  targetCurrency?: string;
  currentBunkerPrice?: number;
  currentDate?: Date | string;
}

export interface EvaluatedSurchargeLine {
  id: string;
  chargeCode: string;
  chargeName: string;
  category: ChargeCategory;
  evaluationStep: number; // 1: FREIGHT, 2: LOCALS, 3: CUSTOMS/ADMIN
  originalAmount: number;
  originalCurrency: string;
  exchangeRate: number;
  calculatedAmount: number; // in target currency
  currency: string;
  calculationSummary: string;
}

export interface RatedFreightQuote {
  rateId: string;
  contractReference: string;
  carrierName: string;
  originLocationId: string;
  destinationLocationId: string;
  containerType: string;
  etd: string;
  baseFreightAmount: number;
  totalSurchargesAmount: number;
  totalFreightAmount: number;
  currency: string;
  evaluatedLines: EvaluatedSurchargeLine[];
  effectiveDate: string;
  expirationDate: string;
}

export interface MarginValidationResult {
  buyRateTotal: number;
  sellRateTotal: number;
  currency: string;
  actualMarginAmount: number;
  actualMarginPercent: number;
  minRequiredMarginPercent: number;
  isApproved: boolean;
  approvalRequiredReason?: string;
}

// ============================================================================
// 2. SURCHARGE EVALUATION ORDER & FORMULAS
// ============================================================================

/**
 * Strict evaluation precedence per atlas-billing-tariff-engine:
 * Step 1: Base Freight (FREIGHT)
 * Step 2: Mandatory Origin & Destination Local Charges (ORIGIN_LOCAL, DESTINATION_LOCAL)
 * Step 3: Customs, Security & Administrative Fees (CUSTOMS, ADMIN)
 */
export function getCategoryPrecedence(category: ChargeCategory): number {
  switch (category) {
    case "FREIGHT":
      return 1;
    case "ORIGIN_LOCAL":
    case "DESTINATION_LOCAL":
      return 2;
    case "CUSTOMS":
    case "ADMIN":
      return 3;
    default:
      return 4;
  }
}

/**
 * Evaluates an individual surcharge line given operational context.
 */
export function evaluateSurcharge(
  surcharge: SurchargeDefinition,
  baseFreight: number,
  context: RatingContext,
  exchangeRate = 1.0,
): EvaluatedSurchargeLine {
  const containerCount = context.containerCount ?? 1;
  const is40ft =
    context.containerType === "40HC" ||
    context.containerType === "40GP" ||
    context.containerType === "40RF";
  const teuCount =
    context.teuCount ?? (is40ft ? 2 * containerCount : 1 * containerCount);
  const volumeCbm = context.volumeCbm ?? 1.0;
  const chargeableWeightKg = context.chargeableWeightKg ?? 1000.0;
  const targetCurrency = context.targetCurrency || surcharge.originalCurrency;

  let calculatedInOriginal = 0;
  let summary = "";

  switch (surcharge.calculationMethod) {
    case "PER_CONTAINER":
      calculatedInOriginal = surcharge.originalAmount * containerCount;
      summary = `${surcharge.originalAmount} x ${containerCount} container(s)`;
      break;

    case "PER_TEU":
      calculatedInOriginal = surcharge.originalAmount * teuCount;
      summary = `${surcharge.originalAmount} x ${teuCount} TEU(s)`;
      break;

    case "PER_CBM":
      calculatedInOriginal = surcharge.originalAmount * volumeCbm;
      summary = `${surcharge.originalAmount} x ${volumeCbm} CBM`;
      break;

    case "PER_KG":
      calculatedInOriginal = surcharge.originalAmount * chargeableWeightKg;
      summary = `${surcharge.originalAmount} x ${chargeableWeightKg} kg CW`;
      break;

    case "FLAT":
      calculatedInOriginal = surcharge.originalAmount;
      summary = `Flat fee: ${surcharge.originalAmount}`;
      break;

    case "PERCENTAGE":
      calculatedInOriginal = (surcharge.originalAmount / 100) * baseFreight;
      summary = `${surcharge.originalAmount}% of Base Freight (${baseFreight})`;
      break;

    case "DYNAMIC_JSON": {
      const rule = surcharge.dynamicRules;
      if (!rule) {
        calculatedInOriginal = surcharge.originalAmount;
        summary = `Dynamic rule missing; applied base: ${surcharge.originalAmount}`;
        break;
      }

      if (rule.ruleType === "BAF_FUEL_INDEX") {
        const baseline = rule.baselineBunkerPrice || 600.0;
        const current =
          context.currentBunkerPrice || rule.currentBunkerPrice || 650.0;
        const indexRatio = current / baseline;
        calculatedInOriginal =
          Math.round(surcharge.originalAmount * indexRatio * 100) / 100;
        summary = `BAF Fuel Index (${current} / ${baseline} = ${(indexRatio * 100).toFixed(1)}%) x ${surcharge.originalAmount}`;
      } else if (rule.ruleType === "PEAK_SEASON_SURGE") {
        const checkDate = new Date(context.etd).toISOString().split("T")[0];
        const inPeak =
          Boolean(rule.peakSeasonStart && rule.peakSeasonEnd) &&
          checkDate >= rule.peakSeasonStart! &&
          checkDate <= rule.peakSeasonEnd!;
        const surge = inPeak ? rule.peakSeasonSurgeAmount || 350.0 : 0.0;
        calculatedInOriginal =
          (surcharge.originalAmount + surge) * containerCount;
        summary = inPeak
          ? `Peak Season Active (+${surge}) x ${containerCount} container(s)`
          : `Off-Peak Base (${surcharge.originalAmount}) x ${containerCount} container(s)`;
      } else if (rule.ruleType === "EU_ETS_MARITIME") {
        const co2PerTeu = rule.co2FactorPerTeu || 0.45; // 0.45 tons CO2 per TEU on Asia-Europe
        const carbonPrice = rule.carbonPriceEurPerTon || 68.5; // €68.50 per ton allowance
        const etsAmount =
          Math.round(co2PerTeu * carbonPrice * teuCount * 100) / 100;
        calculatedInOriginal = etsAmount;
        summary = `EU ETS Maritime (${co2PerTeu} t CO2 x €${carbonPrice} x ${teuCount} TEU)`;
      } else {
        calculatedInOriginal = surcharge.originalAmount * containerCount;
        summary = `Custom formula applied: ${calculatedInOriginal}`;
      }
      break;
    }

    default:
      calculatedInOriginal = surcharge.originalAmount;
      summary = `Default base: ${calculatedInOriginal}`;
  }

  // Convert to target currency with tripartite precision
  const convertedAmount =
    Math.round(calculatedInOriginal * exchangeRate * 100) / 100;

  return {
    id: surcharge.id,
    chargeCode: surcharge.chargeCode,
    chargeName: surcharge.chargeName,
    category: surcharge.category,
    evaluationStep: getCategoryPrecedence(surcharge.category),
    originalAmount: Math.round(calculatedInOriginal * 100) / 100,
    originalCurrency: surcharge.originalCurrency,
    exchangeRate,
    calculatedAmount: convertedAmount,
    currency: targetCurrency,
    calculationSummary: summary,
  };
}

// ============================================================================
// 3. RATE TEMPORALITY & CONTRACT RESOLUTION ENGINE
// ============================================================================

/**
 * Resolves commercial freight rates matching origin, destination, container type,
 * transport mode, and strictly filtering by shipment ETD against effective/expiration dates.
 */
export function resolveCommercialRate(
  rates: CommercialContractRate[],
  context: RatingContext & {
    originLocationId: string;
    destinationLocationId: string;
    transportMode?: string;
  },
  exchangeRates: Record<string, number> = {},
): RatedFreightQuote | null {
  const etdDate = new Date(context.etd);
  const etdTime = etdDate.getTime();

  // Strict temporal filtering: effectiveDate <= ETD && expirationDate >= ETD
  const activeCandidates = rates.filter((r) => {
    if (r.status !== "ACTIVE") return false;
    if (
      r.originLocationId !== context.originLocationId ||
      r.destinationLocationId !== context.destinationLocationId
    ) {
      return false;
    }
    if (r.containerType !== context.containerType) return false;
    if (context.transportMode && r.transportMode !== context.transportMode) {
      return false;
    }

    const start = new Date(r.effectiveDate).getTime();
    const end = new Date(r.expirationDate).getTime();
    return start <= etdTime && end >= etdTime;
  });

  if (activeCandidates.length === 0) {
    return null;
  }

  // Pick candidate (lowest baseRate or primary agreement)
  activeCandidates.sort((a, b) => a.baseRate - b.baseRate);
  const selected = activeCandidates[0];

  const targetCurr = context.targetCurrency || selected.currency;
  const currPair = `${selected.currency}_${targetCurr}`;
  const rateToTarget =
    selected.currency === targetCurr ? 1.0 : (exchangeRates[currPair] ?? 1.0);

  const containerCount = context.containerCount ?? 1;
  const baseFreightAmount =
    Math.round(selected.baseRate * containerCount * rateToTarget * 100) / 100;

  // Evaluate surcharges in deterministic order
  const rawSurcharges = selected.surcharges || [];
  const evaluatedLines: EvaluatedSurchargeLine[] = [];

  // Sort surcharges by evaluation step
  const sortedSurcharges = [...rawSurcharges].sort(
    (a, b) =>
      getCategoryPrecedence(a.category) - getCategoryPrecedence(b.category),
  );

  for (const s of sortedSurcharges) {
    const sPair = `${s.originalCurrency}_${targetCurr}`;
    const sExRate =
      s.originalCurrency === targetCurr
        ? 1.0
        : (exchangeRates[sPair] ?? rateToTarget);
    evaluatedLines.push(
      evaluateSurcharge(s, baseFreightAmount, context, sExRate),
    );
  }

  const totalSurchargesAmount =
    Math.round(
      evaluatedLines.reduce((sum, l) => sum + l.calculatedAmount, 0) * 100,
    ) / 100;

  const totalFreightAmount =
    Math.round((baseFreightAmount + totalSurchargesAmount) * 100) / 100;

  return {
    rateId: selected.id,
    contractReference: selected.contractReference,
    carrierName: selected.carrierName || "Carrier Partner",
    originLocationId: selected.originLocationId,
    destinationLocationId: selected.destinationLocationId,
    containerType: selected.containerType,
    etd: new Date(context.etd).toISOString().split("T")[0],
    baseFreightAmount,
    totalSurchargesAmount,
    totalFreightAmount,
    currency: targetCurr,
    evaluatedLines,
    effectiveDate: new Date(selected.effectiveDate).toISOString().split("T")[0],
    expirationDate: new Date(selected.expirationDate)
      .toISOString()
      .split("T")[0],
  };
}

// ============================================================================
// 4. BUY VS. SELL MARGIN ENFORCEMENT ENGINE
// ============================================================================

/**
 * Validates that a quoted sell rate against the buy rate achieves the minimum acceptable
 * profit margin percentage (default 15%), guarding against commercial loss before locking rates.
 */
export function validateProfitMargin(
  buyRateTotal: number,
  sellRateTotal: number,
  minRequiredMarginPercent = 15.0,
  currency = "USD",
): MarginValidationResult {
  const actualMarginAmount =
    Math.round((sellRateTotal - buyRateTotal) * 100) / 100;
  const actualMarginPercent =
    sellRateTotal > 0
      ? Math.round((actualMarginAmount / sellRateTotal) * 10000) / 100
      : 0;

  const isApproved = actualMarginPercent >= minRequiredMarginPercent;
  const approvalRequiredReason = !isApproved
    ? `Profit margin ${actualMarginPercent}% is below corporate threshold of ${minRequiredMarginPercent}%. Minimum sell rate: ${(buyRateTotal / (1 - minRequiredMarginPercent / 100)).toFixed(2)} ${currency}`
    : undefined;

  return {
    buyRateTotal,
    sellRateTotal,
    currency,
    actualMarginAmount,
    actualMarginPercent,
    minRequiredMarginPercent,
    isApproved,
    approvalRequiredReason,
  };
}

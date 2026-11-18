/**
 * @file consolidation-math.ts
 * @description Operational Chargeable Weight (CW) engine and penny-perfect MBL-to-HBL cost allocation algorithms.
 * @module @atlas/shared/logistics/consolidation-math
 * @see {@link docs/architecture/consolidation-math.md}
 */

// ============================================================================
// 1. TYPES & RATIOS
// ============================================================================

export type TransportConsolidationMode = "AIR" | "OCEAN_LCL" | "ROAD";

export type CostAllocationBasis =
  "CHARGEABLE_WEIGHT" | "VOLUME_CBM" | "GROSS_WEIGHT";

export interface ChargeableWeightInput {
  grossWeightKg: number;
  volumeCbm: number;
  mode: TransportConsolidationMode;
}

export interface ChargeableWeightResult {
  grossWeightKg: number;
  volumeCbm: number;
  volumetricRatio: number; // kg per CBM (Air: 166.667, Ocean: 1000, Road: 333.333)
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  billedBasis: "GROSS_WEIGHT" | "VOLUME";
}

export interface HouseCargoAllocationItem {
  shipmentId: string;
  houseDocumentNumber: string;
  grossWeightKg: number;
  volumeCbm: number;
  chargeableWeightKg: number;
  customRatioWeight?: number;
}

export interface ProratedCostLine {
  shipmentId: string;
  houseDocumentNumber: string;
  basisValue: number;
  basisSharePercent: number;
  allocatedAmount: number;
  currency: string;
}

export interface MasterCostProrateInput {
  masterCostId: string;
  masterCostName: string;
  masterAmount: number;
  currency: string;
  allocationBasis: CostAllocationBasis;
  houseItems: HouseCargoAllocationItem[];
}

export interface MasterCostProrateResult {
  masterCostId: string;
  masterCostName: string;
  totalMasterAmount: number;
  currency: string;
  allocationBasis: CostAllocationBasis;
  allocations: ProratedCostLine[];
  leakageDelta: number; // Strictly 0.00 in penny-perfect algorithm
}

export interface HouseShipmentRevenueCost {
  shipmentId: string;
  houseDocumentNumber: string;
  grossWeightKg: number;
  volumeCbm: number;
  chargeableWeightKg: number;
  revenueAmount: number;
  houseSpecificCosts: number;
}

export interface ConsolidationPnLInput {
  consolidationReference: string;
  currency: string;
  masterCosts: Array<{ name: string; amount: number }>;
  houseShipments: HouseShipmentRevenueCost[];
}

export interface ConsolidationPnLResult {
  consolidationReference: string;
  currency: string;
  totalVolumeCbm: number;
  totalGrossWeightKg: number;
  totalChargeableWeightKg: number;
  totalHouseRevenue: number;
  totalMasterCosts: number;
  totalHouseSpecificCosts: number;
  totalConsolidatedCosts: number;
  netGrossProfit: number;
  grossMarginPercent: number;
  yieldPerCbm: number;
  yieldPerChargeableKg: number;
}

// ============================================================================
// 2. CHARGEABLE WEIGHT (CW) ENGINE
// ============================================================================

/**
 * Standard volumetric conversion factors:
 * - Air Freight: 1:6000 (1 CBM = 166.667 kg, standard IATA rule)
 * - Ocean LCL: 1:1000 (1 CBM = 1,000 kg or 1 metric ton, W/M rule)
 * - Road Groupage: 1:3000 (1 CBM = 333.333 kg, European road freight standard)
 */
export const VOLUMETRIC_FACTORS: Record<TransportConsolidationMode, number> = {
  AIR: 166.667,
  OCEAN_LCL: 1000.0,
  ROAD: 333.333,
};

/**
 * Computes the Chargeable Weight (CW) based on the W/M comparison rule.
 */
export function calculateChargeableWeight(
  input: ChargeableWeightInput,
): ChargeableWeightResult {
  const ratio = VOLUMETRIC_FACTORS[input.mode] ?? 1000.0;
  const rawVolumetricWeight = input.volumeCbm * ratio;

  // Round to 3 decimal places for regulatory shipping precision
  const volumetricWeightKg = Math.round(rawVolumetricWeight * 1000) / 1000;
  const grossWeightKg = Math.round(input.grossWeightKg * 1000) / 1000;

  const chargeableWeightKg = Math.max(grossWeightKg, volumetricWeightKg);
  const billedBasis: "GROSS_WEIGHT" | "VOLUME" =
    grossWeightKg >= volumetricWeightKg ? "GROSS_WEIGHT" : "VOLUME";

  return {
    grossWeightKg,
    volumeCbm: input.volumeCbm,
    volumetricRatio: ratio,
    volumetricWeightKg,
    chargeableWeightKg,
    billedBasis,
  };
}

// ============================================================================
// 3. MASTER-TO-HOUSE COST PRORATING (PENNY-PERFECT / ZERO LEAKAGE)
// ============================================================================

/**
 * Prorates an MBL Master Cost across attached HBL shipments without financial leakage.
 * Any remainder cents resulting from fractional divisions are assigned to the HBL
 * with the largest basis value (or first in order).
 */
export function prorateMasterCosts(
  input: MasterCostProrateInput,
): MasterCostProrateResult {
  const { masterAmount, houseItems, allocationBasis, currency } = input;

  if (houseItems.length === 0) {
    return {
      masterCostId: input.masterCostId,
      masterCostName: input.masterCostName,
      totalMasterAmount: masterAmount,
      currency,
      allocationBasis,
      allocations: [],
      leakageDelta: 0,
    };
  }

  // Determine the basis value for each house item
  const getBasisValue = (item: HouseCargoAllocationItem): number => {
    switch (allocationBasis) {
      case "CHARGEABLE_WEIGHT":
        return item.chargeableWeightKg;
      case "VOLUME_CBM":
        return item.volumeCbm;
      case "GROSS_WEIGHT":
        return item.grossWeightKg;
      default:
        return item.chargeableWeightKg;
    }
  };

  const totalBasisValue = houseItems.reduce(
    (sum, item) => sum + getBasisValue(item),
    0,
  );

  // If total basis is 0, distribute equally
  const count = houseItems.length;
  const rawAllocations = houseItems.map((item) => {
    const basisVal = getBasisValue(item);
    const sharePercent =
      totalBasisValue > 0 ? (basisVal / totalBasisValue) * 100 : 100 / count;
    const rawShare =
      totalBasisValue > 0
        ? (basisVal / totalBasisValue) * masterAmount
        : masterAmount / count;
    // Truncate to cents
    const roundedAmount = Math.floor(rawShare * 100) / 100;
    return {
      shipmentId: item.shipmentId,
      houseDocumentNumber: item.houseDocumentNumber,
      basisValue: basisVal,
      basisSharePercent: Math.round(sharePercent * 100) / 100,
      allocatedAmount: roundedAmount,
      currency,
    };
  });

  // Calculate remaining fractional cents
  const sumAllocatedCents = Math.round(
    rawAllocations.reduce((acc, curr) => acc + curr.allocatedAmount, 0) * 100,
  );
  const masterCents = Math.round(masterAmount * 100);
  let remainderCents = masterCents - sumAllocatedCents;

  // Allocate remaining pennies to the largest items (or first if equal)
  if (remainderCents > 0) {
    // Sort descending by basis value to distribute remainder cents
    const sortedIndices = [...rawAllocations.keys()].sort(
      (a, b) => rawAllocations[b].basisValue - rawAllocations[a].basisValue,
    );

    let idx = 0;
    while (remainderCents > 0 && idx < sortedIndices.length) {
      const targetIdx = sortedIndices[idx];
      rawAllocations[targetIdx].allocatedAmount =
        Math.round((rawAllocations[targetIdx].allocatedAmount + 0.01) * 100) /
        100;
      remainderCents--;
      idx = (idx + 1) % sortedIndices.length;
    }
  }

  // Final leakage verification: must be strictly 0.00
  const finalSum =
    Math.round(
      rawAllocations.reduce((acc, curr) => acc + curr.allocatedAmount, 0) * 100,
    ) / 100;
  const leakageDelta = Math.round((masterAmount - finalSum) * 100) / 100;

  return {
    masterCostId: input.masterCostId,
    masterCostName: input.masterCostName,
    totalMasterAmount: masterAmount,
    currency,
    allocationBasis,
    allocations: rawAllocations,
    leakageDelta,
  };
}

// ============================================================================
// 4. CONSOLIDATION PROFITABILITY (P&L) ENGINE
// ============================================================================

/**
 * Calculates dynamic Gross Margin, Net Profit, and yield metrics for an LCL / Air Consolidation.
 */
export function calculateConsolidationProfitability(
  input: ConsolidationPnLInput,
): ConsolidationPnLResult {
  const { consolidationReference, currency, masterCosts, houseShipments } =
    input;

  const totalVolumeCbm =
    Math.round(houseShipments.reduce((sum, h) => sum + h.volumeCbm, 0) * 1000) /
    1000;
  const totalGrossWeightKg =
    Math.round(
      houseShipments.reduce((sum, h) => sum + h.grossWeightKg, 0) * 1000,
    ) / 1000;
  const totalChargeableWeightKg =
    Math.round(
      houseShipments.reduce((sum, h) => sum + h.chargeableWeightKg, 0) * 1000,
    ) / 1000;

  const totalHouseRevenue =
    Math.round(
      houseShipments.reduce((sum, h) => sum + h.revenueAmount, 0) * 100,
    ) / 100;

  const totalMasterCosts =
    Math.round(masterCosts.reduce((sum, c) => sum + c.amount, 0) * 100) / 100;

  const totalHouseSpecificCosts =
    Math.round(
      houseShipments.reduce((sum, h) => sum + h.houseSpecificCosts, 0) * 100,
    ) / 100;

  const totalConsolidatedCosts =
    Math.round((totalMasterCosts + totalHouseSpecificCosts) * 100) / 100;

  const netGrossProfit =
    Math.round((totalHouseRevenue - totalConsolidatedCosts) * 100) / 100;

  const grossMarginPercent =
    totalHouseRevenue > 0
      ? Math.round((netGrossProfit / totalHouseRevenue) * 10000) / 100
      : 0;

  const yieldPerCbm =
    totalVolumeCbm > 0
      ? Math.round((netGrossProfit / totalVolumeCbm) * 100) / 100
      : 0;

  const yieldPerChargeableKg =
    totalChargeableWeightKg > 0
      ? Math.round((netGrossProfit / totalChargeableWeightKg) * 10000) / 10000
      : 0;

  return {
    consolidationReference,
    currency,
    totalVolumeCbm,
    totalGrossWeightKg,
    totalChargeableWeightKg,
    totalHouseRevenue,
    totalMasterCosts,
    totalHouseSpecificCosts,
    totalConsolidatedCosts,
    netGrossProfit,
    grossMarginPercent,
    yieldPerCbm,
    yieldPerChargeableKg,
  };
}

/**
 * Actuarial Cargo Insurance Premium Rating Service
 * Deterministic calculation of net premium, war/strikes surcharges, and statutory taxes (IPS & Consorcio).
 */

export type CargoInsuranceClause =
  | "ICC_A_ALL_RISKS_2009"
  | "ICC_B_MAJOR_PERILS_2009"
  | "ICC_C_BASIC_PERILS_2009"
  | "ICC_AIR_ALL_RISKS";

export type CommodityRiskType =
  | "GENERAL_CARGO"
  | "INDUSTRIAL_MACHINERY"
  | "CHEMICALS_DANGEROUS"
  | "ELECTRONICS_HIGH_TECH"
  | "PHARMA_TEMPERATURE_CONTROLLED"
  | "PERISHABLES_FOOD";

export type InsuranceTransportMode =
  | "MARITIME_OCEAN_FCL"
  | "MARITIME_OCEAN_LCL"
  | "AIR_CARGO"
  | "ROAD_FREIGHT"
  | "RAIL_FREIGHT"
  | "MULTIMODAL";

export interface PremiumRatingInput {
  insuredValue: number;
  coverageClause: CargoInsuranceClause;
  commodityType?: CommodityRiskType;
  transportMode?: InsuranceTransportMode;
  hasWarStrikesCover?: boolean;
  isHighRiskRoute?: boolean;
  minPremiumAmount?: number;
  ipsTaxPercentage?: number; // Default 6.0% (Impuesto sobre Primas de Seguros)
  ccsConsorcioPercentage?: number; // Default 0.005% (Recargo Consorcio de Compensación de Seguros)
}

export interface PremiumRatingResult {
  insuredValue: number;
  coverageClause: CargoInsuranceClause;
  baseClauseRatePercentage: number;
  commodityFactor: number;
  modeFactor: number;
  warStrikesRatePercentage: number;
  totalAppliedRatePercentage: number;
  netPremiumCalculated: number;
  isMinPremiumApplied: boolean;
  netPremiumFinal: number;
  ipsTaxPercentage: number;
  ipsTaxAmount: number;
  ccsConsorcioPercentage: number;
  ccsConsorcioAmount: number;
  grossPremiumPayable: number;
}

export const CLAUSE_BASE_RATES: Record<CargoInsuranceClause, number> = {
  ICC_A_ALL_RISKS_2009: 0.25, // 0.25%
  ICC_B_MAJOR_PERILS_2009: 0.18, // 0.18%
  ICC_C_BASIC_PERILS_2009: 0.12, // 0.12%
  ICC_AIR_ALL_RISKS: 0.2, // 0.20%
};

export const COMMODITY_FACTORS: Record<CommodityRiskType, number> = {
  GENERAL_CARGO: 1.0,
  INDUSTRIAL_MACHINERY: 1.15,
  CHEMICALS_DANGEROUS: 1.3,
  ELECTRONICS_HIGH_TECH: 1.45,
  PHARMA_TEMPERATURE_CONTROLLED: 1.5,
  PERISHABLES_FOOD: 1.35,
};

export const MODE_FACTORS: Record<InsuranceTransportMode, number> = {
  MARITIME_OCEAN_FCL: 1.0,
  MARITIME_OCEAN_LCL: 1.25,
  AIR_CARGO: 0.85,
  ROAD_FREIGHT: 1.1,
  RAIL_FREIGHT: 1.05,
  MULTIMODAL: 1.15,
};

export class ActuarialPremiumRatingService {
  /**
   * Deterministically rates and prices a marine/air/road cargo insurance certificate.
   */
  public static calculatePremium(
    input: PremiumRatingInput,
  ): PremiumRatingResult {
    const val = Math.max(0, input.insuredValue || 0);
    const clause = input.coverageClause || "ICC_A_ALL_RISKS_2009";
    const commodity = input.commodityType || "GENERAL_CARGO";
    const mode = input.transportMode || "MARITIME_OCEAN_FCL";
    const minPrem =
      input.minPremiumAmount !== undefined ? input.minPremiumAmount : 50.0;
    const ipsPct =
      input.ipsTaxPercentage !== undefined ? input.ipsTaxPercentage : 6.0;
    const ccsPct =
      input.ccsConsorcioPercentage !== undefined
        ? input.ccsConsorcioPercentage
        : 0.005;

    const baseClauseRate = CLAUSE_BASE_RATES[clause] ?? 0.25;
    const commFactor = COMMODITY_FACTORS[commodity] ?? 1.0;
    const modeFactor = MODE_FACTORS[mode] ?? 1.0;

    let warRate = 0.0;
    if (input.hasWarStrikesCover !== false) {
      warRate = input.isHighRiskRoute ? 0.12 : 0.04;
    }

    const netRateBeforeWar = baseClauseRate * commFactor * modeFactor;
    const totalAppliedRate =
      Math.round((netRateBeforeWar + warRate) * 10000) / 10000;

    const calcNetPrem =
      Math.round(((val * totalAppliedRate) / 100) * 100) / 100;
    const isMinApplied = calcNetPrem < minPrem;
    const finalNetPrem = isMinApplied ? minPrem : calcNetPrem;

    const ipsAmount = Math.round(((finalNetPrem * ipsPct) / 100) * 100) / 100;
    const ccsAmount = Math.round(((finalNetPrem * ccsPct) / 100) * 100) / 100;
    const grossTotal =
      Math.round((finalNetPrem + ipsAmount + ccsAmount) * 100) / 100;

    return {
      insuredValue: val,
      coverageClause: clause,
      baseClauseRatePercentage: baseClauseRate,
      commodityFactor: commFactor,
      modeFactor,
      warStrikesRatePercentage: warRate,
      totalAppliedRatePercentage: totalAppliedRate,
      netPremiumCalculated: calcNetPrem,
      isMinPremiumApplied: isMinApplied,
      netPremiumFinal: finalNetPrem,
      ipsTaxPercentage: ipsPct,
      ipsTaxAmount: ipsAmount,
      ccsConsorcioPercentage: ccsPct,
      ccsConsorcioAmount: ccsAmount,
      grossPremiumPayable: grossTotal,
    };
  }
}

/**
 * FuelEU Calculator Service
 *
 * Implements deterministic calculations for the European Union FuelEU Maritime Regulation
 * (Regulation (EU) 2023/1805 of the European Parliament and of the Council).
 *
 * Core Formulas & Legal Articles:
 * 1. Well-to-Wake Greenhouse Gas (GHG) Intensity of Energy Used On-Board (Annex I):
 *    GHG_actual (gCO2eq / MJ) = Sum(M_i * LCV_i * WtW_i + E_ops * WtW_ops) / Sum(M_i * LCV_i + E_ops)
 *
 * 2. Regulatory Reduction Trajectory (Article 4(2)):
 *    Baseline Reference (2020): 91.16 gCO2eq/MJ
 *    - 2025–2029: -2.0%  => 89.3368 gCO2eq/MJ
 *    - 2030–2034: -6.0%  => 85.6904 gCO2eq/MJ
 *    - 2035–2039: -14.5% => 77.9418 gCO2eq/MJ
 *    - 2040–2044: -31.0% => 62.9004 gCO2eq/MJ
 *    - 2045–2049: -62.0% => 34.6408 gCO2eq/MJ
 *    - 2050+:     -80.0% => 18.2320 gCO2eq/MJ
 *
 * 3. Compliance Balance (CB) (Article 23(1)):
 *    CB (gCO2eq) = (GHG_target - GHG_actual) * Total_Energy_Consumed (MJ)
 *    - If CB >= 0 => Surplus (Compliance / Bankable / Poolable)
 *    - If CB < 0  => Deficit (Non-compliance / Subject to penalty)
 *
 * 4. FuelEU Remedial Financial Penalty (Article 23(2)):
 *    Penalty (€) = (|Deficit CB| / GHG_actual) * (41,000 MJ/t / 1,000,000) * 2,400 €/t VLSFO-equivalent
 *
 * 5. Onshore Power Supply (OPS) Non-compliance Fee (Article 6 & Annex III):
 *    OPS Penalty (€) = Unconnected_Berth_Hours * Required_Power_kW * 1.50 €/kWh
 */

export interface FuelConsumptionItem {
  fuelCode: string;
  consumedTonnes: number;
  lowerCalorificValueMjPerGram: number; // e.g. 0.0410 for VLSFO (41,000 MJ/tonne)
  wtwFactorGco2eqPerMj: number; // e.g. 91.16 for VLSFO
}

export interface GhgIntensityCalculationResult {
  totalFuelMassTonnes: number;
  totalFuelEnergyMj: number;
  opsElectricityEnergyMj: number;
  totalEnergyConsumedMj: number;
  totalGhgEmissionsGco2eq: number;
  calculatedGhgIntensityGco2eqPerMj: number;
}

export interface ComplianceBalanceResult {
  reportingYear: number;
  targetGhgIntensityGco2eqPerMj: number;
  actualGhgIntensityGco2eqPerMj: number;
  totalEnergyConsumedMj: number;
  complianceBalanceGco2eq: number;
  complianceBalanceTonnesCo2eq: number;
  isCompliant: boolean;
  complianceStatus: "SURPLUS" | "DEFICIT";
  fuelEuPenaltyEur: number;
}

export interface FleetPoolVesselInput {
  vesselId: string;
  vesselName: string;
  complianceBalanceGco2eq: number;
}

export interface FleetPoolResult {
  poolCode: string;
  totalEnrolledVessels: number;
  consolidatedNetBalanceGco2eq: number;
  consolidatedNetBalanceTonnesCo2eq: number;
  isPoolCompliant: boolean;
  totalResidualPenaltyEur: number;
  reallocationNotes: string;
}

export class FuelEuCalculatorService {
  /**
   * Reference baseline emission intensity (2020 reference in Annex I)
   */
  public static readonly BASELINE_GHG_INTENSITY = 91.16; // gCO2eq/MJ

  /**
   * Statutory FuelEU penalty multiplier constant (€2,400 per tonne of VLSFO equivalent)
   */
  public static readonly PENALTY_EUR_PER_TONNE_VLSFO_EQUIV = 2400.0;

  /**
   * VLSFO reference calorific value in MJ/t (41,000 MJ/t)
   */
  public static readonly VLSFO_REFERENCE_ENERGY_MJ_PER_TONNE = 41000.0;

  /**
   * Standard conversion: 1 kWh of OPS electricity = 3.6 MJ
   */
  public static readonly KWH_TO_MJ_CONVERSION_FACTOR = 3.6;

  /**
   * Default EU grid electricity WtW emission factor in gCO2eq/MJ
   */
  public static readonly OPS_ELECTRICITY_WTW_FACTOR = 28.0;

  /**
   * Get regulatory target GHG intensity for a given reporting year under Art. 4(2)
   */
  public static getTargetGhgIntensityForYear(reportingYear: number): number {
    if (reportingYear < 2025) {
      return this.BASELINE_GHG_INTENSITY;
    } else if (reportingYear <= 2029) {
      // -2%
      return Number((this.BASELINE_GHG_INTENSITY * 0.98).toFixed(4));
    } else if (reportingYear <= 2034) {
      // -6%
      return Number((this.BASELINE_GHG_INTENSITY * 0.94).toFixed(4));
    } else if (reportingYear <= 2039) {
      // -14.5%
      return Number((this.BASELINE_GHG_INTENSITY * 0.855).toFixed(4));
    } else if (reportingYear <= 2044) {
      // -31%
      return Number((this.BASELINE_GHG_INTENSITY * 0.69).toFixed(4));
    } else if (reportingYear <= 2049) {
      // -62%
      return Number((this.BASELINE_GHG_INTENSITY * 0.38).toFixed(4));
    } else {
      // 2050+: -80%
      return Number((this.BASELINE_GHG_INTENSITY * 0.2).toFixed(4));
    }
  }

  /**
   * Computes the actual Well-to-Wake GHG intensity (gCO2eq/MJ) of energy used on board.
   */
  public static calculateGhgIntensity(
    fuelConsumptions: FuelConsumptionItem[],
    opsElectricityConsumedKwh: number = 0.0,
  ): GhgIntensityCalculationResult {
    let totalFuelMassTonnes = 0;
    let totalFuelEnergyMj = 0;
    let totalGhgEmissionsGco2eq = 0;

    for (const item of fuelConsumptions) {
      totalFuelMassTonnes += item.consumedTonnes;
      // Energy in MJ = tonnes * 1,000,000 grams * LCV (MJ/g) = tonnes * 1000 * (LCV * 1000)
      const energyMj =
        item.consumedTonnes *
        1000.0 *
        (item.lowerCalorificValueMjPerGram * 1000.0);
      totalFuelEnergyMj += energyMj;
      totalGhgEmissionsGco2eq += energyMj * item.wtwFactorGco2eqPerMj;
    }

    const opsElectricityEnergyMj =
      opsElectricityConsumedKwh * this.KWH_TO_MJ_CONVERSION_FACTOR;
    totalGhgEmissionsGco2eq +=
      opsElectricityEnergyMj * this.OPS_ELECTRICITY_WTW_FACTOR;

    const totalEnergyConsumedMj = totalFuelEnergyMj + opsElectricityEnergyMj;

    const calculatedGhgIntensityGco2eqPerMj =
      totalEnergyConsumedMj > 0
        ? Number((totalGhgEmissionsGco2eq / totalEnergyConsumedMj).toFixed(4))
        : 0;

    return {
      totalFuelMassTonnes: Number(totalFuelMassTonnes.toFixed(3)),
      totalFuelEnergyMj: Number(totalFuelEnergyMj.toFixed(2)),
      opsElectricityEnergyMj: Number(opsElectricityEnergyMj.toFixed(2)),
      totalEnergyConsumedMj: Number(totalEnergyConsumedMj.toFixed(2)),
      totalGhgEmissionsGco2eq: Number(totalGhgEmissionsGco2eq.toFixed(2)),
      calculatedGhgIntensityGco2eqPerMj,
    };
  }

  /**
   * Evaluates the Compliance Balance (CB) for a vessel in a reporting year and calculates any penalty.
   */
  public static calculateComplianceBalance(
    reportingYear: number,
    actualGhgIntensityGco2eqPerMj: number,
    totalEnergyConsumedMj: number,
  ): ComplianceBalanceResult {
    const targetGhgIntensityGco2eqPerMj =
      this.getTargetGhgIntensityForYear(reportingYear);

    // CB (gCO2eq) = (Target - Actual) * Total Energy (MJ)
    const complianceBalanceGco2eq = Number(
      (
        (targetGhgIntensityGco2eqPerMj - actualGhgIntensityGco2eqPerMj) *
        totalEnergyConsumedMj
      ).toFixed(2),
    );

    const complianceBalanceTonnesCo2eq = Number(
      (complianceBalanceGco2eq / 1_000_000).toFixed(4),
    );
    const isCompliant = complianceBalanceGco2eq >= 0;
    const complianceStatus: "SURPLUS" | "DEFICIT" = isCompliant
      ? "SURPLUS"
      : "DEFICIT";

    let fuelEuPenaltyEur = 0;
    if (!isCompliant && actualGhgIntensityGco2eqPerMj > 0) {
      // Penalty (€) = (|Deficit CB (gCO2eq)| / Actual GHG (gCO2eq/MJ)) / 41,000 MJ/t * 2,400 €/t
      const deficitGco2eq = Math.abs(complianceBalanceGco2eq);
      const energyEquivalentMj = deficitGco2eq / actualGhgIntensityGco2eqPerMj;
      const vlsfoEquivTonnes =
        energyEquivalentMj / this.VLSFO_REFERENCE_ENERGY_MJ_PER_TONNE;
      fuelEuPenaltyEur = Number(
        (vlsfoEquivTonnes * this.PENALTY_EUR_PER_TONNE_VLSFO_EQUIV).toFixed(2),
      );
    }

    return {
      reportingYear,
      targetGhgIntensityGco2eqPerMj,
      actualGhgIntensityGco2eqPerMj,
      totalEnergyConsumedMj,
      complianceBalanceGco2eq,
      complianceBalanceTonnesCo2eq,
      isCompliant,
      complianceStatus,
      fuelEuPenaltyEur,
    };
  }

  /**
   * Calculates Onshore Power Supply (OPS) penalty for non-compliance at berth (Art. 6).
   */
  public static calculateOpsPenalty(
    unconnectedBerthHours: number,
    averageRequiredHotelPowerKw: number = 800.0,
    penaltyRateEurPerKwh: number = 1.5,
  ): {
    unconnectedBerthHours: number;
    totalKwhShortfall: number;
    penaltyEur: number;
  } {
    const totalKwhShortfall = Number(
      (unconnectedBerthHours * averageRequiredHotelPowerKw).toFixed(2),
    );
    const penaltyEur = Number(
      (totalKwhShortfall * penaltyRateEurPerKwh).toFixed(2),
    );
    return {
      unconnectedBerthHours,
      totalKwhShortfall,
      penaltyEur,
    };
  }

  /**
   * Simulates fleet compliance pooling (Art. 21).
   * Aggregates surplus and deficit across participating vessels.
   */
  public static evaluatePoolBalance(
    poolCode: string,
    vessels: FleetPoolVesselInput[],
  ): FleetPoolResult {
    let consolidatedNetBalanceGco2eq = 0;

    for (const v of vessels) {
      consolidatedNetBalanceGco2eq += v.complianceBalanceGco2eq;
    }

    consolidatedNetBalanceGco2eq = Number(
      consolidatedNetBalanceGco2eq.toFixed(2),
    );
    const consolidatedNetBalanceTonnesCo2eq = Number(
      (consolidatedNetBalanceGco2eq / 1_000_000).toFixed(4),
    );
    const isPoolCompliant = consolidatedNetBalanceGco2eq >= 0;

    let totalResidualPenaltyEur = 0;
    if (!isPoolCompliant) {
      // In deficit, proportional penalty is calculated
      const deficitGco2eq = Math.abs(consolidatedNetBalanceGco2eq);
      const energyEquivalentMj = deficitGco2eq / this.BASELINE_GHG_INTENSITY;
      const vlsfoEquivTonnes =
        energyEquivalentMj / this.VLSFO_REFERENCE_ENERGY_MJ_PER_TONNE;
      totalResidualPenaltyEur = Number(
        (vlsfoEquivTonnes * this.PENALTY_EUR_PER_TONNE_VLSFO_EQUIV).toFixed(2),
      );
    }

    const reallocationNotes = isPoolCompliant
      ? `El Pool ${poolCode} es plenamente conforme (superávit neto de ${consolidatedNetBalanceTonnesCo2eq} t CO2eq). Las sanciones individuales de todos los buques quedan neutralizadas a 0,00 €.`
      : `El Pool ${poolCode} presenta un déficit neto consolidado de ${Math.abs(
          consolidatedNetBalanceTonnesCo2eq,
        )} t CO2eq. Se requiere liquidar una penalización remanente de ${totalResidualPenaltyEur.toLocaleString(
          "es-ES",
        )} €.`;

    return {
      poolCode,
      totalEnrolledVessels: vessels.length,
      consolidatedNetBalanceGco2eq,
      consolidatedNetBalanceTonnesCo2eq,
      isPoolCompliant,
      totalResidualPenaltyEur,
      reallocationNotes,
    };
  }

  /**
   * Simulates borrowing deficit from the next reporting year under Article 20(2).
   * Applies statutory penalty factor 1.10 (10% surcharge).
   */
  public static evaluateBorrowing(deficitGco2eq: number): {
    borrowedPrincipalGco2eq: number;
    borrowingSurchargePercent: number;
    totalNextYearObligationGco2eq: number;
  } {
    const principal = Math.abs(deficitGco2eq);
    const totalObligation = Number((principal * 1.1).toFixed(2));
    return {
      borrowedPrincipalGco2eq: principal,
      borrowingSurchargePercent: 10.0,
      totalNextYearObligationGco2eq: totalObligation,
    };
  }
}

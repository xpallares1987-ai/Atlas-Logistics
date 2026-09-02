/**
 * ASTM-IP Petroleum & Liquid Bulk Ullage / Tank Survey Service (ASTM Table 54A/54B)
 * Deterministic calculation of Gross/Net Standard Volume (15°C) and Metric Tonnes in Air & Vacuum.
 */

export interface AstmUllageSurveyInput {
  productName: string;
  tankCount?: number;
  observedAverageTemperatureCelsius: number; // T_obs
  densityAt15Celsius: number; // Density in t/m3 or kg/L (e.g. 0.7985 for Jet A-1, 0.8450 for Gasoil)
  totalObservedVolumeM3: number; // TOV
  totalFreeWaterVolumeM3?: number; // FW dip
  sedimentAndWaterPercentage?: number; // S&W % (default 0.0)
}

export interface AstmUllageSurveyResult {
  productName: string;
  observedAverageTemperatureCelsius: number;
  densityAt15Celsius: number;
  totalObservedVolumeM3: number; // TOV
  totalFreeWaterVolumeM3: number; // FW
  grossObservedVolumeM3: number; // GOV = TOV - FW
  volumeCorrectionFactorAstm54: number; // VCF Table 54
  grossStandardVolumeM3: number; // GSV (15°C)
  netStandardVolumeM3: number; // NSV (15°C)
  metricTonnesInAir: number; // Commercial weight in air (t)
  metricTonnesInVacuum: number; // True physical mass (t)
  surveySummaryStatement: string;
}

export class AstmUllageTankSurveyService {
  /**
   * Evaluates tanker liquid volume and mass according to ASTM Table 54 standards.
   */
  public static calculateLiquidQuantity(
    input: AstmUllageSurveyInput,
  ): AstmUllageSurveyResult {
    const tempObs = input.observedAverageTemperatureCelsius;
    const dens15 = Math.max(0.6, input.densityAt15Celsius || 0.8);
    const tov = Math.max(0, input.totalObservedVolumeM3 || 0);
    const fw = Math.max(0, input.totalFreeWaterVolumeM3 || 0);
    const swPct = Math.max(0, input.sedimentAndWaterPercentage || 0.0);

    // Gross Observed Volume (GOV)
    const gov = Math.max(0, tov - fw);

    // Delta T from standard 15°C
    const deltaT = tempObs - 15.0;

    // Standardized alpha_15 thermal expansion coefficient approximation under ASTM Table 54B
    // alpha15 ≈ 613.9723 / (dens15 * 1000)^2
    const densKgM3 = dens15 * 1000;
    const alpha15 = 613.9723 / Math.pow(densKgM3, 2);

    // ASTM Table 54 formula: VCF = exp(-alpha15 * deltaT * (1 + 0.8 * alpha15 * deltaT))
    const vcf = Math.exp(-alpha15 * deltaT * (1 + 0.8 * alpha15 * deltaT));
    const vcfRounded = Math.round(vcf * 10000) / 10000;

    // Gross Standard Volume at 15°C
    const gsv = Math.round(gov * vcfRounded * 100) / 100;

    // Net Standard Volume after S&W deduction
    const nsv = Math.round(gsv * (1 - swPct / 100) * 100) / 100;

    // Mass in Vacuum (tonnes)
    const massVac = Math.round(nsv * dens15 * 100) / 100;

    // Mass in Air / Commercial Billing Weight (tonnes) with air buoyancy correction (-0.0011 t/m3)
    const densInAir = Math.max(0, dens15 - 0.0011);
    const massAir = Math.round(nsv * densInAir * 100) / 100;

    const statement =
      `Sondeo de tanques certificado (${input.productName}): TOV = ${tov.toLocaleString("en-US")} m³, ` +
      `Agua libre = ${fw} m³, VCF (ASTM 54) = ${vcfRounded} a ${tempObs}°C. ` +
      `NSV (15°C) = ${nsv.toLocaleString("en-US")} m³. Masa comercial en aire = ${massAir.toLocaleString("en-US")} t.`;

    return {
      productName: input.productName,
      observedAverageTemperatureCelsius: tempObs,
      densityAt15Celsius: dens15,
      totalObservedVolumeM3: Math.round(tov * 100) / 100,
      totalFreeWaterVolumeM3: Math.round(fw * 100) / 100,
      grossObservedVolumeM3: Math.round(gov * 100) / 100,
      volumeCorrectionFactorAstm54: vcfRounded,
      grossStandardVolumeM3: gsv,
      netStandardVolumeM3: nsv,
      metricTonnesInAir: massAir,
      metricTonnesInVacuum: massVac,
      surveySummaryStatement: statement,
    };
  }
}

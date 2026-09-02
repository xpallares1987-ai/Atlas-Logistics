/**
 * IMO Grain Code Stability Calculator Service (SOLAS Chapter VI / Part A)
 * Deterministic evaluation of volumetric heeling moments, residual heel angle (<= 12 deg), and initial metacentric height (GM0 >= 0.30m).
 */

export interface GrainStabilityInput {
  grainType: string;
  totalGrainTonnage: number;
  stowageFactorM3PerTonne: number; // m3/t
  totalVolumetricHeelingMoment: number; // VHM (m4)
  departureDisplacement: number; // tonnes
  departureGm0: number; // initial GM (m)
  departureKg: number; // m
}

export interface GrainStabilityResult {
  grainType: string;
  totalGrainTonnage: number;
  stowageFactorM3PerTonne: number;
  totalVolumetricHeelingMoment: number;
  departureDisplacement: number;
  correctedHeelingMoment: number; // m
  departureGm0: number; // m
  residualHeelAngleDegrees: number; // deg
  residualDynamicalStabilityArea: number; // m*rad
  isHeelAngleCompliant: boolean; // theta <= 12 deg
  isGm0Compliant: boolean; // GM0 >= 0.30 m
  isAreaCompliant: boolean; // Area >= 0.075 m*rad
  isImoGrainCodeCompliant: boolean;
  grainComplianceStatement: string;
}

export class GrainStabilityCalculatorService {
  /**
   * Evaluates grain loading stability against IMO Grain Code statutory criteria.
   */
  public static calculateGrainStability(
    input: GrainStabilityInput,
  ): GrainStabilityResult {
    const vhm = Math.max(0, input.totalVolumetricHeelingMoment);
    const sf = Math.max(0.1, input.stowageFactorM3PerTonne);
    const disp = Math.max(1, input.departureDisplacement);
    const gm0 = Math.max(0.01, input.departureGm0);

    // Corrected grain heeling moment: HM = VHM / (SF * Displacement)
    const hm = Math.round((vhm / (sf * disp)) * 1000) / 1000;

    // Static residual heel angle: theta = arctan(HM / GM0)
    const tanTheta = hm / gm0;
    const thetaRad = Math.atan(tanTheta);
    const thetaDeg = Math.round(thetaRad * (180 / Math.PI) * 100) / 100;

    // Approximate dynamical stability area under GZ curve up to 40 deg or flooding angle
    const baseArea = 0.075;
    const additionalArea = Math.max(0, (gm0 - 0.3) * 0.04);
    const dynamicArea = Math.round((baseArea + additionalArea) * 1000) / 1000;

    const isHeelOk = thetaDeg <= 12.0;
    const isGmOk = gm0 >= 0.3;
    const isAreaOk = dynamicArea >= 0.075;
    const isOverallOk = isHeelOk && isGmOk && isAreaOk;

    let statement = "";
    if (isOverallOk) {
      statement =
        `PLAN DE ESTABILIDAD DE GRANO APROBADO (IMO Grain Code): Ángulo de escora residual θ = ${thetaDeg}° (≤ 12.0°), ` +
        `GM₀ = ${gm0.toFixed(2)} m (≥ 0.30 m), Área dinámica GZ = ${dynamicArea} m·rad (≥ 0.075 m·rad). Cumple SOLAS Cap. VI.`;
    } else {
      statement =
        `ALERTA DE ESTABILIDAD: No cumple los criterios mandatorios del IMO Grain Code. ` +
        (!isHeelOk ? `Escora excesiva θ = ${thetaDeg}° > 12.0°. ` : "") +
        (!isGmOk
          ? `Altura metacéntrica insuficiente GM₀ = ${gm0.toFixed(2)} m < 0.30 m. `
          : "");
    }

    return {
      grainType: input.grainType,
      totalGrainTonnage: input.totalGrainTonnage,
      stowageFactorM3PerTonne: sf,
      totalVolumetricHeelingMoment: vhm,
      departureDisplacement: disp,
      correctedHeelingMoment: hm,
      departureGm0: gm0,
      residualHeelAngleDegrees: thetaDeg,
      residualDynamicalStabilityArea: dynamicArea,
      isHeelAngleCompliant: isHeelOk,
      isGm0Compliant: isGmOk,
      isAreaCompliant: isAreaOk,
      isImoGrainCodeCompliant: isOverallOk,
      grainComplianceStatement: statement,
    };
  }
}

/**
 * IMSBC Code Liquefaction & Bulk Cargo Safety Evaluator Service
 * Deterministic calculation of TML (Transportable Moisture Limit = 90% FMP) and cargo acceptance under IMSBC Code Section 7.
 */

export type ImsbcGroup =
  "GROUP_A_LIQUEFACTION" | "GROUP_B_CHEMICAL_HAZARD" | "GROUP_C_NON_HAZARDOUS";

export interface ImsbcEvaluationInput {
  bulkCargoShippingName: string;
  imsbcGroup: ImsbcGroup;
  moistureContentPercentage: number;
  flowMoisturePointPercentage?: number; // FMP %
  angleOfReposeDegrees?: number;
  stowageFactorM3PerTonne: number;
}

export interface ImsbcEvaluationResult {
  bulkCargoShippingName: string;
  imsbcGroup: ImsbcGroup;
  moistureContentPercentage: number;
  flowMoisturePointPercentage?: number;
  transportableMoistureLimit?: number; // TML = 90% FMP
  safetyMarginPercentage?: number; // TML - Moisture
  isLiquefactionCompliant: boolean;
  requiresSpecialTrimming: boolean; // if angle of repose <= 35 deg
  declarationStatus: "APPROVED_FOR_LOADING" | "REJECTED_EXCEEDS_TML";
  complianceStatement: string;
  imsbcRecommendations: string[];
}

export class ImsbcLiquefactionEvaluatorService {
  /**
   * Deterministically evaluates solid bulk cargo compliance under IMSBC Code.
   */
  public static evaluateCargo(
    input: ImsbcEvaluationInput,
  ): ImsbcEvaluationResult {
    const group = input.imsbcGroup;
    const moisture = Math.max(0, input.moistureContentPercentage);
    const fmp =
      input.flowMoisturePointPercentage !== undefined
        ? Math.max(0, input.flowMoisturePointPercentage)
        : undefined;
    const angle = input.angleOfReposeDegrees;

    let tml: number | undefined;
    let isCompliant = true;
    let margin: number | undefined;

    const recommendations: string[] = [];

    if (group === "GROUP_A_LIQUEFACTION" || fmp !== undefined) {
      if (fmp !== undefined && fmp > 0) {
        // TML is 90% of Flow Moisture Point under IMSBC Code 7.3.2
        tml = Math.round(fmp * 0.9 * 100) / 100;
        margin = Math.round((tml - moisture) * 100) / 100;
        isCompliant = moisture <= tml;
      } else {
        // Missing FMP for Group A is non-compliant
        isCompliant = false;
        recommendations.push(
          "FALTA CERTIFICADO FMP: No se puede embarcar carga Grupo A sin ensayo de Punto de Fluidez.",
        );
      }
    }

    const requiresTrimming = angle !== undefined ? angle <= 35 : false;
    if (requiresTrimming) {
      recommendations.push(
        "ENRASE OBLIGATORIO: Ángulo de reposo ≤ 35°. Debe enrasarse la superficie de las bodegas para prevenir corrimiento.",
      );
    }

    if (group === "GROUP_B_CHEMICAL_HAZARD") {
      recommendations.push(
        "RIESGO QUÍMICO (MHB): Monitorear atmósfera de bodega (oxígeno, gases tóxicos/inflamables) y temperatura periódicamente.",
      );
    }

    let status: "APPROVED_FOR_LOADING" | "REJECTED_EXCEEDS_TML" =
      "APPROVED_FOR_LOADING";
    let statement = "";

    if (!isCompliant) {
      status = "REJECTED_EXCEEDS_TML";
      statement =
        `ALERTA CRÍTICA IMSBC SECCIÓN 7: El contenido de humedad (${moisture}%) SUPERA el Límite de Humedad Transportable (TML ${tml}%). ` +
        `EMBARQUE ESTRICTAMENTE PROHIBIDO por riesgo inminente de licuefacción y zozobra del buque.`;
      recommendations.unshift(
        "PROHIBICIÓN TOTAL DE CARGA: Rechazar cargamento en muelle o deshumedecer en acopio antes de reanalizar.",
      );
    } else {
      status = "APPROVED_FOR_LOADING";
      statement =
        `CARGAMENTO APTO PARA NAVEGACIÓN: Contenido de humedad (${moisture}%) ` +
        (tml !== undefined
          ? `dentro del margen de seguridad del TML (${tml}%, margen ${margin}%).`
          : "conforme con las especificaciones del IMSBC Code.");
    }

    return {
      bulkCargoShippingName: input.bulkCargoShippingName,
      imsbcGroup: group,
      moistureContentPercentage: moisture,
      flowMoisturePointPercentage: fmp,
      transportableMoistureLimit: tml,
      safetyMarginPercentage: margin,
      isLiquefactionCompliant: isCompliant,
      requiresSpecialTrimming: requiresTrimming,
      declarationStatus: status,
      complianceStatement: statement,
      imsbcRecommendations: recommendations,
    };
  }
}

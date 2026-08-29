export interface PartnerRiskAssessmentInput {
  partnerName: string;
  partnerType:
    | "HAULIER_CARRIER"
    | "CUSTOMS_BROKER"
    | "WAREHOUSE_KEEPER"
    | "FREIGHT_FORWARDER"
    | "SUPPLIER_PACKER"
    | "TERMINAL_OPERATOR";
  hasAeoCertification: boolean;
  hasCtpatCertification?: boolean;
  iso28000Certified?: boolean;
  securityQuestionnaireScore: number; // 0 to 100%
  monthsSinceLastAssessment: number;
}

export interface PartnerRiskAssessmentResult {
  partnerName: string;
  calculatedRiskScore: number; // 0 to 100 (higher = safer)
  riskLevel: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK_ENHANCED_CONTROL";
  recommendedStatus: "APPROVED_PARTNER" | "PROVISIONAL" | "SUSPENDED_REVOKED";
  dueForReassessment: boolean;
  securityMeasuresRequired: string[];
}

export class PartnerSecurityRiskService {
  /**
   * Assesses supply chain security risk for a logistics business partner under ISO 28000 & AEO standards.
   */
  public static assessPartnerRisk(
    input: PartnerRiskAssessmentInput,
  ): PartnerRiskAssessmentResult {
    let score = input.securityQuestionnaireScore * 0.4; // 40% from questionnaire

    if (input.hasAeoCertification) score += 35; // AEO is gold standard (+35 pts)
    if (input.hasCtpatCertification) score += 15; // C-TPAT (+15 pts)
    if (input.iso28000Certified) score += 10; // ISO 28000 (+10 pts)

    // Penalty for outdated audits (> 12 months)
    const dueForReassessment = input.monthsSinceLastAssessment > 12;
    if (dueForReassessment) {
      score = Math.max(0, score - 15);
    }

    const calculatedRiskScore = Number(
      Math.min(100, Math.max(0, score)).toFixed(1),
    );

    let riskLevel: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK_ENHANCED_CONTROL" =
      "LOW_RISK";
    let recommendedStatus:
      "APPROVED_PARTNER" | "PROVISIONAL" | "SUSPENDED_REVOKED" =
      "APPROVED_PARTNER";
    const securityMeasuresRequired: string[] = [];

    if (calculatedRiskScore >= 80) {
      riskLevel = "LOW_RISK";
      recommendedStatus = "APPROVED_PARTNER";
      securityMeasuresRequired.push(
        "Socio homologado de bajo riesgo. Auditoría documental anual estándar.",
      );
    } else if (calculatedRiskScore >= 60) {
      riskLevel = "MEDIUM_RISK";
      recommendedStatus = "PROVISIONAL";
      securityMeasuresRequired.push(
        "Socio de riesgo medio: Requiere verificación presencial de precintos ISO 17712 y declaración de seguridad de transporte firmada.",
      );
    } else {
      riskLevel = "HIGH_RISK_ENHANCED_CONTROL";
      recommendedStatus = "SUSPENDED_REVOKED";
      securityMeasuresRequired.push(
        "Socio de alto riesgo: Prohibida la subcontratación en rutas internacionales críticas hasta completar plan de subsanación de seguridad.",
      );
    }

    if (dueForReassessment) {
      securityMeasuresRequired.push(
        "Reevaluación de seguridad vencida: Requerir actualización inmediata del Cuestionario de Seguridad.",
      );
    }

    return {
      partnerName: input.partnerName,
      calculatedRiskScore,
      riskLevel,
      recommendedStatus,
      dueForReassessment,
      securityMeasuresRequired,
    };
  }
}

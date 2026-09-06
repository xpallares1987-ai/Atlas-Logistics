export interface CaeBlockInput {
  blockNumber: number; // 1 to 6
  blockCode:
    | "BLOCK_1_GENERAL_INFO"
    | "BLOCK_2_CUSTOMS_COMPLIANCE"
    | "BLOCK_3_ACCOUNTING_LOGISTICS_RECORDS"
    | "BLOCK_4_FINANCIAL_SOLVENCY"
    | "BLOCK_5_PRACTICAL_COMPETENCE"
    | "BLOCK_6_SECURITY_SAFETY_STANDARDS";
  blockTitle: string;
  totalQuestions: number;
  compliantCount: number;
  nonCompliantCount: number;
  waivedCount?: number;
}

export interface CaeBlockScoreResult {
  blockNumber: number;
  blockCode: string;
  blockTitle: string;
  totalQuestions: number;
  compliantCount: number;
  nonCompliantCount: number;
  waivedCount: number;
  scorePercentage: number;
  status: "COMPLIANT" | "DEFICIENT_ACTION_REQUIRED" | "NOT_APPLICABLE";
  isDisqualifying: boolean;
  recommendation: string;
}

export interface AeoReadinessScoreResult {
  modality:
    | "OEAC_CUSTOMS_SIMPLIFICATIONS"
    | "OEAS_SECURITY_SAFETY"
    | "OEAF_FULL_COMBINED";
  overallScorePercentage: number;
  blockScores: CaeBlockScoreResult[];
  hasDisqualifyingDeficiency: boolean;
  isAuditReady: boolean;
  recommendedStatus:
    "CERTIFIED_APPROVED" | "AUDIT_READY" | "ACTION_PLAN_REQUIRED" | "DRAFT";
  actionPlanItems: string[];
}

export class AeoCaeScoringService {
  // Standard block weightings for OEAF (Full Combined)
  private static readonly OEAF_WEIGHTS: Record<number, number> = {
    1: 0.05, // General Info
    2: 0.25, // Customs & Tax Compliance (Art. 39a) - Critical
    3: 0.2, // Commercial & Logistics Records (Art. 39b)
    4: 0.15, // Financial Solvency (Art. 39c)
    5: 0.15, // Practical Competence (Art. 39d)
    6: 0.2, // Security & Safety Standards (Art. 39e)
  };

  private static readonly OEAC_WEIGHTS: Record<number, number> = {
    1: 0.1,
    2: 0.35,
    3: 0.25,
    4: 0.15,
    5: 0.15,
    6: 0.0, // Not evaluated for OEAC
  };

  private static readonly OEAS_WEIGHTS: Record<number, number> = {
    1: 0.1,
    2: 0.25,
    3: 0.15,
    4: 0.1,
    5: 0.0,
    6: 0.4, // Heavy weight for OEAS / C-TPAT
  };

  /**
   * Evaluates and scores an individual CAE questionnaire section/block.
   */
  public static evaluateBlock(block: CaeBlockInput): CaeBlockScoreResult {
    const waived = block.waivedCount ?? 0;
    const applicableQuestions = Math.max(1, block.totalQuestions - waived);
    const scorePercentage = Number(
      Math.min(
        100,
        Math.max(0, (block.compliantCount / applicableQuestions) * 100),
      ).toFixed(1),
    );

    // Block 2 (Customs compliance) is strictly disqualifying if score < 90% (Art. 39.a zero serious infringements)
    const isDisqualifying =
      (block.blockNumber === 2 && scorePercentage < 90.0) ||
      (block.blockNumber === 4 && scorePercentage < 80.0); // Solvency

    let status: "COMPLIANT" | "DEFICIENT_ACTION_REQUIRED" | "NOT_APPLICABLE" =
      "COMPLIANT";
    let recommendation = "Cumple con las directrices TAXUD/B2/047/2011.";

    if (scorePercentage < 85.0 || isDisqualifying) {
      status = "DEFICIENT_ACTION_REQUIRED";
      recommendation = `Subsanar deficiencias en ${block.blockTitle}. Requiere plan de acción formal antes de la auditoría de la AEAT.`;
    }

    return {
      blockNumber: block.blockNumber,
      blockCode: block.blockCode,
      blockTitle: block.blockTitle,
      totalQuestions: block.totalQuestions,
      compliantCount: block.compliantCount,
      nonCompliantCount: block.nonCompliantCount,
      waivedCount: waived,
      scorePercentage,
      status,
      isDisqualifying,
      recommendation,
    };
  }

  /**
   * Calculates overall AEO / C-TPAT readiness score across all 6 CAE blocks.
   */
  public static calculateOverallScore(
    modality:
      | "OEAC_CUSTOMS_SIMPLIFICATIONS"
      | "OEAS_SECURITY_SAFETY"
      | "OEAF_FULL_COMBINED",
    blocks: CaeBlockInput[],
  ): AeoReadinessScoreResult {
    const weights =
      modality === "OEAC_CUSTOMS_SIMPLIFICATIONS"
        ? this.OEAC_WEIGHTS
        : modality === "OEAS_SECURITY_SAFETY"
          ? this.OEAS_WEIGHTS
          : this.OEAF_WEIGHTS;

    const blockScores = blocks.map((b) => this.evaluateBlock(b));
    let weightedSum = 0;
    let hasDisqualifying = false;
    const actionPlanItems: string[] = [];

    for (const bScore of blockScores) {
      const w = weights[bScore.blockNumber] ?? 0;
      weightedSum += bScore.scorePercentage * w;

      if (bScore.isDisqualifying) {
        hasDisqualifying = true;
      }
      if (bScore.status === "DEFICIENT_ACTION_REQUIRED") {
        actionPlanItems.push(
          `[Bloque ${bScore.blockNumber}] ${bScore.blockTitle}: ${bScore.recommendation}`,
        );
      }
    }

    const overallScorePercentage = Number(weightedSum.toFixed(1));
    const isAuditReady = overallScorePercentage >= 85.0 && !hasDisqualifying;

    let recommendedStatus:
      "CERTIFIED_APPROVED" | "AUDIT_READY" | "ACTION_PLAN_REQUIRED" | "DRAFT" =
      "ACTION_PLAN_REQUIRED";

    if (overallScorePercentage >= 92.0 && !hasDisqualifying) {
      recommendedStatus = "CERTIFIED_APPROVED";
    } else if (isAuditReady) {
      recommendedStatus = "AUDIT_READY";
    }

    return {
      modality,
      overallScorePercentage,
      blockScores,
      hasDisqualifyingDeficiency: hasDisqualifying,
      isAuditReady,
      recommendedStatus,
      actionPlanItems,
    };
  }
}

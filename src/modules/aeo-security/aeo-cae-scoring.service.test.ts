import { describe, it, expect } from "vitest";
import {
  AeoCaeScoringService,
  CaeBlockInput,
} from "./aeo-cae-scoring.service.js";

describe("AeoCaeScoringService", () => {
  const compliantBlocks: CaeBlockInput[] = [
    {
      blockNumber: 1,
      blockCode: "BLOCK_1_GENERAL_INFO",
      blockTitle: "Bloque 1: Información General",
      totalQuestions: 8,
      compliantCount: 8,
      nonCompliantCount: 0,
    },
    {
      blockNumber: 2,
      blockCode: "BLOCK_2_CUSTOMS_COMPLIANCE",
      blockTitle: "Bloque 2: Historial Aduanero (Art. 39.a)",
      totalQuestions: 10,
      compliantCount: 10,
      nonCompliantCount: 0,
    },
    {
      blockNumber: 3,
      blockCode: "BLOCK_3_ACCOUNTING_LOGISTICS_RECORDS",
      blockTitle: "Bloque 3: Registros Comerciales (Art. 39.b)",
      totalQuestions: 12,
      compliantCount: 11,
      nonCompliantCount: 1,
    },
    {
      blockNumber: 4,
      blockCode: "BLOCK_4_FINANCIAL_SOLVENCY",
      blockTitle: "Bloque 4: Solvencia Financiera (Art. 39.c)",
      totalQuestions: 6,
      compliantCount: 6,
      nonCompliantCount: 0,
    },
    {
      blockNumber: 5,
      blockCode: "BLOCK_5_PRACTICAL_COMPETENCE",
      blockTitle: "Bloque 5: Competencia Profesional (Art. 39.d)",
      totalQuestions: 8,
      compliantCount: 8,
      nonCompliantCount: 0,
    },
    {
      blockNumber: 6,
      blockCode: "BLOCK_6_SECURITY_SAFETY_STANDARDS",
      blockTitle: "Bloque 6: Seguridad y Protección (Art. 39.e)",
      totalQuestions: 15,
      compliantCount: 14,
      nonCompliantCount: 1,
    },
  ];

  it("should calculate high overall readiness score and approve full OEAF audit", () => {
    const result = AeoCaeScoringService.calculateOverallScore(
      "OEAF_FULL_COMBINED",
      compliantBlocks,
    );

    expect(result.overallScorePercentage).toBeGreaterThanOrEqual(90.0);
    expect(result.isAuditReady).toBe(true);
    expect(result.hasDisqualifyingDeficiency).toBe(false);
    expect(result.recommendedStatus).toBe("CERTIFIED_APPROVED");
  });

  it("should flag disqualifying deficiency if Block 2 (Customs compliance) score < 90%", () => {
    const deficientBlocks: CaeBlockInput[] = [
      ...compliantBlocks.slice(0, 1),
      {
        blockNumber: 2,
        blockCode: "BLOCK_2_CUSTOMS_COMPLIANCE",
        blockTitle: "Bloque 2: Historial Aduanero (Art. 39.a)",
        totalQuestions: 10,
        compliantCount: 7, // 70% < 90%
        nonCompliantCount: 3,
      },
      ...compliantBlocks.slice(2),
    ];

    const result = AeoCaeScoringService.calculateOverallScore(
      "OEAF_FULL_COMBINED",
      deficientBlocks,
    );

    expect(result.hasDisqualifyingDeficiency).toBe(true);
    expect(result.isAuditReady).toBe(false);
    expect(result.recommendedStatus).toBe("ACTION_PLAN_REQUIRED");
    expect(result.actionPlanItems.length).toBeGreaterThan(0);
  });
});

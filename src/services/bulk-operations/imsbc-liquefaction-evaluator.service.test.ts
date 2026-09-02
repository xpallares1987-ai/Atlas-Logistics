import { describe, it, expect } from "vitest";
import { ImsbcLiquefactionEvaluatorService } from "./imsbc-liquefaction-evaluator.service.js";

describe("ImsbcLiquefactionEvaluatorService (IMSBC Liquefaction & TML)", () => {
  it("should approve compliant Group A cargo with moisture below TML", () => {
    // Iron ore concentrate: FMP = 11.0% -> TML = 9.9%
    // Actual moisture = 8.5% -> Safe margin = +1.4%
    const res = ImsbcLiquefactionEvaluatorService.evaluateCargo({
      bulkCargoShippingName: "IRON ORE CONCENTRATE",
      imsbcGroup: "GROUP_A_LIQUEFACTION",
      flowMoisturePointPercentage: 11.0,
      moistureContentPercentage: 8.5,
      stowageFactorM3PerTonne: 0.45,
      angleOfReposeDegrees: 40,
    });

    expect(res.transportableMoistureLimit).toBe(9.9);
    expect(res.safetyMarginPercentage).toBe(1.4);
    expect(res.isLiquefactionCompliant).toBe(true);
    expect(res.declarationStatus).toBe("APPROVED_FOR_LOADING");
    expect(res.complianceStatement).toContain("CARGAMENTO APTO");
  });

  it("should strictly reject Group A cargo exceeding TML threshold", () => {
    // Copper concentrate: FMP = 10.0% -> TML = 9.0%
    // Actual moisture = 10.2% -> Exceeds TML
    const res = ImsbcLiquefactionEvaluatorService.evaluateCargo({
      bulkCargoShippingName: "COPPER CONCENTRATE",
      imsbcGroup: "GROUP_A_LIQUEFACTION",
      flowMoisturePointPercentage: 10.0,
      moistureContentPercentage: 10.2,
      stowageFactorM3PerTonne: 0.52,
    });

    expect(res.transportableMoistureLimit).toBe(9.0);
    expect(res.isLiquefactionCompliant).toBe(false);
    expect(res.declarationStatus).toBe("REJECTED_EXCEEDS_TML");
    expect(res.complianceStatement).toContain("ALERTA CRÍTICA IMSBC");
  });

  it("should identify special trimming requirement for non-cohesive bulk with angle <= 35 deg", () => {
    const res = ImsbcLiquefactionEvaluatorService.evaluateCargo({
      bulkCargoShippingName: "GRAIN BY-PRODUCTS / PELLET",
      imsbcGroup: "GROUP_C_NON_HAZARDOUS",
      moistureContentPercentage: 11.0,
      stowageFactorM3PerTonne: 1.45,
      angleOfReposeDegrees: 32,
    });

    expect(res.requiresSpecialTrimming).toBe(true);
    expect(
      res.imsbcRecommendations.some((r) => r.includes("ENRASE OBLIGATORIO")),
    ).toBe(true);
  });
});

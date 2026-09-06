import { describe, it, expect } from "vitest";
import { DraftSurveyCalculatorService } from "./draft-survey-calculator.service.js";

describe("DraftSurveyCalculatorService (Hydrostatic Drafts & Displacement)", () => {
  it("should calculate initial survey displacement and trim corrections", () => {
    // Initial survey (ballast condition)
    // FP: 4.20m, FS: 4.22m (Fm: 4.21m)
    // AP: 6.80m, AS: 6.84m (Am: 6.82m) -> Trim: +2.61m by stern
    // MP: 5.48m, MS: 5.52m (Mm: 5.50m)
    // LBP: 220m, LCF: -3.5m, TPC: 65 t/cm, MTC: 850 t*m/cm
    // Hydro Disp: 28,500 t, Measured density: 1.020 t/m3
    // Ballast: 12,000t, Fuel: 1,500t, Diesel: 200t, FW: 300t -> Deductibles: 14,000t
    const res = DraftSurveyCalculatorService.calculateDraftSurvey({
      forwardDraftPort: 4.2,
      forwardDraftStarboard: 4.22,
      aftDraftPort: 6.8,
      aftDraftStarboard: 6.84,
      midDraftPort: 5.48,
      midDraftStarboard: 5.52,
      lengthBetweenPerpendiculars: 220,
      longitudinalCenterOfFlotation: -3.5,
      tonnesPerCmImmersion: 65,
      momentToChangeTrim1Cm: 850,
      measuredWaterDensity: 1.02,
      hydrostaticDisplacement: 28500,
      ballastWaterDeductible: 12000,
      fuelOilDeductible: 1500,
      dieselOilDeductible: 200,
      freshWaterDeductible: 300,
    });

    expect(res.forwardMeanDraft).toBe(4.21);
    expect(res.aftMeanDraft).toBe(6.82);
    expect(res.midMeanDraft).toBe(5.5);
    expect(res.apparentTrim).toBe(2.61);
    expect(res.quarterMeanDraft).toBeCloseTo(5.501, 2);
    expect(res.totalDeductibles).toBe(14000);
    expect(res.densityCorrectionFactor).toBeCloseTo(0.9951, 3);
    expect(res.correctedDisplacement).toBeLessThan(28500);
    expect(res.netDisplacement).toBeGreaterThan(13000);
  });

  it("should calculate final survey net cargo tonnage loaded", () => {
    // Initial net displacement (Lightship): 13,800 tonnes
    // Final loaded survey: Corrected Disp = 78,500 tonnes, Deductibles (Fuel/FW) = 1,700 tonnes
    // Final Net Disp: 76,800 tonnes
    // Net Cargo: 76,800 - 13,800 = 63,000 tonnes
    const res = DraftSurveyCalculatorService.calculateDraftSurvey({
      forwardDraftPort: 12.4,
      forwardDraftStarboard: 12.44,
      aftDraftPort: 12.8,
      aftDraftStarboard: 12.82,
      midDraftPort: 12.6,
      midDraftStarboard: 12.64,
      lengthBetweenPerpendiculars: 220,
      longitudinalCenterOfFlotation: -0.5,
      tonnesPerCmImmersion: 72,
      momentToChangeTrim1Cm: 920,
      measuredWaterDensity: 1.025,
      hydrostaticDisplacement: 78500,
      fuelOilDeductible: 1400,
      dieselOilDeductible: 180,
      freshWaterDeductible: 120,
      initialNetDisplacement: 13800,
    });

    expect(res.apparentTrim).toBe(0.39);
    expect(res.totalDeductibles).toBe(1700);
    expect(res.calculatedCargoTonnage).toBeCloseTo(63000, -2);
  });
});

import { describe, it, expect } from "vitest";
import { GrainStabilityCalculatorService } from "./grain-stability-calculator.service.js";

describe("GrainStabilityCalculatorService (IMO Grain Code Stability)", () => {
  it("should approve compliant grain loading condition with heel <= 12 deg and GM0 >= 0.30m", () => {
    // Wheat cargo: 65,000 tonnes, SF = 1.35 m3/t
    // Departure displacement: 82,000 tonnes
    // Total VHM: 12,500 m4
    // GM0 = 1.15 m
    // Corrected HM: 12,500 / (1.35 * 82,000) = 0.1129 m
    // tan(theta) = 0.1129 / 1.15 = 0.0982 -> theta = ~5.6°
    const res = GrainStabilityCalculatorService.calculateGrainStability({
      grainType: "WHEAT",
      totalGrainTonnage: 65000,
      stowageFactorM3PerTonne: 1.35,
      totalVolumetricHeelingMoment: 12500,
      departureDisplacement: 82000,
      departureGm0: 1.15,
      departureKg: 9.8,
    });

    expect(res.correctedHeelingMoment).toBeCloseTo(0.113, 2);
    expect(res.residualHeelAngleDegrees).toBeLessThan(12.0);
    expect(res.isHeelAngleCompliant).toBe(true);
    expect(res.isGm0Compliant).toBe(true);
    expect(res.isImoGrainCodeCompliant).toBe(true);
    expect(res.grainComplianceStatement).toContain("APROBADO");
  });

  it("should detect stability failure when GM0 is below 0.30m", () => {
    const res = GrainStabilityCalculatorService.calculateGrainStability({
      grainType: "BARLEY",
      totalGrainTonnage: 40000,
      stowageFactorM3PerTonne: 1.45,
      totalVolumetricHeelingMoment: 18000,
      departureDisplacement: 55000,
      departureGm0: 0.22, // Insufficient GM
      departureKg: 10.5,
    });

    expect(res.isGm0Compliant).toBe(false);
    expect(res.isImoGrainCodeCompliant).toBe(false);
    expect(res.grainComplianceStatement).toContain("ALERTA DE ESTABILIDAD");
  });
});

import { describe, it, expect } from "vitest";
import { AstmUllageTankSurveyService } from "./astm-ullage-tank-survey.service.js";

describe("AstmUllageTankSurveyService (ASTM Table 54 Petroleum Volume Correction)", () => {
  it("should calculate NSV and commercial mass in air for Jet A-1 cargo", () => {
    // Jet A-1: TOV = 44,000 m3, Free Water = 20 m3 -> GOV = 43,980 m3
    // Observed Temp = 22.0°C (Delta T = +7.0°C)
    // Density @ 15°C = 0.7985 t/m3
    // VCF Table 54B < 1.0 (thermal expansion at higher temp)
    const res = AstmUllageTankSurveyService.calculateLiquidQuantity({
      productName: "AVIATION FUEL JET A-1",
      observedAverageTemperatureCelsius: 22.0,
      densityAt15Celsius: 0.7985,
      totalObservedVolumeM3: 44000,
      totalFreeWaterVolumeM3: 20,
    });

    expect(res.grossObservedVolumeM3).toBe(43980);
    expect(res.volumeCorrectionFactorAstm54).toBeLessThan(1.0);
    expect(res.netStandardVolumeM3).toBeLessThan(43980);
    expect(res.metricTonnesInAir).toBeGreaterThan(34000);
    expect(res.metricTonnesInVacuum).toBeGreaterThan(res.metricTonnesInAir);
    expect(res.surveySummaryStatement).toContain(
      "Sondeo de tanques certificado",
    );
  });

  it("should adjust VCF above 1.0 when observed temp is below 15°C", () => {
    // Winter discharge: Temp = 8.0°C (Delta T = -7.0°C)
    const res = AstmUllageTankSurveyService.calculateLiquidQuantity({
      productName: "ULSD DIESEL 10PPM",
      observedAverageTemperatureCelsius: 8.0,
      densityAt15Celsius: 0.845,
      totalObservedVolumeM3: 20000,
      totalFreeWaterVolumeM3: 0,
    });

    expect(res.volumeCorrectionFactorAstm54).toBeGreaterThan(1.0);
    expect(res.netStandardVolumeM3).toBeGreaterThan(20000);
  });
});

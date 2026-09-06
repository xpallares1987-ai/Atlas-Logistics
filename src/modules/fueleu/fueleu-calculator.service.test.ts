import { describe, it, expect } from "vitest";
import {
  FuelEuCalculatorService,
  FuelConsumptionItem,
} from "./fueleu-calculator.service.js";

describe("FuelEuCalculatorService (Regulation (EU) 2023/1805)", () => {
  it("should calculate target GHG intensity for years across regulatory trajectory", () => {
    expect(FuelEuCalculatorService.getTargetGhgIntensityForYear(2024)).toBe(
      91.16,
    );
    expect(FuelEuCalculatorService.getTargetGhgIntensityForYear(2025)).toBe(
      89.3368,
    ); // -2%
    expect(FuelEuCalculatorService.getTargetGhgIntensityForYear(2030)).toBe(
      85.6904,
    ); // -6%
    expect(FuelEuCalculatorService.getTargetGhgIntensityForYear(2035)).toBe(
      77.9418,
    ); // -14.5%
    expect(FuelEuCalculatorService.getTargetGhgIntensityForYear(2050)).toBe(
      18.232,
    ); // -80%
  });

  it("should calculate Well-to-Wake GHG intensity for a single fuel (VLSFO)", () => {
    const consumption: FuelConsumptionItem[] = [
      {
        fuelCode: "FOSSIL_VLSFO",
        consumedTonnes: 100.0,
        lowerCalorificValueMjPerGram: 0.041, // 41,000 MJ/t
        wtwFactorGco2eqPerMj: 91.16,
      },
    ];

    const result = FuelEuCalculatorService.calculateGhgIntensity(
      consumption,
      0,
    );

    expect(result.totalFuelMassTonnes).toBe(100.0);
    expect(result.totalFuelEnergyMj).toBe(4_100_000);
    expect(result.calculatedGhgIntensityGco2eqPerMj).toBe(91.16);
  });

  it("should calculate Well-to-Wake GHG intensity for dual-fuel E-Methanol + OPS electricity", () => {
    const consumption: FuelConsumptionItem[] = [
      {
        fuelCode: "E_METHANOL_RFNBO",
        consumedTonnes: 100.0,
        lowerCalorificValueMjPerGram: 0.0199, // 19,900 MJ/t => 1,990,000 MJ
        wtwFactorGco2eqPerMj: 5.2,
      },
    ];
    const opsKwh = 10000; // 36,000 MJ @ 28.0 gCO2eq/MJ

    const result = FuelEuCalculatorService.calculateGhgIntensity(
      consumption,
      opsKwh,
    );

    expect(result.totalFuelEnergyMj).toBe(1_990_000);
    expect(result.opsElectricityEnergyMj).toBe(36_000);
    expect(result.totalEnergyConsumedMj).toBe(2_026_000);
    // Weighted avg: (1,990,000 * 5.2 + 36,000 * 28.0) / 2,026,000 = (10,348,000 + 1,008,000) / 2,026,000 = 11,356,000 / 2,026,000 ≈ 5.6051
    expect(result.calculatedGhgIntensityGco2eqPerMj).toBeCloseTo(5.6051, 2);
  });

  it("should compute Compliance Balance (CB) and zero penalty when in surplus", () => {
    // E-Methanol vessel in 2025: Actual = 5.72 g/MJ vs Target = 89.3368 g/MJ
    const totalEnergyMj = 2_848_000;
    const result = FuelEuCalculatorService.calculateComplianceBalance(
      2025,
      5.72,
      totalEnergyMj,
    );

    expect(result.isCompliant).toBe(true);
    expect(result.complianceStatus).toBe("SURPLUS");
    expect(result.complianceBalanceGco2eq).toBeGreaterThan(0);
    expect(result.fuelEuPenaltyEur).toBe(0.0);
  });

  it("should compute Compliance Balance (CB) and statutory penalty when in deficit", () => {
    // VLSFO vessel in 2025: Actual = 91.16 g/MJ vs Target = 89.3368 g/MJ (Deficit: -1.8232 g/MJ)
    const totalEnergyMj = 10_000_000;
    const result = FuelEuCalculatorService.calculateComplianceBalance(
      2025,
      91.16,
      totalEnergyMj,
    );

    expect(result.isCompliant).toBe(false);
    expect(result.complianceStatus).toBe("DEFICIT");
    expect(result.complianceBalanceGco2eq).toBeCloseTo(-18_232_000, 0);
    // Penalty calculation:
    // (|18,232,000| / 91.16) / 41,000 * 2,400 = (200,000 / 41,000) * 2,400 = 4.87804878 * 2,400 = 11,707.32 €
    expect(result.fuelEuPenaltyEur).toBeCloseTo(11707.32, 1);
  });

  it("should calculate OPS berth non-compliance penalty correctly", () => {
    const opsResult = FuelEuCalculatorService.calculateOpsPenalty(20, 800, 1.5);
    expect(opsResult.totalKwhShortfall).toBe(16000);
    expect(opsResult.penaltyEur).toBe(24000);
  });

  it("should evaluate fleet compliance pool neutralizing penalties across green and conventional vessels", () => {
    const fleetVessels = [
      {
        vesselId: "ves_green",
        vesselName: "Iberian Voyager (Methanol)",
        complianceBalanceGco2eq: 238_000_000, // +238 t CO2eq surplus
      },
      {
        vesselId: "ves_fossil",
        vesselName: "Atlas Mediterranean (VLSFO)",
        complianceBalanceGco2eq: -33_000_000, // -33 t CO2eq deficit
      },
    ];

    const poolResult = FuelEuCalculatorService.evaluatePoolBalance(
      "POOL-TEST-01",
      fleetVessels,
    );

    expect(poolResult.isPoolCompliant).toBe(true);
    expect(poolResult.consolidatedNetBalanceGco2eq).toBe(205_000_000);
    expect(poolResult.totalResidualPenaltyEur).toBe(0.0);
    expect(poolResult.reallocationNotes).toContain("neutralizadas a 0,00 €");
  });

  it("should calculate borrowing penalty with 1.10 surcharge factor", () => {
    const borrowing = FuelEuCalculatorService.evaluateBorrowing(-10_000_000);
    expect(borrowing.borrowedPrincipalGco2eq).toBe(10_000_000);
    expect(borrowing.totalNextYearObligationGco2eq).toBe(11_000_000);
  });
});

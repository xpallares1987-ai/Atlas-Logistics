import { describe, it, expect } from "vitest";
import {
  CbamCalculatorService,
  CbamEmissionInput,
} from "./cbam-calculator.service.js";

describe("CbamCalculatorService (Embedded Emissions & Precursors)", () => {
  it("should calculate simple direct and indirect emissions accurately", () => {
    const input: CbamEmissionInput = {
      netWeightTonnes: 1000.0,
      directEmissionFactor: 1.85,
      indirectEmissionFactor: 0.42,
    };

    const result = CbamCalculatorService.calculateEmbeddedEmissions(input);
    expect(result.directEmissionsTco2e).toBe(1850.0);
    expect(result.indirectEmissionsTco2e).toBe(420.0);
    expect(result.precursorEmissionsTco2e).toBe(0.0);
    expect(result.totalEmbeddedEmissionsTco2e).toBe(2270.0);
    expect(result.totalSpecificFactor).toBe(2.27);
  });

  it("should incorporate precursor embedded emissions for complex goods", () => {
    const input: CbamEmissionInput = {
      netWeightTonnes: 500.0,
      directEmissionFactor: 0.8,
      indirectEmissionFactor: 0.2,
      precursors: [
        {
          cnCode: "7207 11 00",
          description: "Palanquillas de acero sin alear",
          consumptionPerTonneProduct: 1.05, // 1.05 t precursor / t product
          embeddedDirectFactor: 1.6,
          embeddedIndirectFactor: 0.3, // Total 1.9 tCO2e / t
        },
      ],
    };

    // Precursor specific factor = 1.05 * 1.9 = 1.995 tCO2e / t
    // Total specific factor = 0.8 + 0.2 + 1.995 = 2.995 tCO2e / t
    // Total emissions = 500 * 2.995 = 1497.5 tCO2e
    const result = CbamCalculatorService.calculateEmbeddedEmissions(input);
    expect(result.directEmissionsTco2e).toBe(400.0);
    expect(result.indirectEmissionsTco2e).toBe(100.0);
    expect(result.precursorEmissionsTco2e).toBe(997.5);
    expect(result.totalEmbeddedEmissionsTco2e).toBe(1497.5);
    expect(result.totalSpecificFactor).toBe(2.995);
  });

  it("should compute savings vs EU default factors", () => {
    const input: CbamEmissionInput = {
      netWeightTonnes: 1000.0,
      directEmissionFactor: 1.5,
      indirectEmissionFactor: 0.3,
      euDefaultDirectFactor: 2.0,
      euDefaultIndirectFactor: 0.5, // Default total = 2.5 tCO2e / t (2500 tCO2e)
    };

    const result = CbamCalculatorService.calculateEmbeddedEmissions(input);
    expect(result.totalEmbeddedEmissionsTco2e).toBe(1800.0);
    expect(result.comparisonWithEuDefaults?.euDefaultTotalTco2e).toBe(2500.0);
    expect(result.comparisonWithEuDefaults?.deltaTco2e).toBe(-700.0);
    expect(result.comparisonWithEuDefaults?.percentageSavingsVsDefault).toBe(
      28.0,
    );
  });
});

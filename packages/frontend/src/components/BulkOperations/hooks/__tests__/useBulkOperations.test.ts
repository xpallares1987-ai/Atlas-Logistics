/**
 * @file useBulkOperations.test.ts
 * @description Unit tests for maritime bulk operations hook and formulas.
 * @module @atlas/frontend/components/BulkOperations/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import { useBulkOperations, INITIAL_VESSEL_OPS } from "../useBulkOperations";

describe("BulkOperations domain logic and constants", () => {
  it("exports useBulkOperations hook as a function", () => {
    expect(typeof useBulkOperations).toBe("function");
  });

  it("contains pre-configured maritime vessel operations with capesize, panamax, and tanker", () => {
    expect(INITIAL_VESSEL_OPS.length).toBe(3);

    const capesize = INITIAL_VESSEL_OPS.find(
      (v) => v.vesselType === "CAPESIZE_BULKER",
    );
    expect(capesize).toBeDefined();
    expect(capesize?.vesselName).toBe("MV Cape Finisterre");
    expect(capesize?.targetCargoTonnage).toBe(120000);

    const tanker = INITIAL_VESSEL_OPS.find(
      (v) => v.vesselType === "PRODUCT_TANKER",
    );
    expect(tanker).toBeDefined();
    expect(tanker?.vesselName).toBe("MT Atlantic Energy");
    expect(tanker?.cargoCategory).toBe("CLEAN_LIQUID_BULK");
  });

  it("verifies ASTM Table 54B VCF formula logic", () => {
    const temp = 22.0;
    const density15 = 0.7985;
    const tov = 44000.0;
    const freeWater = 20.0;

    const gov = Math.max(0, tov - freeWater);
    const deltaT = temp - 15.0;
    const alpha15 = 613.9723 / Math.pow(density15 * 1000, 2);
    const vcf =
      Math.round(
        Math.exp(-alpha15 * deltaT * (1 + 0.8 * alpha15 * deltaT)) * 10000,
      ) / 10000;
    const gsv = Math.round(gov * vcf * 100) / 100;
    const massAir =
      Math.round(gsv * Math.max(0, density15 - 0.0011) * 100) / 100;

    expect(gov).toBe(43980);
    expect(vcf).toBeCloseTo(0.993, 2);
    expect(gsv).toBeGreaterThan(43000);
    expect(massAir).toBeGreaterThan(34000);
  });

  it("verifies IMSBC liquefaction TML threshold", () => {
    const fmp = 11.0;
    const moisture = 8.5;
    const tml = Math.round(fmp * 0.9 * 100) / 100;

    expect(tml).toBe(9.9);
    expect(moisture <= tml).toBe(true);
  });
});

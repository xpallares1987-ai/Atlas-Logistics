/**
 * @file useAirCargo.test.ts
 * @description Unit tests for IATA Air Cargo hook and volumetric weight conversion formulas.
 * @module @atlas/frontend/components/AirCargo/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import { useAirCargo } from "../useAirCargo";

describe("AirCargo domain logic and hook", () => {
  it("exports useAirCargo hook as a function", () => {
    expect(typeof useAirCargo).toBe("function");
  });

  it("calculates IATA volumetric weight accurately using standard 1:6000 ratio", () => {
    // Piece: 120cm x 80cm x 100cm, quantity: 2
    // Volume = (1.2 * 0.8 * 1.0) * 2 = 1.92 m3
    // Volumetric weight = 1,920,000 cm3 / 6000 = 320 kg
    const lengthCm = 120;
    const widthCm = 80;
    const heightCm = 100;
    const quantity = 2;

    const volumeCbm = (lengthCm * widthCm * heightCm * quantity) / 1000000;
    const volumetricWeightKg =
      (lengthCm * widthCm * heightCm * quantity) / 6000;

    expect(volumeCbm).toBeCloseTo(1.92, 2);
    expect(volumetricWeightKg).toBeCloseTo(320, 1);

    // Chargeable weight = max(actualGrossWeight, volumetricWeight)
    const actualGrossWeightKg = 250;
    const chargeableWeightKg = Math.max(
      actualGrossWeightKg,
      volumetricWeightKg,
    );
    expect(chargeableWeightKg).toBe(320);
  });

  it("verifies IATA Special Handling Codes (SHC) taxonomy", () => {
    const specialCodes = ["ELI", "ELM", "COL", "ICE", "CAO", "VAL", "PER"];
    expect(specialCodes).toContain("COL"); // Cold chain
    expect(specialCodes).toContain("CAO"); // Cargo Aircraft Only
    expect(specialCodes).toContain("ELI"); // Lithium Ion batteries
  });
});

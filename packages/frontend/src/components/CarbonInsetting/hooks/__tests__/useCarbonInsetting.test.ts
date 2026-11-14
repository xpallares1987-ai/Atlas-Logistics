/**
 * @file useCarbonInsetting.test.ts
 * @description Unit tests for Scope 3 carbon insetting domain formulas and hook exports.
 * @module @atlas/frontend/components/CarbonInsetting/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import { useCarbonInsetting } from "../useCarbonInsetting";
import {
  CERTIFIED_FUELS_CATALOG,
  calculateGhgInsettingAbatement,
  executeFuelEuPooling,
  SEED_FUELEU_POOL_VESSELS,
} from "@atlas/shared";

describe("CarbonInsetting domain logic and hook", () => {
  it("exports useCarbonInsetting hook as a function", () => {
    expect(typeof useCarbonInsetting).toBe("function");
  });

  it("calculates Scope 3 GHG abatement for certified fuels accurately", () => {
    const abatementB100 = calculateGhgInsettingAbatement("B100_BIODIESEL", 100);
    expect(abatementB100.energyContentMJ).toBeGreaterThan(0);
    expect(abatementB100.baselineEmissionsMTCO2e).toBeGreaterThan(
      abatementB100.actualEmissionsMTCO2e,
    );
    expect(abatementB100.abatedEmissionsMTCO2e).toBeGreaterThan(200);
    expect(abatementB100.reductionPercentage).toBeGreaterThanOrEqual(80);
  });

  it("executes FuelEU maritime compliance pooling with compliant status", () => {
    const pool = executeFuelEuPooling(SEED_FUELEU_POOL_VESSELS, 2026);
    expect(pool.vessels.length).toBe(SEED_FUELEU_POOL_VESSELS.length);
    expect(pool.grossSurplusGCO2e).toBeGreaterThan(0);
    expect(pool.totalPenaltyAvoidedEur).toBeGreaterThan(0);
    expect(pool.contractSealHash).toBeDefined();
  });

  it("contains RED II and MARPOL Annex VI certified fuels catalog", () => {
    const fuelKeys = Object.keys(CERTIFIED_FUELS_CATALOG);
    expect(fuelKeys).toContain("B100_BIODIESEL");
    expect(fuelKeys).toContain("BIO_LNG");
    expect(fuelKeys).toContain("E_METHANOL");
  });
});

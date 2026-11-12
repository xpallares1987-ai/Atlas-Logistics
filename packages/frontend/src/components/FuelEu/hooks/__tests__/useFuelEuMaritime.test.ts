/**
 * @file useFuelEuMaritime.test.ts
 * @description Unit tests for FuelEU Maritime KPI aggregation helper.
 * @module @atlas/frontend/components/FuelEu/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import { computeVoyageKpis } from "../useFuelEuMaritime";

describe("computeVoyageKpis", () => {
  it("returns zeroes when voyage list is empty", () => {
    const res = computeVoyageKpis([]);
    expect(res.totalEtsEmissionsSum).toBe(0);
    expect(res.totalFuelEnergySum).toBe(0);
    expect(res.avgGhgIntensity).toBe(0);
  });

  it("aggregates ETS emissions, energy, and average GHG intensity across voyages", () => {
    const voyages = [
      {
        etsApplicableScopeEmissionsTco2eq: 120.5,
        totalEnergyConsumedMj: 10_000_000,
        calculatedGhgIntensityGco2eqPerMj: 85.0,
      },
      {
        etsApplicableScopeEmissionsTco2eq: 79.5,
        totalEnergyConsumedMj: 15_000_000,
        calculatedGhgIntensityGco2eqPerMj: 91.0,
      },
    ];
    const res = computeVoyageKpis(voyages);
    expect(res.totalEtsEmissionsSum).toBeCloseTo(200.0);
    expect(res.totalFuelEnergySum).toBe(25_000_000);
    expect(res.avgGhgIntensity).toBeCloseTo(88.0);
  });
});

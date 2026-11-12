/**
 * @file useCarbonEmissions.test.ts
 * @description Unit tests for Scope 3 Carbon Footprint helpers (toNumber, toFixed).
 * @module @atlas/frontend/components/CarbonEmissions/hooks/__tests__
 */

import { describe, expect, it } from "vitest";
import { toFixed, toNumber } from "../useCarbonEmissions";

describe("useCarbonEmissions numeric helpers", () => {
  it("converts valid numbers and strings accurately in toNumber", () => {
    expect(toNumber(12.345)).toBe(12.345);
    expect(toNumber("42.5")).toBe(42.5);
    expect(toNumber(undefined, 7)).toBe(7);
    expect(toNumber("invalid", 3)).toBe(3);
  });

  it("formats numbers to fixed decimal places safely in toFixed", () => {
    expect(toFixed(15.6789, 2)).toBe("15.68");
    expect(toFixed(undefined, 3)).toBe("0.000");
  });
});

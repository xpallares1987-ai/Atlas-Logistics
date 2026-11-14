/**
 * @file useCustomsClearance.test.ts
 * @description Unit tests for useCustomsClearance hook and channel visual classifiers.
 * @module @atlas/frontend/components/CustomsClearance/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import { useCustomsClearance, getStatusVisuals } from "../useCustomsClearance";

describe("useCustomsClearance & getStatusVisuals", () => {
  it("exports useCustomsClearance hook as a function", () => {
    expect(typeof useCustomsClearance).toBe("function");
  });

  it("returns correct visuals for Green Channel (Levante Inmediato)", () => {
    const visuals = getStatusVisuals("Green Channel");
    expect(visuals.label).toBe("Canal Verde (Levante Inmediato)");
    expect(visuals.color).toContain("emerald");
  });

  it("returns correct visuals for Red Channel (Inspección Física)", () => {
    const visuals = getStatusVisuals("Red Channel");
    expect(visuals.label).toBe("Canal Rojo (Inspección Física)");
    expect(visuals.color).toContain("rose");
  });

  it("returns correct visuals for Orange Channel (Control Documental)", () => {
    const visuals = getStatusVisuals("Orange Channel");
    expect(visuals.label).toBe("Canal Naranja (Control Documental)");
    expect(visuals.color).toContain("amber");
  });
});

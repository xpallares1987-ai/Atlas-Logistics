/**
 * @file useCbam.test.ts
 * @description Unit tests for CBAM status badge formatting helpers.
 * @module @atlas/frontend/components/Cbam/hooks/__tests__/useCbam.test
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { describe, it, expect } from "vitest";
import { formatCbamStatusBadge } from "../useCbam";

describe("useCbam helpers", () => {
  it("formats SUBMITTED_REGISTRY to REGISTRADO UE emerald badge", () => {
    const badge = formatCbamStatusBadge("SUBMITTED_REGISTRY");
    expect(badge.label).toBe("REGISTRADO UE");
    expect(badge.className).toContain("text-emerald-300");
  });

  it("formats VALIDATED to VALIDADO blue badge", () => {
    const badge = formatCbamStatusBadge("VALIDATED");
    expect(badge.label).toBe("VALIDADO");
    expect(badge.className).toContain("text-blue-300");
  });

  it("formats DRAFT to amber badge", () => {
    const badge = formatCbamStatusBadge("DRAFT");
    expect(badge.label).toBe("DRAFT");
    expect(badge.className).toContain("text-amber-300");
  });
});

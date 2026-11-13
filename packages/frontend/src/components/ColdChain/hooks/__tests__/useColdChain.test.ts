/**
 * @file useColdChain.test.ts
 * @description Unit tests for Cold Chain GDP verdict badge mapping.
 * @module @atlas/frontend/components/ColdChain/hooks/__tests__/useColdChain.test
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { describe, it, expect } from "vitest";
import { getGdpVerdictBadge } from "../useColdChain";

describe("useColdChain helpers", () => {
  it("maps RELEASED_FOR_DISTRIBUTION to LIBERADO emerald badge", () => {
    const badge = getGdpVerdictBadge("RELEASED_FOR_DISTRIBUTION");
    expect(badge.label).toBe("LIBERADO");
    expect(badge.className).toContain("text-emerald-300");
  });

  it("maps QUARANTINE_INVESTIGATION to CUARENTENA amber badge", () => {
    const badge = getGdpVerdictBadge("QUARANTINE_INVESTIGATION");
    expect(badge.label).toBe("CUARENTENA");
    expect(badge.className).toContain("text-amber-300");
  });

  it("maps REJECTED_DISPOSAL to rose badge", () => {
    const badge = getGdpVerdictBadge("REJECTED_DISPOSAL");
    expect(badge.label).toBe("REJECTED_DISPOSAL");
    expect(badge.className).toContain("text-rose-300");
  });
});

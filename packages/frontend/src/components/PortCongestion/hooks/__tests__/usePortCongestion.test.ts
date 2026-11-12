/**
 * @file usePortCongestion.test.ts
 * @description Unit tests for Port Congestion vessel filtering and AIS telemetry helpers.
 * @module @atlas/frontend/components/PortCongestion/hooks/__tests__
 */

import { describe, expect, it } from "vitest";
import { SEED_AIS_VESSELS } from "@atlas/shared";
import { filterActiveVessels } from "../usePortCongestion";

describe("usePortCongestion helpers", () => {
  it("filters AIS vessels by port code accurately", () => {
    const bcnVessels = filterActiveVessels(SEED_AIS_VESSELS, "ESBCN", "");
    expect(bcnVessels.length).toBeGreaterThan(0);
    expect(bcnVessels.every((v) => v.destinationPortCode === "ESBCN")).toBe(
      true,
    );
  });

  it("filters AIS vessels by vessel name or carrier search query", () => {
    const firstBcn = SEED_AIS_VESSELS.find(
      (v) => v.destinationPortCode === "ESBCN",
    );
    expect(firstBcn).toBeDefined();
    if (firstBcn) {
      const matched = filterActiveVessels(
        SEED_AIS_VESSELS,
        "ESBCN",
        firstBcn.vesselName.slice(0, 4),
      );
      expect(matched.some((v) => v.imo === firstBcn.imo)).toBe(true);
    }
  });
});

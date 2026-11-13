/**
 * @file useIoTControlTower.test.ts
 * @description Unit tests for IoT Control Tower coordinate projection and status/severity badge helpers.
 * @module @atlas/frontend/components/IoTControlTower/hooks/__tests__
 */

import { describe, expect, it } from "vitest";
import {
  getSeverityColor,
  getStatusColor,
  toSvgCoords,
} from "../useIoTControlTower";

describe("useIoTControlTower helpers", () => {
  it("projects geographic lat/lng coordinates into bounded 800x400 SVG canvas", () => {
    const bcn = toSvgCoords(41.38, 2.17);
    expect(bcn.x).toBeGreaterThan(0);
    expect(bcn.x).toBeLessThan(800);
    expect(bcn.y).toBeGreaterThan(0);
    expect(bcn.y).toBeLessThan(400);
  });

  it("maps asset status and alert severity to expected Tailwind classes", () => {
    expect(getStatusColor("CRITICAL_ALERT")).toContain("text-red-400");
    expect(getStatusColor("IN_TRANSIT")).toContain("text-emerald-400");
    expect(getSeverityColor("CRITICAL")).toContain("text-red-400");
    expect(getSeverityColor("WARNING")).toContain("text-amber-400");
  });
});

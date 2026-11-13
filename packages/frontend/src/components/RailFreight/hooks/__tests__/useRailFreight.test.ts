/**
 * @file useRailFreight.test.ts
 * @description Unit tests for the useRailFreight domain hook.
 * @module @atlas/frontend/components/RailFreight/hooks/__tests__/useRailFreight.test
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { describe, it, expect } from "vitest";
import { useRailFreight } from "../useRailFreight";

describe("useRailFreight hook", () => {
  it("exports useRailFreight function", () => {
    expect(typeof useRailFreight).toBe("function");
  });
});

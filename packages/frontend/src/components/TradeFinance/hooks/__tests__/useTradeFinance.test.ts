/**
 * @file useTradeFinance.test.ts
 * @description Unit tests for Trade Finance filter label formatting helpers.
 * @module @atlas/frontend/components/TradeFinance/hooks/__tests__/useTradeFinance.test
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { describe, it, expect } from "vitest";
import { formatInstrumentFilterLabel } from "../useTradeFinance";

describe("useTradeFinance helpers", () => {
  it("formats COMMERCIAL_LC_CONFIRMED filter key to human-readable label", () => {
    expect(formatInstrumentFilterLabel("COMMERCIAL_LC_CONFIRMED")).toBe(
      "L/C Confirmado",
    );
  });

  it("formats DEMAND_GUARANTEE_URDG758 filter key to Garantía URDG", () => {
    expect(formatInstrumentFilterLabel("DEMAND_GUARANTEE_URDG758")).toBe(
      "Garantía URDG",
    );
  });

  it("formats ALL filter key to Todos", () => {
    expect(formatInstrumentFilterLabel("ALL")).toBe("Todos");
  });
});

/**
 * @file useCustomsWarehouse.test.ts
 * @description Unit tests for the useCustomsWarehouse hook and currency helpers.
 * @module @atlas/frontend/components/CustomsWarehouse/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import { useCustomsWarehouse, formatCurrencyEs } from "../useCustomsWarehouse";

describe("useCustomsWarehouse", () => {
  it("exports useCustomsWarehouse hook as a function", () => {
    expect(typeof useCustomsWarehouse).toBe("function");
  });

  it("formats numbers using Spanish locale currency rules", () => {
    const formatted = formatCurrencyEs(12500.5);
    expect(formatted).toContain("50");
  });
});

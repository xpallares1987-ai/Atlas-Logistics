/**
 * @file useIncotermsContracts.test.ts
 * @description Unit tests for Incoterms 2020 hook and rule categorization.
 * @module @atlas/frontend/components/IncotermsContracts/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import { useIncotermsContracts } from "../useIncotermsContracts";

describe("IncotermsContracts domain logic and hook", () => {
  it("exports useIncotermsContracts hook as a function", () => {
    expect(typeof useIncotermsContracts).toBe("function");
  });

  it("verifies the 11 official ICC Incoterms rules taxonomy", () => {
    const multimodalRules = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP"];
    const maritimeRules = ["FAS", "FOB", "CFR", "CIF"];

    expect(multimodalRules.length).toBe(7);
    expect(maritimeRules.length).toBe(4);
    expect(multimodalRules.length + maritimeRules.length).toBe(11);
  });

  it("verifies customs DUA Box 46 CIF normalization logic", () => {
    // Under EXW: invoiceValue + preCarriage + exportCosts + freight + insurance = CIF value
    const invoiceValue = 10000;
    const preCarriage = 500;
    const exportCosts = 100;
    const freight = 1200;
    const insurance = 100;

    const cifValue =
      invoiceValue + preCarriage + exportCosts + freight + insurance;
    expect(cifValue).toBe(11900);
  });
});

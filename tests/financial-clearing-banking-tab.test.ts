/**
 * @file financial-clearing-banking-tab.test.ts
 * @description Unit tests for Banking & ISO 20022 UI Tab module and barrel components.
 * @module @atlas/tests/financial-clearing-banking-tab
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { describe, it, expect } from "vitest";
import * as BankingIsoTab from "../packages/frontend/src/components/FinancialClearing/Tab/BankingIso20022/index.js";

describe("Financial Clearing Banking & ISO 20022 Tab Components", () => {
  it("1. Exports all canonical components from the Tab barrel", () => {
    expect(BankingIsoTab.XmlInspector).toBeDefined();
    expect(BankingIsoTab.StatementReconciliation).toBeDefined();
    expect(BankingIsoTab.LetterOfCreditViewer).toBeDefined();
    expect(typeof BankingIsoTab.XmlInspector).toBe("function");
    expect(typeof BankingIsoTab.StatementReconciliation).toBe("function");
    expect(typeof BankingIsoTab.LetterOfCreditViewer).toBe("function");
  });

  it("2. Validates XmlInspector displayName or function name", () => {
    expect(BankingIsoTab.XmlInspector.name).toBe("XmlInspector");
  });

  it("3. Validates StatementReconciliation displayName or function name", () => {
    expect(BankingIsoTab.StatementReconciliation.name).toBe(
      "StatementReconciliation",
    );
  });

  it("4. Validates LetterOfCreditViewer displayName or function name", () => {
    expect(BankingIsoTab.LetterOfCreditViewer.name).toBe(
      "LetterOfCreditViewer",
    );
  });
});

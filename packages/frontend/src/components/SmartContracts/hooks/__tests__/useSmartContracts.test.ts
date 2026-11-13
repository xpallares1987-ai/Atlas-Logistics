/**
 * @file useSmartContracts.test.ts
 * @description Unit tests for Smart Contracts DLT ledger filtering and event badge helpers.
 * @module @atlas/frontend/components/SmartContracts/hooks/__tests__
 */

import { describe, expect, it } from "vitest";
import { filterLedgerBlocks, getEventBadgeClass } from "../useSmartContracts";

describe("useSmartContracts helpers", () => {
  const sampleLedger: any[] = [
    {
      blockNumber: 0,
      txHash: "0xabc123",
      payload: {
        event: "GENESIS",
        sender: "Atlas Authority",
        details: "Genesis block initialized",
      },
    },
    {
      blockNumber: 1,
      txHash: "0xdef456",
      payload: {
        event: "EBL_ISSUED",
        sender: "Maersk Line",
        details: "Digital Bill of Lading issued",
      },
    },
  ];

  it("filters DLT ledger blocks by search query and event type", () => {
    expect(filterLedgerBlocks(sampleLedger, "maersk", "ALL")).toHaveLength(1);
    expect(filterLedgerBlocks(sampleLedger, "", "GENESIS")).toHaveLength(1);
    expect(filterLedgerBlocks(sampleLedger, "", "ALL")).toHaveLength(2);
  });

  it("returns appropriate Tailwind classes for blockchain event badges", () => {
    expect(getEventBadgeClass("GENESIS")).toContain("bg-slate-700");
    expect(getEventBadgeClass("EBL_ISSUED")).toContain("text-sky-400");
    expect(getEventBadgeClass("ESCROW_DISPUTED")).toContain("text-rose-400");
  });
});

import { describe, it, expect } from "vitest";
import { client } from "../index.js";

describe("Phase 2 Physical Database Migration", () => {
  it("should have created all Phase 2 tables in sqlite_master", async () => {
    const res = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('carta_porte_declarations', 'efirma_audit_stamps', 'smart_escrow_contracts', 'blockchain_blocks', 'erp_purchase_orders', 'erp_sync_logs')",
    );
    expect(res.rows.length).toBe(6);
  });
});

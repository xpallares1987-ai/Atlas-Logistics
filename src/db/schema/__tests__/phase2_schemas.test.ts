import { describe, it, expect } from "vitest";
import {
  cartaPorteDeclarations,
  efirmaAuditStamps,
  smartEscrowContracts,
  blockchainBlocks,
  erpPurchaseOrders,
  erpSyncLogs,
} from "../index.js";

describe("Phase 2 Drizzle Schemas", () => {
  it("should export all phase 2 relational tables", () => {
    expect(cartaPorteDeclarations).toBeDefined();
    expect(efirmaAuditStamps).toBeDefined();
    expect(smartEscrowContracts).toBeDefined();
    expect(blockchainBlocks).toBeDefined();
    expect(erpPurchaseOrders).toBeDefined();
    expect(erpSyncLogs).toBeDefined();
  });
});

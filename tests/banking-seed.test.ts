/**
 * @file banking-seed.test.ts
 * @description Integration test verifying deterministic execution and referential
 * integrity of SWIFT ISO 20022 banking seed fixtures.
 */

import { describe, it, expect } from "vitest";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";
import { seedBanking } from "../src/db/seeds/banking.seed.js";

describe("Banking Master Seeder Integration Suite", () => {
  it("should seed bilateral netting cycles, transmissions, and statement entries deterministically", async () => {
    // 1. Run seeder
    await seedBanking();

    // 2. Assert bilateral netting cycle seeded
    const [cycle] = await db
      .select()
      .from(schema.bilateralNettingCycles)
      .where(eq(schema.bilateralNettingCycles.id, "bnc_demo_01"))
      .limit(1);

    expect(cycle).toBeDefined();
    expect(cycle.status).toBe("SETTLED");
    expect(cycle.netSettlementAmount).toBe(48500.0);
    expect(cycle.baseCurrency).toBe("EUR");

    // 3. Assert transmissions seeded
    const transmissions = await db
      .select()
      .from(schema.bankingTransmissions)
      .where(eq(schema.bankingTransmissions.tenantId, "tenant-default"));

    expect(transmissions.length).toBeGreaterThanOrEqual(3);

    const pain001 = transmissions.find((t) => t.id === "trx_demo_pain001");
    expect(pain001).toBeDefined();
    expect(pain001?.messageType).toBe("PAIN_001");
    expect(pain001?.status).toBe("ACKED");
    expect(pain001?.payloadXml).toContain("<Document");
    expect(pain001?.payloadXml).toContain("pain.001.001.09");

    const pacs008 = transmissions.find((t) => t.id === "trx_demo_pacs008");
    expect(pacs008).toBeDefined();
    expect(pacs008?.messageType).toBe("PACS_008");
    expect(pacs008?.totalAmount).toBe(125000.0);

    const tsmt019 = transmissions.find((t) => t.id === "trx_demo_tsmt019");
    expect(tsmt019).toBeDefined();
    expect(tsmt019?.messageType).toBe("TSMT_019");
    expect(tsmt019?.totalAmount).toBe(89000.0);

    // 4. Assert bank statement entries seeded
    const statementEntries = await db
      .select()
      .from(schema.bankStatementEntries)
      .where(eq(schema.bankStatementEntries.statementId, "STMT-2026-08-01"));

    expect(statementEntries.length).toBeGreaterThanOrEqual(2);

    const reconciledEntry = statementEntries.find(
      (e) => e.id === "bse_demo_01",
    );
    expect(reconciledEntry).toBeDefined();
    expect(reconciledEntry?.reconciliationStatus).toBe("RECONCILED");
    expect(reconciledEntry?.amount).toBe(48500.0);

    const unmatchedEntry = statementEntries.find((e) => e.id === "bse_demo_02");
    expect(unmatchedEntry).toBeDefined();
    expect(unmatchedEntry?.reconciliationStatus).toBe("UNMATCHED");
  });

  it("should be strictly idempotent on repeated execution", async () => {
    await expect(seedBanking()).resolves.not.toThrow();

    const [cycle] = await db
      .select()
      .from(schema.bilateralNettingCycles)
      .where(eq(schema.bilateralNettingCycles.id, "bnc_demo_01"))
      .limit(1);

    expect(cycle).toBeDefined();
    expect(cycle.netSettlementAmount).toBe(48500.0);
  });
});

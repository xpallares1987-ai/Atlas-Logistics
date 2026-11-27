/**
 * @file banking-master-seed.test.ts
 * @description Integration and idempotency test suite for Banking Master Seeder (banking.seed.ts).
 * Verifies Bilateral Netting, ISO 20022 Transmissions (pain.001, pacs.008, tsmt.019),
 * Letter of Credit settlement honouring (lc_hamb_2026_05), and bank statement reconciliation (camt.053).
 * @module @atlas/tests/banking-master-seed
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";
import { seedBanking } from "../src/db/seeds/banking.seed.js";
import { seedTradeFinance } from "../src/db/seeds/trade-finance.seed.js";

describe("Banking Master Seeder & Trade Credit pacs.008 Settlement Fixtures", () => {
  beforeAll(async () => {
    // Ensure parent trade finance instruments exist defensively before seeding banking
    await seedTradeFinance();
    await seedBanking();
  });

  it("should seed bilateral netting cycle bnc_demo_01 with deterministic figures", async () => {
    const [cycle] = await db
      .select()
      .from(schema.bilateralNettingCycles)
      .where(eq(schema.bilateralNettingCycles.id, "bnc_demo_01"));

    expect(cycle).toBeDefined();
    expect(cycle.baseCurrency).toBe("EUR");
    expect(cycle.grossVolumeAtoB).toBe(125000.0);
    expect(cycle.grossVolumeBtoA).toBe(76500.0);
    expect(cycle.netSettlementAmount).toBe(48500.0);
    expect(cycle.status).toBe("SETTLED");
  });

  it("should seed ISO 20022 pacs.008 Letter of Credit settlement transmission with SHA-256 seal", async () => {
    const [trx] = await db
      .select()
      .from(schema.bankingTransmissions)
      .where(eq(schema.bankingTransmissions.id, "btx_lc_demo_01"));

    expect(trx).toBeDefined();
    expect(trx.transmissionNumber).toBe("TRX-LC-20261015-PACS008");
    expect(trx.messageType).toBe("PACS_008");
    expect(trx.senderBic).toBe("DEUTDEDDXXX");
    expect(trx.receiverBic).toBe("BNPAESMMXXX");
    expect(trx.totalAmount).toBe(680000.0);
    expect(trx.currency).toBe("EUR");
    expect(trx.status).toBe("ACKED");
    expect(trx.payloadXml).toContain("pacs.008.001.08");
    expect(trx.payloadXml).toContain("head.001.001.02");
    expect(trx.payloadXml).toContain("LC-2026-HAM-0219");
    expect(trx.payloadHashSha256).toHaveLength(64);
  });

  it("should transition canonical trade credit instrument lc_hamb_2026_05 to HONOURED_PAID", async () => {
    const [instrument] = await db
      .select()
      .from(schema.tradeCreditInstruments)
      .where(eq(schema.tradeCreditInstruments.id, "lc_hamb_2026_05"));

    expect(instrument).toBeDefined();
    expect(instrument.instrumentReference).toBe("LC-2026-HAM-0219");
    expect(instrument.creditAmount).toBe(680000.0);
    expect(instrument.currency).toBe("EUR");
    expect(instrument.status).toBe("HONOURED_PAID");
  });

  it("should seed bank statement entry bse_lc_hamb_01 reconciling the pacs.008 transfer", async () => {
    const [entry] = await db
      .select()
      .from(schema.bankStatementEntries)
      .where(eq(schema.bankStatementEntries.id, "bse_lc_hamb_01"));

    expect(entry).toBeDefined();
    expect(entry.transmissionId).toBe("btx_lc_demo_01");
    expect(entry.amount).toBe(680000.0);
    expect(entry.currency).toBe("EUR");
    expect(entry.creditDebitIndicator).toBe("DBIT");
    expect(entry.reconciliationStatus).toBe("RECONCILED");
    expect(entry.endToEndId).toBe("TRX-LC-20261015-PACS008");
  });

  it("should be 100% idempotent upon repeated executions without duplicates or errors", async () => {
    await expect(seedBanking()).resolves.not.toThrow();

    // Verify row count remains exact
    const transmissions = await db
      .select()
      .from(schema.bankingTransmissions)
      .where(eq(schema.bankingTransmissions.id, "btx_lc_demo_01"));
    expect(transmissions.length).toBe(1);

    const entries = await db
      .select()
      .from(schema.bankStatementEntries)
      .where(eq(schema.bankStatementEntries.id, "bse_lc_hamb_01"));
    expect(entries.length).toBe(1);
  });
});

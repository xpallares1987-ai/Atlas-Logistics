/**
 * @file cbam-master-seed.test.ts
 * @description Integration and idempotency test suite for CBAM master seeder (definitive regime fixtures).
 * Verifies EEX quotes, certificate inventory, surrenders, and ISO 20022 wire settlements.
 * @module @atlas/tests/cbam-master-seed
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema/index.js";
import { eq, sql } from "drizzle-orm";
import { seedCbam } from "../src/db/seeds/cbam.seed.js";

describe("CBAM Master Seeder & Definitive Regime Fixtures", () => {
  beforeAll(async () => {
    // Seed CBAM master data (first run)
    await seedCbam();
  });

  it("should seed official EEX weekly carbon auction quotes for 2026", async () => {
    const quotes = await db
      .select()
      .from(schema.cbamEexQuotes)
      .where(
        sql`quote_week IN ('2026-W38', '2026-W39', '2026-W40', '2026-W41')`,
      );

    expect(quotes.length).toBe(4);

    const w38 = quotes.find((q) => q.quoteWeek === "2026-W38");
    expect(w38).toBeDefined();
    expect(w38?.auctionAveragePriceEur).toBe(82.4);
    expect(w38?.scaledPrice).toBe(82400000);
    expect(w38?.source).toBe("EEX_AUCTION");

    const w41 = quotes.find((q) => q.quoteWeek === "2026-W41");
    expect(w41).toBeDefined();
    expect(w41?.auctionAveragePriceEur).toBe(84.75);
    expect(w41?.scaledPrice).toBe(84750000);
  });

  it("should seed banking_transmissions with compliant pain.001 wire payment and SHA-256 seal", async () => {
    const [trx] = await db
      .select()
      .from(schema.bankingTransmissions)
      .where(eq(schema.bankingTransmissions.id, "btx_cbam_demo_01"));

    expect(trx).toBeDefined();
    expect(trx.transmissionNumber).toBe("TRX-CBAM-20260920-PAIN001");
    expect(trx.messageType).toBe("PAIN_001");
    expect(trx.totalAmount).toBe(412000.0);
    expect(trx.currency).toBe("EUR");
    expect(trx.status).toBe("ACKED");
    expect(trx.payloadXml).toContain("pain.001.001.09");
    expect(trx.payloadXml).toContain("LOT-2026-001");
    expect(trx.payloadHashSha256).toHaveLength(64);
  });

  it("should seed CBAM certificate inventory lots with NCA accounts and linked settlement", async () => {
    const lots = await db
      .select()
      .from(schema.cbamCertificateInventory)
      .where(
        sql`lot_reference IN ('LOT-2026-001', 'LOT-2026-002', 'LOT-2026-003')`,
      );

    expect(lots.length).toBe(3);

    const lot1 = lots.find((l) => l.lotReference === "LOT-2026-001");
    expect(lot1).toBeDefined();
    expect(lot1?.ncaRegistryAccountId).toBe("ES-CBAM-ACC-88319");
    expect(lot1?.quantityPurchased).toBe(5000);
    expect(lot1?.quantitySurrendered).toBe(1500);
    expect(lot1?.quantityAvailable).toBe(3500);
    expect(lot1?.unitPriceEur).toBe(82.4);
    expect(lot1?.totalCostEur).toBe(412000.0);
    expect(lot1?.bankingTransmissionId).toBe("btx_cbam_demo_01");

    const lot3 = lots.find((l) => l.lotReference === "LOT-2026-003");
    expect(lot3).toBeDefined();
    expect(lot3?.ncaRegistryAccountId).toBe("DE-CBAM-ACC-44912");
    expect(lot3?.quantityPurchased).toBe(4000);
    expect(lot3?.quantityAvailable).toBe(4000);
  });

  it("should seed official CBAM surrender record with verifier accreditation and declaration link", async () => {
    const [surrender] = await db
      .select()
      .from(schema.cbamCertificateSurrenders)
      .where(eq(schema.cbamCertificateSurrenders.id, "cbam_surr_001"));

    expect(surrender).toBeDefined();
    expect(surrender.surrenderReference).toBe("SURR-2026-Q3-001");
    expect(surrender.declarationId).toBe("cbam_dec_2026_q3_01");
    expect(surrender.reportingPeriod).toBe("2026-Q3");
    expect(surrender.totalCertificatesSurrendered).toBe(1500);
    expect(surrender.totalCostEur).toBe(123600.0);
    expect(surrender.verifierName).toBe("Bureau Veritas Certification España");
    expect(surrender.verifierAccreditationNumber).toBe("ENAC-045/V-012");
    expect(surrender.verificationReportId).toBe("BV-CBAM-VER-2026-0994");
    expect(surrender.surrenderPayloadHashSha256).toHaveLength(64);
    expect(surrender.iso20022PaymentTransmissionId).toBe("btx_cbam_demo_01");

    // Also assert that declaration status was marked CERTIFICATES_SURRENDERED
    const [declaration] = await db
      .select()
      .from(schema.cbamDeclarations)
      .where(eq(schema.cbamDeclarations.id, "cbam_dec_2026_q3_01"));
    expect(declaration?.status).toBe("CERTIFICATES_SURRENDERED");
  });

  it("should be 100% idempotent upon repeated executions without throwing or creating duplicates", async () => {
    // Execute seedCbam a second time to verify onConflictDoUpdate behavior
    await expect(seedCbam()).resolves.not.toThrow();

    // Verify counts remain deterministic
    const quotes = await db
      .select()
      .from(schema.cbamEexQuotes)
      .where(
        sql`quote_week IN ('2026-W38', '2026-W39', '2026-W40', '2026-W41')`,
      );
    expect(quotes.length).toBe(4);

    const lots = await db
      .select()
      .from(schema.cbamCertificateInventory)
      .where(
        sql`lot_reference IN ('LOT-2026-001', 'LOT-2026-002', 'LOT-2026-003')`,
      );
    expect(lots.length).toBe(3);

    const surrenders = await db
      .select()
      .from(schema.cbamCertificateSurrenders)
      .where(eq(schema.cbamCertificateSurrenders.id, "cbam_surr_001"));
    expect(surrenders.length).toBe(1);
  });
});

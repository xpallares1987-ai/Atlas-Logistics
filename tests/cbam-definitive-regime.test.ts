/**
 * @file cbam-definitive-regime.test.ts
 * @description Comprehensive unit and integration test suite for EU CBAM Definitive Regime (2026+):
 * EEX carbon auction quotes, electronic certificate inventory (FIFO), ISO 20022 pain.001 payment generation,
 * and cryptographically sealed certificate surrender under Regulation (EU) 2023/956.
 * @module @atlas/tests/cbam-definitive-regime
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../src/app.js";
import jwt from "jsonwebtoken";
import { db } from "../src/db/index.js";
import {
  cbamDeclarations,
  cbamCertificateInventory,
  cbamCertificateSurrenders,
  cbamEexQuotes,
} from "../src/db/schema/cbam.js";
import {
  CbamEexService,
  CbamCertificateService,
} from "../src/modules/cbam/index.js";
import { bootstrapCbamDefinitiveTables } from "../src/modules/cbam/cbam-bootstrap.js";
import { eq } from "drizzle-orm";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("CBAM Definitive Regime (2026+) & ISO 20022 Financial Settlement Suite", () => {
  let authHeader: { authorization: string };
  const testTenantId = "tenant-cbam-test";
  const testDeclarationId = `dec-cbam-test-${Date.now()}`;
  const testDeclarationNumber = `CBAM-2026-TEST-${Date.now().toString(36).toUpperCase()}`;

  beforeAll(async () => {
    await bootstrapCbamDefinitiveTables();
    await app.ready();
    const token = jwt.sign(
      {
        id: "admin_user_id",
        email: "admin@atlas.com",
        role: "ADMIN",
        name: "Admin User",
        tenantId: testTenantId,
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    authHeader = { authorization: `Bearer ${token}` };

    // Seed a test declaration in VALIDATED state with net carbon liability
    await db.insert(cbamDeclarations).values({
      id: testDeclarationId,
      declarationNumber: testDeclarationNumber,
      reportingPeriod: "2026-Q3",
      declarantVat: "ESB12345678",
      declarantName: "Atlas Forwarding Customs SL",
      importerVat: "ESA98765432",
      importerName: "Iberian Steel Industrial SA",
      totalGrossMassTonnes: 100.0,
      totalNetMassTonnes: 95.0,
      totalDirectEmissionsTco2e: 180.0,
      totalIndirectEmissionsTco2e: 20.0,
      totalEmbeddedEmissionsTco2e: 200.0,
      euEtsBenchmarkPriceEur: 85.5,
      grossCarbonLiabilityEur: 17100.0,
      carbonPricePaidForeignEur: 0.0,
      netCarbonLiabilityEur: 17100.0, // Requires 200 certs at 85.50
      status: "VALIDATED",
    });
  });

  afterAll(async () => {
    // Cleanup seeded test records
    await db
      .delete(cbamCertificateSurrenders)
      .where(eq(cbamCertificateSurrenders.declarationId, testDeclarationId));
    await db
      .delete(cbamDeclarations)
      .where(eq(cbamDeclarations.id, testDeclarationId));
    await db
      .delete(cbamCertificateInventory)
      .where(eq(cbamCertificateInventory.tenantId, testTenantId));
  });

  describe("1. CbamEexService: Weekly EUA Auction Benchmark Quotes", () => {
    it("records and updates weekly EEX quotes with micro-cents scaling", async () => {
      const recorded = await CbamEexService.recordQuote({
        quoteWeek: "2026-W42",
        validFrom: "2026-10-12",
        validUntil: "2026-10-18",
        auctionAveragePriceEur: 87.25,
        source: "EEX_AUCTION",
      });

      expect(recorded.quoteWeek).toBe("2026-W42");
      expect(recorded.auctionAveragePriceEur).toBe(87.25);
      expect(recorded.scaledPrice).toBe(87250000);
      expect(recorded.source).toBe("EEX_AUCTION");
    });

    it("resolves active quote for a given date within validity range", async () => {
      const active = await CbamEexService.resolveActiveQuote(
        new Date("2026-10-15"),
      );
      expect(active.quoteWeek).toBe("2026-W42");
      expect(active.auctionAveragePriceEur).toBe(87.25);
      expect(active.isFallback).toBe(false);
    });

    it("resolves active quote fallback when no published quote covers date", async () => {
      const active = await CbamEexService.resolveActiveQuote(
        new Date("2024-01-01"),
      );
      expect(active.auctionAveragePriceEur).toBeGreaterThan(0);
    });
  });

  describe("2. CbamCertificateService: FIFO Inventory & Non-Repudiation Surrender", () => {
    let lot1Id: string;
    let lot2Id: string;

    it("purchases certificate lots and tracks inventory balance", async () => {
      // Lot 1: 150 certs at 84.00 €
      const lot1 = await CbamCertificateService.purchaseLot({
        lotReference: `LOT-TEST-001-${Date.now()}`,
        purchaseDate: "2026-09-01",
        ncaRegistryAccountId: "ES-CBAM-ACC-TEST",
        quantityPurchased: 150,
        unitPriceEur: 84.0,
        tenantId: testTenantId,
      });
      lot1Id = lot1.id;

      // Lot 2: 100 certs at 86.50 €
      const lot2 = await CbamCertificateService.purchaseLot({
        lotReference: `LOT-TEST-002-${Date.now()}`,
        purchaseDate: "2026-09-15",
        ncaRegistryAccountId: "ES-CBAM-ACC-TEST",
        quantityPurchased: 100,
        unitPriceEur: 86.5,
        tenantId: testTenantId,
      });
      lot2Id = lot2.id;

      const summary =
        await CbamCertificateService.getInventorySummary(testTenantId);
      expect(summary.totalPurchased).toBe(250);
      expect(summary.totalAvailable).toBe(250);
      expect(summary.totalSurrendered).toBe(0);
      expect(summary.activeLotsCount).toBe(2);
      expect(summary.totalValuationEur).toBe(150 * 84.0 + 100 * 86.5);
    });

    it("generates ISO 20022 pain.001.001.09 payment order XML for lot purchase", () => {
      const paymentOrder = CbamCertificateService.generatePaymentOrderXml({
        lotId: lot1Id,
        debtorName: "Atlas Forwarding Customs SL",
        debtorIban: "ES9121000418450200051332",
        debtorBic: "CAIXESBBXXX",
      });

      expect(paymentOrder.messageId).toContain("MSG-CBAM-");
      expect(paymentOrder.xml).toContain(
        'xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"',
      );
      expect(paymentOrder.xml).toContain("<PmtMtd>TRF</PmtMtd>");
      expect(paymentOrder.xml).toContain(
        "<IBAN>ES9121000418450200051332</IBAN>",
      );
      expect(paymentOrder.xml).toContain("<BICFI>CAIXESBBXXX</BICFI>");
      expect(paymentOrder.xml).toContain(
        "<Ustrd>PAGO ADQUISICION CERTIFICADOS CBAM",
      );
    });

    it("rejects surrender when accredited verifier information is missing (Art. 8)", async () => {
      await expect(
        CbamCertificateService.surrenderCertificates({
          declarationId: testDeclarationId,
          verifierName: "",
          verifierAccreditationNumber: "",
          verificationReportId: "",
          tenantId: testTenantId,
        }),
      ).rejects.toThrow(/Article 8 compliance violation/);
    });

    it("rejects surrender when holding inventory has insufficient certificates", async () => {
      // Seed a huge declaration requiring 5,000 certificates
      const hugeDecId = `dec-huge-${Date.now()}`;
      await db.insert(cbamDeclarations).values({
        id: hugeDecId,
        declarationNumber: `CBAM-HUGE-${Date.now()}`,
        reportingPeriod: "2026-Q3",
        declarantVat: "ESB12345678",
        declarantName: "Atlas Forwarding Customs SL",
        importerVat: "ESA98765432",
        importerName: "Mega Industrial SA",
        totalGrossMassTonnes: 5000.0,
        totalNetMassTonnes: 5000.0,
        totalDirectEmissionsTco2e: 5000.0,
        totalIndirectEmissionsTco2e: 0.0,
        totalEmbeddedEmissionsTco2e: 5000.0,
        euEtsBenchmarkPriceEur: 85.5,
        grossCarbonLiabilityEur: 427500.0,
        carbonPricePaidForeignEur: 0.0,
        netCarbonLiabilityEur: 427500.0,
        status: "VALIDATED",
      });

      await expect(
        CbamCertificateService.surrenderCertificates({
          declarationId: hugeDecId,
          verifierName: "TÜV Rheinland Carbon Services SL",
          verifierAccreditationNumber: "ENAC-088/V-001",
          verificationReportId: "REP-2026-08819",
          tenantId: testTenantId,
        }),
      ).rejects.toThrow(/INSUFFICIENT_CBAM_CERTIFICATES/);

      await db
        .delete(cbamDeclarations)
        .where(eq(cbamDeclarations.id, hugeDecId));
    });

    it("executes FIFO surrender: exhausts Lot 1, consumes partial Lot 2, updates declaration status, and seals with SHA-256", async () => {
      // Required certs for testDeclaration: ceil(17100 / 85.5) = 200 certs
      // Lot 1 has 150 -> exhausts Lot 1 (remaining 50)
      // Lot 2 has 100 -> consumes 50 from Lot 2 (leaving 50 in Lot 2)
      const surrender = await CbamCertificateService.surrenderCertificates({
        declarationId: testDeclarationId,
        verifierName: "SGS International Verification SA",
        verifierAccreditationNumber: "ENAC-045/V-012",
        verificationReportId: "VER-CBAM-2026-993",
        tenantId: testTenantId,
      });

      expect(surrender.declarationId).toBe(testDeclarationId);
      expect(surrender.totalCertificatesSurrendered).toBe(200);
      expect(surrender.surrenderLots.length).toBe(2);

      // Verify FIFO allocation
      expect(surrender.surrenderLots[0].lotId).toBe(lot1Id);
      expect(surrender.surrenderLots[0].quantity).toBe(150);
      expect(surrender.surrenderLots[1].lotId).toBe(lot2Id);
      expect(surrender.surrenderLots[1].quantity).toBe(50);

      // Verify SHA-256 seal (64-character hex string)
      expect(surrender.surrenderPayloadHashSha256).toMatch(/^[a-f0-9]{64}$/);

      // Verify declaration status transition
      const updatedDec = await db
        .select()
        .from(cbamDeclarations)
        .where(eq(cbamDeclarations.id, testDeclarationId))
        .get();
      expect(updatedDec?.status).toBe("CERTIFICATES_SURRENDERED");

      // Verify inventory balances
      const postSummary =
        await CbamCertificateService.getInventorySummary(testTenantId);
      expect(postSummary.totalPurchased).toBe(250);
      expect(postSummary.totalSurrendered).toBe(200);
      expect(postSummary.totalAvailable).toBe(50);
      expect(postSummary.activeLotsCount).toBe(1); // Lot 1 is EXHAUSTED, Lot 2 is ACTIVE
    });

    it("rejects surrender of an already surrendered declaration", async () => {
      await expect(
        CbamCertificateService.surrenderCertificates({
          declarationId: testDeclarationId,
          verifierName: "SGS International Verification SA",
          verifierAccreditationNumber: "ENAC-045/V-012",
          verificationReportId: "VER-CBAM-2026-993",
          tenantId: testTenantId,
        }),
      ).rejects.toThrow(/already been surrendered/);
    });
  });

  describe("3. Fastify REST API Routes: EEX & Certificate Inventory", () => {
    it("POST /api/cbam/eex/quotes - records a new weekly quote", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/cbam/eex/quotes",
        headers: authHeader,
        payload: {
          quoteWeek: "2026-W43",
          validFrom: "2026-10-19",
          validUntil: "2026-10-25",
          auctionAveragePriceEur: 88.5,
          source: "EEX_AUCTION",
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.quoteWeek).toBe("2026-W43");
      expect(json.auctionAveragePriceEur).toBe(88.5);
    });

    it("GET /api/cbam/eex/quotes - lists quotes", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/cbam/eex/quotes",
        headers: authHeader,
      });

      expect(res.statusCode).toBe(200);
      const quotes = res.json();
      expect(Array.isArray(quotes)).toBe(true);
      expect(quotes.length).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/cbam/eex/quotes/active - resolves quote for date", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/cbam/eex/quotes/active?date=2026-10-20",
        headers: authHeader,
      });

      expect(res.statusCode).toBe(200);
      const active = res.json();
      expect(active.quoteWeek).toBe("2026-W43");
      expect(active.auctionAveragePriceEur).toBe(88.5);
    });

    it("POST /api/cbam/certificates/lots - registers certificate lot", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/cbam/certificates/lots",
        headers: authHeader,
        payload: {
          lotReference: `API-LOT-${Date.now()}`,
          purchaseDate: "2026-10-01",
          ncaRegistryAccountId: "ES-CBAM-ACC-API",
          quantityPurchased: 50,
          unitPriceEur: 88.0,
        },
      });

      expect(res.statusCode).toBe(201);
      const lot = res.json();
      expect(lot.quantityPurchased).toBe(50);
      expect(lot.quantityAvailable).toBe(50);
      expect(lot.status).toBe("ACTIVE");
    });

    it("GET /api/cbam/certificates/inventory - retrieves summary and lot inventory", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/cbam/certificates/inventory",
        headers: authHeader,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.summary).toBeDefined();
      expect(data.summary.totalPurchased).toBeGreaterThanOrEqual(50);
      expect(Array.isArray(data.lots)).toBe(true);
    });

    it("POST /api/cbam/certificates/lots/:id/payment-order - generates pain.001 wire XML", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/cbam/certificates/lots/test-lot-123/payment-order",
        headers: authHeader,
        payload: {
          debtorName: "Atlas Forwarding Customs SL",
          debtorIban: "ES9121000418450200051332",
          debtorBic: "CAIXESBBXXX",
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.messageType).toBe("PAIN_001");
      expect(json.xml).toContain("pain.001.001.09");
      expect(json.xml).toContain("ES9121000418450200051332");
    });

    it("GET /api/cbam/certificates/surrenders - lists all non-repudiation surrender records", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/cbam/certificates/surrenders",
        headers: authHeader,
      });

      expect(res.statusCode).toBe(200);
      const list = res.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(1);
      const surrenderRecord = list.find(
        (s: { declarationId: string }) => s.declarationId === testDeclarationId,
      );
      expect(surrenderRecord).toBeDefined();
      expect(surrenderRecord.surrenderPayloadHashSha256).toMatch(
        /^[a-f0-9]{64}$/,
      );
    });

    it("POST /api/cbam/certificates/surrenders/:id/payment-order - generates pain.001 wire XML for surrender settlement", async () => {
      const listRes = await app.inject({
        method: "GET",
        url: "/api/cbam/certificates/surrenders",
        headers: authHeader,
      });
      const list = listRes.json();
      const surrender = list[0];

      const res = await app.inject({
        method: "POST",
        url: `/api/cbam/certificates/surrenders/${surrender.id}/payment-order`,
        headers: authHeader,
        payload: {
          debtorName: "Atlas Forwarding Customs SL",
          debtorIban: "ES9121000418450200051332",
          debtorBic: "CAIXESBBXXX",
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.messageType).toBe("PAIN_001");
      expect(json.schema).toBe("pain.001.001.09");
      expect(json.totalAmountEur).toBe(surrender.totalCostEur);
      expect(json.xml).toContain("pain.001.001.09");
      expect(json.xml).toContain("ES9121000418450200051332");
      expect(json.xml).toContain(
        "LIQUIDACION DEFINITIVA ENTREGA CERTIFICADOS CBAM",
      );
    });
  });
});

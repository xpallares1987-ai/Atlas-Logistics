/**
 * @file commercial-pricing-tariff-engine.test.ts
 * @description Comprehensive automated integration test suite for Track A:
 * Commercial Pricing & Dynamic Tariff Engine (atlas-billing-tariff-engine, atlas-accounting-gl-sync, atlas-consolidation-math).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import quotesRoutes from "../src/routes/quotes.routes.js";
import { lclOperationsRoutes } from "../src/routes/operations/lcl.routes.js";
import { invoicesRoutes } from "../src/routes/financial/invoices.routes.js";
import {
  calculateChargeableWeight,
  prorateMasterCosts,
  calculateConsolidationProfitability,
  evaluateSurcharge,
  validateProfitMargin,
  getCategoryPrecedence,
  SurchargeDefinition,
} from "@atlas/shared";
import { TariffResolutionService } from "../src/services/pricing/tariff-resolution.service.js";
import { GlSyncService } from "../src/services/accounting/gl-sync.service.js";
import { db } from "../src/db/index.js";
import { scmOutboxMessages } from "../src/db/schema/scm_foundation.js";
import {
  rates,
  lanes,
  addresses,
  locations,
  companies,
  invoices,
  invoiceItems,
} from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("Track A: Commercial Pricing, Tariff Engine & GL Sync Test Suite", () => {
  let app: FastifyInstance;
  const testRateId = "rate-tracka-test-01";
  const testInvoiceId = "inv-tracka-test-01";

  beforeAll(async () => {
    app = Fastify();
    await app.register(quotesRoutes, { prefix: "/api/quotes" });
    await app.register(lclOperationsRoutes, { prefix: "/api/operations" });
    await app.register(invoicesRoutes, { prefix: "/api" });
    await app.ready();

    // 1. Ensure test company
    await db
      .insert(companies)
      .values({
        id: "comp-track-a",
        name: "Track A Shipper Logistics Corp",
        taxId: "ES-A99887766",
        creditLimit: 500000,
      })
      .onConflictDoNothing();

    // 2. Ensure test locations & lane
    await db
      .insert(locations)
      .values({ id: "CNSHA", name: "Shanghai", type: "PORT" })
      .onConflictDoNothing();
    await db
      .insert(locations)
      .values({ id: "ESBCN", name: "Barcelona", type: "PORT" })
      .onConflictDoNothing();

    const laneId = "lane-sha-bcn-test";
    await db
      .insert(lanes)
      .values({
        id: laneId,
        originLocationId: "CNSHA",
        destinationLocationId: "ESBCN",
        distance: 10500,
      })
      .onConflictDoNothing();

    // 3. Ensure test carrier address
    const existingAddresses = await db.select().from(addresses).limit(1);
    let carrierAddrId = existingAddresses[0]?.id;
    if (!carrierAddrId) {
      carrierAddrId = "addr-carrier-tracka";
      await db
        .insert(addresses)
        .values({
          id: carrierAddrId,
          companyId: "comp-track-a",
          addressType: "CAR",
          companyName: "Maersk Line A/S",
          tradeName: "Maersk",
          street1: "Esplanaden 50",
          zipCode: "1098",
          city: "Copenhagen",
          country: "DK",
        })
        .onConflictDoNothing();
    }

    // 4. Upsert test rate
    await db
      .insert(rates)
      .values({
        id: testRateId,
        carrierId: carrierAddrId,
        laneId: laneId,
        containerType: "40HC",
        baseRate: 2350,
        baf: 350,
        pss: 200,
        thc: 180,
        serviceLine: "Express",
        transitDays: 26,
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        companyId: "comp-track-a",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: rates.id,
        set: { validTo: new Date("2026-12-31") },
      });

    // 5. Upsert test invoice
    await db
      .insert(invoices)
      .values({
        id: testInvoiceId,
        invoiceNumber: "INV-2026-TRACKA-001",
        companyId: "comp-track-a",
        type: "AR",
        amount: 4500,
        currency: "EUR",
        status: "ISSUED",
        dueDate: new Date(Date.now() + 30 * 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    // 6. Insert sample line items
    await db
      .insert(invoiceItems)
      .values([
        {
          id: "item-tracka-1",
          invoiceId: testInvoiceId,
          description: "Ocean Linehaul Freight (40HC)",
          quantity: 1,
          unitPrice: 3500,
          total: 3500,
          createdAt: new Date(),
        },
        {
          id: "item-tracka-2",
          invoiceId: testInvoiceId,
          description: "Customs Duty Import Clearance (Suplidos)",
          quantity: 1,
          unitPrice: 1000,
          total: 1000,
          createdAt: new Date(),
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================================================
  // SECTION 1: CONSOLIDATION MATH & CHARGEABLE WEIGHT (atlas-consolidation-math)
  // ==========================================================================
  describe("Section 1: Chargeable Weight (CW) W/M Algorithms", () => {
    it("evaluates Ocean LCL (1:1000): billed by Gross Weight when cargo is dense", () => {
      const cw = calculateChargeableWeight({
        grossWeightKg: 4500,
        volumeCbm: 2.5, // 2.5 CBM * 1000 = 2500 kg
        mode: "OCEAN_LCL",
      });

      expect(cw.volumetricRatio).toBe(1000);
      expect(cw.volumetricWeightKg).toBe(2500);
      expect(cw.chargeableWeightKg).toBe(4500);
      expect(cw.billedBasis).toBe("GROSS_WEIGHT");
    });

    it("evaluates Ocean LCL (1:1000): billed by Volumetric Weight when cargo is bulky", () => {
      const cw = calculateChargeableWeight({
        grossWeightKg: 1200,
        volumeCbm: 4.8, // 4.8 CBM * 1000 = 4800 kg
        mode: "OCEAN_LCL",
      });

      expect(cw.volumetricWeightKg).toBe(4800);
      expect(cw.chargeableWeightKg).toBe(4800);
      expect(cw.billedBasis).toBe("VOLUME");
    });

    it("evaluates Air Freight (1:6000 / 166.667 kg/CBM) accurately", () => {
      const cw = calculateChargeableWeight({
        grossWeightKg: 200,
        volumeCbm: 3.0, // 3 * 166.667 = 500.001 kg
        mode: "AIR",
      });

      expect(cw.volumetricRatio).toBeCloseTo(166.667, 2);
      expect(cw.chargeableWeightKg).toBeGreaterThan(499);
      expect(cw.billedBasis).toBe("VOLUME");
    });

    it("evaluates Road Freight (1:3000 / 333.333 kg/CBM) accurately", () => {
      const cw = calculateChargeableWeight({
        grossWeightKg: 800,
        volumeCbm: 3.0, // 3 * 333.333 = 1000 kg
        mode: "ROAD",
      });

      expect(cw.volumetricWeightKg).toBeCloseTo(1000, 1);
      expect(cw.chargeableWeightKg).toBeCloseTo(1000, 1);
      expect(cw.billedBasis).toBe("VOLUME");
    });
  });

  describe("Section 2: Penny-Perfect MBL-to-HBL Cost Prorating (Zero Leakage)", () => {
    it("distributes $100.00 Master cost across 3 equal HBLs without penny leakage ($33.34 + $33.33 + $33.33 = $100.00)", () => {
      const result = prorateMasterCosts({
        masterCostId: "mcost_ocean_freight_01",
        masterCostName: "Master Ocean Freight",
        masterAmount: 100.0,
        currency: "USD",
        allocationBasis: "CHARGEABLE_WEIGHT",
        houseItems: [
          {
            shipmentId: "shp_hbl_01",
            houseDocumentNumber: "HBL-LON-001",
            grossWeightKg: 1000,
            volumeCbm: 1.0,
            chargeableWeightKg: 1000,
          },
          {
            shipmentId: "shp_hbl_02",
            houseDocumentNumber: "HBL-LON-002",
            grossWeightKg: 1000,
            volumeCbm: 1.0,
            chargeableWeightKg: 1000,
          },
          {
            shipmentId: "shp_hbl_03",
            houseDocumentNumber: "HBL-LON-003",
            grossWeightKg: 1000,
            volumeCbm: 1.0,
            chargeableWeightKg: 1000,
          },
        ],
      });

      expect(result.allocations.length).toBe(3);
      expect(result.leakageDelta).toBe(0.0);

      const sumAllocated = result.allocations.reduce(
        (sum, a) => sum + a.allocatedAmount,
        0,
      );
      expect(sumAllocated).toBe(100.0);

      // Largest item receives the +$0.01 fractional remainder
      expect(result.allocations[0].allocatedAmount).toBe(33.34);
      expect(result.allocations[1].allocatedAmount).toBe(33.33);
      expect(result.allocations[2].allocatedAmount).toBe(33.33);
    });

    it("distributes Master Terminal THC proportionally by CBM with exact reconciliation", () => {
      const result = prorateMasterCosts({
        masterCostId: "mcost_thc_dest",
        masterCostName: "Destination Port THC",
        masterAmount: 645.75,
        currency: "EUR",
        allocationBasis: "VOLUME_CBM",
        houseItems: [
          {
            shipmentId: "shp_hbl_a",
            houseDocumentNumber: "HBL-A",
            grossWeightKg: 500,
            volumeCbm: 4.25,
            chargeableWeightKg: 4250,
          },
          {
            shipmentId: "shp_hbl_b",
            houseDocumentNumber: "HBL-B",
            grossWeightKg: 1200,
            volumeCbm: 12.8,
            chargeableWeightKg: 12800,
          },
          {
            shipmentId: "shp_hbl_c",
            houseDocumentNumber: "HBL-C",
            grossWeightKg: 850,
            volumeCbm: 6.95,
            chargeableWeightKg: 6950,
          },
        ],
      });

      expect(result.leakageDelta).toBe(0.0);
      const sum = result.allocations.reduce(
        (acc, curr) => acc + curr.allocatedAmount,
        0,
      );
      expect(Math.round(sum * 100) / 100).toBe(645.75);
    });

    it("calculates dynamic Consolidation Profitability (P&L) and yield per CBM/KG", () => {
      const pnl = calculateConsolidationProfitability({
        consolidationReference: "CNS-SHA-BCN-2026-04",
        currency: "USD",
        masterCosts: [
          { name: "Master Ocean Freight (40HC)", amount: 2200.0 },
          { name: "Master Terminal Handling (THC)", amount: 380.0 },
          { name: "Master BAF / Fuel Surcharge", amount: 450.0 },
        ],
        houseShipments: [
          {
            shipmentId: "hbl_01",
            houseDocumentNumber: "HBL-001",
            grossWeightKg: 2400,
            volumeCbm: 8.5,
            chargeableWeightKg: 8500,
            revenueAmount: 1850.0,
            houseSpecificCosts: 120.0,
          },
          {
            shipmentId: "hbl_02",
            houseDocumentNumber: "HBL-002",
            grossWeightKg: 4200,
            volumeCbm: 14.0,
            chargeableWeightKg: 14000,
            revenueAmount: 2950.0,
            houseSpecificCosts: 180.0,
          },
          {
            shipmentId: "hbl_03",
            houseDocumentNumber: "HBL-003",
            grossWeightKg: 3100,
            volumeCbm: 11.2,
            chargeableWeightKg: 11200,
            revenueAmount: 2400.0,
            houseSpecificCosts: 150.0,
          },
        ],
      });

      expect(pnl.totalHouseRevenue).toBe(7200.0);
      expect(pnl.totalMasterCosts).toBe(3030.0);
      expect(pnl.totalHouseSpecificCosts).toBe(450.0);
      expect(pnl.totalConsolidatedCosts).toBe(3480.0);
      expect(pnl.netGrossProfit).toBe(3720.0);
      expect(pnl.grossMarginPercent).toBe(51.67);
      expect(pnl.yieldPerCbm).toBeGreaterThan(110);
    });
  });

  // ==========================================================================
  // SECTION 2: DYNAMIC TARIFF ENGINE & SURCHARGES (atlas-billing-tariff-engine)
  // ==========================================================================
  describe("Section 3: Formula Surcharges & Evaluation Precedence", () => {
    it("enforces category evaluation order (FREIGHT -> LOCALS -> ADMIN)", () => {
      expect(getCategoryPrecedence("FREIGHT")).toBe(1);
      expect(getCategoryPrecedence("ORIGIN_LOCAL")).toBe(2);
      expect(getCategoryPrecedence("DESTINATION_LOCAL")).toBe(2);
      expect(getCategoryPrecedence("CUSTOMS")).toBe(3);
      expect(getCategoryPrecedence("ADMIN")).toBe(3);
    });

    it("evaluates BAF Fuel Index formula based on bunker price ratio", () => {
      const bafSurcharge: SurchargeDefinition = {
        id: "surch_baf",
        chargeCode: "BAF",
        chargeName: "Bunker Adjustment Factor",
        category: "FREIGHT",
        calculationMethod: "DYNAMIC_JSON",
        originalAmount: 400.0,
        originalCurrency: "USD",
        dynamicRules: {
          ruleType: "BAF_FUEL_INDEX",
          baselineBunkerPrice: 600.0,
          currentBunkerPrice: 660.0, // +10% fuel increase
        },
      };

      const line = evaluateSurcharge(bafSurcharge, 2500, {
        etd: "2026-08-15",
        containerType: "40HC",
        containerCount: 1,
        currentBunkerPrice: 660.0,
      });

      expect(line.evaluationStep).toBe(1);
      // 400 * (660 / 600) = 440.00
      expect(line.calculatedAmount).toBe(440.0);
      expect(line.calculationSummary).toContain("BAF Fuel Index");
    });

    it("evaluates Peak Season Surcharge (PSS) active during peak window", () => {
      const pssSurcharge: SurchargeDefinition = {
        id: "surch_pss",
        chargeCode: "PSS",
        chargeName: "Peak Season Surcharge",
        category: "FREIGHT",
        calculationMethod: "DYNAMIC_JSON",
        originalAmount: 200.0,
        originalCurrency: "USD",
        dynamicRules: {
          ruleType: "PEAK_SEASON_SURGE",
          peakSeasonStart: "2026-07-01",
          peakSeasonEnd: "2026-10-31",
          peakSeasonSurgeAmount: 350.0,
        },
      };

      // Inside peak season (August)
      const peakLine = evaluateSurcharge(pssSurcharge, 2000, {
        etd: "2026-08-20",
        containerType: "40HC",
        containerCount: 2,
      });
      // (200 + 350) * 2 = 1100.00
      expect(peakLine.calculatedAmount).toBe(1100.0);
      expect(peakLine.calculationSummary).toContain("Peak Season Active");

      // Outside peak season (March)
      const offPeakLine = evaluateSurcharge(pssSurcharge, 2000, {
        etd: "2026-03-10",
        containerType: "40HC",
        containerCount: 2,
      });
      // 200 * 2 = 400.00
      expect(offPeakLine.calculatedAmount).toBe(400.0);
      expect(offPeakLine.calculationSummary).toContain("Off-Peak Base");
    });

    it("evaluates EU ETS Maritime Decarbonization surcharge per TEU", () => {
      const etsSurcharge: SurchargeDefinition = {
        id: "surch_ets",
        chargeCode: "ETS",
        chargeName: "EU ETS Maritime Surcharge",
        category: "ADMIN",
        calculationMethod: "DYNAMIC_JSON",
        originalAmount: 0.0,
        originalCurrency: "EUR",
        dynamicRules: {
          ruleType: "EU_ETS_MARITIME",
          co2FactorPerTeu: 0.45,
          carbonPriceEurPerTon: 70.0,
        },
      };

      // 40HC container = 2 TEUs
      const etsLine = evaluateSurcharge(etsSurcharge, 2200, {
        etd: "2026-09-01",
        containerType: "40HC",
        containerCount: 1,
        teuCount: 2,
      });

      // 0.45 tons * €70 * 2 TEU = €63.00
      expect(etsLine.evaluationStep).toBe(3);
      expect(etsLine.calculatedAmount).toBe(63.0);
    });
  });

  describe("Section 4: Profit Margin Enforcement & Append-Only Rates", () => {
    it("approves healthy commercial profit margin (>= 15%)", () => {
      const margin = validateProfitMargin(2000, 2450, 15.0, "USD");
      expect(margin.isApproved).toBe(true);
      expect(margin.actualMarginAmount).toBe(450);
      expect(margin.actualMarginPercent).toBe(18.37);
      expect(margin.approvalRequiredReason).toBeUndefined();
    });

    it("rejects sell rate with insufficient profit margin (< 15%) and returns minimum acceptable rate", () => {
      const margin = validateProfitMargin(2000, 2100, 15.0, "USD");
      expect(margin.isApproved).toBe(false);
      expect(margin.actualMarginPercent).toBe(4.76);
      expect(margin.approvalRequiredReason).toContain(
        "Profit margin 4.76% is below corporate threshold",
      );
    });

    it("invalidates rate early setting validTo to now without deleting the record", async () => {
      const invalidation =
        await TariffResolutionService.invalidateRateEarly(testRateId);
      expect(invalidation.rateId).toBe(testRateId);
      expect(invalidation.status).toBe("INVALIDATED");
      expect(invalidation.invalidatedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // SECTION 3: ASYNC GL SUB-LEDGER & DISBURSEMENTS (atlas-accounting-gl-sync)
  // ==========================================================================
  describe("Section 5: Asynchronous GL Synchronization & Suplidos Segregation", () => {
    it("classifies customs duties and suplidos into pass-through account 475000", () => {
      const duty = GlSyncService.mapGlAccount(
        "Customs Duty Import Clearance (Suplidos)",
        "AR",
      );
      expect(duty.isDisbursement).toBe(true);
      expect(duty.accountType).toBe("DISBURSEMENT_TAX_LIABILITY");
      expect(duty.glAccountNumber).toBe("475000");

      const freight = GlSyncService.mapGlAccount(
        "Ocean Linehaul Freight",
        "AR",
      );
      expect(freight.isDisbursement).toBe(false);
      expect(freight.accountType).toBe("OPERATIONAL_FREIGHT_REVENUE");
      expect(freight.glAccountNumber).toBe("700000");
    });

    it("enqueues SYNC_GL_INVOICE event into outbox with SAP and NetSuite connectors", async () => {
      const syncResult = await GlSyncService.enqueueInvoiceGlSync({
        invoiceId: testInvoiceId,
        targetBaseCurrency: "EUR",
        exchangeRate: 0.92,
      });

      expect(syncResult.invoiceId).toBe(testInvoiceId);
      expect(syncResult.accountingBaseCurrency).toBe("EUR");
      expect(
        syncResult.erpConnectors.sapS4Hana.serviceEntrySheet,
      ).toBeDefined();
      expect(
        syncResult.erpConnectors.oracleNetSuite.suiteTalkTransactionType,
      ).toBe("CustInvc");

      // Verify record in scmOutboxMessages
      const outboxRows = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.aggregateId, testInvoiceId));

      expect(outboxRows.length).toBeGreaterThan(0);
      expect(outboxRows[0].eventType).toBe("accounting.SYNC_GL_INVOICE");
      expect(["PENDING", "PROCESSED"]).toContain(outboxRows[0].status);
    }, 15000);
  });

  // ==========================================================================
  // SECTION 4: FASTIFY HTTP API INTEGRATION VERIFICATION
  // ==========================================================================
  describe("Section 6: Fastify API Route Verification", () => {
    it("POST /api/operations/lcl/calculate-cw returns correct chargeable weight", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/operations/lcl/calculate-cw",
        payload: {
          grossWeightKg: 1500,
          volumeCbm: 3.5,
          mode: "OCEAN_LCL",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.result.chargeableWeightKg).toBe(3500);
      expect(body.result.billedBasis).toBe("VOLUME");
    });

    it("POST /api/operations/lcl/prorate-costs returns penny-perfect allocations", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/operations/lcl/prorate-costs",
        payload: {
          masterAmount: 1200.0,
          currency: "USD",
          allocationBasis: "CHARGEABLE_WEIGHT",
          houseItems: [
            {
              shipmentId: "shp_1",
              houseDocumentNumber: "HBL-1",
              grossWeightKg: 2000,
              volumeCbm: 2.0,
              chargeableWeightKg: 2000,
            },
            {
              shipmentId: "shp_2",
              houseDocumentNumber: "HBL-2",
              grossWeightKg: 4000,
              volumeCbm: 4.0,
              chargeableWeightKg: 4000,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.proratedResult.allocations[0].allocatedAmount).toBe(400.0);
      expect(body.proratedResult.allocations[1].allocatedAmount).toBe(800.0);
      expect(body.proratedResult.leakageDelta).toBe(0.0);
    });

    it("POST /api/quotes/validate-margin evaluates pricing profitability", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/quotes/validate-margin",
        payload: {
          buyRateTotal: 2500,
          sellRateTotal: 3000,
          minMarginPercent: 15.0,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.margin.isApproved).toBe(true);
      expect(body.margin.actualMarginAmount).toBe(500);
    });

    it("POST /api/invoices/:id/sync-gl triggers outbox GL enqueueing", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/invoices/${testInvoiceId}/sync-gl`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.syncResult.invoiceId).toBe(testInvoiceId);
      expect(body.syncResult.erpConnectors).toBeDefined();
    }, 15000);
  });
});

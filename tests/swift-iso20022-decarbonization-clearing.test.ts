/**
 * @file swift-iso20022-decarbonization-clearing.test.ts
 * @description Integration and unit tests for SWIFT ISO 20022 Decarbonization Financial Clearing Integration:
 * - CBAM Certificate Lots pain.001 generation & linkage
 * - FuelEU Maritime Penalties pain.001 generation & linkage
 * - Fastify REST endpoints (/api/financial/iso20022/cbam/generate & /api/financial/iso20022/fueleu/generate)
 * - Intelligent 3-tier cascade bank statement reconciliation (camt.053)
 * @module @atlas/tests/swift-iso20022-decarbonization-clearing
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { db } from "../src/db/index.js";
import { sql, eq } from "drizzle-orm";
import {
  bankingTransmissions,
  bankStatementEntries,
} from "../src/db/schema/financial_clearing.js";
import { cbamCertificateInventory } from "../src/db/schema/cbam.js";
import {
  fuelEuPenaltiesLedger,
  marineVessels,
} from "../src/db/schema/fueleu_maritime.js";
import { swiftIso20022Service } from "../src/services/swift-iso20022.service.js";
import { iso20022Routes } from "../src/routes/financial/iso20022.routes.js";
import { generateCamt053Xml } from "../src/scm/engines/swift-iso20022.engine.js";

describe("SWIFT ISO 20022 Decarbonization Financial Clearing Suite", () => {
  let app: FastifyInstance;
  const testTenantId = "tenant-default";

  const testLotId = `lot_test_${Date.now()}`;
  const testLotRef = `LOT-TEST-ISO-${Date.now()}`;

  const testVesselId = `vsl_test_${Date.now()}`;
  const testPenaltyId = `pen_test_${Date.now()}`;
  const testPenaltyRef = `PEN-TEST-ISO-${Date.now()}`;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(iso20022Routes);
    await app.ready();

    // 1. Seed test CBAM Certificate Lot
    await db.insert(cbamCertificateInventory).values({
      id: testLotId,
      tenantId: testTenantId,
      lotReference: testLotRef,
      purchaseDate: "2026-11-26",
      ncaRegistryAccountId: "ES-CBAM-ACC-TEST",
      quantityPurchased: 100,
      quantitySurrendered: 0,
      quantityAvailable: 100,
      unitPriceEur: 85.5,
      unitPriceScaled: 8550000,
      totalCostEur: 8550.0,
      totalCostScaled: 855000000,
      status: "ACTIVE",
    });

    // 2. Seed test Marine Vessel and FuelEU Penalty
    await db.insert(marineVessels).values({
      id: testVesselId,
      imoNumber: `IMO${Date.now().toString().slice(-7)}`,
      vesselName: "M/V Test Decarbonization",
      vesselType: "CONTAINER_SHIP",
      flagState: "ES",
      grossTonnageGt: 45000,
      deadweightTonnageDwt: 65000,
      teuCapacity: 4500,
      mainEngineType: "TWO_STROKE_SLOW_SPEED_DIESEL",
      hasOpsConnectionInstalled: true,
      operatingShippingLine: "Atlas Line",
      docHolderCompany: "Atlas Fleet Management",
      classificationSociety: "DNV",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.insert(fuelEuPenaltiesLedger).values({
      id: testPenaltyId,
      settlementReference: testPenaltyRef,
      vesselId: testVesselId,
      reportingYear: 2026,
      complianceDeficitGco2eq: 50000000,
      vlsfoEquivalentEnergyDeficitMj: 1200000,
      vlsfoEquivalentDeficitTonnes: 10.5,
      statutoryPenaltyRateEurPerTonne: 2400.0,
      penaltyMultiplierConsecutiveYears: 1.0,
      totalPenaltyPayableEur: 25200.0,
      offsetAmountEur: 0,
      netPayableEur: 25200.0,
      paymentStatus: "CALCULATED_PENDING",
      euFundTreasuryAccount: "EU-INNOVATION-FUND-FUELEU-ESCROW",
    });
  });

  afterAll(async () => {
    await app.close();

    // Cleanup test records
    await db.delete(bankingTransmissions).where(sql`id LIKE 'btx_%'`);
    await db
      .delete(bankStatementEntries)
      .where(sql`statement_id LIKE 'STMT-TEST-%'`);
    await db
      .delete(cbamCertificateInventory)
      .where(eq(cbamCertificateInventory.id, testLotId));
    await db
      .delete(fuelEuPenaltiesLedger)
      .where(eq(fuelEuPenaltiesLedger.id, testPenaltyId));
    await db.delete(marineVessels).where(eq(marineVessels.id, testVesselId));
  });

  it("should generate a compliant pain.001 payment instruction for a CBAM certificate lot via SwiftIso20022Service", async () => {
    const payment = await swiftIso20022Service.generateCbamCertificatePayment({
      lotId: testLotId,
      tenantId: testTenantId,
      debtorName: "Atlas Forwarding Customs SL",
      debtorIban: "ES9121000418450200051332",
      debtorBic: "CAIXESBBXXX",
    });

    expect(payment).toBeDefined();
    expect(payment.id).toBeDefined();
    expect(payment.messageType).toBe("PAIN_001");
    expect(payment.totalAmount).toBe(8550.0);
    expect(payment.payloadXml).toContain("pain.001.001.09");
    expect(payment.payloadXml).toContain("ES-CBAM-ACC-TEST");

    // Verify linkage in lot
    const [updatedLot] = await db
      .select()
      .from(cbamCertificateInventory)
      .where(eq(cbamCertificateInventory.id, testLotId))
      .limit(1);

    expect(updatedLot.bankingTransmissionId).toBe(payment.id);
    expect(updatedLot.paymentReference).toBe(payment.transmissionNumber);
  });

  it("should generate a compliant pain.001 payment instruction for FuelEU Maritime penalties via SwiftIso20022Service", async () => {
    const payment = await swiftIso20022Service.generateFuelEuPenaltyPayment({
      penaltyId: testPenaltyId,
      tenantId: testTenantId,
      debtorName: "Atlas Maritime Operations SL",
      debtorIban: "ES9121000418450200051332",
      debtorBic: "CAIXESBBXXX",
    });

    expect(payment).toBeDefined();
    expect(payment.id).toBeDefined();
    expect(payment.messageType).toBe("PAIN_001");
    expect(payment.totalAmount).toBe(25200.0);
    expect(payment.payloadXml).toContain("pain.001.001.09");
    expect(payment.payloadXml).toContain(testPenaltyRef);

    // Verify linkage in penalty ledger
    const [updatedPenalty] = await db
      .select()
      .from(fuelEuPenaltiesLedger)
      .where(eq(fuelEuPenaltiesLedger.id, testPenaltyId))
      .limit(1);

    expect(updatedPenalty.bankingTransmissionId).toBe(payment.id);
  });

  it("POST /api/financial/iso20022/cbam/generate should generate transmission through Fastify endpoint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/financial/iso20022/cbam/generate",
      payload: {
        lotId: testLotId,
        debtorName: "Atlas Forwarding Customs SL",
        debtorIban: "ES9121000418450200051332",
        debtorBic: "CAIXESBBXXX",
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.payment.messageType).toBe("PAIN_001");
    expect(json.payment.totalAmount).toBe(8550.0);
  });

  it("POST /api/financial/iso20022/fueleu/generate should generate transmission through Fastify endpoint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/financial/iso20022/fueleu/generate",
      payload: {
        penaltyId: testPenaltyId,
        debtorName: "Atlas Maritime Operations SL",
        debtorIban: "ES9121000418450200051332",
        debtorBic: "CAIXESBBXXX",
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.payment.messageType).toBe("PAIN_001");
    expect(json.payment.totalAmount).toBe(25200.0);
  });

  it("GET /api/financial/iso20022/transmissions should support category filtering", async () => {
    const resAll = await app.inject({
      method: "GET",
      url: "/api/financial/iso20022/transmissions?category=ALL",
    });
    expect(resAll.statusCode).toBe(200);

    const resCbam = await app.inject({
      method: "GET",
      url: "/api/financial/iso20022/transmissions?category=CBAM",
    });
    expect(resCbam.statusCode).toBe(200);
    const cbamItems = resCbam.json().transmissions;
    expect(Array.isArray(cbamItems)).toBe(true);
    expect(cbamItems.length).toBeGreaterThanOrEqual(1);

    const resFuelEu = await app.inject({
      method: "GET",
      url: "/api/financial/iso20022/transmissions?category=FUELEU",
    });
    expect(resFuelEu.statusCode).toBe(200);
    const fueleuItems = resFuelEu.json().transmissions;
    expect(Array.isArray(fueleuItems)).toBe(true);
    expect(fueleuItems.length).toBeGreaterThanOrEqual(1);
  });

  it("should reconcile CBAM lots and FuelEU penalties via intelligent 3-tier cascade in ingestBankStatement", async () => {
    const statementId = `STMT-TEST-${Date.now()}`;
    const camtXml = generateCamt053Xml({
      statementId,
      electronicSequenceNumber: 1,
      creationDateTime: new Date().toISOString(),
      accountIban: "ES9121000418450200051332",
      accountCurrency: "EUR",
      accountServicerBic: "CAIXESBBXXX",
      openingBalance: {
        amount: 500000.0,
        currency: "EUR",
        date: "2026-11-26",
      },
      closingBalance: {
        amount: 466250.0,
        currency: "EUR",
        date: "2026-11-26",
      },
      entries: [
        {
          entryReference: testLotRef,
          amount: 8550.0,
          currency: "EUR",
          creditDebitIndicator: "DBIT",
          bookingDate: "2026-11-26",
          remittanceInfo: testLotRef,
        },
        {
          entryReference: testPenaltyRef,
          amount: 25200.0,
          currency: "EUR",
          creditDebitIndicator: "DBIT",
          bookingDate: "2026-11-26",
          remittanceInfo: testPenaltyRef,
        },
      ],
    });

    const result = await swiftIso20022Service.ingestBankStatement(
      camtXml,
      testTenantId,
    );
    expect(result.reconciledCount).toBe(2);
    expect(result.unmatchedCount).toBe(0);

    // Verify FuelEU penalty was marked PAID_TO_EU_FUND
    const [settledPenalty] = await db
      .select()
      .from(fuelEuPenaltiesLedger)
      .where(eq(fuelEuPenaltiesLedger.id, testPenaltyId))
      .limit(1);

    expect(settledPenalty.paymentStatus).toBe("PAID_TO_EU_FUND");
    expect(settledPenalty.settledAt).toBeDefined();
  });
});

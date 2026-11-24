/**
 * @file swift-iso20022-routes.test.ts
 * @description Integration test suite for SWIFT ISO 20022 Fastify REST routes (T-69).
 * Tests payment generation, camt.053 reconciliation, MT-to-MX translation,
 * and canonical XML streaming endpoints.
 * @module @atlas/tests/swift-iso20022-routes
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { iso20022Routes } from "../src/routes/financial/iso20022.routes.js";
import { db } from "../src/db/index.js";
import {
  bilateralNettingCycles,
  financialClearingEntries,
  bankingTransmissions,
  bankStatementEntries,
} from "../src/db/schema/financial_clearing.js";
import { generateCamt053Xml } from "../src/scm/engines/swift-iso20022.engine.js";
import { eq } from "drizzle-orm";

describe("SWIFT ISO 20022 REST Routes Integration Suite (T-69)", () => {
  let app: FastifyInstance;
  const tenantId = "tenant-default";
  const testCycleId = `cycle_route_${Date.now()}`;
  const testInvoiceRef = `REF-ROUTE-${Date.now()}`;
  let generatedTransmissionId: string;

  beforeAll(async () => {
    app = Fastify();
    await app.register(iso20022Routes);
    await app.ready();

    // Seed test netting cycle in database
    await db.insert(bilateralNettingCycles).values({
      id: testCycleId,
      tenantId,
      baseCurrency: "EUR",
      participantA: "Atlas Logistique FR",
      participantB: "Atlas Logistics DE",
      grossVolumeAtoB: 24000.0,
      grossVolumeBtoA: 11500.0,
      netPayer: "Atlas Logistique FR",
      netReceiver: "Atlas Logistics DE",
      netSettlementAmount: 12500.0,
      reconciledTransactionsCount: 3,
      transactionIds: ["tx-r1", "tx-r2", "tx-r3"],
      status: "ACCEPTED",
      settlementReference: `SETTLE-ROUTE-${Date.now()}`,
    });

    // Seed test clearing entry for statement reconciliation
    await db.insert(financialClearingEntries).values({
      id: `fce_route_${Date.now()}`,
      tenantId,
      debtorAgentId: "agent-fr",
      creditorAgentId: "agent-de",
      noteType: "INVOICE",
      reference: testInvoiceRef,
      amount: 12500.0,
      scaledAmount: 12500000000,
      currency: "EUR",
      status: "PENDING",
      issueDate: "2026-11-20",
      dueDate: "2026-12-20",
    });
  });

  afterAll(async () => {
    // Clean up test records
    await db
      .delete(bilateralNettingCycles)
      .where(eq(bilateralNettingCycles.id, testCycleId));
    await db
      .delete(financialClearingEntries)
      .where(eq(financialClearingEntries.reference, testInvoiceRef));
    if (generatedTransmissionId) {
      await db
        .delete(bankingTransmissions)
        .where(eq(bankingTransmissions.id, generatedTransmissionId));
    }
    await app.close();
  });

  it("1. POST /api/financial/iso20022/payments/generate - generates pain.001 payment instruction", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/financial/iso20022/payments/generate",
      payload: {
        nettingCycleId: testCycleId,
        paymentType: "PAIN_001",
        senderBic: "ATLASESMMXXX",
        receiverBic: "BNPAFRPPXXX",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.payment).toBeDefined();
    expect(body.payment.messageType).toBe("PAIN_001");
    expect(body.payment.totalAmount).toBe(12500.0);
    expect(body.payment.currency).toBe("EUR");
    expect(body.payment.payloadXml).toContain("<AppHdr");
    expect(body.payment.payloadXml).toContain("<CstmrCdtTrfInitn>");

    generatedTransmissionId = body.payment.id;
  });

  it("2. POST /api/financial/iso20022/payments/generate - returns 404 for nonexistent cycle", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/financial/iso20022/payments/generate",
      payload: {
        nettingCycleId: "nonexistent_cycle_id",
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it("3. POST /api/financial/iso20022/mt/translate - translates MT103 to pacs.008 XML", async () => {
    const rawMt103 = `{1:F01TESTBICAXXX0000000000}{2:I103TESTBICBXXXXN}{4:
:20:TRX-MT103-999
:23B:CRED
:32A:261124EUR45000,50
:50K:/ES1234567890123456789012
ATLAS LOGISTICS SPAIN
:59:/FR9876543210987654321098
MEDITERRANEAN FORWARDING PARIS
:70:FREIGHT SETTLEMENT SH-2026-99
:71A:SHA
-}`;

    const res = await app.inject({
      method: "POST",
      url: "/api/financial/iso20022/mt/translate",
      payload: {
        rawMt: rawMt103,
        targetType: "PACS_008",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.xml).toContain("<FIToFICstmrCdtTrf>");
    expect(body.xml).toContain("45000.50");
    expect(body.hash).toHaveLength(64);
  });

  it("4. POST /api/financial/iso20022/statements/reconcile - ingests camt.053 statement and reconciles clearing entry", async () => {
    const stmtXml = generateCamt053Xml({
      statementId: `STMT-ROUTE-${Date.now()}`,
      electronicSequenceNumber: 1,
      creationDateTime: new Date().toISOString(),
      accountIban: "ES7620380000001234567890",
      accountCurrency: "EUR",
      accountServicerBic: "BBVAESMMXXX",
      openingBalance: {
        amount: 50000.0,
        currency: "EUR",
        date: "2026-11-24",
      },
      closingBalance: {
        amount: 62500.0,
        currency: "EUR",
        date: "2026-11-24",
      },
      entries: [
        {
          entryReference: testInvoiceRef,
          bookingDate: "2026-11-24",
          creditDebitIndicator: "CRDT",
          amount: 12500.0,
          currency: "EUR",
          remittanceInfo: `Payment for clearing reference ${testInvoiceRef}`,
        },
      ],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/financial/iso20022/statements/reconcile",
      payload: {
        xmlContent: stmtXml,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.reconciliation.totalEntriesCount).toBe(1);
    expect(body.reconciliation.reconciledCount).toBe(1);
    expect(body.reconciliation.entries[0].reconciliationStatus).toBe(
      "RECONCILED",
    );
  });

  it("5. GET /api/financial/iso20022/transmissions - lists transmissions", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/financial/iso20022/transmissions",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.transmissions)).toBe(true);
    expect(body.transmissions.length).toBeGreaterThan(0);
  });

  it("6. GET /api/financial/iso20022/transmissions/:id - gets transmission details", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/financial/iso20022/transmissions/${generatedTransmissionId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.transmission.id).toBe(generatedTransmissionId);
  });

  it("7. GET /api/financial/iso20022/transmissions/:id/xml - streams raw XML payload", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/financial/iso20022/transmissions/${generatedTransmissionId}/xml`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/xml");
    expect(res.headers["content-disposition"]).toContain(".xml");
    expect(res.payload).toContain("<AppHdr");
    expect(res.payload).toContain("<CstmrCdtTrfInitn>");
  });

  it("8. GET /api/financial/iso20022/statements - lists statement entries", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/financial/iso20022/statements",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries.length).toBeGreaterThan(0);
  });
});

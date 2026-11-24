/**
 * @file swift-iso20022-service.test.ts
 * @description Integration test suite for SwiftIso20022Service, covering ISO 20022 payment generation,
 * camt.053 statement ingestion, automated AP/AR clearing reconciliation, and outbox telemetry.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/db/index.js";
import {
  bilateralNettingCycles,
  financialClearingEntries,
  bankingTransmissions,
  bankStatementEntries,
} from "../src/db/schema/financial_clearing.js";
import { swiftIso20022Service } from "../src/services/swift-iso20022.service.js";
import { generateCamt053Xml } from "../src/scm/engines/swift-iso20022.engine.js";
import { eq } from "drizzle-orm";

describe("SwiftIso20022Service Integration Suite (T-69)", () => {
  const tenantId = `tenant_test_${Date.now()}`;
  const testCycleId = `cycle_${Date.now()}`;
  const testInvoiceRef = `REF-INV-${Date.now()}`;

  beforeAll(async () => {
    // 1. Seed test netting cycle
    await db.insert(bilateralNettingCycles).values({
      id: testCycleId,
      tenantId,
      baseCurrency: "EUR",
      participantA: "Atlas Operating Hub ES",
      participantB: "Forwarding Partner Hub FR",
      grossVolumeAtoB: 15000.5,
      grossVolumeBtoA: 8200.0,
      netPayer: "Atlas Operating Hub ES",
      netReceiver: "Forwarding Partner Hub FR",
      netSettlementAmount: 6800.5,
      reconciledTransactionsCount: 4,
      transactionIds: ["tx1", "tx2", "tx3", "tx4"],
      status: "ACCEPTED",
      settlementReference: `SETTLE-${Date.now()}`,
    });

    // 2. Seed test clearing entry for statement reconciliation
    await db.insert(financialClearingEntries).values({
      id: `fce_${Date.now()}`,
      tenantId,
      debtorAgentId: "agent-a",
      creditorAgentId: "agent-b",
      noteType: "INVOICE",
      reference: testInvoiceRef,
      amount: 6800.5,
      scaledAmount: 6800500000,
      currency: "EUR",
      status: "PENDING",
      issueDate: "2026-11-20",
      dueDate: "2026-12-20",
    });
  });

  it("1. Generates ISO 20022 pain.001 payment with Business Application Header", async () => {
    const payment = await swiftIso20022Service.generateSettlementPayment({
      nettingCycleId: testCycleId,
      tenantId,
      paymentType: "PAIN_001",
    });

    expect(payment).toBeDefined();
    expect(payment.transmissionNumber).toMatch(/^TRX-ISO-/);
    expect(payment.messageType).toBe("PAIN_001");
    expect(payment.totalAmount).toBe(6800.5);
    expect(payment.currency).toBe("EUR");
    expect(payment.status).toBe("PENDING");

    // XML Assertions
    expect(payment.payloadXml).toContain("<AppHdr");
    expect(payment.payloadXml).toContain("head.001.001.02");
    expect(payment.payloadXml).toContain("<CstmrCdtTrfInitn>");
    expect(payment.payloadXml).toContain("pain.001.001.09");
    expect(payment.payloadXml).toContain("6800.50");
    expect(payment.payloadHashSha256).toHaveLength(64);

    // Verify stored record in DB
    const [fetched] = await db
      .select()
      .from(bankingTransmissions)
      .where(eq(bankingTransmissions.id, payment.id));
    expect(fetched).toBeDefined();
    expect(fetched.transmissionNumber).toBe(payment.transmissionNumber);
  });

  it("2. Generates ISO 20022 pacs.008 interbank transfer with Business Application Header", async () => {
    const payment = await swiftIso20022Service.generateSettlementPayment({
      nettingCycleId: testCycleId,
      tenantId,
      paymentType: "PACS_008",
    });

    expect(payment.messageType).toBe("PACS_008");
    expect(payment.payloadXml).toContain("pacs.008.001.08");
    expect(payment.payloadXml).toContain("<FIToFICstmrCdtTrf>");
  });

  it("3. Ingests camt.053 electronic bank statement and reconciles open AP/AR invoice", async () => {
    const syntheticCamtXml = generateCamt053Xml({
      statementId: `STMT-${Date.now()}`,
      electronicSequenceNumber: 1,
      creationDateTime: new Date().toISOString(),
      accountIban: "ES1221000418450200051332",
      accountCurrency: "EUR",
      accountServicerBic: "ATLAESMMXXX",
      openingBalance: {
        amount: 100000.0,
        currency: "EUR",
        date: "2026-11-20",
      },
      closingBalance: {
        amount: 106800.5,
        currency: "EUR",
        date: "2026-11-21",
      },
      entries: [
        {
          amount: 6800.5,
          currency: "EUR",
          creditDebitIndicator: "CRDT",
          bookingDate: "2026-11-21",
          entryReference: testInvoiceRef,
          remittanceInfo: testInvoiceRef,
        },
        {
          amount: 1500.0,
          currency: "EUR",
          creditDebitIndicator: "CRDT",
          bookingDate: "2026-11-21",
          entryReference: "UNMATCHED-REF-999",
        },
      ],
    });

    const result = await swiftIso20022Service.ingestBankStatement(
      syntheticCamtXml,
      tenantId,
    );

    expect(result.totalEntriesCount).toBe(2);
    expect(result.reconciledCount).toBe(1);
    expect(result.unmatchedCount).toBe(1);

    // Verify clearing entry was marked SETTLED
    const [clearingEntry] = await db
      .select()
      .from(financialClearingEntries)
      .where(eq(financialClearingEntries.reference, testInvoiceRef));
    expect(clearingEntry.status).toBe("SETTLED");

    // Verify bank statement entries table
    const statementRecords = await db
      .select()
      .from(bankStatementEntries)
      .where(eq(bankStatementEntries.statementId, result.statementId));
    expect(statementRecords).toHaveLength(2);

    const reconciledItem = statementRecords.find(
      (r) => r.reconciliationStatus === "RECONCILED",
    );
    expect(reconciledItem).toBeDefined();
    expect(reconciledItem?.amount).toBe(6800.5);
    expect(reconciledItem?.matchedInvoiceId).toBe(clearingEntry.id);
  });

  it("4. Translates raw SWIFT MT messages into ISO 20022 XML", () => {
    const rawMt103 = `{1:F01ATLAESMMXXXX0001000001}{2:I103BNPAFRPPXXXXN}{4:
:20:TRX103TEST
:23B:CRED
:32A:261124EUR5000,00
:50K:/ES1221000418450200051332
SHIPPERS CORP
BARCELONA, ES
:59:/FR7630006000011234567890189
CONSIGNEE LOGISTICS
PARIS, FR
:71A:SHA
-}`;

    const { xml, hash } = swiftIso20022Service.translateMtMessage(
      rawMt103,
      "PACS_008",
    );
    expect(xml).toContain("<FIToFICstmrCdtTrf>");
    expect(xml).toContain("5000.00");
    expect(hash).toHaveLength(64);
  });
});

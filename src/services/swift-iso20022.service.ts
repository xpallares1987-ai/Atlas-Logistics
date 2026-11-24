/**
 * @file swift-iso20022.service.ts
 * @description Banking clearing service orchestrating ISO 20022 settlement payments (pain.001 / pacs.008),
 * electronic bank statement ingestion & automatic AP/AR reconciliation (camt.053), and Transactional Outbox integration.
 * @module @atlas/api/services/swift-iso20022
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import crypto from "node:crypto";
import { db } from "../db/index.js";
import { eq, and, desc } from "drizzle-orm";
import {
  bankingTransmissions,
  bankStatementEntries,
  bilateralNettingCycles,
  financialClearingEntries,
} from "../db/schema/financial_clearing.js";
import { outboxStreamBus } from "../events/outbox-stream.bus.js";
import { DEFAULT_OPERATOR_ACTOR } from "../scm/kernel/primitives.js";
import {
  translateMt103ToPain001Xml,
  translateMt103ToPacs008Xml,
  translateMt700ToTsmt019Xml,
  parseSwiftMt103,
  parseSwiftMt700,
  parseCamt053Xml,
  buildBusinessApplicationHeaderXml,
  type ParsedMt103,
  type ParsedCamt053,
} from "../scm/engines/swift-iso20022.engine.js";

export interface SettlementPaymentOptions {
  nettingCycleId: string;
  tenantId?: string;
  paymentType?: "PAIN_001" | "PACS_008";
  senderBic?: string;
  receiverBic?: string;
}

export interface StatementReconciliationResult {
  statementId: string;
  totalEntriesCount: number;
  reconciledCount: number;
  unmatchedCount: number;
  entries: Array<typeof bankStatementEntries.$inferSelect>;
}

export class SwiftIso20022Service {
  /**
   * Generates a compliant ISO 20022 payment initiation or interbank transfer for a settled netting cycle.
   */
  async generateSettlementPayment(
    options: SettlementPaymentOptions,
  ): Promise<typeof bankingTransmissions.$inferSelect> {
    const tenantId = options.tenantId || "tenant-default";
    const paymentType = options.paymentType || "PAIN_001";
    const senderBic = options.senderBic || "ATLAESMMXXX";
    const receiverBic = options.receiverBic || "BNPAFRPPXXX";

    // 1. Fetch Netting Cycle
    const [cycle] = await db
      .select()
      .from(bilateralNettingCycles)
      .where(
        and(
          eq(bilateralNettingCycles.id, options.nettingCycleId),
          eq(bilateralNettingCycles.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!cycle) {
      throw new Error(`Netting cycle ${options.nettingCycleId} not found`);
    }

    const transmissionNumber = `TRX-ISO-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const bahMessageId = `BAH-${transmissionNumber}`;
    const today = new Date().toISOString().slice(0, 10);

    // 2. Synthesize ParsedMt103 domain representation from Netting Cycle
    const syntheticMt103: ParsedMt103 = {
      senderReference: cycle.settlementReference || transmissionNumber,
      bankOperationCode: "CRED",
      valueDate: today,
      currency: cycle.baseCurrency || "EUR",
      instructedAmount: cycle.netSettlementAmount,
      orderingCustomer: {
        name: cycle.netPayer || cycle.participantA,
        addressLines: ["Atlas Netting Operating Entity", "Barcelona, Spain"],
        accountOrIban: "ES1221000418450200051332",
        bic: senderBic,
      },
      orderingInstitutionBic: senderBic,
      accountWithInstitutionBic: receiverBic,
      beneficiaryCustomer: {
        name: cycle.netReceiver || cycle.participantB,
        addressLines: ["Global Forwarding Partner Hub", "Paris, France"],
        accountOrIban: "FR7630006000011234567890189",
        bic: receiverBic,
      },
      remittanceInformation: `Netting settlement for cycle ${cycle.id} ref ${cycle.settlementReference || "NET"}`,
      chargeDetails: "SHA",
    };

    // 3. Build XML Documents (BAH + Document)
    const bahXml = buildBusinessApplicationHeaderXml({
      businessMessageIdentifier: bahMessageId,
      messageDefinitionIdentifier:
        paymentType === "PACS_008" ? "pacs.008.001.08" : "pain.001.001.09",
      senderBic,
      receiverBic,
    });

    const docXml =
      paymentType === "PACS_008"
        ? translateMt103ToPacs008Xml(syntheticMt103, transmissionNumber)
        : translateMt103ToPain001Xml(syntheticMt103, transmissionNumber);

    const fullPayloadXml = `${bahXml}\n${docXml}`;
    const payloadHashSha256 = crypto
      .createHash("sha256")
      .update(fullPayloadXml, "utf8")
      .digest("hex");

    // 4. Persist in database
    const transmissionRecord: typeof bankingTransmissions.$inferSelect = {
      id: `bt_${crypto.randomUUID()}`,
      tenantId,
      transmissionNumber,
      nettingCycleId: cycle.id,
      messageType: paymentType,
      bahMessageId,
      senderBic,
      receiverBic,
      totalAmount: cycle.netSettlementAmount,
      currency: cycle.baseCurrency as
        "USD" | "EUR" | "GBP" | "JPY" | "CHF" | "CAD" | "AUD" | "CNY",
      payloadXml: fullPayloadXml,
      payloadHashSha256,
      status: "PENDING" as const,
      failureReason: null,
      transmittedAt: null,
      ackReceivedAt: null,
      metadata: {
        netPayer: cycle.netPayer,
        netReceiver: cycle.netReceiver,
        reconciledTransactionsCount: cycle.reconciledTransactionsCount,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(bankingTransmissions).values(transmissionRecord);

    // 5. Publish to Transactional Outbox
    await outboxStreamBus.publish({
      eventType: "financial.banking.payment_initiated",
      aggregateType: "banking_transmission",
      aggregateId: transmissionRecord.id,
      producerContext: "financial-clearing",
      payload: {
        tenantId,
        transmissionNumber,
        messageType: paymentType,
        totalAmount: cycle.netSettlementAmount,
        currency: cycle.baseCurrency,
        senderBic,
        receiverBic,
        sha256: payloadHashSha256,
        actor: DEFAULT_OPERATOR_ACTOR,
      },
    });

    return transmissionRecord;
  }

  /**
   * Ingests an ISO 20022 camt.053 XML electronic bank statement and reconciles matched invoices.
   */
  async ingestBankStatement(
    xmlContent: string,
    tenantId = "tenant-default",
  ): Promise<StatementReconciliationResult> {
    const parsed: ParsedCamt053 = parseCamt053Xml(xmlContent);

    let reconciledCount = 0;
    let unmatchedCount = 0;
    const insertedEntries: Array<typeof bankStatementEntries.$inferSelect> = [];

    for (const entry of parsed.entries) {
      const entryId = `bse_${crypto.randomUUID()}`;
      let reconciliationStatus:
        "UNMATCHED" | "RECONCILED" | "PARTIALLY_MATCHED" = "UNMATCHED";
      let matchedInvoiceId: string | undefined;

      // Match against open Financial Clearing entries by reference or endToEndId
      if (entry.endToEndId || entry.remittanceInfo) {
        const candidateRef = entry.endToEndId || entry.remittanceInfo;
        if (candidateRef) {
          const [matched] = await db
            .select()
            .from(financialClearingEntries)
            .where(
              and(
                eq(financialClearingEntries.tenantId, tenantId),
                eq(financialClearingEntries.reference, candidateRef),
              ),
            )
            .limit(1);

          if (matched) {
            matchedInvoiceId = matched.id;
            reconciliationStatus = "RECONCILED";
            reconciledCount++;

            // Update matching clearing entry to SETTLED
            await db
              .update(financialClearingEntries)
              .set({
                status: "SETTLED",
                updatedAt: new Date().toISOString(),
              })
              .where(eq(financialClearingEntries.id, matched.id));
          }
        }
      }

      if (reconciliationStatus === "UNMATCHED") {
        unmatchedCount++;
      }

      const record: typeof bankStatementEntries.$inferInsert = {
        id: entryId,
        tenantId,
        statementId: parsed.statementId || parsed.messageId || "STMT-UNKNOWN",
        bookingDate: entry.bookingDate || new Date().toISOString().slice(0, 10),
        valueDate: entry.bookingDate || new Date().toISOString().slice(0, 10),
        creditDebitIndicator: entry.creditDebitIndicator,
        amount: entry.amount,
        currency: (entry.currency || parsed.accountCurrency || "EUR") as
          "USD" | "EUR" | "GBP" | "JPY" | "CHF" | "CAD" | "AUD" | "CNY",
        accountIban: parsed.accountIban,
        accountBic: parsed.accountServicerBic,
        endToEndId: entry.endToEndId,
        remittanceInformation: entry.remittanceInfo,
        reconciliationStatus,
        matchedInvoiceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.insert(bankStatementEntries).values(record);
      insertedEntries.push(record as typeof bankStatementEntries.$inferSelect);
    }

    // Publish reconciliation outbox event
    await outboxStreamBus.publish({
      eventType: "financial.banking.statement_reconciled",
      aggregateType: "bank_statement",
      aggregateId: parsed.statementId || parsed.messageId,
      producerContext: "financial-clearing",
      payload: {
        tenantId,
        statementId: parsed.statementId,
        totalEntries: parsed.entries.length,
        reconciledCount,
        unmatchedCount,
        actor: DEFAULT_OPERATOR_ACTOR,
      },
    });

    return {
      statementId: parsed.statementId || parsed.messageId,
      totalEntriesCount: parsed.entries.length,
      reconciledCount,
      unmatchedCount,
      entries: insertedEntries,
    };
  }

  /**
   * Translates incoming legacy SWIFT MT message into compliant ISO 20022 XML.
   */
  translateMtMessage(
    rawMt: string,
    targetType: "PACS_008" | "PAIN_001" | "TSMT_019",
  ): { xml: string; hash: string } {
    let xml = "";
    if (targetType === "TSMT_019") {
      const mt700 = parseSwiftMt700(rawMt);
      xml = translateMt700ToTsmt019Xml(mt700);
    } else if (targetType === "PACS_008") {
      const mt103 = parseSwiftMt103(rawMt);
      xml = translateMt103ToPacs008Xml(mt103);
    } else {
      const mt103 = parseSwiftMt103(rawMt);
      xml = translateMt103ToPain001Xml(mt103);
    }

    const hash = crypto.createHash("sha256").update(xml, "utf8").digest("hex");
    return { xml, hash };
  }

  /**
   * Lists banking transmissions with optional pagination.
   */
  async listTransmissions(
    tenantId = "tenant-default",
    limit = 50,
  ): Promise<Array<typeof bankingTransmissions.$inferSelect>> {
    return db
      .select()
      .from(bankingTransmissions)
      .where(eq(bankingTransmissions.tenantId, tenantId))
      .orderBy(desc(bankingTransmissions.createdAt))
      .limit(limit);
  }

  /**
   * Retrieves single transmission record by ID.
   */
  async getTransmissionDetails(
    id: string,
    tenantId = "tenant-default",
  ): Promise<typeof bankingTransmissions.$inferSelect | null> {
    const [record] = await db
      .select()
      .from(bankingTransmissions)
      .where(
        and(
          eq(bankingTransmissions.id, id),
          eq(bankingTransmissions.tenantId, tenantId),
        ),
      )
      .limit(1);

    return record || null;
  }

  /**
   * Lists ingested bank statement entries.
   */
  async listStatementEntries(
    tenantId = "tenant-default",
    limit = 50,
  ): Promise<Array<typeof bankStatementEntries.$inferSelect>> {
    return db
      .select()
      .from(bankStatementEntries)
      .where(eq(bankStatementEntries.tenantId, tenantId))
      .orderBy(desc(bankStatementEntries.createdAt))
      .limit(limit);
  }
}

export const swiftIso20022Service = new SwiftIso20022Service();

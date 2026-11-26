/**
 * @file swift-iso20022.service.ts
 * @description Banking clearing service orchestrating ISO 20022 settlement payments (pain.001 / pacs.008),
 * electronic bank statement ingestion & automatic AP/AR reconciliation (camt.053), and Transactional Outbox integration.
 * @module @atlas/api/services/swift-iso20022
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import crypto from "node:crypto";
import { db } from "../db/index.js";
import { eq, and, desc, or } from "drizzle-orm";
import {
  bankingTransmissions,
  bankStatementEntries,
  bilateralNettingCycles,
  financialClearingEntries,
} from "../db/schema/financial_clearing.js";
import { cbamCertificateInventory } from "../db/schema/cbam.js";
import { fuelEuPenaltiesLedger } from "../db/schema/fueleu_maritime.js";
import {
  tradeCreditInstruments,
  tradeDiscrepancies,
} from "../db/schema/trade_finance.js";
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

export interface CbamPaymentOptions {
  lotId: string;
  tenantId?: string;
  debtorName: string;
  debtorIban: string;
  debtorBic: string;
  creditorNcaName?: string;
  creditorNcaIban?: string;
  creditorNcaBic?: string;
}

export interface FuelEuPenaltyPaymentOptions {
  penaltyId: string;
  tenantId?: string;
  debtorName: string;
  debtorIban: string;
  debtorBic: string;
  creditorFundName?: string;
  creditorFundIban?: string;
  creditorFundBic?: string;
}

export interface TradeCreditPaymentOptions {
  instrumentId: string;
  tenantId?: string;
  debtorIban?: string;
  debtorBic?: string;
  creditorIban?: string;
  creditorBic?: string;
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
   * Generates a compliant ISO 20022 pain.001 wire payment initiation for settling a CBAM Certificate Lot.
   */
  async generateCbamCertificatePayment(
    options: CbamPaymentOptions,
  ): Promise<typeof bankingTransmissions.$inferSelect> {
    const tenantId = options.tenantId || "tenant-default";

    // 1. Fetch Lot from inventory
    const [lot] = await db
      .select()
      .from(cbamCertificateInventory)
      .where(
        and(
          eq(cbamCertificateInventory.id, options.lotId),
          eq(cbamCertificateInventory.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!lot) {
      throw new Error(`CBAM Certificate Lot ${options.lotId} not found`);
    }

    const transmissionNumber = `TRX-CBAM-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const bahMessageId = `BAH-${transmissionNumber}`;
    const today = new Date().toISOString().slice(0, 10);
    const creditorNcaName =
      options.creditorNcaName ||
      `National Competent Authority (${lot.ncaRegistryAccountId})`;
    const creditorNcaIban =
      options.creditorNcaIban || "ES9121000418450200051332";
    const creditorNcaBic = options.creditorNcaBic || "BACESMMXXXX";

    // 2. Synthesize ParsedMt103 representation
    const syntheticMt103: ParsedMt103 = {
      senderReference: lot.lotReference || transmissionNumber,
      bankOperationCode: "CRED",
      valueDate: today,
      currency: "EUR",
      instructedAmount: lot.totalCostEur,
      orderingCustomer: {
        name: options.debtorName,
        addressLines: ["Atlas Carbon Operations Hub", "Valencia, Spain"],
        accountOrIban: options.debtorIban,
        bic: options.debtorBic,
      },
      orderingInstitutionBic: options.debtorBic,
      accountWithInstitutionBic: creditorNcaBic,
      beneficiaryCustomer: {
        name: creditorNcaName,
        addressLines: [
          "EU CBAM National Registry Treasury",
          "Brussels / Madrid",
        ],
        accountOrIban: creditorNcaIban,
        bic: creditorNcaBic,
      },
      remittanceInformation: `CBAM Lot ${lot.lotReference} / ${lot.quantityPurchased} certs / RegAcc ${lot.ncaRegistryAccountId}`,
      chargeDetails: "SHA",
    };

    // 3. Build XML Documents
    const bahXml = buildBusinessApplicationHeaderXml({
      businessMessageIdentifier: bahMessageId,
      messageDefinitionIdentifier: "pain.001.001.09",
      senderBic: options.debtorBic,
      receiverBic: creditorNcaBic,
    });

    const docXml = translateMt103ToPain001Xml(syntheticMt103);
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n<AppHdrAndDoc xmlns="urn:iso:std:iso:20022:tech:xsd:head.001.001.02">\n${bahXml}\n${docXml}\n</AppHdrAndDoc>`;
    const payloadHash = crypto
      .createHash("sha256")
      .update(fullXml, "utf8")
      .digest("hex");
    const transmissionId = `btx_${crypto.randomUUID()}`;

    // 4. Insert into banking_transmissions and link to lot
    const record: typeof bankingTransmissions.$inferInsert = {
      id: transmissionId,
      tenantId,
      transmissionNumber,
      nettingCycleId: null,
      messageType: "PAIN_001",
      bahMessageId,
      senderBic: options.debtorBic,
      receiverBic: creditorNcaBic,
      totalAmount: lot.totalCostEur,
      currency: "EUR",
      payloadXml: fullXml,
      payloadHashSha256: payloadHash,
      status: "PENDING",
      metadata: {
        category: "CBAM_CERTIFICATE_PURCHASE",
        lotId: lot.id,
        lotReference: lot.lotReference,
        quantityPurchased: lot.quantityPurchased,
        unitPriceEur: lot.unitPriceEur,
        ncaRegistryAccountId: lot.ncaRegistryAccountId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(bankingTransmissions).values(record);

    await db
      .update(cbamCertificateInventory)
      .set({
        bankingTransmissionId: transmissionId,
        paymentReference: transmissionNumber,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cbamCertificateInventory.id, lot.id));

    // 5. Publish to Outbox
    await outboxStreamBus.publish({
      eventType: "financial.iso20022.cbam_payment_initiated.v1",
      aggregateType: "banking_transmission",
      aggregateId: transmissionId,
      producerContext: "cbam-clearing",
      payload: {
        transmissionId,
        transmissionNumber,
        lotId: lot.id,
        lotReference: lot.lotReference,
        totalCostEur: lot.totalCostEur,
        debtorIban: options.debtorIban,
        creditorNcaIban,
        actor: DEFAULT_OPERATOR_ACTOR,
      },
    });

    return record as typeof bankingTransmissions.$inferSelect;
  }

  /**
   * Generates a compliant ISO 20022 pain.001 wire payment initiation for settling FuelEU Maritime Penalties.
   */
  async generateFuelEuPenaltyPayment(
    options: FuelEuPenaltyPaymentOptions,
  ): Promise<typeof bankingTransmissions.$inferSelect> {
    const tenantId = options.tenantId || "tenant-default";

    // 1. Fetch Penalty from ledger
    const [penalty] = await db
      .select()
      .from(fuelEuPenaltiesLedger)
      .where(eq(fuelEuPenaltiesLedger.id, options.penaltyId))
      .limit(1);

    if (!penalty) {
      throw new Error(`FuelEU Penalty ${options.penaltyId} not found`);
    }

    const transmissionNumber = `TRX-FUELEU-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const bahMessageId = `BAH-${transmissionNumber}`;
    const today = new Date().toISOString().slice(0, 10);
    const creditorFundName =
      options.creditorFundName || "EU Innovation Fund - FuelEU Maritime Escrow";
    const creditorFundIban = options.creditorFundIban || "BE68539007547034";
    const creditorFundBic = options.creditorFundBic || "EUEBBE22XXX";

    // 2. Synthesize ParsedMt103 representation
    const syntheticMt103: ParsedMt103 = {
      senderReference: penalty.settlementReference || transmissionNumber,
      bankOperationCode: "CRED",
      valueDate: today,
      currency: "EUR",
      instructedAmount: penalty.netPayableEur,
      orderingCustomer: {
        name: options.debtorName,
        addressLines: ["Atlas Maritime Operations", "Barcelona, Spain"],
        accountOrIban: options.debtorIban,
        bic: options.debtorBic,
      },
      orderingInstitutionBic: options.debtorBic,
      accountWithInstitutionBic: creditorFundBic,
      beneficiaryCustomer: {
        name: creditorFundName,
        addressLines: ["European Commission DG CLIMA", "Brussels, Belgium"],
        accountOrIban: creditorFundIban,
        bic: creditorFundBic,
      },
      remittanceInformation: `FuelEU Art23 Penalty ${penalty.settlementReference} / Year ${penalty.reportingYear} / Deficit ${penalty.vlsfoEquivalentDeficitTonnes.toFixed(2)}t`,
      chargeDetails: "SHA",
    };

    // 3. Build XML Documents
    const bahXml = buildBusinessApplicationHeaderXml({
      businessMessageIdentifier: bahMessageId,
      messageDefinitionIdentifier: "pain.001.001.09",
      senderBic: options.debtorBic,
      receiverBic: creditorFundBic,
    });

    const docXml = translateMt103ToPain001Xml(syntheticMt103);
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n<AppHdrAndDoc xmlns="urn:iso:std:iso:20022:tech:xsd:head.001.001.02">\n${bahXml}\n${docXml}\n</AppHdrAndDoc>`;
    const payloadHash = crypto
      .createHash("sha256")
      .update(fullXml, "utf8")
      .digest("hex");
    const transmissionId = `btx_${crypto.randomUUID()}`;

    // 4. Insert into banking_transmissions and link to penalty
    const record: typeof bankingTransmissions.$inferInsert = {
      id: transmissionId,
      tenantId,
      transmissionNumber,
      nettingCycleId: null,
      messageType: "PAIN_001",
      bahMessageId,
      senderBic: options.debtorBic,
      receiverBic: creditorFundBic,
      totalAmount: penalty.netPayableEur,
      currency: "EUR",
      payloadXml: fullXml,
      payloadHashSha256: payloadHash,
      status: "PENDING",
      metadata: {
        category: "FUELEU_MARITIME_PENALTY",
        penaltyId: penalty.id,
        settlementReference: penalty.settlementReference,
        reportingYear: penalty.reportingYear,
        vlsfoEquivalentDeficitTonnes: penalty.vlsfoEquivalentDeficitTonnes,
        statutoryPenaltyRateEurPerTonne:
          penalty.statutoryPenaltyRateEurPerTonne,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(bankingTransmissions).values(record);

    await db
      .update(fuelEuPenaltiesLedger)
      .set({
        bankingTransmissionId: transmissionId,
      })
      .where(eq(fuelEuPenaltiesLedger.id, penalty.id));

    // 5. Publish to Outbox
    await outboxStreamBus.publish({
      eventType: "financial.iso20022.fueleu_payment_initiated.v1",
      aggregateType: "banking_transmission",
      aggregateId: transmissionId,
      producerContext: "fueleu-clearing",
      payload: {
        transmissionId,
        transmissionNumber,
        penaltyId: penalty.id,
        settlementReference: penalty.settlementReference,
        netPayableEur: penalty.netPayableEur,
        debtorIban: options.debtorIban,
        creditorFundIban,
        actor: DEFAULT_OPERATOR_ACTOR,
      },
    });

    return record as typeof bankingTransmissions.$inferSelect;
  }

  /**
   * Generates a compliant ISO 20022 pacs.008 interbank customer credit transfer
   * to honour and settle a verified Documentary Letter of Credit (LC) under UCP 600 rules.
   */
  async generateTradeCreditSettlementPayment(
    options: TradeCreditPaymentOptions,
  ): Promise<typeof bankingTransmissions.$inferSelect> {
    const tenantId = options.tenantId || "tenant-default";

    // 1. Fetch Letter of Credit Instrument
    const [instrument] = await db
      .select()
      .from(tradeCreditInstruments)
      .where(eq(tradeCreditInstruments.id, options.instrumentId))
      .limit(1);

    if (!instrument) {
      throw new Error(
        `Trade credit instrument ${options.instrumentId} not found`,
      );
    }

    // 2. Assert Instrument Compliance State under UCP 600
    if (instrument.status === "HONOURED_PAID") {
      throw new Error(
        `Trade credit instrument ${instrument.instrumentReference} has already been honoured and settled.`,
      );
    }

    if (instrument.status === "DISCREPANCIES_FOUND") {
      // Check if all recorded discrepancies have been waived by applicant
      const openDiscrepancies = await db
        .select()
        .from(tradeDiscrepancies)
        .where(
          and(
            eq(tradeDiscrepancies.instrumentId, instrument.id),
            or(
              eq(tradeDiscrepancies.status, "OPEN"),
              eq(tradeDiscrepancies.status, "WAIVER_REQUESTED"),
              eq(tradeDiscrepancies.status, "REJECTED_REFUSAL"),
            ),
          ),
        );

      if (openDiscrepancies.length > 0) {
        throw new Error(
          `Cannot honour instrument ${instrument.instrumentReference}: contains ${openDiscrepancies.length} unresolved/unwaived UCP 600 discrepancies.`,
        );
      }
    } else if (
      instrument.status !== "ACCEPTED" &&
      instrument.status !== "DOCUMENTS_PRESENTED"
    ) {
      throw new Error(
        `Cannot honour instrument ${instrument.instrumentReference}: current status is '${instrument.status}', expected 'ACCEPTED' or compliant presentation.`,
      );
    }

    const transmissionNumber = `TRX-LC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const bahMessageId = `BAH-${transmissionNumber}`;
    const today = new Date().toISOString().slice(0, 10);

    const debtorBic =
      options.debtorBic || instrument.issuingBankBic || "ATLAESMMXXX";
    const debtorIban = options.debtorIban || "ES9121000418450200051332";
    const creditorBic =
      options.creditorBic || instrument.confirmingBankBic || "BNPAFRPPXXX";
    const creditorIban = options.creditorIban || "FR7630006000011234567890189";

    // 3. Synthesize ParsedMt103 for interbank payment execution
    const syntheticMt103: ParsedMt103 = {
      senderReference: instrument.instrumentReference,
      bankOperationCode: "CRED",
      valueDate: today,
      currency: instrument.currency || "EUR",
      instructedAmount: instrument.creditAmount,
      orderingCustomer: {
        name: instrument.applicantName || "Atlas Operations Hub",
        addressLines: ["Avenida del Puerto 120", "Valencia, Spain"],
        accountOrIban: debtorIban,
        bic: debtorBic,
      },
      orderingInstitutionBic: debtorBic,
      accountWithInstitutionBic: creditorBic,
      beneficiaryCustomer: {
        name: instrument.beneficiaryName || "International Trade Beneficiary",
        addressLines: ["Trade Finance Hub", "Marseille, France"],
        accountOrIban: creditorIban,
        bic: creditorBic,
      },
      remittanceInformation: `Honouring LC ${instrument.instrumentReference} / UCP600 / Beneficiary ${instrument.beneficiaryName}`,
      chargeDetails: "SHA",
    };

    // 4. Build ISO 20022 BAH (head.001.001.02) and pacs.008.001.08 XML
    const bahXml = buildBusinessApplicationHeaderXml({
      businessMessageIdentifier: bahMessageId,
      messageDefinitionIdentifier: "pacs.008.001.08",
      senderBic: debtorBic,
      receiverBic: creditorBic,
    });

    const docXml = translateMt103ToPacs008Xml(syntheticMt103);
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n<AppHdrAndDoc xmlns="urn:iso:std:iso:20022:tech:xsd:head.001.001.02">\n${bahXml}\n${docXml}\n</AppHdrAndDoc>`;
    const payloadHash = crypto
      .createHash("sha256")
      .update(fullXml, "utf8")
      .digest("hex");
    const transmissionId = `btx_${crypto.randomUUID()}`;

    // 5. Insert record into banking_transmissions
    const record: typeof bankingTransmissions.$inferInsert = {
      id: transmissionId,
      tenantId,
      transmissionNumber,
      nettingCycleId: null,
      messageType: "PACS_008",
      bahMessageId,
      senderBic: debtorBic,
      receiverBic: creditorBic,
      totalAmount: instrument.creditAmount,
      currency: (instrument.currency as "EUR" | "USD" | "GBP") || "EUR",
      payloadXml: fullXml,
      payloadHashSha256: payloadHash,
      status: "ACKED",
      transmittedAt: new Date().toISOString(),
      ackReceivedAt: new Date().toISOString(),
      metadata: {
        category: "TRADE_CREDIT_SETTLEMENT",
        instrumentId: instrument.id,
        instrumentReference: instrument.instrumentReference,
        instrumentType: instrument.instrumentType,
        applicantName: instrument.applicantName,
        beneficiaryName: instrument.beneficiaryName,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(bankingTransmissions).values(record);

    // 6. Transition instrument status to HONOURED_PAID
    await db
      .update(tradeCreditInstruments)
      .set({
        status: "HONOURED_PAID",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tradeCreditInstruments.id, instrument.id));

    // 7. Dispatch Outbox Event
    await outboxStreamBus.publish({
      eventType: "financial.iso20022.trade_credit_honoured.v1",
      aggregateType: "trade_credit_instrument",
      aggregateId: instrument.id,
      producerContext: "trade-finance-clearing",
      payload: {
        transmissionId,
        transmissionNumber,
        instrumentId: instrument.id,
        instrumentReference: instrument.instrumentReference,
        creditAmount: instrument.creditAmount,
        currency: instrument.currency,
        debtorIban,
        creditorIban,
        actor: DEFAULT_OPERATOR_ACTOR,
      },
    });

    return record as typeof bankingTransmissions.$inferSelect;
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

      // Extract all candidate references from endToEndId, entryReference, and remittanceInfo
      const candidateRefs = [
        entry.endToEndId,
        entry.entryReference,
        entry.remittanceInfo,
      ].filter((ref): ref is string => Boolean(ref && ref.trim().length > 0));

      for (const candidateRef of candidateRefs) {
        if ((reconciliationStatus as string) === "RECONCILED") break;

        // 1. Tier 1: Match against open Financial Clearing entries by reference
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

          await db
            .update(financialClearingEntries)
            .set({
              status: "SETTLED",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(financialClearingEntries.id, matched.id));
          break;
        }

        // 2. Tier 2: Match against CBAM Certificate Inventory lots by lotReference or paymentReference
        const [matchedLot] = await db
          .select()
          .from(cbamCertificateInventory)
          .where(
            and(
              eq(cbamCertificateInventory.tenantId, tenantId),
              or(
                eq(cbamCertificateInventory.lotReference, candidateRef),
                eq(cbamCertificateInventory.paymentReference, candidateRef),
              ),
            ),
          )
          .limit(1);

        if (matchedLot) {
          matchedInvoiceId = matchedLot.id;
          reconciliationStatus = "RECONCILED";
          reconciledCount++;

          await db
            .update(cbamCertificateInventory)
            .set({
              status: "ACTIVE",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(cbamCertificateInventory.id, matchedLot.id));
          break;
        }

        // 3. Tier 3: Match against FuelEU Maritime Penalties ledger by settlementReference
        const [matchedPenalty] = await db
          .select()
          .from(fuelEuPenaltiesLedger)
          .where(eq(fuelEuPenaltiesLedger.settlementReference, candidateRef))
          .limit(1);

        if (matchedPenalty) {
          matchedInvoiceId = matchedPenalty.id;
          reconciliationStatus = "RECONCILED";
          reconciledCount++;

          await db
            .update(fuelEuPenaltiesLedger)
            .set({
              paymentStatus: "PAID_TO_EU_FUND",
              settledAt: new Date().toISOString(),
            })
            .where(eq(fuelEuPenaltiesLedger.id, matchedPenalty.id));
          break;
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

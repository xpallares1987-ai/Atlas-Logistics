/**
 * @file banking.seed.ts
 * @description Master database seeders for SWIFT ISO 20022 Banking Transmissions,
 * Bilateral Netting Cycles, and Electronic Bank Statement Reconciliation (camt.053).
 * @module @atlas/db/seeds/banking
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import {
  translateMt103ToPain001Xml,
  translateMt103ToPacs008Xml,
  translateMt700ToTsmt019Xml,
  buildBusinessApplicationHeaderXml,
  type ParsedMt103,
  type ParsedMt700,
} from "../../scm/engines/swift-iso20022.engine.js";

export async function seedBanking(): Promise<void> {
  console.log(
    "🏦 [PHASE 4/FINANCE] Inyectando Ciclos de Netting Bilateral, Transmisiones ISO 20022 y Extractos Bancarios (camt.053)...",
  );

  // 1. Ensure canonical companies exist defensively
  const [compA] = await db
    .select({ id: schema.companies.id })
    .from(schema.companies)
    .where(sql`id = 'c-1'`)
    .limit(1);

  const [compB] = await db
    .select({ id: schema.companies.id })
    .from(schema.companies)
    .where(sql`id = 'c-2'`)
    .limit(1);

  const participantA = compA?.id || "c-1";
  const participantB = compB?.id || "c-2";

  // 2. Seed Bilateral Netting Cycle
  const nettingCycleId = "bnc_demo_01";
  await db
    .insert(schema.bilateralNettingCycles)
    .values({
      id: nettingCycleId,
      tenantId: "tenant-default",
      baseCurrency: "EUR",
      participantA,
      participantB,
      grossVolumeAtoB: 125000.0,
      grossVolumeBtoA: 76500.0,
      netPayer: participantA,
      netReceiver: participantB,
      netSettlementAmount: 48500.0,
      reconciledTransactionsCount: 14,
      transactionIds: [
        "inv-101",
        "inv-102",
        "inv-103",
        "inv-104",
        "inv-105",
        "inv-106",
      ],
      status: "SETTLED",
      settlementReference: "NET-SETTLE-2026-08",
      clearedAt: "2026-08-28 10:00:00",
    })
    .onConflictDoUpdate({
      target: schema.bilateralNettingCycles.id,
      set: {
        grossVolumeAtoB: 125000.0,
        grossVolumeBtoA: 76500.0,
        netSettlementAmount: 48500.0,
        status: "SETTLED",
        clearedAt: "2026-08-28 10:00:00",
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

  // 3. Generate Compliant XML for Transmissions
  const mt103Pain: ParsedMt103 = {
    senderReference: "TRX-ISO-20260828-PAIN001",
    bankOperationCode: "CRED",
    valueDate: "2026-08-28",
    currency: "EUR",
    instructedAmount: 48500.0,
    orderingCustomer: {
      accountOrIban: "ES7621000418450200051332",
      name: "Atlas Logistics Iberia S.L.U.",
      addressLines: ["Avenida del Puerto 45", "46024 Valencia", "ES"],
      bic: "ATLAESMMXXX",
    },
    beneficiaryCustomer: {
      accountOrIban: "FR7630006000011234567890189",
      name: "Trans-European Freight Netting Corp",
      addressLines: ["Rue de la Paix 12", "75002 Paris", "FR"],
      bic: "BNPAFRPPXXX",
    },
    remittanceInformation:
      "Bilateral Netting August 2026 Settlement bnc_demo_01",
    chargeDetails: "SHA",
  };

  const mt103Pacs: ParsedMt103 = {
    senderReference: "TRX-ISO-20260828-PACS008",
    bankOperationCode: "CRED",
    valueDate: "2026-08-28",
    currency: "USD",
    instructedAmount: 125000.0,
    orderingCustomer: {
      accountOrIban: "ES7621000418450200051332",
      name: "Atlas Logistics Iberia S.L.U.",
      addressLines: ["Avenida del Puerto 45", "Valencia", "ES"],
      bic: "ATLAESMMXXX",
    },
    beneficiaryCustomer: {
      accountOrIban: "DE89370400440532013000",
      name: "Global Interbank Clearing Frankfurt",
      addressLines: ["Taunusanlage 12", "Frankfurt", "DE"],
      bic: "DEUTDEDDXXX",
    },
    remittanceInformation: "Interbank Gross Liquidity Replenishment",
    chargeDetails: "OUR",
  };

  const mt700Tsmt: ParsedMt700 = {
    documentaryCreditNumber: "LC-2026-VAL-9912",
    formOfCredit: "IRREVOCABLE",
    issueDate: "2026-08-15",
    expiryDate: "2026-11-15",
    expiryPlace: "VALENCIA",
    applicant: {
      name: "Mediterranean Import Group S.A.",
      addressLines: ["Calle Colon 18", "Valencia", "ES"],
    },
    beneficiary: {
      name: "Shanghai Apex Heavy Industries Ltd.",
      addressLines: ["Pudong New Area 888", "Shanghai", "CN"],
    },
    currency: "USD",
    creditAmount: 89000.0,
    availableBy: "BY PAYMENT",
    partialShipmentsAllowed: true,
    transhipmentAllowed: false,
    portOfLoading: "CNSHA",
    portOfDischarge: "ESVLC",
    latestShipmentDate: "2026-10-31",
    descriptionOfGoods:
      "Automotive components and clean-tech lithium battery packaging.",
    documentsRequired: [
      "Signed Commercial Invoice in 3 originals",
      "Full set 3/3 clean on board ocean Bills of Lading to order",
      "Certificate of Origin issued by CCPIT",
    ],
  };

  const painXml = translateMt103ToPain001Xml(mt103Pain);
  const pacsXml = translateMt103ToPacs008Xml(mt103Pacs);
  const tsmtXml = translateMt700ToTsmt019Xml(mt700Tsmt);

  const painHash = crypto.createHash("sha256").update(painXml).digest("hex");
  const pacsHash = crypto.createHash("sha256").update(pacsXml).digest("hex");
  const tsmtHash = crypto.createHash("sha256").update(tsmtXml).digest("hex");

  // Synthetic MT103/PACS.008 for Trade Credit Settlement (LC-2026-HAM-0219 / lc_hamb_2026_05)
  const mt103LcPacs: ParsedMt103 = {
    senderReference: "LC-2026-HAM-0219",
    bankOperationCode: "CRED",
    valueDate: "2026-10-15",
    currency: "EUR",
    instructedAmount: 680000.0,
    orderingCustomer: {
      accountOrIban: "DE89500700100123456789",
      name: "Bavarian Precision Tools GmbH",
      addressLines: ["Industriestrasse 42", "80331 Munich", "DE"],
      bic: "DEUTDEDDXXX",
    },
    orderingInstitutionBic: "DEUTDEDDXXX",
    accountWithInstitutionBic: "BNPAESMMXXX",
    beneficiaryCustomer: {
      accountOrIban: "ES7600491500051234567890",
      name: "Iberica Heavy Industry Components SA",
      addressLines: ["Poligono Industrial El Abra", "48500 Bilbao", "ES"],
      bic: "BNPAESMMXXX",
    },
    remittanceInformation:
      "Honouring LC LC-2026-HAM-0219 / UCP 600 / Beneficiary Iberica Heavy Industry Components SA",
    chargeDetails: "SHA",
  };

  const lcBahXml = buildBusinessApplicationHeaderXml({
    businessMessageIdentifier: "BAH-TRX-LC-20261015-PACS008",
    messageDefinitionIdentifier: "pacs.008.001.08",
    senderBic: "DEUTDEDDXXX",
    receiverBic: "BNPAESMMXXX",
  });
  const lcDocXml = translateMt103ToPacs008Xml(mt103LcPacs);
  const lcPacsXml = `<?xml version="1.0" encoding="UTF-8"?>\n<AppHdrAndDoc xmlns="urn:iso:std:iso:20022:tech:xsd:head.001.001.02">\n${lcBahXml}\n${lcDocXml}\n</AppHdrAndDoc>`;
  const lcPacsHash = crypto
    .createHash("sha256")
    .update(lcPacsXml, "utf8")
    .digest("hex");

  // 4. Seed Banking Transmissions
  await db
    .insert(schema.bankingTransmissions)
    .values([
      {
        id: "trx_demo_pain001",
        tenantId: "tenant-default",
        transmissionNumber: "TRX-ISO-20260828-PAIN001",
        nettingCycleId,
        messageType: "PAIN_001",
        bahMessageId: "BAH-ATLAS-2026-001",
        senderBic: "ATLAESMMXXX",
        receiverBic: "BNPAFRPPXXX",
        totalAmount: 48500.0,
        currency: "EUR",
        payloadXml: painXml,
        payloadHashSha256: painHash,
        status: "ACKED",
        transmittedAt: "2026-08-28 10:15:00",
        ackReceivedAt: "2026-08-28 10:18:22",
        failureReason: null,
        metadata: {
          source: "Bilateral Netting August 2026",
          clearingMethod: "SEPA_CREDIT_TRANSFER",
          reconciledInvoiceCount: 14,
        },
      },
      {
        id: "trx_demo_pacs008",
        tenantId: "tenant-default",
        transmissionNumber: "TRX-ISO-20260828-PACS008",
        nettingCycleId,
        messageType: "PACS_008",
        bahMessageId: "BAH-ATLAS-2026-002",
        senderBic: "ATLAESMMXXX",
        receiverBic: "DEUTDEDDXXX",
        totalAmount: 125000.0,
        currency: "USD",
        payloadXml: pacsXml,
        payloadHashSha256: pacsHash,
        status: "TRANSMITTED",
        transmittedAt: "2026-08-28 11:00:00",
        ackReceivedAt: null,
        failureReason: null,
        metadata: {
          source: "Interbank Netting Liquidity Settlement",
          clearingSystem: "TARGET2_CORRESPONDENT",
        },
      },
      {
        id: "trx_demo_tsmt019",
        tenantId: "tenant-default",
        transmissionNumber: "TRX-ISO-20260828-TSMT019",
        nettingCycleId: null,
        messageType: "TSMT_019",
        bahMessageId: "BAH-ATLAS-2026-003",
        senderBic: "CHASTOPPXXX",
        receiverBic: "ATLAESMMXXX",
        totalAmount: 89000.0,
        currency: "USD",
        payloadXml: tsmtXml,
        payloadHashSha256: tsmtHash,
        status: "ACKED",
        transmittedAt: "2026-08-28 14:30:00",
        ackReceivedAt: "2026-08-28 14:35:00",
        failureReason: null,
        metadata: {
          letterOfCreditNumber: "LC-2026-VAL-9912",
          shipmentId: "sh_demo_01",
          goodsCategory: "CLEAN_TECH_BATTERIES",
        },
      },
      {
        id: "btx_lc_demo_01",
        tenantId: "tenant-default",
        transmissionNumber: "TRX-LC-20261015-PACS008",
        nettingCycleId: null,
        messageType: "PACS_008",
        bahMessageId: "BAH-TRX-LC-20261015-PACS008",
        senderBic: "DEUTDEDDXXX",
        receiverBic: "BNPAESMMXXX",
        totalAmount: 680000.0,
        currency: "EUR",
        payloadXml: lcPacsXml,
        payloadHashSha256: lcPacsHash,
        status: "ACKED",
        transmittedAt: "2026-10-15 11:30:00",
        ackReceivedAt: "2026-10-15 11:30:45",
        failureReason: null,
        metadata: {
          category: "TRADE_CREDIT_SETTLEMENT",
          instrumentId: "lc_hamb_2026_05",
          instrumentReference: "LC-2026-HAM-0219",
          applicantName: "Bavarian Precision Tools GmbH",
          beneficiaryName: "Iberica Heavy Industry Components SA",
          applicableRules: "UCP600",
        },
      },
    ])
    .onConflictDoUpdate({
      target: schema.bankingTransmissions.id,
      set: {
        status: sql`excluded.status`,
        payloadXml: sql`excluded.payload_xml`,
        payloadHashSha256: sql`excluded.payload_hash_sha256`,
        metadata: sql`excluded.metadata`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

  // 5. Seed Bank Statement Entries (camt.053)
  await db
    .insert(schema.bankStatementEntries)
    .values([
      {
        id: "bse_demo_01",
        tenantId: "tenant-default",
        statementId: "STMT-2026-08-01",
        transmissionId: "trx_demo_pain001",
        bookingDate: "2026-08-28",
        valueDate: "2026-08-28",
        creditDebitIndicator: "CRDT",
        amount: 48500.0,
        currency: "EUR",
        accountIban: "ES7621000418450200051332",
        accountBic: "CAIXESBBXXX",
        endToEndId: "E2E-ATLAS-2026-001",
        paymentInformationId: "PMT-INFO-001",
        remittanceInformation:
          "Netting Settlement Aug 2026 Cycle bnc_demo_01 / TRX-ISO-20260828-PAIN001",
        reconciliationStatus: "RECONCILED",
        matchedInvoiceId: "inv_seed_001",
        matchedCompanyId: participantB,
        notes:
          "Automatically reconciled against bilateral netting advice bnc_demo_01",
      },
      {
        id: "bse_demo_02",
        tenantId: "tenant-default",
        statementId: "STMT-2026-08-01",
        transmissionId: null,
        bookingDate: "2026-08-28",
        valueDate: "2026-08-28",
        creditDebitIndicator: "CRDT",
        amount: 14250.0,
        currency: "EUR",
        accountIban: "ES7621000418450200051332",
        accountBic: "CAIXESBBXXX",
        endToEndId: "WIRE-REM-99214",
        paymentInformationId: "PMT-INFO-002",
        remittanceInformation: "Ocean Freight Deposit B/L MEDU1847291",
        reconciliationStatus: "UNMATCHED",
        matchedInvoiceId: null,
        matchedCompanyId: null,
        notes:
          "Unmatched incoming wire transfer from foreign merchant - pending commercial invoice association",
      },
      {
        id: "bse_demo_03",
        tenantId: "tenant-default",
        statementId: "STMT-2026-08-02",
        transmissionId: null,
        bookingDate: "2026-08-29",
        valueDate: "2026-08-29",
        creditDebitIndicator: "DBIT",
        amount: 3200.5,
        currency: "EUR",
        accountIban: "ES7621000418450200051332",
        accountBic: "CAIXESBBXXX",
        endToEndId: "DRAY-VLC-01",
        paymentInformationId: "PMT-INFO-003",
        remittanceInformation: "THC & Terminal Drayage BK-2026-67116",
        reconciliationStatus: "PARTIALLY_MATCHED",
        matchedInvoiceId: "inv_seed_002",
        matchedCompanyId: participantA,
        notes:
          "Port handling matched; haulage congestion surcharge variance (+€150.00) pending dispatcher review",
      },
      {
        id: "bse_demo_04",
        tenantId: "tenant-default",
        statementId: "STMT-2026-08-02",
        transmissionId: null,
        bookingDate: "2026-08-29",
        valueDate: "2026-08-29",
        creditDebitIndicator: "DBIT",
        amount: 750.0,
        currency: "EUR",
        accountIban: "ES7621000418450200051332",
        accountBic: "CAIXESBBXXX",
        endToEndId: "DEM-INV-7721",
        paymentInformationId: "PMT-INFO-004",
        remittanceInformation: "Carrier Demurrage Fee 2x40HC MSKU9284712",
        reconciliationStatus: "DISPUTED",
        matchedInvoiceId: null,
        matchedCompanyId: null,
        notes:
          "Demurrage disputed: terminal weather closure waiver active under FMC / Port Authority protocol",
      },
      {
        id: "bse_lc_hamb_01",
        tenantId: "tenant-default",
        statementId: "STMT-2026-10-01",
        transmissionId: "btx_lc_demo_01",
        bookingDate: "2026-10-15",
        valueDate: "2026-10-15",
        creditDebitIndicator: "DBIT",
        amount: 680000.0,
        currency: "EUR",
        accountIban: "ES7600491500051234567890",
        accountBic: "BNPAESMMXXX",
        endToEndId: "TRX-LC-20261015-PACS008",
        paymentInformationId: "PMT-LC-HAM-0219",
        remittanceInformation:
          "Honouring LC LC-2026-HAM-0219 / UCP 600 / Beneficiary Iberica Heavy Industry Components SA",
        reconciliationStatus: "RECONCILED",
        matchedInvoiceId: null,
        matchedCompanyId: participantA,
        notes:
          "Documentary Credit interbank settlement fully honoured under ICC UCP 600 rules via ISO 20022 pacs.008 transfer",
      },
    ])
    .onConflictDoUpdate({
      target: schema.bankStatementEntries.id,
      set: {
        reconciliationStatus: sql`excluded.reconciliation_status`,
        matchedInvoiceId: sql`excluded.matched_invoice_id`,
        matchedCompanyId: sql`excluded.matched_company_id`,
        notes: sql`excluded.notes`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

  // 6. Update Canonical LC Instrument (lc_hamb_2026_05) to HONOURED_PAID
  await db
    .update(schema.tradeCreditInstruments)
    .set({
      status: "HONOURED_PAID",
      updatedAt: "2026-10-15 11:30:45",
    })
    .where(sql`id = 'lc_hamb_2026_05'`);

  console.log(
    "✅ [PHASE 4/FINANCE] Ciclos de Netting, Transmisiones ISO 20022 y Extractos Bancarios inyectados con éxito.",
  );
}

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { companies } from "./core.js";

/**
 * Trade Credit Instruments: Letters of Credit (L/C), Standby L/C (SBLC), Demand Guarantees (URDG 758), Documentary Collections (URC 522)
 */
export const tradeCreditInstruments = sqliteTable("trade_credit_instruments", {
  id: text("id").primaryKey(),
  instrumentReference: text("instrument_reference").notNull().unique(), // e.g. LC-2026-BCN-0089
  instrumentType: text("instrument_type")
    .$type<
      | "COMMERCIAL_LC_IRREVOCABLE"
      | "COMMERCIAL_LC_CONFIRMED"
      | "STANDBY_LC_ISP98"
      | "DEMAND_GUARANTEE_URDG758"
      | "DOC_COLLECTION_DP"
      | "DOC_COLLECTION_DA"
    >()
    .notNull(),
  applicableRules: text("applicable_rules")
    .$type<"UCP600" | "EUCP21" | "URDG758" | "ISP98" | "URC522">()
    .notNull()
    .default("UCP600"),
  applicantCompanyId: text("applicant_company_id").references(
    () => companies.id,
  ),
  applicantName: text("applicant_name").notNull(),
  beneficiaryName: text("beneficiary_name").notNull(),
  beneficiaryCountry: text("beneficiary_country").notNull().default("ES"),
  issuingBankBic: text("issuing_bank_bic").notNull(), // SWIFT BIC8 or BIC11
  issuingBankName: text("issuing_bank_name").notNull(),
  confirmingBankBic: text("confirming_bank_bic"), // SWIFT BIC
  confirmingBankName: text("confirming_bank_name"),
  currency: text("currency").notNull().default("EUR"), // EUR, USD, GBP, CNY, etc.
  creditAmount: real("credit_amount").notNull(),
  tolerancePercentage: real("tolerance_percentage").notNull().default(5.0), // +/- 5% under UCP 600 Art. 30
  issueDate: text("issue_date").notNull(),
  latestShipmentDate: text("latest_shipment_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  expiryPlace: text("expiry_place")
    .notNull()
    .default("Counters of Beneficiary Bank"),
  portOfLoading: text("port_of_loading").notNull(),
  portOfDischarge: text("port_of_discharge").notNull(),
  goodsDescriptionSummary: text("goods_description_summary").notNull(),
  partialShipmentsAllowed: integer("partial_shipments_allowed", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  transhipmentAllowed: integer("transhipment_allowed", { mode: "boolean" })
    .notNull()
    .default(false),
  presentationPeriodDays: integer("presentation_period_days")
    .notNull()
    .default(21), // UCP 600 Art. 14c default 21 days
  confirmationInstructions: text("confirmation_instructions")
    .$type<"CONFIRM" | "MAY_ADD" | "WITHOUT">()
    .notNull()
    .default("CONFIRM"),
  paymentTerms: text("payment_terms")
    .$type<"SIGHT" | "DEFERRED_PAYMENT" | "ACCEPTANCE_USANCE" | "NEGOTIATION">()
    .notNull()
    .default("SIGHT"),
  tenorDays: integer("tenor_days").notNull().default(0), // 0 for SIGHT, 30, 60, 90, 180
  status: text("status")
    .$type<
      | "DRAFT"
      | "ISSUED"
      | "DOCUMENTS_PRESENTED"
      | "ACCEPTED"
      | "DISCREPANCIES_FOUND"
      | "HONOURED_PAID"
      | "CANCELLED"
    >()
    .notNull()
    .default("ISSUED"),
  remarks: text("remarks"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Trade Credit Documents: Required vs Presented Documents
 */
export const tradeCreditDocuments = sqliteTable("trade_credit_documents", {
  id: text("id").primaryKey(),
  instrumentId: text("instrument_id")
    .notNull()
    .references(() => tradeCreditInstruments.id, { onDelete: "cascade" }),
  documentType: text("document_type")
    .$type<
      | "COMMERCIAL_INVOICE"
      | "OCEAN_BILL_OF_LADING"
      | "AIR_WAYBILL"
      | "ROAD_CMR"
      | "RAIL_CIM"
      | "INSURANCE_CERTIFICATE"
      | "CERTIFICATE_OF_ORIGIN"
      | "PACKING_LIST"
      | "INSPECTION_CERTIFICATE"
      | "PHYTOSANITARY_CERTIFICATE"
    >()
    .notNull(),
  originalCopiesRequired: integer("original_copies_required")
    .notNull()
    .default(1),
  originalCopiesPresented: integer("original_copies_presented")
    .notNull()
    .default(1),
  documentReferenceNumber: text("document_reference_number").notNull(),
  documentDate: text("document_date").notNull(),
  issuerName: text("issuer_name").notNull(),
  shippedOnBoardDate: text("shipped_on_board_date"),
  cleanOnBoardStatus: integer("clean_on_board_status", { mode: "boolean" })
    .notNull()
    .default(true),
  freightPaymentClause: text("freight_payment_clause")
    .$type<"PREPAID" | "COLLECT">()
    .default("PREPAID"),
  invoiceAmount: real("invoice_amount"),
  invoiceCurrency: text("invoice_currency"),
  goodsDescriptionExactMatch: integer("goods_description_exact_match", {
    mode: "boolean",
  }).default(true),
  insuredAmount: real("insured_amount"),
  insuredPercentageOfCif: real("insured_percentage_of_cif"), // Must be >= 110% under UCP 600 Art. 28f
  complianceStatus: text("compliance_status")
    .$type<"PENDING" | "COMPLIANT" | "DISCREPANT">()
    .notNull()
    .default("PENDING"),
  remarks: text("remarks"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Trade Discrepancies: Rule-based discrepancy log against UCP 600 / ISBP 745
 */
export const tradeDiscrepancies = sqliteTable("trade_discrepancies", {
  id: text("id").primaryKey(),
  instrumentId: text("instrument_id")
    .notNull()
    .references(() => tradeCreditInstruments.id, { onDelete: "cascade" }),
  documentId: text("document_id").references(() => tradeCreditDocuments.id, {
    onDelete: "cascade",
  }),
  discrepancyRuleCode: text("discrepancy_rule_code").notNull(), // e.g. UCP600_ART_14_LATE_PRESENTATION
  articleReference: text("article_reference").notNull(), // e.g. UCP 600 Art. 14(c) / ISBP 745 Para A19
  severity: text("severity")
    .$type<"CRITICAL_REFUSAL" | "MAJOR_DISCREPANCY" | "MINOR_WAIVABLE">()
    .notNull(),
  description: text("description").notNull(),
  suggestedRemedy: text("suggested_remedy").notNull(),
  status: text("status")
    .$type<
      "OPEN" | "WAIVER_REQUESTED" | "WAIVER_ACCEPTED" | "REJECTED_REFUSAL"
    >()
    .notNull()
    .default("OPEN"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Trade Fee Schedules: Bank Commission and Fee Calculations
 */
export const tradeFeeSchedules = sqliteTable("trade_fee_schedules", {
  id: text("id").primaryKey(),
  instrumentId: text("instrument_id")
    .notNull()
    .references(() => tradeCreditInstruments.id, { onDelete: "cascade" }),
  openingFeeRatePct: real("opening_fee_rate_pct").notNull().default(0.25), // 0.25% per quarter
  confirmationFeeRatePct: real("confirmation_fee_rate_pct")
    .notNull()
    .default(0.5), // 0.50% p.a.
  discrepancyFeeAmount: real("discrepancy_fee_amount").notNull().default(75.0), // Fixed €75 or $75
  amendmentFeeAmount: real("amendment_fee_amount").notNull().default(50.0),
  paymentSettlementFeeAmount: real("payment_settlement_fee_amount")
    .notNull()
    .default(60.0),
  calculatedOpeningFeeEur: real("calculated_opening_fee_eur")
    .notNull()
    .default(0.0),
  calculatedConfirmationFeeEur: real("calculated_confirmation_fee_eur")
    .notNull()
    .default(0.0),
  calculatedDiscrepancyFeeEur: real("calculated_discrepancy_fee_eur")
    .notNull()
    .default(0.0),
  totalBankFeesEur: real("total_bank_fees_eur").notNull().default(0.0),
  feePayerParty: text("fee_payer_party")
    .$type<"APPLICANT" | "BENEFICIARY" | "SHARED">()
    .notNull()
    .default("APPLICANT"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Trade SWIFT Messages: Structured MT700, MT707, MT734 telematics
 */
export const tradeSwiftMessages = sqliteTable("trade_swift_messages", {
  id: text("id").primaryKey(),
  instrumentId: text("instrument_id")
    .notNull()
    .references(() => tradeCreditInstruments.id, { onDelete: "cascade" }),
  messageType: text("message_type")
    .$type<"MT700_ISSUE" | "MT707_AMENDMENT" | "MT734_REFUSAL">()
    .notNull(),
  senderBic: text("sender_bic").notNull(),
  receiverBic: text("receiver_bic").notNull(),
  rawSwiftMessage: text("raw_swift_message").notNull(),
  transmissionStatus: text("transmission_status")
    .$type<"DRAFT" | "TRANSMITTED" | "ACKNOWLEDGED">()
    .notNull()
    .default("DRAFT"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

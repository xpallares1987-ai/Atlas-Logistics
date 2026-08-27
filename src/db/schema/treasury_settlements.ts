import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { companies } from "./core.js";

// Foreign Exchange Reference Rates (BCE / Central Banks)
export const fxRates = sqliteTable("fx_rates", {
  id: text("id").primaryKey(),
  fromCurrency: text("from_currency").notNull(), // EUR
  toCurrency: text("to_currency").notNull(), // USD, GBP, JPY, CNY, CHF, AED
  spotRate: real("spot_rate").notNull(),
  effectiveDate: text("effective_date").notNull(), // YYYY-MM-DD
  source: text("source").notNull().default("ECB"), // ECB, Federal Reserve, BoE
  forward30Rate: real("forward_30_rate"),
  forward60Rate: real("forward_60_rate"),
  forward90Rate: real("forward_90_rate"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Carrier Invoices (Ocean Navieras, Air CASS, Road Freight Carriers)
export const carrierInvoices = sqliteTable("carrier_invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  carrierId: text("carrier_id").references(() => companies.id),
  carrierName: text("carrier_name").notNull(),
  carrierVat: text("carrier_vat"),
  mode: text("mode", {
    enum: ["OCEAN_FCL", "OCEAN_LCL", "AIR_CARGO", "ROAD_FREIGHT"],
  }).notNull(),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date").notNull(),
  billingPeriod: text("billing_period"), // e.g. "2026-08-W3"
  currency: text("currency").notNull().default("EUR"), // EUR, USD, GBP
  totalAmount: real("total_amount").notNull(),
  matchedAmount: real("matched_amount").notNull().default(0),
  disputedAmount: real("disputed_amount").notNull().default(0),
  reconciliationStatus: text("reconciliation_status", {
    enum: [
      "PENDING",
      "AUTO_MATCHED",
      "DISCREPANCY_FLAGGED",
      "DISPUTED",
      "APPROVED_FOR_PAYMENT",
      "SETTLED",
    ],
  })
    .notNull()
    .default("PENDING"),
  cassStatementNumber: text("cass_statement_number"), // If IATA CASS billing
  paymentTerms: text("payment_terms").default("30_DAYS"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Line-by-Line Breakdown & 3-Way Match Audit
export const carrierInvoiceLines = sqliteTable("carrier_invoice_lines", {
  id: text("id").primaryKey(),
  carrierInvoiceId: text("carrier_invoice_id")
    .notNull()
    .references(() => carrierInvoices.id, { onDelete: "cascade" }),
  shipmentId: text("shipment_id"),
  bookingNumber: text("booking_number"),
  documentNumber: text("document_number").notNull(), // B/L Number, MAWB/HAWB, CMR
  chargeCode: text("charge_code", {
    enum: [
      "BASIC_FREIGHT",
      "BAF_FUEL",
      "CAF_CURRENCY",
      "THC_ORIGIN",
      "THC_DEST",
      "DEMURRAGE",
      "DETENTION",
      "IATA_COMMISSION",
      "SECURITY_FEE",
      "CUSTOMS_CLEARANCE",
      "DOCUMENTATION_FEE",
      "OTHER_SURCHARGE",
    ],
  }).notNull(),
  description: text("description").notNull(),
  billedQuantity: real("billed_quantity").notNull().default(1),
  billedRate: real("billed_rate").notNull(),
  billedAmount: real("billed_amount").notNull(),
  expectedQuantity: real("expected_quantity").notNull().default(1),
  expectedRate: real("expected_rate").notNull(),
  expectedAmount: real("expected_amount").notNull(),
  varianceAmount: real("variance_amount").notNull().default(0), // billed - expected
  variancePercentage: real("variance_percentage").notNull().default(0),
  isWithinTolerance: integer("is_within_tolerance", { mode: "boolean" })
    .notNull()
    .default(true),
  disputeReason: text("dispute_reason"),
  disputeStatus: text("dispute_status", {
    enum: ["NONE", "UNDER_REVIEW", "DISPUTED", "ACCEPTED_BY_CARRIER", "WAIVED"],
  })
    .notNull()
    .default("NONE"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Consolidated Multi-Currency Treasury Positions & FX Exposure
export const treasuryFxPositions = sqliteTable("treasury_fx_positions", {
  id: text("id").primaryKey(),
  currency: text("currency").notNull().unique(), // USD, GBP, JPY, CNY, CHF, AED
  receivablesAmount: real("receivables_amount").notNull().default(0), // Incoming from customers
  payablesAmount: real("payables_amount").notNull().default(0), // Outgoing to carriers/terminals
  netExposure: real("net_exposure").notNull().default(0), // receivables - payables
  averageExchangeRate: real("average_exchange_rate").notNull(),
  currentSpotRate: real("current_spot_rate").notNull(),
  unrealizedGainLossEur: real("unrealized_gain_loss_eur").notNull().default(0),
  hedgedAmount: real("hedged_amount").notNull().default(0),
  unhedgedAmount: real("unhedged_amount").notNull().default(0),
  riskLevel: text("risk_level", {
    enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
  })
    .notNull()
    .default("LOW"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

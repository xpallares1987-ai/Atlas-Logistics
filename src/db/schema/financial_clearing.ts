/**
 * @file financial_clearing.ts
 * @description Drizzle ORM SQLite schema for Autonomous Intercompany Clearing, Bilateral Netting, and IATA CASS Airline Reconciliation.
 * @module @atlas/db/schema/financial_clearing
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================================
// 1. FINANCIAL CLEARING ENTRIES (INTERCOMPANY DEBIT / CREDIT / INVOICE NOTES)
// ============================================================================

export const financialClearingEntries = sqliteTable(
  "financial_clearing_entries",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    debtorAgentId: text("debtor_agent_id").notNull(),
    creditorAgentId: text("creditor_agent_id").notNull(),
    shipmentId: text("shipment_id"),
    noteType: text("note_type", {
      enum: ["DEBIT_NOTE", "CREDIT_NOTE", "INVOICE", "DISBURSEMENT"],
    }).notNull(),
    reference: text("reference").notNull(),
    amount: real("amount").notNull(),
    scaledAmount: integer("scaled_amount").notNull(), // micro-cents integer (amount * 1,000,000)
    currency: text("currency", {
      enum: ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY"],
    }).notNull(),
    exchangeRateToBase: real("exchange_rate_to_base").notNull().default(1.0),
    status: text("status", {
      enum: ["PENDING", "SETTLED", "DISPUTED", "NETTED"],
    })
      .notNull()
      .default("PENDING"),
    nettingCycleId: text("netting_cycle_id"),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date").notNull(),
    metadata: text("metadata", { mode: "json" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_fin_clearing_tenant_agents").on(
      table.tenantId,
      table.debtorAgentId,
      table.creditorAgentId,
    ),
    index("idx_fin_clearing_tenant_status").on(table.tenantId, table.status),
    index("idx_fin_clearing_netting_cycle").on(
      table.tenantId,
      table.nettingCycleId,
    ),
    index("idx_fin_clearing_reference").on(table.tenantId, table.reference),
  ],
);

// Alias for domain convenience
export const financialClearingLedger = financialClearingEntries;

// ============================================================================
// 2. BILATERAL NETTING CYCLES (CROSS-BORDER SETTLEMENT ADVICES)
// ============================================================================

export const bilateralNettingCycles = sqliteTable(
  "bilateral_netting_cycles",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    baseCurrency: text("base_currency", {
      enum: ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY"],
    })
      .notNull()
      .default("USD"),
    participantA: text("participant_a").notNull(),
    participantB: text("participant_b").notNull(),
    grossVolumeAtoB: real("gross_volume_a_to_b").notNull(),
    grossVolumeBtoA: real("gross_volume_b_to_a").notNull(),
    netPayer: text("net_payer"),
    netReceiver: text("net_receiver"),
    netSettlementAmount: real("net_settlement_amount").notNull(),
    reconciledTransactionsCount: integer("reconciled_transactions_count")
      .notNull()
      .default(0),
    transactionIds: text("transaction_ids", { mode: "json" }).notNull(),
    status: text("status", {
      enum: ["PROPOSED", "ACCEPTED", "SETTLED", "DISPUTED"],
    })
      .notNull()
      .default("PROPOSED"),
    settlementReference: text("settlement_reference"),
    clearedAt: text("cleared_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_bilateral_netting_tenant_pair").on(
      table.tenantId,
      table.participantA,
      table.participantB,
    ),
    index("idx_bilateral_netting_status").on(table.tenantId, table.status),
  ],
);

// ============================================================================
// 3. IATA CASS RECONCILIATION BATCHES (AIRLINE BILLING RUNS)
// ============================================================================

export const cassReconciliationBatches = sqliteTable(
  "cass_reconciliation_batches",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    airlineCode: text("airline_code").notNull(),
    airlineName: text("airline_name").notNull(),
    billingPeriod: text("billing_period").notNull(),
    currency: text("currency", {
      enum: ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY"],
    })
      .notNull()
      .default("USD"),
    totalAwbsCount: integer("total_awbs_count").notNull().default(0),
    exactMatchCount: integer("exact_match_count").notNull().default(0),
    toleranceMatchCount: integer("tolerance_match_count").notNull().default(0),
    discrepancyCount: integer("discrepancy_count").notNull().default(0),
    totalForwarderAmount: real("total_forwarder_amount").notNull().default(0),
    totalAirlineAmount: real("total_airline_amount").notNull().default(0),
    totalNetVariance: real("total_net_variance").notNull().default(0),
    disputedAmount: real("disputed_amount").notNull().default(0),
    status: text("status", {
      enum: ["DRAFT", "RECONCILED", "DISPUTED", "ACCEPTED", "CLOSED"],
    })
      .notNull()
      .default("DRAFT"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_cass_batches_tenant_airline_period").on(
      table.tenantId,
      table.airlineCode,
      table.billingPeriod,
    ),
    index("idx_cass_batches_status").on(table.tenantId, table.status),
  ],
);

// ============================================================================
// 4. IATA CASS RECONCILIATION ITEMS (PER-AWB LINE DISCREPANCIES)
// ============================================================================

export const cassReconciliationItems = sqliteTable(
  "cass_reconciliation_items",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    batchId: text("batch_id")
      .notNull()
      .references(() => cassReconciliationBatches.id, { onDelete: "cascade" }),
    awbNumber: text("awb_number").notNull(),
    status: text("status", {
      enum: [
        "EXACT_MATCH",
        "ACCEPTABLE_TOLERANCE",
        "DISCREPANCY_WEIGHT",
        "DISCREPANCY_RATE",
        "DISCREPANCY_SURCHARGE",
        "OVERBILLING_DISPUTE",
        "UNMATCHED_AIRLINE_RECORD",
        "UNBILLED_FORWARDER_RECORD",
      ],
    }).notNull(),
    forwarderTotal: real("forwarder_total").notNull().default(0),
    airlineTotal: real("airline_total").notNull().default(0),
    varianceAmount: real("variance_amount").notNull().default(0),
    weightVarianceKg: real("weight_variance_kg").notNull().default(0),
    rateVariance: real("rate_variance").notNull().default(0),
    surchargeVariance: real("surcharge_variance").notNull().default(0),
    autoAccepted: integer("auto_accepted", { mode: "boolean" })
      .notNull()
      .default(false),
    disputeRequired: integer("dispute_required", { mode: "boolean" })
      .notNull()
      .default(false),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_cass_items_tenant_batch").on(table.tenantId, table.batchId),
    index("idx_cass_items_tenant_awb").on(table.tenantId, table.awbNumber),
    index("idx_cass_items_batch_status").on(table.batchId, table.status),
  ],
);

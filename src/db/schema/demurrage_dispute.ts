import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { shipments } from "./operations.js";
import { documents } from "./support.js";
import { commonAuditFields } from "./_common.js";

export const demurrageInvoices = sqliteTable(
  "demurrage_invoices",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    containerNumber: text("container_number").notNull(),
    carrierScac: text("carrier_scac").notNull(),
    carrierName: text("carrier_name").notNull(),
    billOfLading: text("bill_of_lading").notNull(),
    pod: text("pod").notNull(),
    terminalName: text("terminal_name").notNull(),
    vesselDischargeDate: text("vessel_discharge_date"),
    gateInDate: text("gate_in_date"),
    gateOutDate: text("gate_out_date"),
    availableDate: text("available_date"),
    freeTimeStartDate: text("free_time_start_date"),
    freeTimeEndDate: text("free_time_end_date"),
    freeDaysGranted: integer("free_days_granted").notNull().default(4),
    dailyRateUsd: real("daily_rate_usd").notNull().default(150),
    totalInvoicedUsd: real("total_invoiced_usd").notNull(),
    status: text("status", {
      enum: ["ISSUED", "PAID", "DISPUTED", "SETTLED", "WAIVED"],
    })
      .notNull()
      .default("ISSUED"),
    fmcCompliant: integer("fmc_compliant", { mode: "boolean" })
      .notNull()
      .default(true),
    tariffTiersJson: text("tariff_tiers_json"),
    ...commonAuditFields,
  },
  (table) => ({
    shipmentIdx: index("demurrage_inv_shipment_idx").on(table.shipmentId),
    containerIdx: index("demurrage_inv_container_idx").on(
      table.containerNumber,
    ),
    blIdx: index("demurrage_inv_bl_idx").on(table.billOfLading),
  }),
);

export const demurrageSuspensions = sqliteTable(
  "demurrage_suspensions",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => demurrageInvoices.id, { onDelete: "cascade" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    daysSuspended: integer("days_suspended").notNull(),
    reason: text("reason").notNull(),
    justificationText: text("justification_text"),
    evidenceDocumentId: text("evidence_document_id").references(
      () => documents.id,
    ),
    approved: integer("approved", { mode: "boolean" }).notNull().default(true),
    ...commonAuditFields,
  },
  (table) => ({
    invoiceIdx: index("demurrage_susp_invoice_idx").on(table.invoiceId),
  }),
);

export const demurrageDisputes = sqliteTable(
  "demurrage_disputes",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => demurrageInvoices.id, { onDelete: "cascade" }),
    disputedAmountUsd: real("disputed_amount_usd").notNull(),
    revisedPayableUsd: real("revised_payable_usd").notNull(),
    fmcRuleClause: text("fmc_rule_clause").notNull(),
    status: text("status", {
      enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"],
    })
      .notNull()
      .default("SUBMITTED"),
    formalLetterPayload: text("formal_letter_payload"),
    submittedAt: integer("submitted_at"),
    resolvedAt: integer("resolved_at"),
    ...commonAuditFields,
  },
  (table) => ({
    invoiceIdx: index("demurrage_disp_invoice_idx").on(table.invoiceId),
  }),
);

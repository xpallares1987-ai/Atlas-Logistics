import {
  sqliteTable,
  text,
  integer,
  real,
  check,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { commonAuditFields } from "./_common.js";
import { shipments } from "./operations.js";
import { companies, users } from "./core.js";
import { carriers } from "./vendors.js";

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    invoiceNumber: text("invoiceNumber").notNull().unique(),
    type: text("type").notNull().default("AR"), // AR, AP, CN, DN
    shipmentId: text("shipment_id").references(() => shipments.id),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    amount: real("amount").notNull(),
    taxAmount: real("tax_amount").default(0),
    taxRate: real("tax_rate").default(0),
    currency: text("currency").notNull(),
    status: text("status").notNull(), // DRAFT, ISSUED, PARTIAL, PAID, OVERDUE
    dueDate: integer("due_date", { mode: "timestamp" }),
    paidDate: integer("paid_date", { mode: "timestamp" }),
    createdBy: text("created_by").references(() => users.id),
    updatedBy: text("updated_by").references(() => users.id),
    ...commonAuditFields,
  },
  (table) => ({
    amountCheck: check("invoices_amount_check", sql`${table.amount} >= 0`),
    taxCheck: check("invoices_tax_check", sql`${table.taxAmount} >= 0`),
    typeCreatedAtIdx: index("idx_invoices_type_created_at").on(
      table.type,
      table.createdAt,
    ),
  }),
);

export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id),
    description: text("description").notNull(),
    quantity: real("quantity").notNull(),
    unitPrice: real("unit_price").notNull(),
    total: real("total").notNull(),
    ...commonAuditFields,
  },
  (table) => ({
    qtyCheck: check("invoice_items_qty_check", sql`${table.quantity} > 0`),
    priceCheck: check(
      "invoice_items_price_check",
      sql`${table.unitPrice} >= 0`,
    ),
  }),
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id),
    amount: real("amount").notNull(),
    paymentDate: integer("payment_date", { mode: "timestamp" }).notNull(),
    reference: text("reference"),
    ...commonAuditFields,
  },
  (table) => ({
    amountCheck: check("payments_amount_check", sql`${table.amount} >= 0`),
  }),
);

export const exchangeRates = sqliteTable("exchange_rates", {
  id: text("id").primaryKey(),
  baseCurrency: text("base_currency").notNull(),
  targetCurrency: text("target_currency").notNull(),
  rate: real("rate").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
});

export const costs = sqliteTable(
  "costs",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id),
    vendorId: text("vendor_id").references(() => carriers.id),
    amount: real("amount").notNull(),
    currency: text("currency").notNull(),
    description: text("description"),
    ...commonAuditFields,
  },
  (table) => ({
    amountCheck: check("costs_amount_check", sql`${table.amount} >= 0`),
  }),
);

export const revenues = sqliteTable(
  "revenues",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id),
    amount: real("amount").notNull(),
    currency: text("currency").notNull(),
    description: text("description"),
    ...commonAuditFields,
  },
  (table) => ({
    amountCheck: check("revenues_amount_check", sql`${table.amount} >= 0`),
  }),
);

export const agentSettlements = sqliteTable("agent_settlements", {
  id: text("id").primaryKey(),
  statementNumber: text("statement_number").notNull().unique(),
  agentId: text("agent_id")
    .notNull()
    .references(() => companies.id),
  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),
  netBalance: real("net_balance").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("Pending"), // Pending, Paid
  ...commonAuditFields,
});

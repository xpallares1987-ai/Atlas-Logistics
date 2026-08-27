import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { invoices } from "./finance.js";
import { rates } from "./pricing.js";
import { users } from "./core.js";

export const customsEventLogs = sqliteTable("customs_event_logs", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  recordedAt: integer("recorded_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const shipmentEventLogs = sqliteTable("shipment_event_logs", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull(),
  status: text("status").notNull(),
  location: text("location").notNull(),
  recordedAt: integer("recorded_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const invoiceEventLogs = sqliteTable("invoice_event_logs", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  changedBy: text("changed_by").references(() => users.id),
  reason: text("reason"),
  recordedAt: integer("recorded_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const rateChangeLogs = sqliteTable("rate_change_logs", {
  id: text("id").primaryKey(),
  rateId: text("rate_id")
    .notNull()
    .references(() => rates.id),
  previousAmount: real("previous_amount"),
  newAmount: real("new_amount").notNull(),
  changedBy: text("changed_by").references(() => users.id),
  reason: text("reason"),
  recordedAt: integer("recorded_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

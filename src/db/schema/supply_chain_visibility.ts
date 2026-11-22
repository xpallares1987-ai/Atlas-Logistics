/**
 * @file supply_chain_visibility.ts
 * @description Drizzle ORM SQLite WAL schema for Supply Chain Visibility,
 * Unified Milestone Tracking (CQRS Ledger), and Predictive Exceptions.
 * Connects upstream factory production milestones with downstream carrier freight execution.
 * @module @atlas/db/schema/supply_chain_visibility
 * @see {@link docs/adr/0033-supply-chain-visibility-and-predictive-milestone-tracking.md}
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { purchaseOrders, poLineItems } from "./po.js";
import { bookings, shipments } from "./operations.js";

// ============================================================================
// 1. ENUMS & CONSTANTS
// ============================================================================

export const milestoneCategoryEnum = [
  "SUPPLIER_PRODUCTION",
  "CARRIER_TRANSIT",
  "FINAL_DELIVERY",
] as const;

export type MilestoneCategory = (typeof milestoneCategoryEnum)[number];

export const milestoneStatusEnum = [
  "PLANNED",
  "ESTIMATED",
  "ACTUAL",
  "CANCELLED",
] as const;

export type MilestoneStatus = (typeof milestoneStatusEnum)[number];

export const milestoneDataSourceEnum = [
  "SUPPLIER_PORTAL",
  "DCSA_EVENT",
  "AIR_CARGO_FSU",
  "AIS_TELEMETRY",
  "MANUAL_OVERRIDE",
  "SYSTEM_DERIVED",
] as const;

export type MilestoneDataSource = (typeof milestoneDataSourceEnum)[number];

export const exceptionCategoryEnum = [
  "CRD_CUTOFF_BREACH",
  "ETA_RDD_BREACH",
  "TRANSSHIPMENT_DWELL",
  "ROLLOVER_RISK",
  "CUSTOMS_HOLD",
  "CARRIER_DELAY",
] as const;

export type ExceptionCategory = (typeof exceptionCategoryEnum)[number];

export const exceptionSeverityEnum = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type ExceptionSeverity = (typeof exceptionSeverityEnum)[number];

export const exceptionStatusEnum = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_MITIGATION",
  "RESOLVED",
  "IGNORED",
] as const;

export type ExceptionStatus = (typeof exceptionStatusEnum)[number];

// ============================================================================
// 2. SUPPLY CHAIN MILESTONE EVENTS (CQRS Visibility Ledger)
// ============================================================================

export const supplyChainMilestoneEvents = sqliteTable(
  "supply_chain_milestone_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    poId: text("po_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    poLineItemId: text("po_line_item_id").references(() => poLineItems.id, {
      onDelete: "set null",
    }),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    shipmentId: text("shipment_id").references(() => shipments.id, {
      onDelete: "set null",
    }),
    containerNumber: text("container_number"), // ISO 6346 standard container code
    milestoneCode: text("milestone_code").notNull(), // e.g. 'ORDER_RECEIVED', 'CARGO_READY', 'LOADED', 'DELIVERED'
    milestoneCategory: text("milestone_category", {
      enum: milestoneCategoryEnum,
    }).notNull(),
    status: text("status", { enum: milestoneStatusEnum })
      .notNull()
      .default("PLANNED"),
    plannedTimestamp: text("planned_timestamp").notNull(), // ISO 8601 string
    estimatedTimestamp: text("estimated_timestamp"), // ISO 8601 string
    actualTimestamp: text("actual_timestamp"), // ISO 8601 string
    delayHours: integer("delay_hours").notNull().default(0), // Positive indicates delay, negative indicates ahead of schedule
    locationCode: text("location_code"), // UN/LOCODE e.g. 'CNSHA', 'USLAX', 'ESBCN'
    locationName: text("location_name"),
    latitude: text("latitude"), // Decimal coordinate string
    longitude: text("longitude"), // Decimal coordinate string
    vesselName: text("vessel_name"),
    voyageNumber: text("voyage_number"),
    carrierCode: text("carrier_code"), // SCAC or IATA code e.g. 'MSCU', 'MAEU'
    dataSource: text("data_source", { enum: milestoneDataSourceEnum })
      .notNull()
      .default("SYSTEM_DERIVED"),
    notes: text("notes"),
    ...commonAuditFields,
  },
  (table) => ({
    tenantPoIdx: index("idx_scme_tenant_po").on(table.tenantId, table.poId),
    tenantBookingIdx: index("idx_scme_tenant_booking").on(
      table.tenantId,
      table.bookingId,
    ),
    tenantShipmentIdx: index("idx_scme_tenant_shipment").on(
      table.tenantId,
      table.shipmentId,
    ),
    tenantStatusIdx: index("idx_scme_tenant_status").on(
      table.tenantId,
      table.status,
    ),
    tenantCategoryIdx: index("idx_scme_tenant_category").on(
      table.tenantId,
      table.milestoneCategory,
    ),
  }),
);

export type SupplyChainMilestoneEvent =
  typeof supplyChainMilestoneEvents.$inferSelect;
export type NewSupplyChainMilestoneEvent =
  typeof supplyChainMilestoneEvents.$inferInsert;

// ============================================================================
// 3. SUPPLY CHAIN EXCEPTIONS & PREDICTIVE ALERTS
// ============================================================================

export const supplyChainExceptions = sqliteTable(
  "supply_chain_exceptions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    poId: text("po_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    shipmentId: text("shipment_id").references(() => shipments.id, {
      onDelete: "set null",
    }),
    milestoneEventId: text("milestone_event_id").references(
      () => supplyChainMilestoneEvents.id,
      { onDelete: "set null" },
    ),
    exceptionCode: text("exception_code").notNull(), // e.g. 'EXC_CRD_AFTER_CUTOFF', 'EXC_ETA_PAST_RDD'
    exceptionCategory: text("exception_category", {
      enum: exceptionCategoryEnum,
    }).notNull(),
    severity: text("severity", { enum: exceptionSeverityEnum })
      .notNull()
      .default("MEDIUM"),
    status: text("status", { enum: exceptionStatusEnum })
      .notNull()
      .default("OPEN"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    impactSummary: text("impact_summary"),
    delayEstimateHours: integer("delay_estimate_hours").notNull().default(0),
    financialRiskAmount: text("financial_risk_amount").default("0.00"), // Decimal string (2 decimal places)
    financialRiskCurrency: text("financial_risk_currency").default("USD"),
    suggestedMitigations: text("suggested_mitigations", { mode: "json" }), // Structured mitigation actions array
    aiAnalysis: text("ai_analysis", { mode: "json" }), // Gemini contextual assessment
    resolvedBy: text("resolved_by"),
    resolvedAt: text("resolved_at"),
    resolutionNotes: text("resolution_notes"),
    ...commonAuditFields,
  },
  (table) => ({
    tenantPoIdx: index("idx_scex_tenant_po").on(table.tenantId, table.poId),
    tenantStatusIdx: index("idx_scex_tenant_status").on(
      table.tenantId,
      table.status,
    ),
    tenantSeverityIdx: index("idx_scex_tenant_severity").on(
      table.tenantId,
      table.severity,
    ),
    tenantCategoryIdx: index("idx_scex_tenant_category").on(
      table.tenantId,
      table.exceptionCategory,
    ),
  }),
);

export type SupplyChainException = typeof supplyChainExceptions.$inferSelect;
export type NewSupplyChainException = typeof supplyChainExceptions.$inferInsert;

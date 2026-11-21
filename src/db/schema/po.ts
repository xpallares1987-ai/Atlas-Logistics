/**
 * @file po.ts
 * @description Drizzle ORM SQLite WAL schema for Supply Chain and Purchase Order (PO) Management.
 * Connects upstream supplier manufacturing (Purchase Orders, SKUs, Production Milestones)
 * with downstream freight execution (FMS Bookings).
 * @module @atlas/db/schema/po
 * @see {@link docs/adr/0032-supply-chain-purchase-order-and-booking-allocation-engine.md}
 */

import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { companies } from "./core.js";
import { bookings } from "./operations.js";

// ============================================================================
// 1. ENUMS & CONSTANTS
// ============================================================================

export const poStatusEnum = [
  "ISSUED",
  "ACKNOWLEDGED",
  "IN_PRODUCTION",
  "CARGO_READY",
  "PARTIALLY_BOOKED",
  "BOOKED",
  "SHIPPED",
  "CANCELLED",
] as const;

export type PoStatus = (typeof poStatusEnum)[number];

export const productionMilestoneCodeEnum = [
  "ORDER_RECEIVED",
  "RAW_MATERIALS_READY",
  "ASSEMBLY_STARTED",
  "QC_PASSED",
  "PACKED",
] as const;

export type ProductionMilestoneCode =
  (typeof productionMilestoneCodeEnum)[number];

// ============================================================================
// 2. PURCHASE ORDERS (Header)
// ============================================================================

export const purchaseOrders = sqliteTable(
  "purchase_orders",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    poNumber: text("po_number").notNull(),
    incoterm: text("incoterm").notNull(), // e.g. 'FOB', 'EXW', 'CIF'
    expectedCargoReadyDate: text("expected_cargo_ready_date").notNull(),
    status: text("status", { enum: poStatusEnum }).notNull().default("ISSUED"),
    notes: text("notes"),
    ...commonAuditFields,
  },
  (table) => ({
    tenantPoIdx: uniqueIndex("idx_purchase_orders_tenant_po").on(
      table.tenantId,
      table.poNumber,
    ),
    buyerIdx: index("idx_purchase_orders_buyer").on(
      table.tenantId,
      table.buyerId,
    ),
    supplierIdx: index("idx_purchase_orders_supplier").on(
      table.tenantId,
      table.supplierId,
    ),
    statusIdx: index("idx_purchase_orders_status").on(
      table.tenantId,
      table.status,
    ),
  }),
);

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;

// ============================================================================
// 3. PO LINE ITEMS (Granular SKUs & Allocations)
// ============================================================================

export const poLineItems = sqliteTable(
  "po_line_items",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    poId: text("po_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    skuCode: text("sku_code").notNull(),
    description: text("description").notNull(),
    quantity: text("quantity").notNull(), // Exact decimal string with 3 decimal places e.g. '1000.000'
    allocatedQuantity: text("allocated_quantity").notNull().default("0.000"), // Allocated quantity to date
    uom: text("uom").notNull().default("PCS"),
    hsCode: text("hs_code"),
    packageCount: integer("package_count"),
    grossWeightKg: text("gross_weight_kg"), // Exact decimal string with 3 decimal places
    volumeCbm: text("volume_cbm"), // Exact decimal string with 3 decimal places
    originalUnitPrice: text("original_unit_price"), // 4 decimal places e.g. '12.5000'
    originalCurrency: text("original_currency").default("USD"),
    exchangeRate: text("exchange_rate").default("1.000000"), // 6 decimal places
    ...commonAuditFields,
  },
  (table) => ({
    poIdx: index("idx_po_line_items_po").on(table.tenantId, table.poId),
    bookingIdx: index("idx_po_line_items_booking").on(
      table.tenantId,
      table.bookingId,
    ),
    skuIdx: index("idx_po_line_items_sku").on(table.tenantId, table.skuCode),
  }),
);

export type PoLineItem = typeof poLineItems.$inferSelect;
export type NewPoLineItem = typeof poLineItems.$inferInsert;

// ============================================================================
// 4. PRODUCTION MILESTONES (Factory Upstream Tracking)
// ============================================================================

export const productionMilestones = sqliteTable(
  "production_milestones",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    poId: text("po_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    milestoneCode: text("milestone_code", {
      enum: productionMilestoneCodeEnum,
    }).notNull(),
    plannedDate: text("planned_date").notNull(),
    actualDate: text("actual_date"),
    notes: text("notes"),
    ...commonAuditFields,
  },
  (table) => ({
    poIdx: index("idx_production_milestones_po").on(table.tenantId, table.poId),
    codeIdx: index("idx_production_milestones_code").on(
      table.tenantId,
      table.milestoneCode,
    ),
  }),
);

export type ProductionMilestone = typeof productionMilestones.$inferSelect;
export type NewProductionMilestone = typeof productionMilestones.$inferInsert;

/**
 * @file portal_projections.ts
 * @description Drizzle ORM SQLite WAL schema for Zero-Trust B2B Customer & Vendor Portals.
 * Defines read-only CQRS projection tables (portal_po_projections) and secure access tokens (portal_access_tokens).
 * Enforces strict financial data masking (ADR 0035 & atlas-customer-portal-experience).
 * @module @atlas/db/schema/portal_projections
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { purchaseOrders } from "./po.js";

// ============================================================================
// 1. ENUMS & CONSTANTS
// ============================================================================

export const portalTypeEnum = ["VENDOR", "CUSTOMER"] as const;
export type PortalType = (typeof portalTypeEnum)[number];

export const supplierConfirmationStatusEnum = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
] as const;
export type SupplierConfirmationStatus =
  (typeof supplierConfirmationStatusEnum)[number];

// ============================================================================
// 2. READ-ONLY CQRS PROJECTIONS (portal_po_projections)
// ============================================================================

export const portalPoProjections = sqliteTable(
  "portal_po_projections",
  {
    id: text("id").primaryKey(), // Format: 'proj_po_<uuid>'
    poId: text("po_id")
      .notNull()
      .unique()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    vendorCompanyId: text("vendor_company_id").notNull(), // Supplier Company ID for Zero-Trust scoping
    buyerCompanyId: text("buyer_company_id").notNull(), // Buyer Company ID for Customer Portal scoping
    poNumber: text("po_number").notNull(),
    buyerName: text("buyer_name").notNull(),
    supplierName: text("supplier_name").notNull(),
    incoterm: text("incoterm").notNull(),
    expectedCargoReadyDate: text("expected_cargo_ready_date").notNull(),
    promisedCargoReadyDate: text("promised_cargo_ready_date"), // Locked by supplier confirmation
    poStatus: text("po_status").notNull(),
    supplierConfirmationStatus: text("supplier_confirmation_status", {
      enum: supplierConfirmationStatusEnum,
    })
      .notNull()
      .default("PENDING"),
    confirmedAt: text("confirmed_at"),
    confirmationNotes: text("confirmation_notes"),

    // Masked line items: SKU, Description, Qty, AllocatedQty, RemainingQty, UOM.
    // ZERO costs, ZERO margins, ZERO internal freight buy rates.
    lineItemsSummaryJson: text("line_items_summary_json", { mode: "json" })
      .notNull()
      .default("[]"),

    // Aggregated milestone status (factory + international transit)
    milestonesSummaryJson: text("milestones_summary_json", { mode: "json" })
      .notNull()
      .default("[]"),

    // Masked public exceptions (delay, hold) without internal financial liability estimates
    exceptionsSummaryJson: text("exceptions_summary_json", { mode: "json" })
      .notNull()
      .default("[]"),

    lastProjectedAt: text("last_projected_at").notNull(),
    ...commonAuditFields,
  },
  (table) => ({
    vendorCompanyIdx: index("idx_portal_po_vendor_company").on(
      table.tenantId,
      table.vendorCompanyId,
    ),
    buyerCompanyIdx: index("idx_portal_po_buyer_company").on(
      table.tenantId,
      table.buyerCompanyId,
    ),
    poNumberIdx: index("idx_portal_po_number").on(table.poNumber),
  }),
);

export type PortalPoProjection = typeof portalPoProjections.$inferSelect;
export type NewPortalPoProjection = typeof portalPoProjections.$inferInsert;

// ============================================================================
// 3. SECURE MAGIC ACCESS TOKENS (portal_access_tokens)
// ============================================================================

export const portalAccessTokens = sqliteTable(
  "portal_access_tokens",
  {
    id: text("id").primaryKey(), // Format: 'tok_<uuid>'
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    poId: text("po_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull(),
    portalType: text("portal_type", { enum: portalTypeEnum }).notNull(),
    tokenHash: text("token_hash").notNull().unique(), // SHA-256 hash of the bearer token
    expiresAt: integer("expires_at").notNull(), // Unix timestamp (seconds)
    lastUsedAt: integer("last_used_at"),
    revokedAt: integer("revoked_at"),
    isRevoked: integer("is_revoked", { mode: "boolean" })
      .notNull()
      .default(false),
    ...commonAuditFields,
  },
  (table) => ({
    tokenHashIdx: index("idx_portal_tokens_hash").on(table.tokenHash),
    poCompanyIdx: index("idx_portal_tokens_po_company").on(
      table.tenantId,
      table.poId,
      table.companyId,
    ),
  }),
);

export type PortalAccessToken = typeof portalAccessTokens.$inferSelect;
export type NewPortalAccessToken = typeof portalAccessTokens.$inferInsert;

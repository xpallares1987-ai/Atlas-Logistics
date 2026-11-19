/**
 * @file customs_brokerage.ts
 * @description Drizzle ORM schema for Customs Brokerage (DUA/MRN), 1:N Shipment Grouping, and Zero-Markup Disbursements (Suplidos).
 * @module @atlas/db/schema/customs_brokerage
 * @see {@link docs/adr/0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md}
 */

import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { companies, addresses } from "./core.js";
import { shipments } from "./operations.js";
import { customsGuarantees } from "./customs_warehouse.js";

// ============================================================================
// 1. OFFICIAL CUSTOMS CLEARANCES (DUA / MRN Declarations)
// ============================================================================

export const customsClearances = sqliteTable(
  "customs_clearances",
  {
    id: text("id").primaryKey(),
    clearanceNumber: text("clearance_number").notNull().unique(), // e.g. DUA-2026-ES0801-000412
    mrn: text("mrn").notNull().unique(), // Movement Reference Number: 26ES00080100412891
    procedureType: text("procedure_type", {
      enum: [
        "IMPORT_4000", // Free circulation & home use
        "IMPORT_7100", // Customs Warehousing (DA)
        "EXPORT_1000", // Permanent export
        "TRANSIT_T1", // Bonded internal/external transit
      ],
    })
      .notNull()
      .default("IMPORT_4000"),
    customsOfficeCode: text("customs_office_code").notNull(), // e.g. ES000801 (Port of Barcelona)
    importerCompanyId: text("importer_company_id")
      .notNull()
      .references(() => companies.id),
    declarantAddressId: text("declarant_address_id")
      .notNull()
      .references(() => addresses.id),
    taricCode: text("taric_code").notNull(), // 10-digit TARIC e.g. 7208380000
    goodsDescription: text("goods_description").notNull(),
    originCountryCode: text("origin_country_code").notNull(), // ISO-2 e.g. TR, CN, IN
    grossMassKg: real("gross_mass_kg").notNull(),
    netMassKg: real("net_mass_kg").notNull(),
    customsValueEur: real("customs_value_eur").notNull(),
    dutyTariffRatePercent: real("duty_tariff_rate_percent")
      .notNull()
      .default(0.0),
    assessedDutyAmountEur: real("assessed_duty_amount_eur")
      .notNull()
      .default(0.0),
    importVatRatePercent: real("import_vat_rate_percent")
      .notNull()
      .default(21.0),
    assessedVatAmountEur: real("assessed_vat_amount_eur")
      .notNull()
      .default(0.0),
    totalDisbursementEur: real("total_disbursement_eur").notNull().default(0.0),
    routingChannel: text("routing_channel", {
      enum: ["PENDING", "GREEN", "ORANGE", "RED"],
    })
      .notNull()
      .default("PENDING"),
    status: text("status", {
      enum: [
        "DRAFT",
        "REGISTERED",
        "ROUTED",
        "LEVANTE_RELEASED",
        "DISCHARGED",
        "CANCELLED",
      ],
    })
      .notNull()
      .default("DRAFT"),
    levanteReleasedAt: text("levante_released_at"),
    t1GuaranteeId: text("t1_guarantee_id").references(
      () => customsGuarantees.id,
    ),
    guaranteeCommittedEur: real("guarantee_committed_eur")
      .notNull()
      .default(0.0),
    isCbamApplicable: integer("is_cbam_applicable", { mode: "boolean" })
      .notNull()
      .default(false),
    cbamDeclarationLineId: text("cbam_declaration_line_id"),
    ocrStagingReference: text("ocr_staging_reference"),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    mrnIdx: index("idx_customs_clearances_mrn").on(table.mrn),
    tenantStatusIdx: index("idx_customs_clearances_tenant_status").on(
      table.tenantId,
      table.status,
    ),
  }),
);

// ============================================================================
// 2. 1:N CLEARANCE SHIPMENT GROUPING JUNCTION
// ============================================================================

export const customsClearanceShipments = sqliteTable(
  "customs_clearance_shipments",
  {
    id: text("id").primaryKey(),
    clearanceId: text("clearance_id")
      .notNull()
      .references(() => customsClearances.id, { onDelete: "cascade" }),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    allocatedNetMassKg: real("allocated_net_mass_kg").notNull(),
    proratedDutyEur: real("prorated_duty_eur").notNull().default(0.0),
    proratedVatEur: real("prorated_vat_eur").notNull().default(0.0),
    proratedDisbursementEur: real("prorated_disbursement_eur")
      .notNull()
      .default(0.0),
    allocatedAt: text("allocated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    clearanceShipmentIdx: index("idx_customs_clearance_shipments_lookup").on(
      table.clearanceId,
      table.shipmentId,
    ),
  }),
);

// ============================================================================
// 3. ZERO-MARKUP DISBURSEMENTS LEDGER (Suplidos)
// ============================================================================

export const customsDisbursements = sqliteTable(
  "customs_disbursements",
  {
    id: text("id").primaryKey(),
    clearanceId: text("clearance_id")
      .notNull()
      .references(() => customsClearances.id, { onDelete: "cascade" }),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id),
    disbursementType: text("disbursement_type", {
      enum: [
        "IMPORT_DUTY",
        "IMPORT_VAT",
        "PORT_T3_TAX",
        "HEALTH_SOIVRE_INSPECTION_FEE",
      ],
    }).notNull(),
    officialVoucherNumber: text("official_voucher_number").notNull(), // e.g. Model 031 ref: 031-2026-AEAT-09182
    incurredCostAmountEur: real("incurred_cost_amount_eur").notNull(), // AP paid to Customs
    billedRevenueAmountEur: real("billed_revenue_amount_eur").notNull(), // AR billed to Importer
    markupAmountEur: real("markup_amount_eur").notNull().default(0.0), // Must be strictly 0.00
    isZeroMarkupValidated: integer("is_zero_markup_validated", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    apInvoiceReference: text("ap_invoice_reference").notNull(),
    arInvoiceId: text("ar_invoice_id"),
    isReconciled: integer("is_reconciled", { mode: "boolean" })
      .notNull()
      .default(false),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    tenantShipmentIdx: index("idx_customs_disbursements_tenant_shipment").on(
      table.tenantId,
      table.shipmentId,
    ),
  }),
);

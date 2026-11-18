/**
 * @file containers.ts
 * @description Master catalog of standard ISO 668 & ISO 6346 intermodal freight container types,
 * dimensions, tare weights, payload limits, and volumetric capacities.
 * @module @atlas/db/schema/containers
 * @see {@link docs/architecture/logistics-master-catalogs-spec.md}
 */

import {
  sqliteTable,
  text,
  real,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { shipments } from "./operations.js";
import { locations, companies } from "./core.js";
import { costs } from "./finance.js";

export const containerCategoryEnum = [
  "DRY_STANDARD",
  "HIGH_CUBE",
  "REEFER",
  "REEFER_HIGH_CUBE",
  "OPEN_TOP",
  "FLAT_RACK",
  "ISO_TANK",
  "BULK",
  "VENTILATED",
] as const;

export type ContainerCategory = (typeof containerCategoryEnum)[number];

export const containerIsoTypes = sqliteTable(
  "container_iso_types",
  {
    /**
     * Official ISO 6346 4-character Size & Type code (e.g. '22G1', '42G1', '45G1', '22R1', '45R1', '22U1', '42P1', '22T1')
     */
    isoCode: text("iso_code").primaryKey(),

    /**
     * Standard commercial/industry abbreviation (e.g. '20GP', '40GP', '40HC', '45HC', '20RF', '40HR', '20OT', '40FR', '20TK', '40NOR')
     */
    industryCode: text("industry_code").notNull().unique(),

    /**
     * Equipment functional category
     */
    category: text("category", { enum: containerCategoryEnum }).notNull(),

    /**
     * Nominal exterior dimensions in Imperial feet (industry reference)
     */
    nominalLengthFt: real("nominal_length_ft").notNull(), // 20.0, 40.0, 45.0
    nominalHeightFt: real("nominal_height_ft").notNull(), // 8.5, 9.5
    nominalWidthFt: real("nominal_width_ft").notNull().default(8.0),

    /**
     * Physical exterior dimensions in millimeters (ISO 668:2020)
     */
    externalLengthMm: integer("external_length_mm").notNull(),
    externalWidthMm: integer("external_width_mm").notNull(),
    externalHeightMm: integer("external_height_mm").notNull(),

    /**
     * Usable internal dimensions in millimeters
     */
    internalLengthMm: integer("internal_length_mm").notNull(),
    internalWidthMm: integer("internal_width_mm").notNull(),
    internalHeightMm: integer("internal_height_mm").notNull(),

    /**
     * Rear door opening clearance in millimeters
     */
    doorOpeningWidthMm: integer("door_opening_width_mm"),
    doorOpeningHeightMm: integer("door_opening_height_mm"),

    /**
     * Mass ratings and capacity (ISO 668 / CSC safety convention)
     */
    tareWeightKg: real("tare_weight_kg").notNull(), // Empty unladen weight
    maxPayloadKg: real("max_payload_kg").notNull(), // Net max payload (M.G.W. - Tare)
    maxGrossWeightKg: real("max_gross_weight_kg").notNull(), // Maximum Gross Weight (M.G.W.)
    cubicCapacityCbm: real("cubic_capacity_cbm").notNull(), // Volume in m³

    /**
     * Twenty-foot Equivalent Unit (TEU) multiplier factor for vessel stowage & terminal slot allocation
     */
    teuFactor: real("teu_factor").notNull(), // 1.0 (20ft), 2.0 (40ft), 2.25 (45ft)

    /**
     * Special cargo handling flags
     */
    isReefer: integer("is_reefer", { mode: "boolean" })
      .notNull()
      .default(false),
    hasControlledAtmosphere: integer("has_controlled_atmosphere", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    isVentilated: integer("is_ventilated", { mode: "boolean" })
      .notNull()
      .default(false),

    /**
     * Full commercial and technical description
     */
    description: text("description").notNull(),

    ...commonAuditFields,
  },
  (table) => ({
    industryCodeIdx: uniqueIndex("idx_container_iso_industry_code").on(
      table.industryCode,
    ),
    categoryIdx: index("idx_container_iso_category").on(table.category),
    lengthIdx: index("idx_container_iso_length").on(table.nominalLengthFt),
  }),
);

export type ContainerIsoType = typeof containerIsoTypes.$inferSelect;
export type NewContainerIsoType = typeof containerIsoTypes.$inferInsert;

// ============================================================================
// 1. PHYSICAL EQUIPMENT (CONTAINERS)
// ============================================================================

export const containerIsoSizeTypes = [
  "20DC",
  "40DC",
  "40HQ",
  "20RF",
  "40RF",
  "20OT",
  "40OT",
  "40FR",
] as const;

export type ContainerIsoSizeType = (typeof containerIsoSizeTypes)[number];

export const containers = sqliteTable(
  "containers",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").references(() => companies.id),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    containerNumber: text("container_number").notNull(),
    isoSizeType: text("iso_size_type"),
    sealNumber: text("seal_number"),
    tareWeightKg: real("tare_weight_kg"),
    maxPayloadKg: real("max_payload_kg"),
    isShipperOwned: integer("is_shipper_owned", { mode: "boolean" })
      .notNull()
      .default(false),
    ...commonAuditFields,
  },
  (table) => ({
    shipmentIdx: index("idx_containers_shipment_id").on(table.shipmentId),
    containerNumIdx: index("idx_containers_container_number").on(
      table.containerNumber,
    ),
    tenantIdx: index("idx_containers_tenant_id").on(table.tenantId),
  }),
);

export type Container = typeof containers.$inferSelect;
export type NewContainer = typeof containers.$inferInsert;

// ============================================================================
// 2. VERIFIED GROSS MASS (SOLAS VGM COMPLIANCE)
// ============================================================================

export const vgmWeighingMethods = ["METHOD_1", "METHOD_2"] as const;
export type VgmWeighingMethod = (typeof vgmWeighingMethods)[number];

export const containerVgm = sqliteTable(
  "container_vgm",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").references(() => companies.id),
    containerId: text("container_id")
      .notNull()
      .references(() => containers.id, { onDelete: "cascade" }),
    shipmentId: text("shipment_id").references(() => shipments.id, {
      onDelete: "cascade",
    }),
    containerNumber: text("container_number").notNull(),
    vgmWeightKg: real("vgm_weight_kg").notNull(),
    weighingMethod: text("weighing_method", {
      enum: ["METHOD_1", "METHOD_2"],
    }).notNull(),
    authorizedPerson: text("authorized_person").notNull(),
    signatureDate: integer("signature_date", { mode: "timestamp" }).notNull(),
    certificateBlobUrl: text("certificate_blob_url"),
    ediTransmittedAt: integer("edi_transmitted_at", { mode: "timestamp" }),
    ...commonAuditFields,
  },
  (table) => ({
    containerIdx: index("idx_container_vgm_container_id").on(table.containerId),
    shipmentIdx: index("idx_container_vgm_shipment_id").on(table.shipmentId),
    containerNumIdx: index("idx_container_vgm_container_num").on(
      table.containerNumber,
    ),
  }),
);

export type ContainerVgm = typeof containerVgm.$inferSelect;
export type NewContainerVgm = typeof containerVgm.$inferInsert;

// ============================================================================
// 3. EQUIPMENT LIFECYCLE (DEMURRAGE & DETENTION MILESTONES)
// ============================================================================

export const equipmentEventTypes = [
  "GATE_OUT_EMPTY",
  "GATE_IN_LADEN",
  "DISCHARGED",
  "GATE_OUT_LADEN",
  "GATE_IN_EMPTY",
] as const;

export type EquipmentEventType = (typeof equipmentEventTypes)[number];

export const equipmentLifecycle = sqliteTable(
  "equipment_lifecycle",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").references(() => companies.id),
    containerId: text("container_id")
      .notNull()
      .references(() => containers.id, { onDelete: "cascade" }),
    containerNumber: text("container_number").notNull(),
    shipmentId: text("shipment_id").references(() => shipments.id, {
      onDelete: "cascade",
    }),
    eventType: text("event_type", {
      enum: [
        "GATE_OUT_EMPTY",
        "GATE_IN_LADEN",
        "DISCHARGED",
        "GATE_OUT_LADEN",
        "GATE_IN_EMPTY",
      ],
    }).notNull(),
    eventTimestamp: integer("event_timestamp", { mode: "timestamp" }).notNull(),
    locationId: text("location_id").references(() => locations.id),
    reportedBy: text("reported_by").notNull(),
    notes: text("notes"),
    ...commonAuditFields,
  },
  (table) => ({
    containerIdx: index("idx_equipment_lifecycle_container_id").on(
      table.containerId,
    ),
    containerNumIdx: index("idx_equipment_lifecycle_container_num").on(
      table.containerNumber,
    ),
    eventTypeIdx: index("idx_equipment_lifecycle_event_type").on(
      table.eventType,
    ),
    timestampIdx: index("idx_equipment_lifecycle_timestamp").on(
      table.eventTimestamp,
    ),
  }),
);

export type EquipmentLifecycle = typeof equipmentLifecycle.$inferSelect;
export type NewEquipmentLifecycle = typeof equipmentLifecycle.$inferInsert;

// ============================================================================
// 4. DEMURRAGE & DETENTION DAILY ACCRUALS (IDEMPOTENT WORKER)
// ============================================================================

export const demurrageAccruals = sqliteTable(
  "demurrage_accruals",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").references(() => companies.id),
    containerId: text("container_id").references(() => containers.id, {
      onDelete: "set null",
    }),
    containerNumber: text("container_number").notNull(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    chargeType: text("charge_type", {
      enum: ["DEMURRAGE", "DETENTION"],
    }).notNull(),
    accrualDate: text("accrual_date").notNull(),
    daysExceeded: integer("days_exceeded").notNull(),
    dailyRate: real("daily_rate").notNull(),
    accrualAmount: real("accrual_amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status", {
      enum: ["ESTIMATED", "POSTED_TO_COSTS"],
    })
      .notNull()
      .default("ESTIMATED"),
    costId: text("cost_id").references(() => costs.id),
    ...commonAuditFields,
  },
  (table) => ({
    idempotencyIdx: uniqueIndex("idx_demurrage_accrual_idempotency").on(
      table.containerNumber,
      table.chargeType,
      table.accrualDate,
    ),
    shipmentIdx: index("idx_demurrage_accrual_shipment_id").on(
      table.shipmentId,
    ),
  }),
);

export type DemurrageAccrual = typeof demurrageAccruals.$inferSelect;
export type NewDemurrageAccrual = typeof demurrageAccruals.$inferInsert;

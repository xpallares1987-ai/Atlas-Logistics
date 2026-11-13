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

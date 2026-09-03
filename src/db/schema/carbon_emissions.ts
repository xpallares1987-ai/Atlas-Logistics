import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Carbon Emissions Calculations for Shipments, Quotes, and Multimodal Simulations (ISO 14083 / GLEC v3)
export const carbonCalculations = sqliteTable(
  "carbon_calculations",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type", {
      enum: ["SHIPMENT", "QUOTE", "SIMULATION"],
    })
      .notNull()
      .default("SHIPMENT"),
    entityId: text("entity_id"),
    referenceCode: text("reference_code").notNull(), // e.g. "SH-2026-0891" or "QT-2026-0045"
    originCity: text("origin_city").notNull(),
    destinationCity: text("destination_city").notNull(),
    searchTextNormalized: text("search_text_normalized").notNull().default(""),
    totalWeightKg: real("total_weight_kg").notNull(),
    totalDistanceKm: real("total_distance_km").notNull(),
    totalTco2eWtw: real("total_tco2e_wtw").notNull(), // Well-to-Wheel Total
    totalTco2eTtw: real("total_tco2e_ttw").notNull(), // Tank-to-Wheel (Direct operational combustion)
    totalTco2eWtt: real("total_tco2e_wtt").notNull(), // Well-to-Tank (Upstream energy lifecycle)
    carbonIntensityGco2ePerTkm: real(
      "carbon_intensity_gco2e_per_tkm",
    ).notNull(),
    status: text("status", {
      enum: ["CALCULATED", "OFFSET_PENDING", "OFFSET_COMPLETED"],
    })
      .notNull()
      .default("CALCULATED"),
    offsetProjectId: text("offset_project_id"),
    offsetCostEur: real("offset_cost_eur"),
    certificateNumber: text("certificate_number"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    createdAtIdIdx: index("idx_carbon_calculations_created_at_id").on(
      table.createdAt,
      table.id,
    ),
    filtersCreatedAtIdIdx: index(
      "idx_carbon_calculations_filters_created_at_id",
    ).on(table.entityType, table.status, table.createdAt, table.id),
  }),
);

// Itemized Leg-by-Leg Calculation Breakdown
export const carbonCalculationLegs = sqliteTable(
  "carbon_calculation_legs",
  {
    id: text("id").primaryKey(),
    calculationId: text("calculation_id")
      .notNull()
      .references(() => carbonCalculations.id, { onDelete: "cascade" }),
    legOrder: integer("leg_order").notNull(),
    originName: text("origin_name").notNull(),
    destinationName: text("destination_name").notNull(),
    mode: text("mode", {
      enum: [
        "OCEAN_CONTAINER",
        "OCEAN_BULK",
        "AIR_FREIGHT",
        "AIR_BELLY",
        "ROAD_DIESEL",
        "ROAD_HVO",
        "ROAD_EV",
        "RAIL_ELECTRIC",
        "RAIL_DIESEL",
      ],
    }).notNull(),
    distanceKm: real("distance_km").notNull(),
    weightTonnes: real("weight_tonnes").notNull(),
    emissionFactorWtw: real("emission_factor_wtw").notNull(), // gCO2e / t-km
    emissionFactorTtw: real("emission_factor_ttw").notNull(), // gCO2e / t-km
    emissionFactorWtt: real("emission_factor_wtt").notNull(), // gCO2e / t-km
    legTco2eWtw: real("leg_tco2e_wtw").notNull(),
    legTco2eTtw: real("leg_tco2e_ttw").notNull(),
    legTco2eWtt: real("leg_tco2e_wtt").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    calculationLegOrderIdx: index(
      "idx_carbon_calculation_legs_calculation_order",
    ).on(table.calculationId, table.legOrder),
  }),
);

// Verified Carbon Offset Projects Catalog (Gold Standard, Verra VCS, Puro.earth)
export const carbonOffsetProjects = sqliteTable("carbon_offset_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  standard: text("standard", {
    enum: ["GOLD_STANDARD", "VERRA_VCS", "PLAN_VIVO", "PURO_EARTH"],
  }).notNull(),
  category: text("category", {
    enum: [
      "REFORESTATION",
      "RENEWABLE_ENERGY",
      "BIOCHAR",
      "DIRECT_AIR_CAPTURE",
      "BLUE_CARBON",
    ],
  }).notNull(),
  country: text("country").notNull(),
  pricePerTco2eEur: real("price_per_tco2e_eur").notNull(),
  availableCreditsTco2e: real("available_credits_tco2e").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  verificationRegistryUrl: text("verification_registry_url"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Official Offset Certificates with Validation Metadata
export const carbonCertificates = sqliteTable(
  "carbon_certificates",
  {
    id: text("id").primaryKey(),
    certificateNumber: text("certificate_number").notNull().unique(), // e.g. "ATLAS-CARBON-2026-0042"
    calculationId: text("calculation_id")
      .notNull()
      .references(() => carbonCalculations.id),
    beneficiaryName: text("beneficiary_name").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => carbonOffsetProjects.id),
    projectName: text("project_name").notNull(),
    projectStandard: text("project_standard").notNull(),
    offsetTco2e: real("offset_tco2e").notNull(),
    amountPaidEur: real("amount_paid_eur").notNull(),
    qrValidationUrl: text("qr_validation_url").notNull(),
    issuedAt: text("issued_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => ({
    issuedAtIdIdx: index("idx_carbon_certificates_issued_at_id").on(
      table.issuedAt,
      table.id,
    ),
  }),
);

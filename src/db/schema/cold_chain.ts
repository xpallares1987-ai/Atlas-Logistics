import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { shipments } from "./operations.js";

// Regulated Temperature Profiles (EU GDP, IATA TCR, WHO)
export const coldChainProfiles = sqliteTable("cold_chain_profiles", {
  id: text("id").primaryKey(),
  code: text("code", {
    enum: [
      "ULTRA_COLD_MINUS_80",
      "FROZEN_MINUS_20",
      "PHARMA_COLD_2_8",
      "CONTROLLED_ROOM_15_25",
      "FRESH_PERISHABLE_0_4",
    ],
  })
    .notNull()
    .unique(),
  name: text("name").notNull(),
  minTempCelsius: real("min_temp_celsius").notNull(),
  maxTempCelsius: real("max_temp_celsius").notNull(),
  targetTempCelsius: real("target_temp_celsius").notNull(),
  humidityMinPct: real("humidity_min_pct"),
  humidityMaxPct: real("humidity_max_pct"),
  standard: text("standard").notNull().default("EU_GDP_2013_C_343"), // EU GDP, IATA TCR, WHO, EN 12830
  description: text("description"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Temperature-Controlled Shipments & Pharma Batches
export const coldChainShipments = sqliteTable("cold_chain_shipments", {
  id: text("id").primaryKey(),
  trackingNumber: text("tracking_number").notNull().unique(), // e.g. "CC-2026-9901"
  shipmentId: text("shipment_id").references(() => shipments.id),
  batchNumber: text("batch_number").notNull(), // e.g. "BATCH-VAX-2026-08A"
  productDescription: text("productDescription").notNull(),
  pharmaClassification: text("pharma_classification", {
    enum: [
      "BIOLOGICS_VACCINES",
      "APIS_REAGENTS",
      "FINISHED_DRUGS",
      "PERISHABLES_FOOD",
    ],
  }).notNull(),
  profileId: text("profile_id")
    .notNull()
    .references(() => coldChainProfiles.id),
  packagingType: text("packaging_type", {
    enum: [
      "ACTIVE_REEFER_CONTAINER",
      "PASSIVE_VIP_DRY_ICE",
      "INSULATED_EPS_GEL_PACKS",
    ],
  }).notNull(),
  setpointTempCelsius: real("setpoint_temp_celsius").notNull(),
  initialDryIceWeightKg: real("initial_dry_ice_weight_kg"),
  currentDryIceWeightKg: real("current_dry_ice_weight_kg"),
  dryIceSublimationRateKgHr: real("dry_ice_sublimation_rate_kg_hr"),
  loggerSerialNumber: text("logger_serial_number").notNull(), // Data logger ID (EN 12830)
  loggerModel: text("logger_model").default("TempTale GEO Ultra"),
  mktCalculatedCelsius: real("mkt_calculated_celsius"), // Mean Kinetic Temperature
  excursionDurationMinutes: integer("excursion_duration_minutes").default(0),
  excursionStatus: text("excursion_status", {
    enum: ["COMPLIANT", "MINOR_EXCURSION", "CRITICAL_EXCURSION"],
  })
    .notNull()
    .default("COMPLIANT"),
  gdpReleaseVerdict: text("gdp_release_verdict", {
    enum: [
      "RELEASED_FOR_DISTRIBUTION",
      "QUARANTINE_INVESTIGATION",
      "REJECTED_DISPOSAL",
      "IN_TRANSIT",
    ],
  })
    .notNull()
    .default("IN_TRANSIT"),
  responsiblePersonName: text("responsible_person_name"),
  qualityAuditNotes: text("quality_audit_notes"),
  originLocation: text("origin_location").notNull(),
  destinationLocation: text("destination_location").notNull(),
  departureTime: text("departure_time").notNull(),
  estimatedArrivalTime: text("estimated_arrival_time").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Telemetry & Probe Temperature Readings (EN 12830 Datalogger Series)
export const temperatureReadings = sqliteTable("temperature_readings", {
  id: text("id").primaryKey(),
  coldChainShipmentId: text("cold_chain_shipment_id")
    .notNull()
    .references(() => coldChainShipments.id, { onDelete: "cascade" }),
  recordedAt: text("recorded_at").notNull(), // ISO timestamp
  probeTemperatureCelsius: real("probe_temperature_celsius").notNull(),
  ambientTemperatureCelsius: real("ambient_temperature_celsius"),
  relativeHumidityPct: real("relative_humidity_pct"),
  isExcursion: integer("is_excursion", { mode: "boolean" })
    .notNull()
    .default(false),
  powerSupplyMode: text("power_supply_mode", {
    enum: ["GENSET_DIESEL", "MAINS_ELECTRIC", "BATTERY_PASSIVE"],
  }).default("BATTERY_PASSIVE"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

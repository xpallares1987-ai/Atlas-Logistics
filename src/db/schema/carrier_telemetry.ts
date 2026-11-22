/**
 * @file carrier_telemetry.ts
 * @description Drizzle ORM SQLite WAL schema for Carrier Telemetry, DCSA 3.0 Webhook Ingestion,
 * Satellite AIS Vessel Tracking, and Port Geofence Proximity.
 * Connects external carrier telemetry with the SCM Visibility and Exceptions Engine.
 * @module @atlas/db/schema/carrier_telemetry
 * @see {@link docs/adr/0034-carrier-track-and-trace-async-ingestion-and-predictive-resolution.md}
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { bookings } from "./operations.js";
import { purchaseOrders } from "./po.js";
import {
  supplyChainMilestoneEvents,
  supplyChainExceptions,
} from "./supply_chain_visibility.js";

// ============================================================================
// 1. ENUMS & CONSTANTS
// ============================================================================

export const telemetryFeedTypeEnum = [
  "DCSA_WEBHOOK",
  "AIS_FEED",
  "MANUAL_SIMULATION",
] as const;

export type TelemetryFeedType = (typeof telemetryFeedTypeEnum)[number];

export const telemetryProcessingStatusEnum = [
  "PROCESSED",
  "DUPLICATE",
  "CORRELATED",
  "ORPHAN",
  "ERROR",
] as const;

export type TelemetryProcessingStatus =
  (typeof telemetryProcessingStatusEnum)[number];

// ============================================================================
// 2. AIS VESSEL POSITIONS (Satellite Maritime Positioning)
// ============================================================================

export const aisVesselPositions = sqliteTable(
  "ais_vessel_positions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    vesselImo: text("vessel_imo").notNull(),
    vesselName: text("vessel_name"),
    callSign: text("call_sign"),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    speedKnots: real("speed_knots").notNull().default(0.0),
    heading: real("heading"),
    navigationalStatus: text("navigational_status")
      .notNull()
      .default("UNDERWAY"),
    destinationLocode: text("destination_locode"),
    etaDateTime: text("eta_date_time"), // ISO 8601 string
    draught: real("draught"),
    sourceProvider: text("source_provider").notNull().default("SPIRE"), // 'SPIRE' | 'MARINETRAFFIC' | 'AISHUB'
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
    ...commonAuditFields,
  },
  (table) => ({
    imoIdx: index("ais_vessel_imo_idx").on(table.vesselImo),
    destIdx: index("ais_dest_locode_idx").on(table.destinationLocode),
    tsIdx: index("ais_timestamp_idx").on(table.timestamp),
    tenantIdx: index("ais_tenant_idx").on(table.tenantId),
  }),
);

// ============================================================================
// 3. PORT GEOFENCES (Maritime Port Approach Boundaries)
// ============================================================================

export const portGeofences = sqliteTable(
  "port_geofences",
  {
    locode: text("locode").primaryKey(), // UN/LOCODE (e.g. 'ESVLC')
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    portName: text("port_name").notNull(),
    countryCode: text("country_code").notNull(),
    centerLat: real("center_lat").notNull(),
    centerLon: real("center_lon").notNull(),
    radiusKm: real("radius_km").notNull().default(25.0),
    berthPolygonJson: text("berth_polygon_json", { mode: "json" }),
    ...commonAuditFields,
  },
  (table) => ({
    countryIdx: index("geofence_country_idx").on(table.countryCode),
    tenantIdx: index("geofence_tenant_idx").on(table.tenantId),
  }),
);

// ============================================================================
// 4. CARRIER TELEMETRY INGESTION LOGS (Append-Only Audit & Correlation Ledger)
// ============================================================================

export const carrierTelemetryIngestionLogs = sqliteTable(
  "carrier_telemetry_ingestion_logs",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    feedType: text("feed_type", { enum: telemetryFeedTypeEnum }).notNull(),
    carrierCode: text("carrier_code"), // 'MSCU' | 'MAEU' | 'CMDU' | 'HLCU' | 'ONEY'
    eventFingerprint: text("event_fingerprint").notNull().unique(),
    rawPayload: text("raw_payload", { mode: "json" }).notNull(),
    httpStatus: integer("http_status").notNull().default(200),
    processingStatus: text("processing_status", {
      enum: telemetryProcessingStatusEnum,
    })
      .notNull()
      .default("PROCESSED"),
    matchedBookingId: text("matched_booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    matchedPoId: text("matched_po_id").references(() => purchaseOrders.id, {
      onDelete: "set null",
    }),
    matchedContainerNumber: text("matched_container_number"),
    milestoneEventId: text("milestone_event_id").references(
      () => supplyChainMilestoneEvents.id,
      { onDelete: "set null" },
    ),
    exceptionId: text("exception_id").references(
      () => supplyChainExceptions.id,
      { onDelete: "set null" },
    ),
    errorMessage: text("error_message"),
    ...commonAuditFields,
  },
  (table) => ({
    fpIdx: index("telemetry_fp_idx").on(table.eventFingerprint),
    carrierIdx: index("telemetry_carrier_idx").on(table.carrierCode),
    statusIdx: index("telemetry_status_idx").on(table.processingStatus),
    bkgIdx: index("telemetry_bkg_idx").on(table.matchedBookingId),
    poIdx: index("telemetry_po_idx").on(table.matchedPoId),
    tenantIdx: index("telemetry_tenant_idx").on(table.tenantId),
  }),
);

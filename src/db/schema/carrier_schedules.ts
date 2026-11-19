/**
 * @file carrier_schedules.ts
 * @description Master data and relational models for Carrier Master Data, Vessel Master Data,
 * Voyage Schedules, Port Rotations, and Terminal Cut-offs.
 * @module @atlas/db/schema/carrier_schedules
 * @see {@link docs/adr/0027-carrier-integrations-ocean-schedules-ebl-lifecycle.md}
 */

import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { addresses, locations } from "./core.js";

// ============================================================================
// 1. CARRIER SERVICES & LOOPS
// ============================================================================

export const transportModeEnum = ["OCEAN", "AIR", "RAIL", "ROAD"] as const;
export type TransportMode = (typeof transportModeEnum)[number];

export const carrierServices = sqliteTable(
  "carrier_services",
  {
    id: text("id").primaryKey(),
    carrierId: text("carrier_id")
      .notNull()
      .references(() => addresses.id),
    serviceCode: text("service_code").notNull(),
    serviceName: text("service_name").notNull(),
    transportMode: text("transport_mode", { enum: transportModeEnum })
      .notNull()
      .default("OCEAN"),
    tradeLane: text("trade_lane"), // e.g. 'ASIA_NORTH_EUROPE', 'TRANSATLANTIC'
    ...commonAuditFields,
  },
  (table) => ({
    carrierIdx: index("idx_carrier_services_carrier_id").on(table.carrierId),
    serviceCodeIdx: index("idx_carrier_services_code").on(table.serviceCode),
  }),
);

export type CarrierService = typeof carrierServices.$inferSelect;
export type NewCarrierService = typeof carrierServices.$inferInsert;

// ============================================================================
// 2. VESSEL MASTER DATA
// ============================================================================

export const vessels = sqliteTable(
  "vessels",
  {
    id: text("id").primaryKey(),
    imoNumber: text("imo_number").notNull().unique(), // Exactly 7 digits
    vesselName: text("vessel_name").notNull(),
    flag: text("flag"), // ISO 3166-1 alpha-2 or alpha-3 flag country
    capacityTeu: integer("capacity_teu"),
    yearBuilt: integer("year_built"),
    callSign: text("call_sign"),
    mmsi: text("mmsi"), // Maritime Mobile Service Identity (9 digits)
    ...commonAuditFields,
  },
  (table) => ({
    nameIdx: index("idx_vessels_name").on(table.vesselName),
    imoIdx: uniqueIndex("idx_vessels_imo").on(table.imoNumber),
  }),
);

export type Vessel = typeof vessels.$inferSelect;
export type NewVessel = typeof vessels.$inferInsert;

// ============================================================================
// 3. VOYAGES & ROTATION SCHEDULES
// ============================================================================

export const voyageDirectionEnum = [
  "EAST",
  "WEST",
  "NORTH",
  "SOUTH",
  "INBOUND",
  "OUTBOUND",
] as const;
export type VoyageDirection = (typeof voyageDirectionEnum)[number];

export const voyageStatusEnum = [
  "SCHEDULED",
  "ACTIVE",
  "COMPLETED",
  "OMITTED",
] as const;
export type VoyageStatus = (typeof voyageStatusEnum)[number];

export const voyages = sqliteTable(
  "voyages",
  {
    id: text("id").primaryKey(),
    voyageNumber: text("voyage_number").notNull(),
    vesselId: text("vessel_id")
      .notNull()
      .references(() => vessels.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => carrierServices.id, {
      onDelete: "set null",
    }),
    direction: text("direction", { enum: voyageDirectionEnum })
      .notNull()
      .default("EAST"),
    status: text("status", { enum: voyageStatusEnum })
      .notNull()
      .default("SCHEDULED"),
    ...commonAuditFields,
  },
  (table) => ({
    vesselVoyageUnique: uniqueIndex("idx_voyages_vessel_voyage").on(
      table.vesselId,
      table.voyageNumber,
    ),
    serviceIdx: index("idx_voyages_service_id").on(table.serviceId),
    statusIdx: index("idx_voyages_status").on(table.status),
  }),
);

export type Voyage = typeof voyages.$inferSelect;
export type NewVoyage = typeof voyages.$inferInsert;

// ============================================================================
// 4. PORT CALLS (ROTATION LEGS) & TERMINAL CUT-OFFS
// ============================================================================

export const portCalls = sqliteTable(
  "port_calls",
  {
    id: text("id").primaryKey(),
    voyageId: text("voyage_id")
      .notNull()
      .references(() => voyages.id, { onDelete: "cascade" }),
    locationId: text("location_id").references(() => locations.id),
    unlocode: text("unlocode").notNull(), // 5-letter UNECE UN/LOCODE (e.g. 'CNSHA', 'ESVLC')
    terminalCode: text("terminal_code"), // e.g. 'CSP_VALENCIA', 'YS_SHANGHAI'
    sequence: integer("sequence").notNull(), // 1, 2, 3...
    eta: integer("eta", { mode: "timestamp" }),
    etd: integer("etd", { mode: "timestamp" }),
    ata: integer("ata", { mode: "timestamp" }),
    atd: integer("atd", { mode: "timestamp" }),
    cyCutOff: integer("cy_cut_off", { mode: "timestamp" }), // Container Yard Gate-in Cut-off
    vgmCutOff: integer("vgm_cut_off", { mode: "timestamp" }), // SOLAS VGM Declaration Cut-off
    siCutOff: integer("si_cut_off", { mode: "timestamp" }), // Shipping Instructions Cut-off
    ...commonAuditFields,
  },
  (table) => ({
    voyageSeqIdx: index("idx_port_calls_voyage_sequence").on(
      table.voyageId,
      table.sequence,
    ),
    unlocodeIdx: index("idx_port_calls_unlocode").on(table.unlocode),
  }),
);

export type PortCall = typeof portCalls.$inferSelect;
export type NewPortCall = typeof portCalls.$inferInsert;

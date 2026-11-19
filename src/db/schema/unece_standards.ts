/**
 * @file unece_standards.ts
 * @description Drizzle ORM schemas for official UNECE / UN/CEFACT master catalogs:
 * (1) UN/EDIFACT message types (~190 codes), (2) UN/CEFACT XML Schemas (CII, MMT-RDM, SCRDM),
 * and (3) UNECE PX-Web Transport Statistics (STAT__40-TRTRANS).
 * @module @atlas/db/schema/unece-standards
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

// ============================================================================
// 1. UN/EDIFACT MESSAGE TYPES MASTER CATALOG (~190 OFFICIAL CODES)
// ============================================================================

export const edifactMessageTypes = sqliteTable(
  "edifact_message_types",
  {
    code: text("code").primaryKey(),
    nameEn: text("name_en").notNull(),
    nameEs: text("name_es").notNull(),
    functionalDomain: text("functional_domain").notNull(),
    isLogisticsCore: integer("is_logistics_core", { mode: "boolean" })
      .notNull()
      .default(false),
    typicalSenderTypes: text("typical_sender_types", { mode: "json" }).$type<
      string[]
    >(),
    typicalReceiverTypes: text("typical_receiver_types", {
      mode: "json",
    }).$type<string[]>(),
    directoryVersion: text("directory_version").notNull().default("D.23B"),
    supportsLiveEngine: integer("supports_live_engine", { mode: "boolean" })
      .notNull()
      .default(false),
    ...commonAuditFields,
  },
  (table) => ({
    domainIdx: index("idx_edifact_msg_domain").on(table.functionalDomain),
    logisticsIdx: index("idx_edifact_msg_logistics").on(table.isLogisticsCore),
  }),
);

export type EdifactMessageType = typeof edifactMessageTypes.$inferSelect;
export type NewEdifactMessageType = typeof edifactMessageTypes.$inferInsert;

// ============================================================================
// 2. UN/CEFACT XML SCHEMAS REGISTRY (CII, MMT-RDM, SCRDM, CUSTOMS)
// ============================================================================

export const uncefactXmlSchemas = sqliteTable(
  "uncefact_xml_schemas",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    standardFamily: text("standard_family").notNull(),
    releaseVersion: text("release_version").notNull(),
    rootElement: text("root_element").notNull(),
    namespaceUri: text("namespace_uri").notNull(),
    schemaUrl: text("schema_url").notNull(),
    edifactEquivalents: text("edifact_equivalents", { mode: "json" }).$type<
      string[]
    >(),
    applicableEntityTypes: text("applicable_entity_types", {
      mode: "json",
    }).$type<string[]>(),
    supportsLiveGenerator: integer("supports_live_generator", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    description: text("description").notNull(),
    ...commonAuditFields,
  },
  (table) => ({
    familyIdx: index("idx_uncefact_xml_family").on(table.standardFamily),
  }),
);

export type UncefactXmlSchema = typeof uncefactXmlSchemas.$inferSelect;
export type NewUncefactXmlSchema = typeof uncefactXmlSchemas.$inferInsert;

// ============================================================================
// 3. UNECE TRANSPORT STATISTICS (STAT__40-TRTRANS VIA PX-WEB REST API)
// ============================================================================

export const uneceTransportStatistics = sqliteTable(
  "unece_transport_statistics",
  {
    id: text("id").primaryKey(),
    datasetCode: text("dataset_code").notNull(),
    transportMode: text("transport_mode").notNull(), // 'ROAD' | 'RAIL' | 'INLAND_WATERWAY' | 'INFRASTRUCTURE'
    countryCode: text("country_code").notNull(),
    countryName: text("country_name").notNull(),
    year: integer("year").notNull(),
    metricLabel: text("metric_label").notNull(),
    value: real("value").notNull(),
    unit: text("unit").notNull(),
    sourceTableId: text("source_table_id").notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull(),
    ...commonAuditFields,
  },
  (table) => ({
    modeCountryYearIdx: index("idx_unece_stats_mode_country_year").on(
      table.transportMode,
      table.countryCode,
      table.year,
    ),
    datasetIdx: index("idx_unece_stats_dataset").on(table.datasetCode),
  }),
);

export type UneceTransportStatistic =
  typeof uneceTransportStatistics.$inferSelect;
export type NewUneceTransportStatistic =
  typeof uneceTransportStatistics.$inferInsert;

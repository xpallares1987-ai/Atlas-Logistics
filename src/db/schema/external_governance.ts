import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

/**
 * 1. Data Sources Catalog (Authorities, Registries, Open Data Providers)
 * Tracks external authorities: UN/LOCODE, OpenStreetMap, GeoNames, GLEIF, IMO, etc.
 */
export const dataSources = sqliteTable(
  "data_sources",
  {
    id: text("id").primaryKey(), // e.g. "src_unlocode", "src_osm"
    code: text("code").notNull().unique(), // e.g. "UNLOCODE", "OPENSTREETMAP", "GEONAMES", "GLEIF"
    name: text("name").notNull(),
    type: text("type").notNull().default("OPEN_DATA"), // 'OPEN_DATA' | 'AUTHORITY' | 'COMMERCIAL_API' | 'REGULATORY'
    websiteUrl: text("website_url"),
    termsUrl: text("terms_url"),
    description: text("description"),
    ...commonAuditFields,
  },
  (table) => ({
    codeIdx: uniqueIndex("data_sources_code_idx").on(table.code),
    typeIdx: index("data_sources_type_idx").on(table.type),
  }),
);

/**
 * 2. Source Records (Raw External Payloads & Ingestion Provenance)
 * Stores ingested raw data as JSON (Zero BLOBs), with SHA-256 integrity hash and extraction timestamp.
 */
export const sourceRecords = sqliteTable(
  "source_records",
  {
    id: text("id").primaryKey(), // UUID: "srec_..."
    sourceId: text("source_id")
      .notNull()
      .references(() => dataSources.id),
    externalId: text("external_id").notNull(), // e.g. "ESBCN", "node/123456", "LEI-549300..."
    sourceUrl: text("source_url"),
    rawPayload: text("raw_payload", { mode: "json" }).notNull(), // Raw JSON payload
    normalizedPayload: text("normalized_payload", { mode: "json" }), // Cleaned domain attributes
    sha256Hash: text("sha256_hash").notNull(), // Cryptographic hash of rawPayload
    retrievedAt: integer("retrieved_at", { mode: "timestamp" }).notNull(),
    versionTag: text("version_tag"), // e.g. "2026-1", "v1.0"
    ...commonAuditFields,
  },
  (table) => ({
    sourceExternalIdx: index("source_records_src_ext_idx").on(
      table.sourceId,
      table.externalId,
    ),
    hashIdx: index("source_records_hash_idx").on(table.sha256Hash),
  }),
);

/**
 * 3. Entity Source Links (Semantic Cross-Reference to Atlas Domain)
 * Binds external authoritative records directly to internal Atlas entities
 * (ports, locations, shipments, containers, carriers, vessels).
 */
export const entitySourceLinks = sqliteTable(
  "entity_source_links",
  {
    id: text("id").primaryKey(), // UUID: "esl_..."
    entityType: text("entity_type").notNull(), // 'PORT' | 'LOCATION' | 'VESSEL' | 'CARRIER' | 'SHIPMENT' | 'CONTAINER'
    entityId: text("entity_id").notNull(), // Internal Atlas entity ID or business code
    sourceRecordId: text("source_record_id")
      .notNull()
      .references(() => sourceRecords.id),
    matchConfidence: real("match_confidence").notNull().default(1.0), // 0.0 to 1.0
    matchMethod: text("match_method").notNull().default("EXACT_CODE"), // 'EXACT_CODE' | 'FUZZY_NAME' | 'GEO_PROXIMITY' | 'MANUAL'
    verifiedAt: integer("verified_at", { mode: "timestamp" }).notNull(),
    verifiedBy: text("verified_by"), // User ID or automated engine name
    ...commonAuditFields,
  },
  (table) => ({
    entityIdx: index("entity_source_links_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    sourceRecordIdx: index("entity_source_links_record_idx").on(
      table.sourceRecordId,
    ),
  }),
);

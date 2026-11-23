/**
 * @file crdt_sync.ts
 * @description Drizzle ORM SQLite schema for Distributed Hybrid Persistence, Logical Vector Clocks, and Multi-Station CRDT State Tracking.
 * @module @atlas/db/schema/crdt_sync
 * @see {@link docs/adr/0039-hybrid-persistence-and-crdt-synchronization.md}
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================================
// 1. CRDT AGGREGATE ENTITY STATES (STATE-BASED CRDT PERSISTENCE)
// ============================================================================

export const crdtEntityStates = sqliteTable(
  "crdt_entity_states",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    entityType: text("entity_type", {
      enum: ["SHIPMENT", "CONTAINER", "PURCHASE_ORDER", "CUSTOMS_CLEARANCE"],
    }).notNull(),
    entityId: text("entity_id").notNull(),
    vectorClock: text("vector_clock", { mode: "json" }).notNull(),
    statePayload: text("state_payload", { mode: "json" }).notNull(),
    lastModifiedNodeId: text("last_modified_node_id").notNull(),
    lastHlcTimestamp: text("last_hlc_timestamp").notNull(),
    hasActiveHold: integer("has_active_hold", { mode: "boolean" })
      .notNull()
      .default(false),
    holdMetadata: text("hold_metadata", { mode: "json" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_crdt_states_tenant_entity").on(
      table.tenantId,
      table.entityType,
      table.entityId,
    ),
    index("idx_crdt_states_hold").on(table.tenantId, table.hasActiveHold),
    index("idx_crdt_states_updated").on(table.updatedAt),
  ],
);

// ============================================================================
// 2. CRDT MUTATION AUDIT & CONFLICT RESOLUTION LOG
// ============================================================================

export const crdtMutationAudit = sqliteTable(
  "crdt_mutation_audit",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    originNodeId: text("origin_node_id").notNull(),
    appliedNodeId: text("applied_node_id").notNull(),
    mutationVectorClock: text("mutation_vector_clock", {
      mode: "json",
    }).notNull(),
    deltaPayload: text("delta_payload", { mode: "json" }).notNull(),
    resolutionOutcome: text("resolution_outcome", {
      enum: [
        "APPLIED_CLEAN",
        "APPLIED_WITH_CONFLICTS",
        "REJECTED_STALE",
        "REJECTED_REGULATORY_HOLD",
      ],
    }).notNull(),
    conflictsDetected: text("conflicts_detected", { mode: "json" }),
    hlcTimestamp: text("hlc_timestamp").notNull(),
    appliedAt: text("applied_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_crdt_mutations_tenant_entity").on(
      table.tenantId,
      table.entityType,
      table.entityId,
    ),
    index("idx_crdt_mutations_node_hlc").on(
      table.originNodeId,
      table.hlcTimestamp,
    ),
  ],
);

// ============================================================================
// 3. CRDT STATION PEERS REGISTRY
// ============================================================================

export const crdtStationPeers = sqliteTable(
  "crdt_station_peers",
  {
    nodeId: text("node_id").primaryKey(),
    stationCode: text("station_code").notNull().unique(),
    stationName: text("station_name").notNull(),
    role: text("role", {
      enum: ["EDGE_STATION", "REGIONAL_HUB", "CENTRAL_CONSOLIDATOR"],
    })
      .notNull()
      .default("EDGE_STATION"),
    endpointUrl: text("endpoint_url"),
    lastSyncAt: text("last_sync_at"),
    lastKnownVectorClock: text("last_known_vector_clock", { mode: "json" }),
    syncStatus: text("sync_status", {
      enum: ["ONLINE_SYNCED", "OFFLINE_DIRTY", "SYNCING", "CONFLICT_LOCKED"],
    })
      .notNull()
      .default("ONLINE_SYNCED"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_crdt_peers_station_code").on(table.stationCode),
    index("idx_crdt_peers_sync_status").on(table.syncStatus),
  ],
);

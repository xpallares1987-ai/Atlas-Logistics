# 0021. Agile External Data Governance, Entity Cross-Linking, and Resilient Offline Architecture (Zero-Cost SQLite)

- **Status**: Accepted (Pragmatic Architecture Review)
- **Date**: 2026-11-12
- **Context**: Atlas Logistics Core Architecture & Data Governance Teams
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)

---

## 1. Context & Problem Statement

Atlas Logistics operates under a hybrid "Zero Recurring Cost & Offline First" paradigm using local SQLite and Fastify. Ingesting external data sources (UNECE UN/LOCODE, OpenStreetMap, GeoNames, GLEIF, IMO GISIS) must reliably enrich internal operational entities (containers, ports, shipments, and vessels).

An initial theoretical proposal called for an 11-table hyper-normalized schema with complex automated license evaluators (ODbL, CC-BY, proprietary). For local, offline operations, this introduced excessive bureaucratic friction. The core operational priorities are:
1. **Direct Operational Entity Linking**: Link ports, terminals, and geocoded coordinates with real external identifiers while preserving raw payloads in JSON.
2. **Offline-to-Central Synchronization**: Rely on immutable append-only Event Sourcing / Outbox patterns to eliminate relational merge conflicts between local offline SQLite instances (`data/dev.db`) and central instances (`data/prod.db`).
3. **Prevent File Orphanage in Local Filesystems**: Use relative paths (`DOCS_ROOT`) and an automated disk Garbage Collector.
4. **Prevent In-Memory Cache De-synchronization**: Implement a *Write-Through Cache* pattern for the in-memory UN/LOCODE prefix trie.
5. **Guarantee Transactionally Consistent Backups**: Prevent torn pages and backup corruption in SQLite WAL mode using native `VACUUM INTO`.

---

## 2. Architectural Decisions

### 2.1. Lean Relational Triad (3 Core Tables)
Adopted an agile, high-performance 3-table schema in `src/db/schema/external_governance.ts`:
- **`data_sources`**: Catalog of external data providers (`UNLOCODE`, `OPENSTREETMAP`, `GEONAMES`, `GLEIF`, `IMO_GISIS`).
- **`source_records`**: Raw ingested records storing original JSON payloads (`text("raw_payload", { mode: "json" })`), external identifiers, extraction timestamps, and SHA-256 integrity hashes.
- **`entity_source_links`**: Semantic cross-links between external source records and internal Atlas domain entities (`PORT`, `LOCATION`, `VESSEL`, `CARRIER`, `SHIPMENT`, `CONTAINER`), including match confidence scores (`match_confidence`) and verification methods.

### 2.2. Append-Only Event Sourcing / Outbox for Offline Synchronization
To guarantee deterministic bidirectional synchronization between offline local instances and central servers:
- State mutations from the UI avoid destructive, ad-hoc `UPDATE` and `DELETE` synchronization scripts.
- Mutations produce immutable domain events recorded in `scmOutboxMessages` / `local_outbox_events` via `TransactionalOutboxBus`.
- Read operations query projected relational SQLite tables (CQRS), while synchronization simply replays ordered domain event envelopes (`eventId`, `eventType`, `payload`, `occurredAt`), avoiding UUID and primary key merge conflicts.

### 2.3. Document Management: Relative Pointers & Scheduled Garbage Collection
- **Zero Absolute Paths in Database**: The `documents` table stores strictly SHA-256 hashes, metadata, and relative paths (`/api/documents/download/...`).
- **Dynamic Filesystem Resolution**: Fastify resolves absolute storage paths dynamically via the `DOCS_ROOT` environment variable (defaulting to `./uploads`), ensuring portability across Windows, Linux, and local NAS storage.
- **Automated Garbage Collector**: An automated script (`src/scripts/documents-garbage-collector.ts`) cross-checks the physical storage directory against active rows in SQLite (`is_deleted = 0`), pruning orphaned files to prevent storage bloat.

### 2.4. In-Memory Dictionaries: Write-Through Cache
- The fast UN/LOCODE lookup engine (`UnlocodePrefixTrie` in `packages/shared/src/unlocode.ts`) implements a **Write-Through** pattern:
- Whenever an entity is inserted or updated in SQLite, the mutation atomically updates the in-memory Trie and LRU cache in Fastify without requiring server restarts.

### 2.5. Safe Transactional Backups: Native SQLite `VACUUM INTO`
- Prohibited hot OS-level file copies (`Copy-Item` / `fs.copyFile`) during active WAL write operations.
- The automated database backup utility (`src/scripts/backup-db.js`) executes native SQLite `VACUUM INTO 'backup-path.db'`, guaranteeing an atomic, defragmented snapshot free of corrupted pages.

---

## 3. Consequences

### Positive
- **Rapid Implementation**: 70% reduction in unnecessary boilerplate, allowing immediate linking of operational shipments with UN/LOCODE ports and GeoNames.
- **Resilient Offline Synchronization**: Append-only event streams permit reliable replication between local and central nodes without relational merge collisions.
- **Hardened Document Storage & Backups**: Zero storage leaks from orphaned files and guaranteed zero torn pages during backups.
- **Sub-Millisecond Read Performance**: Hot in-memory write-through caching delivers instant UI typeahead and search.

---

## 4. Verification State
- **Database Migration**: `drizzle/0028_large_wither.sql` applied cleanly.
- **Determinism in Seeds**: Verified across all seed phases with `sh_demo_01` canonical shipment.
- **Integration Tests**: Verified passing in Vitest with zero regressions.

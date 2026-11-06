# 0009 SQLite WAL Mode and Enforced Foreign Key Constraints

- **Status**: Accepted
- **Deciders**: Engineering Team & AI Architecture Reviewer
- **Date**: 2026-11-03

## Context and Problem Statement

Atlas-Logistics operates with SQLite (`libsql` / `better-sqlite3`) as its primary database. In earlier development phases, SQLite operated in standard rollback journal mode without active foreign key verification by default, leading to database lock contention (`SQLITE_BUSY`) under concurrent Fastify requests and orphan records when inserting child entities before parent records existed.

## Decision Drivers

- Absolute referential integrity across complex multimodal supply chain entities (Shipments, Containers, Documents, Cargo Items, Invoices).
- High-concurrency read performance without blocking writer transactions.
- Prevention of concurrency collisions between background BullMQ jobs and foreground Fastify HTTP requests.
- Strict prevention of database corruption during unexpected restarts or power cuts.

## Decision Outcome

1. **Mandatory WAL (Write-Ahead Logging)**: Configured SQLite to always initialize with `PRAGMA journal_mode = WAL;`.
2. **Synchronous Normal**: Configured `PRAGMA synchronous = NORMAL;` to balance durability with sub-millisecond write latencies.
3. **Active Foreign Keys**: Enforced `PRAGMA foreign_keys = ON;` upon every connection initialization in `src/db/index.ts`.
4. **Defensive Seeders & Migrations**: All seed scripts and data migrations must verify and defensively initialize parent rows (`companies`, `users`, `shipments`) prior to dependent inserts.
5. **Busy Handler Timeout**: Set `busyTimeout: 5000` to automatically retry brief concurrent writes instead of immediately throwing `SQLITE_BUSY`.

### Consequences

- **Good**: Multiple concurrent readers can execute simultaneously without blocking ongoing writes.
- **Good**: Guaranteed referential integrity; database rejects invalid foreign keys at the engine level.
- **Good**: Zero database corruption during sudden process terminations.
- **Bad**: Seeders and tests must strictly declare entities in topological dependency order.

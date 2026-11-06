# 0010 Zero-Mock Live Enterprise Data Standard

- **Status**: Accepted
- **Deciders**: Engineering Team & AI Architecture Reviewer
- **Date**: 2026-11-04

## Context and Problem Statement

Several frontend modules in Atlas-Logistics originally relied on hardcoded mock presets in memory (e.g. `DEMURRAGE_DISPUTE_PRESETS`, `OCEAN_BOOKING_PRESETS`, `STOWAGE_DEMO_PRESETS`). While useful during early UI prototyping, these static mocks caused data drift, prevented real persistence of mutations, and misled operators into thinking actions had taken place when state reset on page refresh.

## Decision Drivers

- Absolute fidelity between user interface actions and underlying SQLite database state.
- Elimination of simulation buttons and artificial data toggles across all production UI modules.
- End-to-end auditability and compliance with international supply chain standards (FIATA, DCSA, SAT, FMC).
- Reliable testability: unit and integration tests must run against real database tables rather than in-memory mocks.

## Decision Outcome

1. **Total Deprecation of In-Memory Presets**: Presets are eliminated from runtime UI loops and relocated exclusively to deterministic database seeders (`src/db/seeds/`).
2. **Dynamic Entity Selectors**: Any view requiring an operational entity (shipment, container, booking) must provide dynamic selectors querying live SQLite data, defaulting to the canonical demo entity (`sh_demo_01`, `cnt_msku_9284712`, `bk_demo_01`).
3. **Direct Operational Actions**: Replaced simulation toggles with transactional Fastify endpoints backed by Drizzle ORM.
4. **Guaranteed Idempotency**: All seeders must use `.onConflictDoNothing()` or `.onConflictDoUpdate()` to ensure re-runs never trigger primary key or unique constraint violations.

### Consequences

- **Good**: User interactions persist permanently in SQLite across page reloads and server restarts.
- **Good**: Eliminates confusion between mocked demonstration flows and live production operations.
- **Good**: Zero mock drift: API schemas, frontend interfaces, and database DDL are strictly synchronized.
- **Bad**: Development workflows require running the database seed pipeline (`/api/admin/seed/*`) to populate initial canonical test data.

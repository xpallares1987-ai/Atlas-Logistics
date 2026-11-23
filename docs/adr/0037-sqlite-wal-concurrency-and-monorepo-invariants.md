# 0037. SQLite WAL Concurrency, Busy-Timeout Safety & Monorepo Package Boundaries

- **Status**: Accepted
- **Date**: 2026-11-23
- **Context**: Atlas Logistics Architecture, SCM Core, Platform Engineering & Data Infrastructure Teams
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **See Also**: [ADR 0004](0004-zero-cost-local-architecture.md), [ADR 0008](0008-scm-sqlite-cqrs-workflow-engine.md), [ADR 0009](0009-sqlite-wal-mandatory-foreign-keys.md), [ADR 0010](0010-zero-mock-live-persistence-standard.md), [ADR 0020](0020-frontend-modular-decomposition-and-file-size-guardrails.md), [ADR 0036](0036-autonomous-disruption-resolution-and-automated-rerouting-engine.md)

---

## 1. Context & Problem Statement

Atlas Logistics operates as an enterprise-grade multimodal Supply Chain Management (SCM) Operating System designed under a zero-cost local infrastructure mandate ($0.00 SaaS/Cloud overhead). Its persistence core is powered by Drizzle ORM paired with SQLite in Write-Ahead Logging mode (`PRAGMA journal_mode=WAL;`) with mandatory foreign key integrity (`PRAGMA foreign_keys = ON;`).

As the platform scales to support concurrent forwarding stations, automated carrier telemetry ingestion, continuous outbox processing, and multi-tenant B2B portals, two critical architectural challenges emerge:

1. **Write Concurrency & `SQLITE_BUSY` Contention**:
   SQLite is fundamentally a single-writer, multi-reader database. While WAL mode enables non-blocking concurrent readers alongside a single active writer, bursty write contention (e.g. 50 parallel forwarding stations committing purchase order allocations, booking milestones, and outbox messages) can trigger `SQLITE_BUSY` exceptions if connections do not configure proper busy-handler backoffs.
2. **Monorepo Package Boundary Erosion**:
   In a multi-package TypeScript monorepo, developers can inadvertently violate architectural boundaries by:
   - Importing backend services or Drizzle database schemas directly into frontend UI packages (`packages/frontend/src/` -> `src/db/`).
   - Coupling pure domain calculation and optimization engines (`src/scm/engines/`) with Fastify HTTP routes, ORMs, or native database drivers.
3. **DDL Schema Drift & Disaster Recovery Verification in CI**:
   Manual modifications or unsynchronized migrations can lead to uncommitted schema divergence between Drizzle schema declarations and live SQLite instances, as well as unverified database backup/restore routines.

---

## 2. Decision Drivers

- **Zero Unhandled `SQLITE_BUSY` Aborts**: Ensure all database connections configure an aggressive, thread-safe busy timeout (`PRAGMA busy_timeout = 5000;`) coupled with `PRAGMA synchronous = NORMAL;`, guaranteeing that write operations queue gracefully for up to 5 seconds before failing.
- **Concurrency SLA Benchmark**: Establish an automated, repeatable stress test suite (`tests/concurrency/sqlite-wal-stress.test.ts`) simulating 50 concurrent forwarding station workers executing 5,000 mixed read/write transactions, verifying p95 latency under 15ms.
- **Strict Monorepo Boundary Enforcement**:
  - Enforce that `packages/frontend/` and all Micro-Frontend (MFE) packages interact with backend data exclusively via typed REST/WebSocket APIs, never importing `src/db/` or `better-sqlite3`.
  - Enforce that pure domain engines (`src/scm/engines/`) remain 100% pure TypeScript functions with zero imports of Fastify, Drizzle ORM, libSQL, better-sqlite3, or Node filesystem APIs.
- **Continuous Schema Integrity & Disaster Recovery in CI**:
  - Integrate `drizzle-kit check` in CI to fail immediately if uncommitted DDL changes or broken foreign keys exist.
  - Wire automated `VACUUM INTO` backup and restore drills in GitHub Actions to verify point-in-time recovery.

---

## 3. Considered Options

### Option 1: Migrate to Managed Cloud Databases (PostgreSQL / CockroachDB)
- *Pros*: Native multi-writer connection pooling; enterprise row-level locking.
- *Cons*: Violates the core architectural invariant of zero SaaS/cloud subscription costs ($0.00 infrastructure mandate); breaks offline-first station autonomy.

### Option 2: SQLite WAL with Tuned Pragmas and ESLint Monorepo Boundaries (Chosen)
- *Pros*:
  - Completely preserves the zero-cost, offline-first embedded topology.
  - `PRAGMA busy_timeout = 5000;` combined with `PRAGMA synchronous = NORMAL;` delivers sub-15ms p95 transaction performance under heavy multi-worker contention.
  - ESLint `no-restricted-imports` and `flat/recommended` guardrails deterministically prevent boundary leaks across monorepo packages.
  - 100% testable locally and in CI with zero external dependencies.
- *Cons*:
  - Requires developers to maintain clean separation between pure calculation engines and database service layers.

---

## 4. Decision Outcome

Chosen Option: **Option 2**.

### Invariant Database Connection Pragmas
Every SQLite connection initialized via `better-sqlite3` or Drizzle ORM in Atlas Logistics must execute the following pragmas immediately upon opening:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB in-memory page cache
PRAGMA temp_store = MEMORY;
```

### ESLint Monorepo Boundary Rules

1. **Frontend Isolation (`packages/frontend/src/**/*.{ts,tsx}`)**:
   ```javascript
   {
     files: ["packages/frontend/src/**/*.{ts,tsx}"],
     rules: {
       "no-restricted-imports": [
         "error",
         {
           paths: [
             { name: "drizzle-orm", message: "Frontend must not import Drizzle ORM directly." },
             { name: "better-sqlite3", message: "Frontend must not import SQLite database driver." },
             { name: "fastify", message: "Frontend must not import backend Fastify framework." },
           ],
           patterns: [
             {
               group: ["**/src/db/**", "**/src/services/**", "**/src/routes/**"],
               message: "Frontend must interact with backend via HTTP/REST contracts, never direct internal backend paths."
             }
           ]
         }
       ]
     }
   }
   ```

2. **Pure Domain Engines Isolation (`src/scm/engines/**/*.ts`)**:
   ```javascript
   {
     files: ["src/scm/engines/**/*.ts"],
     rules: {
       "no-restricted-imports": [
         "error",
         {
           paths: [
             { name: "drizzle-orm", message: "Pure SCM domain engines must remain decoupled from Drizzle ORM." },
             { name: "@libsql/client", message: "Pure SCM domain engines must remain decoupled from libSQL driver." },
             { name: "better-sqlite3", message: "Pure SCM domain engines must remain decoupled from SQLite driver." },
             { name: "fastify", message: "Pure SCM domain engines must remain decoupled from Fastify HTTP." },
             { name: "fs", message: "Pure SCM domain engines must not perform direct filesystem I/O." },
             { name: "node:fs", message: "Pure SCM domain engines must not perform direct filesystem I/O." },
           ]
         }
       ]
     }
   }
   ```

---

## 5. Consequences

### Positive
- **Guaranteed Operational Stability**: Write contention across background workers, REST routes, and outbox publishers is resolved deterministically without application-level `SQLITE_BUSY` crashes.
- **Architectural Purity**: Pure calculation engines can be compiled and reused in workers, edge nodes, mobile PWAs, or serverless environments without modification.
- **Zero Cloud Costs**: Full enterprise concurrency compliance achieved with zero external database licenses or hosting fees.

### Negative / Trade-offs
- Heavy batch writes (such as bulk UN/LOCODE ingests) must be executed in bounded chunks inside explicit transactions to avoid holding the WAL write lock for longer than 5,000ms.

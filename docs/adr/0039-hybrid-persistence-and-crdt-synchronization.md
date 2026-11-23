# 0039. Distributed Hybrid Persistence & CRDT Multi-Station Synchronization Engine

- **Status**: Accepted
- **Date**: 2026-11-23
- **Context**: Atlas Logistics Architecture, Distributed Systems, Multi-Station Forwarding, Offline-First Operations
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **See Also**: [ADR 0004](0004-zero-cost-local-architecture.md), [ADR 0009](0009-sqlite-wal-mandatory-foreign-keys.md), [ADR 0010](0010-zero-mock-live-persistence-standard.md), [ADR 0037](0037-sqlite-wal-concurrency-and-monorepo-invariants.md), [ADR 0038](0038-customs-mtls-and-regulatory-filing-gateway.md)

---

## 1. Context & Problem Statement

Global freight forwarding operations require seamless coordination across distributed operational nodes:
- Port offices, regional dry ports, bonded customs warehouses, airport tarmac forwarding desks, and transport hubs.
- Remote edge facilities (such as port gates and CFS cross-docking warehouses) frequently experience intermittent, degraded, or zero WAN connectivity while processing physical cargo movements.
- Concurrently, central hub offices in major trade gateways (e.g., Barcelona, Rotterdam, Hamburg, Singapore) coordinate consolidated Master Bills of Lading (MBL), financial job costing, and customs clearance releases for the same shipment dossiers.

Under the embedded architecture defined in [ADR 0004](0004-zero-cost-local-architecture.md) and [ADR 0009](0009-sqlite-wal-mandatory-foreign-keys.md), SQLite in Write-Ahead Logging (WAL) mode provides high-performance single-node ACID persistence with zero infrastructure cost. However, two fundamental constraints emerge when scaling to multi-station enterprise networks:

1. **Single-Writer Lock Concurrency Contention**: While WAL allows multiple concurrent readers, write transactions obtain an exclusive table lock. When dozens of warehouse barcode scanners, EDI gateways, and freight operators write simultaneously to a single instance, `SQLITE_BUSY` errors or write queuing may occur.
2. **Disconnected Edge Reconciliation (Split-Brain Discrepancies)**: If an offline edge station (e.g., Station Barcelona) modifies container seal numbers or delivery statuses while a central regional hub (e.g., Station Rotterdam) simultaneously applies an emergency customs hold or updates billing disbursements, traditional centralized databases fail to support local updates, and simplistic "last-write-wins" (LWW) mechanisms arbitrarily discard critical operational or regulatory data.

---

## 2. Decision Drivers

- **Zero Cloud Infrastructure Cost Mandate ($0.00 SaaS)**: The platform must run autonomously on edge stations with embedded SQLite WAL at $0.00 infrastructure cost, while supporting optional distributed engines (PostgreSQL with PgBouncer or distributed libSQL/Turso) for centralized high-concurrency hubs.
- **Zero-Mock Verification Standard (`ADR 0010`)**: The persistence abstraction must satisfy identical test suites and domain semantics across both Edge SQLite and Central Hub engines.
- **Deterministic Conflict Resolution (CRDTs)**: Conflict-Free Replicated Data Types tailored specifically to supply chain domain aggregates.
- **Regulatory Hold Precedence Invariant**: In logistics, regulatory and statutory directives (e.g., `CUSTOMS_HOLD`, `SANCTION_SEIZED`, `BIOSECURITY_HOLD`) must **never** be overwritten, superseded, or cleared by optimistic commercial or transport state changes without an authoritative digital clearance release.
- **Audit Immutability & Document Append Invariant**: Financial ledger lines, document attachments, and customs audit messages are strictly monotonic and append-only (OR-Set semantics).

---

## 3. Considered Options

### Option 1: Centralized Cloud-Only Database (PostgreSQL / Aurora / CockroachDB)
- *Pros*: Provides standard distributed concurrency control and simplifies schema migrations.
- *Cons*:
  - Completely eliminates offline operation at remote terminals, port gates, or warehouse yards during WAN dropouts.
  - Incurs mandatory cloud compute and managed database subscription costs ($100–$1,000+/month), violating the core architectural mandate of zero external costs.

### Option 2: Traditional Distributed Consensus (Raft / 2-Phase Commit)
- *Pros*: Guarantees linearizable consistency across all active nodes.
- *Cons*:
  - Requires a quorum ($N/2 + 1$) of nodes to be online; completely stalls write availability on disconnected edge stations during network partitions (CAP theorem CP model).
  - Unsuitable for asynchronous freight forwarding networks where stations operate across different time zones with intermittent connectivity.

### Option 3: Pluggable Hybrid Persistence with State-Based CRDT & Logical Vector Clocks (Chosen)
- *Pros*:
  - **Dual Persistence Profiles**: Edge nodes use local SQLite WAL (`AbstractDatabaseAdapter`); central hubs can switch to clustered PostgreSQL or libSQL without code changes.
  - **Logical Vector Clocks (`VectorClock`)**: Tracks causal history across all forwarding stations (`Record<string, number>`) to unambiguously determine whether a mutation is `BEFORE`, `AFTER`, `IDENTICAL`, or `CONCURRENT`.
  - **Regulatory Hold Precedence**: Codifies the absolute supremacy of sovereign customs holds over commercial updates.
  - **Monotonic Mutation Audit Ledger**: Every synchronized state and reconciliation outcome is recorded immutably in `crdt_mutation_audit`.
- *Cons*:
  - Requires explicit domain merge logic for concurrent fields; vector clocks require compaction after periodic snapshots.

---

## 4. Decision Outcome

Chosen Option: **Option 3**.

### 4.1 Persistence Layer Abstraction (`src/db/adapters/repository.adapter.ts`)
The `AbstractDatabaseAdapter` provides a pluggable interface for data repositories:
- `SqliteWalAdapter`: Embedded SQLite WAL engine (`better-sqlite3` / `drizzle-orm/better-sqlite3`), running with `PRAGMA synchronous = NORMAL;`, `PRAGMA busy_timeout = 5000;`, and zero cloud costs.
- `PostgresAdapter` / `DistributedLibsqlAdapter`: Configurable for central hubs requiring high-throughput multi-writer pooling.

### 4.2 CRDT State Engine (`src/scm/engines/crdt-sync.engine.ts`)
The pure CRDT engine implements causal order evaluation, hybrid logical clock tracking, and domain-specific merge rules:
1. **Clock Comparison**:
   ```typescript
   export function compareVectorClocks(a: VectorClock, b: VectorClock): ClockComparison
   ```
   Evaluates element-wise partial order to determine causal relationships (`BEFORE`, `AFTER`, `IDENTICAL`, or `CONCURRENT`).
2. **Merge & Conflict Resolution**:
   - Sequential updates (`AFTER`): Applied cleanly.
   - Stale updates (`BEFORE` or `IDENTICAL`): Safely rejected.
   - Concurrent updates (`CONCURRENT`):
     - **Regulatory Rule**: If current state has an active regulatory hold (`CUSTOMS_HOLD`), an incoming commercial patch without `authorizedClearanceEventId` is rejected (`REGULATORY_HOLD_PREVALENCE`).
     - **Additive Rule**: Document and ledger arrays are merged monotonically.
     - **Scalar Rule**: Deterministic Last-Write-Wins with lexicographical node ID tie-breaking for identical timestamps.

### 4.3 Relational Schema (`src/db/schema/crdt_sync.ts`)
1. **`crdt_entity_states`**: Maintains the authoritative local aggregate state, vector clock, and active hold metadata.
2. **`crdt_mutation_audit`**: Records every delta, source node, vector clock snapshot, conflict details, and resolution outcome.
3. **`crdt_station_peers`**: Tracks peer stations (Edge, Hub, Central Consolidator), network endpoints, and synchronization status.

---

## 5. Architectural Invariants

1. **Regulatory Hold Supremacy**: No edge station can clear or overwrite a regulatory hold without authoritative clearance credentials.
2. **Zero-Mock Parity (`ADR 0010`)**: All CRDT state operations must be verifiable in automated test suites without memory mocks.
3. **Bounded Synchronization Latency**: Reconnected edge stations sync dirty deltas through the Transactional Outbox within $t \le 5\text{ s}$ of connectivity restoration.
4. **Append-Only Document Provenance**: Cryptographic document hashes and signatures cannot be deleted or pruned during CRDT reconciliation.

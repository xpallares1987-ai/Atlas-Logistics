# 0040. Autonomous Financial Settlement, Automated Clearing & Outbox Event Bus

- **Status**: Accepted
- **Date**: 2026-11-23
- **Context**: Atlas Logistics Financial Domain, Intercompany Clearing, IATA CASS Settlement, Asynchronous Event Streaming
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **See Also**: [ADR 0004](0004-zero-cost-local-architecture.md), [ADR 0009](0009-sqlite-wal-mandatory-foreign-keys.md), [ADR 0037](0037-sqlite-wal-concurrency-and-monorepo-invariants.md), [ADR 0038](0038-customs-mtls-and-regulatory-filing-gateway.md), [ADR 0039](0039-hybrid-persistence-and-crdt-synchronization.md)

---

## 1. Context & Problem Statement

Global freight forwarding operations require continuous financial settlement across global networks of correspondent agents, airlines, ocean carriers, and domestic branch offices:

1. **Inter-Agent Clearing Friction**:
   In cross-border logistics (e.g., WCA network shipments or origin/destination agent pairings), shipments generate bilateral Debit Notes (DN) and Credit Notes (CN) for origin handling, ocean/air freight, destination customs clearance, and local disbursements. Settling each transaction individually incurs substantial international wire fees ($25–$50 per transfer), foreign exchange (FX) spread penalties, and administrative reconciliation overhead.

2. **IATA CASS Air Cargo Billing Reconciliation**:
   Freight forwarders receive bi-weekly Cargo Accounts Settlement System (CASS) billing files from airlines containing hundreds or thousands of Master Air Waybill (MAWB) charges. Discrepancies frequently arise due to:
   - Discrepant chargeable weight (actual scale vs. billed chargeable weight).
   - Rate table mismatches (contracted tier vs. airline published tariff).
   - Dynamic fuel (FSC) and security (SSC) surcharges.
   - Unmatched airline billings or unbilled forwarder shipments.
   Manual reconciliation risks missing airline payment cutoffs or paying unauthorized overbillings.

3. **Dual-Write Consistency & Asynchronous Event Delivery**:
   Financial state transitions (e.g., approving a bilateral netting cycle, issuing a dispute note, or clearing a CASS batch) must trigger downstream side effects (e.g., GL synchronization in ERP, notification emails, and webhooks to agent portals). Directly publishing to an external message broker within a database transaction risks dual-write inconsistencies (database commits but broker publish fails, or broker publishes but database transaction rolls back).

---

## 2. Decision Drivers

- **Zero Floating-Point Drift ($0.00 Precision Loss)**: Financial calculations must use deterministic scaled-integer arithmetic (micro-cents: factor $1,000,000$) with banker's rounding to eliminate IEEE-754 floating-point inaccuracies.
- **Automated Bilateral & Multi-Currency Netting**: Consolidate reciprocal agent payables and receivables across multiple currencies (USD, EUR, GBP, JPY, CHF, CAD, AUD, CNY) into a single net payment position per settlement cycle.
- **Deterministic IATA CASS Reconciliation**: Automated 1:1 and 1:N AWB matching with configurable variance tolerance ($±$0.50 currency units or 0.1%), automatic dispute generation for overbillings, and audit logging.
- **Guaranteed At-Least-Once Delivery (Transactional Outbox Pattern)**: Persist outgoing events in SQLite WAL within the exact same database transaction as the financial state mutation, ensuring zero event loss.
- **Idempotency & Deduplication**: Outbound event consumers and inbound webhook handlers must guarantee idempotency via unique idempotency keys and state version tracking.
- **Monorepo & $0.00 SaaS Mandate**: Operates natively in embedded SQLite WAL mode with zero external cloud dependencies or commercial message bus costs.

---

## 3. Considered Options

### Option 1: Third-Party Financial Clearing SaaS (Trax, Cass Information Systems, Intelsius)
- *Pros*: Offloads reconciliation algorithms to an external vendor.
- *Cons*: High recurring subscription costs ($2,000–$10,000/month), introduces external API latency, and fails when operating offline or on private sovereign infrastructure.

### Option 2: Floating-Point Math & Direct Webhook Invocation
- *Pros*: Simple to implement.
- *Cons*: Cumulative rounding errors in multi-currency netting; unhandled network failures cause permanent event loss or ghost ledger discrepancies.

### Option 3: Embedded Pure Engine, SQLite WAL Clearing Schema & Transactional Outbox Event Bus (Chosen)
- *Pros*:
  - **P0 Pure Math Engine (`financial-netting.engine.ts`)**: Scaled integer micro-cents arithmetic with deterministic banker's rounding and zero external runtime dependencies.
  - **Relational Drizzle Schema (`financial_clearing.ts`)**: Dedicated tables (`agent_clearing_ledger`, `bilateral_netting_cycles`, `cass_reconciliation_batches`, `cass_reconciliation_items`) with multitenant scoping (`tenant_id`) and composite indexes.
  - **Transactional Outbox Event Bus (`outbox_events` / `outbox-stream.bus.ts`)**: Atomic local transaction persistence paired with an asynchronous polling/streaming dispatcher and consumer idempotency window.
  - **$0.00 Operating Cost**: Fully self-contained within the native TypeScript / Fastify / SQLite WAL architecture.
- *Cons*: Requires running an asynchronous background loop for outbox event delivery.

---

## 4. Decision Outcome

Chosen Option: **Option 3**.

### 4.1 Schema Definitions (`src/db/schema/financial_clearing.ts`)

1. **`agent_clearing_ledger`**:
   Records operational DN/CN transactions between network agents with both nominal and scaled micro-cent amounts, locked exchange rates, and netting cycle association.

2. **`bilateral_netting_cycles`**:
   Tracks periodic netting cycles between pairs of forwarding agents, calculating gross volumes, net payer/receiver, settlement advice references, and reconciliation status (`PROPOSED`, `ACCEPTED`, `SETTLED`, `DISPUTED`).

3. **`cass_reconciliation_batches`**:
   Aggregates airline CASS billing file imports, recording overall reconciliation statistics (exact matches, tolerance matches, discrepancies, forwarder total, airline total, net variance).

4. **`cass_reconciliation_items`**:
   Per-AWB reconciliation audit records detailing weight variances, rate variances, surcharge variances, and dispute flags (`EXACT_MATCH`, `ACCEPTABLE_TOLERANCE`, `DISCREPANCY_WEIGHT`, `DISCREPANCY_RATE`, `DISCREPANCY_SURCHARGE`, `OVERBILLING_DISPUTE`, `UNMATCHED_AIRLINE_RECORD`, `UNBILLED_FORWARDER_RECORD`).

### 4.2 Precision Arithmetic & Invariants

All calculations enforce:
$$\text{Scaled Amount} = \text{round}(\text{Amount} \times 1,000,000)$$
$$\text{Nominal Amount} = \text{round}\left(\frac{\text{Scaled Amount}}{1,000,000} \times 100\right) / 100$$

- All multi-currency transactions convert to a configured Base Currency (typically USD or EUR) using the locked transaction-date exchange rate.
- Net Position Rule:
  $$\text{Net Position}_A = \text{Gross Payable}_A - \text{Gross Receivable}_A$$
  - If $\text{Net Position}_A > 0$: Agent A pays Agent B.
  - If $\text{Net Position}_A < 0$: Agent B pays Agent A.
  - If $\text{Net Position}_A = 0$: Nil settlement advice issued (zero wire transfer required).

### 4.3 Transactional Outbox Pattern

All financial operations commit their business data and corresponding domain events inside an atomic SQLite WAL transaction (`db.transaction(...)`):
```sql
BEGIN IMMEDIATE;
-- 1. Insert or update financial clearing records
-- 2. Insert outbox record into outbox_events with payload and event_type
COMMIT;
```
An asynchronous outbox worker dispatches pending events with exponential backoff and records completion in `outbox_events.published_at`.

---

## 5. Consequences & Trade-offs

- **Positive**:
  - Eliminates up to 85% of international bank wire transfers between frequent trade lanes via bilateral balance netting.
  - Reduces airline CASS billing reconciliation turnaround from days to seconds.
  - Zero dual-write discrepancies between the financial database and external integrations.
  - Operates completely offline or locally at $0.00 infrastructure cost.
- **Negative / Constraints**:
  - Requires maintaining historical FX exchange rate tables for auditability.
  - CASS variance rules require periodic alignment with airline contract tariff amendments.

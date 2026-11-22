# 0033. Supply Chain Visibility & Predictive Milestone Tracking Engine

- **Status**: Accepted
- **Date**: 2026-11-22
- **Context**: Atlas Logistics Architecture, SCM, Visibility & Freight Execution Teams
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **See Also**: [ADR 0005](0005-fastify-websockets-for-realtime.md), [ADR 0006](0006-bullmq-for-background-jobs.md), [ADR 0009](0009-sqlite-wal-mandatory-foreign-keys.md), [ADR 0010](0010-zero-mock-live-persistence-standard.md), [ADR 0013](0013-gemini-free-tier-on-demand-gateway-and-env-unification.md), [ADR 0016](0016-b2b-edi-dcsa-ebl-iata-one-record.md), [ADR 0020](0020-frontend-modular-decomposition-and-file-size-guardrails.md), [ADR 0032](0032-supply-chain-purchase-order-and-booking-allocation-engine.md)

---

## 1. Context & Problem Statement

In global freight forwarding and commercial logistics, commercial Purchase Orders (POs) and transport execution bookings (FMS Bookings/Shipments) traditionally exist in disconnected operational silos. While [ADR 0032](0032-supply-chain-purchase-order-and-booking-allocation-engine.md) established the relational domain connecting POs to transport bookings, supply chain operators still faced critical blind spots:

1. **Disconnected Event Horizons**: Factory milestones (upstream Cargo Ready Dates, production status) were isolated from carrier transport events (DCSA 3.0 carrier events, AIS oceanic positioning, feeder transshipments, and customs gate-outs).
2. **Reactive Rather Than Predictive Exception Handling**: Delays were often identified only after cargo missed a vessel cut-off or failed to arrive at the distribution center by the Required Delivery Date (RDD), resulting in detention penalties, factory line shutdowns, or costly spot air-freight conversions.
3. **Absence of Unified CQRS Visibility Projections**: Calculating the real-time health of a PO across multiple carriers and intermodal legs previously required expensive runtime table scans and multi-join queries across `purchase_orders`, `po_line_items`, `bookings`, `shipments`, and `dcsa_events`.
4. **Disjointed Alert Channels**: Critical deviations lacked transactional outbox guarantees, risking lost notifications or race conditions between database transactions and external alerting systems (e.g., Microsoft Teams, client ERP webhooks).

---

## 2. Decision Drivers

- **Continuous End-to-End Visibility Stream**: Unified lifecycle mapping across three macro-phases: *1. Origin & Factory Production*, *2. International Transit (DCSA / AIS)*, and *3. Final Mile & Customs Clearance*.
- **CQRS Event-Driven Materialized Ledger (`supply_chain_milestone_events`)**: Provide a single, query-optimized projection table capturing planned, estimated, and actual dates with automatic delay hour computation (`delay_hours`).
- **Hybrid Predictive Exception Engine**:
  - *Deterministic Core*: Fastify and SQLite compute instantaneous mathematical deviations (e.g. `planned_crd > booking_cut_off`, `estimated_arrival > po_rdd`, `dwell_hours > 72h`) with quantitative severity classifications (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - *Contextual AI Enrichment*: Optional asynchronous enrichment via the Gemini Free-Tier gateway ([ADR 0013](0013-gemini-free-tier-on-demand-gateway-and-env-unification.md)) with a 12 RPM circuit breaker to generate actionable mitigation plans.
- **Multichannel Transactional Outbox**: Atomic database commits inserting exceptions into `supply_chain_exceptions` and transactional outbox events simultaneously, complemented by real-time WebSocket pushes ([ADR 0005](0005-fastify-websockets-for-realtime.md)) and asynchronous HMAC-signed webhooks or Microsoft 365 Adaptive Cards.
- **Strict Monorepo & File Guardrails ([ADR 0020](0020-frontend-modular-decomposition-and-file-size-guardrails.md))**: Modular Stepper and Exception Resolution Drawer components under 700 lines per file with zero `.innerHTML` sinks.

---

## 3. Considered Options

### Option 1: On-the-Fly SQL Joins & Dynamic Union Views
- *Pros*: Zero additional database tables.
- *Cons*: High latency during peak dashboard queries; complex query degradation when calculating cumulative delays across multiple split bookings and containers; lacks a persistent exception audit trail.

### Option 2: Pure LLM-Driven Exception Evaluation (AI-First)
- *Pros*: Natural language flexibility.
- *Cons*: Violates determinism; introduces latency bottlenecks; vulnerable to 12 RPM rate limits and token exhaustion during batch carrier event ingestion; unacceptable hallucination risk on financial SLA penalties.

### Option 3 (Chosen): CQRS Unified Visibility Stream with Hybrid Exception Engine & Transactional Outbox
- *Pros*:
  - Sub-millisecond lookup times for purchase order status timelines via dedicated composite B-Tree indexes.
  - Deterministic exception detection guaranteeing 100% test coverage and compliance auditability.
  - Seamless fallbacks: operates reliably with zero cloud connectivity, yet enriches contextual mitigation when Gemini is accessible.
  - Immediate reactive UI updates via WebSockets without full-page reloads.

---

## 4. Architectural Design & Implementation

### 4.1. Entity Relationship & Data Model (`src/db/schema/supply_chain_visibility.ts`)

```
   +----------------------+               +----------------------+
   |   purchase_orders    |               |       bookings       |
   +----------------------+               +----------------------+
              |                                      |
              +------------------+-------------------+
                                 |
                                 v
            +-----------------------------------------+
            |      supply_chain_milestone_events      |
            +-----------------------------------------+
            | id (PK)                                 |
            | tenant_id                               |
            | po_id (FK -> purchase_orders)           |
            | booking_id (FK -> bookings)             |
            | shipment_id (FK -> shipments)           |
            | container_number                        |
            | milestone_category (PROD|TRANSIT|FINAL) |
            | status (PLANNED|ESTIMATED|ACTUAL)       |
            | planned_timestamp                       |
            | estimated_timestamp                     |
            | actual_timestamp                        |
            | delay_hours                             |
            | location_code (UN/LOCODE)               |
            | data_source (PORTAL|DCSA|AIS|MANUAL)    |
            +-----------------------------------------+
                                 | 1:N
                                 v
            +-----------------------------------------+
            |         supply_chain_exceptions         |
            +-----------------------------------------+
            | id (PK)                                 |
            | tenant_id                               |
            | po_id (FK)                              |
            | milestone_event_id (FK)                 |
            | exception_code                          |
            | exception_category                      |
            | severity (LOW|MED|HIGH|CRITICAL)        |
            | status (OPEN|ACK|IN_MITIGATION|RESOLVED)|
            | title & description                     |
            | delay_estimate_hours                    |
            | financial_risk_amount & currency        |
            | suggested_mitigations (JSON)            |
            | ai_analysis (JSON)                      |
            +-----------------------------------------+
```

### 4.2. Pure Predictive Exception Engine (`src/scm/engines/predictive-exceptions.engine.ts`)
The pure engine executes zero-dependency mathematical and temporal evaluations:
1. **CRD vs. Booking Cut-Off**:
   $$\Delta_{cut} = \text{Date}(\text{Booking Cut-Off}) - \text{Date}(\text{Supplier CRD})$$
   If $\Delta_{cut} < 0$, generates `EXC_CRD_AFTER_CUTOFF` (Severity: `HIGH` or `CRITICAL` if vessel departs within 48h).
2. **ETA vs. Required Delivery Date (RDD)**:
   $$\Delta_{rdd} = \text{Date}(\text{Estimated Arrival}) - \text{Date}(\text{Required Delivery Date})$$
   If $\Delta_{rdd} > 0$, generates `EXC_ETA_PAST_RDD` with estimated delay in hours.
3. **Transshipment Dwell Time Anomaly**:
   If a container's status is `TRANSSHIPMENT_DISCHARGED` and dwell duration exceeds 72 hours without a connecting vessel feeder event, generates `EXC_EXCESSIVE_DWELL_72H`.

### 4.3. Fastify REST & Real-Time Notification Outbox (`src/routes/scm/visibility.routes.ts`)
- `GET /api/scm/purchase-orders/:id/timeline`: Retrieves chronological milestone events and active exceptions.
- `POST /api/scm/visibility/events`: Ingests tracking events (DCSA, AIS, or Supplier Portal), updates delay calculations, triggers the exception engine, and emits real-time WebSocket payloads.
- `POST /api/scm/exceptions/:id/resolve`: Records operator mitigation decisions, updates status to `RESOLVED`, and logs audit trails.

### 4.4. Frontend React UI (`packages/frontend/src/components/PurchaseOrders/`)
- **`MilestoneTimelineStepper.tsx`**: Visual three-stage stepper reflecting planned versus actual completion with dynamic latency badges (green, amber, red).
- **`ExceptionResolutionDrawer.tsx`**: Operator panel displaying AI-assisted and rule-based mitigations, financial risk exposure, and resolution action buttons.

---

## 5. Consequences & Trade-Offs

- **Positive**:
  - Unifies commercial supply chain commitments with physical freight operations into a cohesive timeline.
  - Dramatically reduces manual demurrage and supply interruption risks via automated predictive alerts.
  - Zero performance regressions; fully indexed by composite tenant B-Trees in SQLite WAL.
  - Resilient offline capability: fallback rules operate without cloud dependency.
- **Negative / Trade-Offs**:
  - Requires maintaining event normalization adapters for external carrier feeds (DCSA, EDIFACT, AIS).
  - Storage footprint increases with high-frequency telemetry events (mitigated by retention archiving policies).

# 0032. Supply Chain Purchase Order (PO) Management & Booking Allocation Engine

- **Status**: Accepted
- **Date**: 2026-11-21
- **Context**: Atlas Logistics Architecture, SCM, and Freight Execution Teams
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **See Also**: [ADR 0009](0009-sqlite-wal-mandatory-foreign-keys.md), [ADR 0010](0010-zero-mock-live-persistence-standard.md), [ADR 0018](0018-repository-hygiene-architectural-simplification-modular-refactoring.md), [ADR 0022](0022-enterprise-freight-forwarding-organization-schema-and-governance.md)

---

## 1. Context & Problem Statement

In global freight forwarding and supply chain operations, transport bookings do not originate in a vacuum; they exist to fulfill commercial purchase orders (POs) executed between buyers (importers/beneficial cargo owners) and upstream suppliers (overseas factories and vendors).

Previously, Atlas Logistics managed generic transport orders in `scm_foundation.ts` (`scm_orders`), but lacked a dedicated, relational Purchase Order domain supporting:
1. **Granular SKU & Item-Level Tracking**: Managing discrete product lines, harmonized tariff codes (HS codes), unit of measure (UOM), and exact pricing for customs valuation and dimensional planning.
2. **Upstream Production Milestone Visibility**: Tracking factory readiness (`ORDER_RECEIVED`, `RAW_MATERIALS_READY`, `ASSEMBLY_STARTED`, `QC_PASSED`, `PACKED`) before cargo handover to carriers (Cargo Ready Date - CRD).
3. **Split Shipments & Multi-PO Consolidation**: Enabling a single PO to be dispatched across multiple transport bookings (split shipments), or multiple POs from different vendors to be consolidated into a single container or master booking (LCL/FCL consolidation).
4. **Architectural Purity**: Enforcing that allocation math and balance tracking remain pure domain functions decoupled from database drivers, satisfying the `AGENTS.md` and ESLint pure-engine guardrails.

---

## 2. Decision Drivers

- **Canonical PO Schema Governance (`atlas-schema-po-management`)**: Model `purchase_orders`, `po_line_items`, and `production_milestones` with application-layer multitenancy, strict foreign keys, and audit columns in SQLite WAL.
- **Pure Domain Engine (`src/scm/engines/po-allocation.engine.ts`)**: Keep allocation arithmetic, remaining balance validations, and dimensional weight/CBM calculations strictly pure, with zero runtime imports of `drizzle-orm`, `@libsql/client`, or `fastify`.
- **Atomic WAL Transactions**: Execute booking allocations and PO state transitions atomically within SQLite WAL transactions with active `PRAGMA busy_timeout = 5000;`.
- **Zero Mocks Standard ([ADR 0010](0010-zero-mock-live-persistence-standard.md))**: Bind the frontend UI directly to Fastify REST endpoints backed by Drizzle ORM and SQLite.
- **Modular Component Guardrails ([ADR 0020](0020-frontend-modular-decomposition-and-file-size-guardrails.md))**: Maintain frontend pages under 700 lines using semantic subdirectories (`Banner/`, `Queue/`, `Drawer/`, `Modal/`).

---

## 3. Considered Options

### Option 1: Generic Extension of `scm_orders`
- *Pros*: Avoids creating new database tables.
- *Cons*: Mixes commercial buyer-supplier agreements with internal transport fulfillment orders; loses granular SKU-level pricing and factory milestone tracking.

### Option 2: Document-Only JSON Storage (No Normalized Line Items)
- *Pros*: Quick to persist arbitrary PO payloads in a single text/JSON column.
- *Cons*: Precludes relational foreign keys from bookings to line items (`po_line_items.booking_id -> bookings.id`); makes partial allocation and customs reconciliation queries slow and error-prone.

### Option 3 (Chosen): Dedicated Relational Domain with Pure Engine & Drizzle SQLite WAL
- *Pros*:
  - Fully normalized relational schema matching international logistics standards.
  - Strict foreign keys: Buyer and Supplier link to `companies.id`, line items cascade on PO deletion, and line items reference `bookings.id` with `onDelete: 'set null'`.
  - Pure calculation engine for balances and cubic meters (CBM) testable in isolation.
  - Native integration with the transactional outbox (`outboxBus`) for events (`PO_ALLOCATED`, `CARGO_READY`).

---

## 4. Architectural Design & Implementation

### 4.1. Data Architecture (`src/db/schema/po.ts`)

```
   +----------------------+
   |      companies       |
   +----------------------+
          ^        ^
 buyer_id |        | supplier_id
   +----------------------+        1:N        +-------------------------+
   |   purchase_orders    |------------------>|  production_milestones  |
   +----------------------+                   +-------------------------+
              | 1:N
              v
   +----------------------+
   |    po_line_items     |
   +----------------------+
              | 0..1:1
              v booking_id
   +----------------------+
   |       bookings       |
   +----------------------+
```

1. **`purchase_orders` Table**:
   - Header attributes: `id`, `tenant_id`, `buyer_id`, `supplier_id`, `po_number`, `incoterm`, `expected_cargo_ready_date`, `status` (`ISSUED`, `ACKNOWLEDGED`, `IN_PRODUCTION`, `CARGO_READY`, `PARTIALLY_BOOKED`, `BOOKED`, `SHIPPED`, `CANCELLED`).
   - Unique constraint: `(tenant_id, po_number)` composite unique index.
2. **`po_line_items` Table**:
   - Granular SKUs: `id`, `tenant_id`, `po_id`, `booking_id`, `sku_code`, `description`, `quantity`, `allocated_quantity`, `uom`, `hs_code`, `original_unit_price`, `original_currency`, `exchange_rate`.
3. **`production_milestones` Table**:
   - Factory timeline: `id`, `tenant_id`, `po_id`, `milestone_code`, `planned_date`, `actual_date`, `notes`.

### 4.2. Pure Domain Engine (`src/scm/engines/po-allocation.engine.ts`)
- Implements stateless business rules:
  - Validates that allocated quantities do not exceed available SKU balances.
  - Automatically calculates total net weight, gross weight, and volume (CBM) from item dimensional parameters.
  - Derives aggregate PO status based on the allocation state of all member lines (`BOOKED` when all items are fully allocated, `PARTIALLY_BOOKED` when some remain).

### 4.3. API Contracts & Fastify Routes (`src/routes/scm/purchase-orders.routes.ts`)
- `GET /api/scm/purchase-orders`: Filtered query by tenant, buyer, supplier, and status.
- `GET /api/scm/purchase-orders/:id`: Full relational view including line items and milestones.
- `POST /api/scm/purchase-orders`: Idempotent creation of PO and initial SKU lines.
- `POST /api/scm/purchase-orders/:id/milestones`: Supplier progress updates.
- `POST /api/scm/purchase-orders/allocate-booking`: Transactional allocation to a transport booking.

---

## 5. Consequences & Trade-Offs

- **Positive**:
  - Provides complete end-to-end trace from the commercial invoice/PO through transport execution.
  - Enables accurate landed cost calculation, split shipment dispatch, and factory vendor compliance tracking.
  - Zero performance degradation; indexed by composite tenant B-trees in SQLite WAL.
- **Negative / Trade-Offs**:
  - Introduces three new physical tables requiring seeders and DDL migration.
  - Requires maintaining balance reconciliation when bookings are modified or cancelled. (Mitigated: `onDelete: 'set null'` on `booking_id` and transactional rollback).

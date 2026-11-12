# 0014. Comprehensive Quote-to-Booking Integration with Port Drayage and Automated Dispatch

- **Status**: Accepted
- **Date**: 2026-11-10
- **Context**: Atlas Logistics (`@atlas/rate-comparer`, `@atlas/ui`, Fastify Backend, SQLite/Drizzle)
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)

## Context & Problem Statement

1. **Disconnection Between Ocean Freight and Inland Drayage**:
   Traditional freight comparison engines calculate only port-to-port maritime legs, forcing freight forwarders and shippers to calculate last-mile port drayage separately through manual offline estimates, resulting in fragmented cost tracking and uncoordinated carbon reporting.
2. **Referential Integrity Constraints (`PRAGMA foreign_keys = ON;`)**:
   Every booking and inland haulage order must be reliably persisted in SQLite, joining real database entities: origin ports/terminals, destination warehouses in the Addresses Hub, ocean carriers, registered haulage contractors (*hauliers*), and active shipments.
3. **ESG & Sustainability Compliance (ISO 14083 / GLEC Framework v3.0)**:
   Corporate logistics shippers require standardized, certified calculations for Well-to-Wheel (WTW) and Tank-to-Wheel (TTW) CO₂ emissions combining ocean voyage and road container haulage.

## Architectural Decisions

### 1. Extension of Rate Comparer (`@atlas/rate-comparer`)
- **Reactive Search Controls**:
  - *"Include Port Drayage (Port-to-Door / Last Mile)"* toggle in `RatesContent.tsx`.
  - Inland warehouse selector populated deterministically from the **Addresses Hub** (`/api/addresses?type=WAREHOUSE`).
  - Sub-millisecond cost and route calculation via `POST /api/drayage/quote`, driven by OSRM routing, haulier base rates, road BAF, and Eurovignette tolls.
- **Unified Door-to-Door Quotations in `RateTable.tsx`**:
  - Aggregates ocean freight base rates, carrier surcharges (BAF, THC, PSS), and port drayage in the active currency (USD/EUR).
  - *"Door-to-Door (Ocean + Drayage)"* badge indicator on combined rows.
  - Expandable row details displaying breakdown of road haulage costs, estimated container turn-time, and GLEC v3.0 carbon footprint.
  - Interactive modal route preview (`DrayageRouteModal.tsx`) using CARTO Voyager raster tiles (`CARTO_API_KEY`) and OSRM turn-by-turn road geometry.

### 2. Transactional Booking Lifecycle & Automatic Order Dispatch (`booking-lifecycle.service.ts`)
- **SQLite Relational Persistence**:
  - Upon booking request submission (`createBookingRequest`), the structured `drayageQuote` payload is saved to `bookings.cargoDetails`.
  - Upon booking confirmation (`confirmBookingToShipment` or endpoint `POST /api/quotes/:id/accept-and-book`):
    1. An operational shipment record is created in `shipments` with assigned container, vessel name, voyage ID, and seal number.
    2. The discharge port terminal is resolved from the destination UN/LOCODE (e.g. `addr_term_best_bcn` for `ESBCN` or `addr_term_apm_vlc` for `ESVLC`).
    3. Addresses for the assigned road haulier and destination consignee warehouse are linked defensively.
    4. An order is atomically inserted into `drayageTransportOrders` (`drayage_transport_orders`) with status `DISPATCHED`, sequential reference `DRY-YYYYMM-XXXX`, 4-digit pickup security PIN, SHA-256 cryptographic QR verification digest, and loading appointment window.
    5. A `DRAYAGE_DISPATCHED` audit event is published to `shipmentEventLogs`.
    6. The response returns order identifiers allowing 1-click deep-link navigation directly into `/drayage`.

### 3. Zero Mocks & Automated Test Coverage (`tests/rate-comparer-drayage-booking.test.ts`)
- Implemented an automated end-to-end integration test suite validating:
  - Creation of PENDING bookings containing `drayageQuote`.
  - Confirmation and transactional insertion into `drayageTransportOrders` with foreign key enforcement.
  - Verification that the generated order is queryable at `/api/drayage/orders?shipmentId=...`.
  - 1-click `accept-and-book` flow from quote comparison to road dispatch.

## Consequences

- **Positive**:
  - Frictionless, unified transition from rate comparison directly into port container drayage dispatch.
  - Full compliance with ISO 14083 and GLEC Framework v3.0 standards for client ESG auditing.
  - Adheres strictly to database guardrails (`PRAGMA foreign_keys = ON;`) and the Zero Mocks UI policy.
- **Mitigations**:
  - In the event of temporary OSRM routing network downtime, the drayage pricing service automatically falls back to an offline Haversine formula calibrated with a 1.25 terrestrial circuity factor to ensure uninterrupted quoting.

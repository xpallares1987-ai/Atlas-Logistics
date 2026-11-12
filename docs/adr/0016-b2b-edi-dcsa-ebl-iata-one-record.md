# 0016. B2B Integrations Expansion: IATA ONE Record 3.0, DCSA e-BL v3.0, and EDIFACT DESADV Gateway

- **Status**: Accepted
- **Date**: 2026-11-11
- **Context**: Atlas Logistics Monorepo (`@atlas/frontend`, `@atlas/ui`, `@atlas/shared`, Fastify Backend, Drizzle ORM / SQLite WAL, SCM Kernel Outbox, DCSA Hub, IATA Linked Data)
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)

## Context & Problem Statement

1. **Elimination of Air Cargo Mock Technical Debt (IATA ONE Record 3.0)**:
   Air cargo services (`IataOneRecordService` and `IataOneRecordModule.tsx`) relied on in-memory collections initialized with hardcoded constants (`SEED_ONE_RECORD_WAYBILLS`, `SEED_CARGO_IQ_TIMELINE`). This breached the Zero Mocks standard (ADR 0010) and the requirement for persistence in SQLite WAL with enforced foreign keys (`PRAGMA foreign_keys = ON;`). A relational model was required to store W3C JSON-LD graph models for e-AWB and Cargo iQ cycle milestones (`RCS`, `DEP`, `ARR`, `RCF`, `NFD`, `DLV`), evaluating operational SLAs in real time.

2. **Electronic Transferable Records Governance (DCSA e-BL v3.0 & UNCITRAL MLETR)**:
   Global container shipping demands the digitization of negotiable Bills of Lading, guaranteeing title singularity and an unbroken chain of custody under the UNCITRAL Model Law on Electronic Transferable Records (MLETR) and ICC UCP 600 rules. A unified API under the DCSA 3.0 standard was needed to orchestrate the entire lifecycle: issuance (`issue`), custody transfer (`transfer`), financial endorsement / bank pledge (`endorse`), and final destination surrender (`surrender`), directly authorizing cargo release (`CARGO_RELEASE_AUTHORIZED`) in the Operations Cockpit.

3. **Multimodal B2B Logistics Interoperability (UN/EDIFACT DESADV & IFTSTA)**:
   End-to-end inventory visibility and dispatch communication between suppliers, forwarders, and warehouses required bidirectional support for UN/EDIFACT D96A DESADV (*Despatch Advice*), including AST parsing, hierarchical packing item generation (CPS, PAC, LIN, QTY), automated `CONTRL` syntax acknowledgments (UCI/UCM), and multimodal `IFTSTA` status report generation.

## Architectural Decisions

### 1. IATA ONE Record 3.0 & Cargo iQ in Relational SQLite
- **Drizzle Schema (`src/db/schema/air_cargo.ts`)**:
  - Added `oneRecordJsonLd: text("one_record_json_ld", { mode: "json" })` column to `airway_bills`.
  - Created `cargo_iq_milestones` table with foreign keys referencing `airway_bills.awb_number` and `iata_airports.code`, composite indices on `(awb_number, milestone_code)` and `sla_status`.
- **Deterministic Seeder (`src/db/seeds/air-cargo.seed.ts`)**:
  - Canonically populated e-AWB `075-82910482` (Iberia BCN-JFK) and `139-44109283` (Aeroméxico MAD-MEX) with W3C JSON-LD graph objects compliant with `https://onerecord.iata.org/ns/cargo#`.
  - Deterministically seeded all 8 Cargo iQ milestones with planned timestamps, SLA thresholds, and operational states.
- **Backend Service (`src/modules/iata-one-record/iata-one-record.service.ts`)**:
  - Asynchronous Drizzle queries (`getWaybills`, `getWaybill`, `getMilestones`).
  - `recordMilestoneEvent` mutation executing atomic updates of actual timestamps, calculating SLA compliance (`ON_TIME`, `WARNING`, `BREACHED`), and emitting an outbox event `IATA_ONE_RECORD_SLA_BREACHED` upon delays.
- **React Frontend (`packages/frontend/src/pages/IataOneRecordModule.tsx`)**:
  - Refactored local state to consume `useApiQuery` and `useApiMutation`, binding interface actions directly to Fastify SQLite endpoints.

### 2. DCSA e-BL v3.0 Maritime Lifecycle & UNCITRAL MLETR
- **DCSA e-BL Service (`src/services/dcsa/dcsa-ebl.service.ts`)**:
  - Native integration with `MletrLedgerService` for append-only audit tracking in `mletr_transferable_records` and `mletr_endorsements_ledger`.
  - Electronic Bill of Lading lifecycle operations:
    - `POST /api/dcsa/ebl/issue`: Generates DCSA 3.0 e-BL with cryptographic Genesis block.
    - `GET /api/dcsa/ebl`: Filterable list of active electronic transferable records.
    - `GET /api/dcsa/ebl/:id`: Full record view with cryptographic chain of custody blocks.
    - `POST /api/dcsa/ebl/:id/transfer` & `POST /api/dcsa/ebl/:id/endorse`: Cryptographic custody transfer (`SHIPPER` -> `BANK` -> `CONSIGNEE`).
    - `POST /api/dcsa/ebl/:id/surrender`: Final surrender to carrier at discharge port; generates release code (`REL-SH_DEMO_01-...`), marks status as `SURRENDERED`, locks subsequent transfers, and emits the outbox domain event `CARGO_RELEASE_AUTHORIZED`.
    - `GET /api/dcsa/ebl/:id/verify`: SHA-256 cryptographic chain validation (`previous_hash` == prior `tx_hash`).

### 3. B2B UN/EDIFACT DESADV, IFTSTA & CONTRL Gateway
- **DESADV Service (`src/services/edi/edifact-desadv.service.ts`)**:
  - Bidirectional parser translating between raw EDIFACT D96A and typed `DespatchAdvice` domain models (extracting BGM, DTM, RFF, NAD, CPS, PAC, LIN, QTY, MEA).
  - Emits domain event `edi.desadv.Received.v1` to the transactional outbox upon ingesting inbound advices.
- **IFTSTA & CONTRL Service (`src/services/edi/edifact-iftsta.service.ts`)**:
  - Multimodal status report generator adhering to IFTSTA D96A.
  - Generates `CONTRL` technical syntax acknowledgments with action codes `7` (Accepted) and `4` (Rejected with syntax error detail).
- **Fastify Routing (`src/routes/edi.routes.ts`)**:
  - Endpoints: `/api/edi/desadv/parse`, `/api/edi/desadv/generate`, `/api/edi/desadv/ingest`, `/api/edi/iftsta/generate`, `/api/edi/contrl/generate`.
  - Dynamic DESADV recognition in unified `/api/edi/parse` and `/api/edi/inbound`.

## Consequences & Benefits

1. **Zero Mocks Standard Preserved**:
   Both IATA ONE Record and maritime DCSA e-BL modules operate 100% against live relational SQLite WAL tables via Drizzle ORM.
2. **International Regulatory Compliance**:
   Strict compliance with IATA ONE Record JSON-LD 3.0, DCSA e-BL v3.0, UNCITRAL MLETR (Model Law on Electronic Transferable Records), and UN/EDIFACT D96A standards.
3. **Event-Driven Outbox Decoupling**:
   Critical domain actions (e-BL surrender, air cargo SLA breach, despatch arrival) are persisted to `platform_gov_outbox_messages` for reliable asynchronous delivery.
4. **Comprehensive Automated Verification**:
   30 integration tests in Vitest (`iata-one-record.test.ts`, `dcsa-ebl.test.ts`, `edi-desadv.test.ts`, `b2b-dcsa-edi-hub.test.ts`) passing with exit code 0.

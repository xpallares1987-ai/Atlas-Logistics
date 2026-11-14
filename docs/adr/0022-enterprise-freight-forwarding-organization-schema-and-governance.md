# 0022. Global Enterprise Freight Forwarding Stations, Departments, Matrix RBAC, and Carrier Allocation Contracts

- **Status**: Accepted
- **Date**: 2026-11-14
- **Context**: Atlas Logistics Architecture, Governance, and Operations Teams
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)

---

## 1. Context & Problem Statement

As Atlas Logistics scales to support Tier-1 Freight Forwarding operations (comparable to Kuehne+Nagel, DSV, Expeditors, and DHL Global Forwarding), the core operational architecture required formal organizational decomposition:

1. **Station/Gateway Boundary**: Operational transport legs (ocean port drayage, airport air-cargo handling, rail ramps, bonded container freight stations) were previously coupled to flat customer/vendor address models without representing operating forwarding branches (`branch_offices`).
2. **Operational Cost Centers & Functional Silos**: Forwarding operations require departmental segregation (`departments`) with dedicated cost centers (`CC-<UNLOCODE>-XX`), specialized managers, and communication aliases for ocean export/import, air logistics, customs brokerage, and road drayage.
3. **Matrix Role-Based Access Control (RBAC)**: Legacy user authentication relied on a single static `role` text enum on `users`, preventing fine-grained operational separation of duties (e.g., Ocean Operators vs. Customs Declarants vs. Branch Directors) across different stations.
4. **Global Alliances & Carrier MQC Commitments**: Forwarders operate within international network alliances (WCA, FIATA, C5C) with financial protection and maintain Minimum Quantity Commitments (MQC / BSA) with ocean/air carriers requiring trade-lane-level quota monitoring and deadfreight risk mitigation.

---

## 2. Architectural Decisions

### 2.1. Operational Hubs & Branch Stations (`branch_offices`)
Implemented `branch_offices` in `src/db/schema/organization.ts`:
- **Canonical Address Anchor**: Foreign key to `addresses.id` (`address_type = 'FW'`), avoiding duplicate geographical records.
- **Logistics Identity**: Captures UNECE UN/LOCODE (`un_locode`), IATA station code (`iata_code`), FMC Ocean Transportation Intermediary number (`fmc_oti_number`), and IATA/CASS numeric agency code (`iata_numeric_code`).
- **Station Types**: Distinguishes `OCEAN_GATEWAY`, `AIR_CARGO_HUB`, `INTERMODAL_RAIL_RAMP`, `CROSSDOCK_CFS`, `CUSTOMS_OFFICE`, and `COMMERCIAL_BRANCH`.
- **Operating Context**: Designates station primary currency (EUR, USD, SGD, CNY) and station timezone for operational SLAs.

### 2.2. Functional Departments & Cost Centers (`departments`)
Created `departments` within stations:
- **Department Codes**: Strict enumeration (`OCEAN_EXPORT`, `OCEAN_IMPORT`, `AIR_LOGISTICS`, `CUSTOMS_BROKERAGE`, `ROAD_DRAYAGE`, `WAREHOUSE_CFS`, `FINANCE_CONTROLLING`, `PRICING_PROCUREMENT`, `SALES_KEY_ACCOUNTS`, `LEGAL_COMPLIANCE`).
- **Cost Center Governance**: Enforces accounting accountability with structured cost center codes (`cost_center`).
- **Departmental Email Aliases**: Dedicated operational distribution lists for B2B and customer messaging.

### 2.3. Enterprise Matrix RBAC (`roles`, `permissions`, `role_permissions`, `user_station_assignments`)
- **Granular Permissions Catalog**: 24 discrete operational permissions across 6 functional categories (`SHIPMENT`, `TRACKING`, `STOWAGE`, `CUSTOMS`, `DOCUMENTS`, `FINANCE`, `COMPLIANCE`).
- **Specialized Roles**: Modeled 8 industry roles (`BRANCH_DIRECTOR`, `OCEAN_OPERATOR`, `AIR_FREIGHT_SPECIALIST`, `CUSTOMS_DECLARANT`, `ROAD_DISPATCHER`, `FINANCE_CONTROLLER`, `PRICING_MANAGER`, `SALES_REP`).
- **Station Assignment Linking**: `user_station_assignments` binds users to specific branches and departments with role overrides, supporting multi-station dispatch and primary station designations.

### 2.4. Global Forwarding Alliances & Carrier MQC Contracts
- **Network Alliances (`forwarding_agent_networks`)**: Models global independent forwarder networks (WCA, FIATA, C5C) with designated secretarial bodies, financial protection limits (USD), and arbitration jurisdictions.
- **Carrier Allocation Contracts (`carrier_allocation_contracts`)**: Tracks carrier service contracts (e.g., Maersk, MSC, CMA CGM) with monthly TEU MQC commitments, committed tier distributions (FCL Standard, Reefer, Special Cargo), and contractual deadfreight penalty rates per slot.

---

## 3. Database Migration & Backward Compatibility

- **Timestamped Drizzle Migration**: Created `drizzle/20261114030000_enterprise_organization/migration.sql` with strict foreign key constraints and covering indices.
- **Legacy Zero-Downtime Resilience**: Preserved existing `users.role` column while establishing relational bridge tables.
- **Deterministic Seeder**: Integrated `src/db/seeds/organization.seed.ts` into Phase 1 of `pnpm run db:seed`, seeding 10 top-tier global logistics gateway hubs (BCN, VLC, MAD, RTM, HAM, ANR, SIN, SHA, NYC, MIA), 58 operational departments, 8 roles, 24 permissions, 3 agent alliances, and active carrier MQC contracts.

---

## 4. Verification & Consequences

- **Referential Integrity**: Verified via `PRAGMA foreign_key_check;` returning **0 violations** across all 238 SQLite tables in WAL mode.
- **Test Integrity**: Vitest suites (`tests/addresses-hub.test.ts`, `tests/booking-addresses-integration.test.ts`, `tests/rate-ingestion.test.ts`) pass with 100% success rate.

# 0018. Repository Hygiene, Architectural Simplification, and Modular Decomposition

- **Status**: Accepted
- **Date**: 2026-11-11
- **Context**: Atlas Logistics Core Architecture Team & Frontend Platform Engineers
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)

---

## 1. Context & Problem Statement

As Atlas Logistics incorporated advanced capabilities (SCM CQRS, MLETR smart transferable records, customs DUA/CBAM dispatch, B2B EDI/DCSA/ONE Record, and FuelEU/EU ETS maritime sustainability), structural technical debt and file dispersion accumulated across the repository:

1. **Repository Root Hygiene Violations**: Obsolete specifications and legacy markdown reports from 2024 accumulated in the root directory (`DOCUMENTATION_PROJECT_COMPLETE.md`, `API_INTEGRATION_GUIDE.md`, etc.), alongside transient SQLite test database files (`atlas-erp-*.db*`, `test-migrate*.db*`), patches, and log outputs. This breached Diátaxis governance (Section 5 of `AGENTS.md`), which requires strictly 6 canonical files in the root.
2. **Redundant Proxy Layers (`src/services/`)**: 18 subdirectories in `src/services/` existed solely to re-export modules from `src/modules/*` (`export * from "../../modules/..."`), creating boilerplate indirection without operational value.
3. **Orphaned Mock Data Files**: In `packages/rate-comparer/src/data/`, legacy files `datos.ts` (6,145 lines of mock data) and `raw_rates.csv` (35 KB) persisted without active consumers.
4. **Massive Monolithic Frontend Views**: High-complexity operational views, particularly `ShipmentWorkspace360Module.tsx` (3,385 lines), bundled multiple BFF type declarations, business logic, and disjoint tab views (Overview, Green Compliance, GLEC v3, CBAM, DUA, Tasks), hindering maintainability.

---

## 2. Architectural Decisions & Executed Actions

### 2.1. Root Hygiene & Cleanup
- **Purged Obsolete Markdown**: Removed legacy 2024 Markdown files from the root and unreferenced docs.
- **Removed Transient Database Files & Logs**: Purged temporary SQLite databases, migration scratch files, and patch artifacts.
- **Enforced Canonical Root Files**: The repository root is strictly constrained to the 6 standard files:
  1. `README.md`
  2. `AGENTS.md`
  3. `CONTRIBUTING.md`
  4. `SECURITY.md`
  5. `CHANGELOG.md`
  6. `CODE_OF_CONDUCT.md`
- **Pruned Empty Directories**: Removed 17 empty directories across the monorepo.

### 2.2. Removed Redundant Proxy Layers in `src/services/`
Removed 18 redundant proxy re-export directories in `src/services/`:
- `aeo-security`, `air-cargo`, `bulk-operations`, `cargo-insurance`, `cbam`, `chartering`, `claims`, `cold-chain`, `customs`, `customs-warehouse`, `dangerous-goods`, `fueleu`, `general-average`, `incoterms`, `rail`, `road-freight`, `trade-finance`, `treasury`.
- Preserved only services containing dedicated logic in `src/services/`: `carbon`, `control-tower`, `dcsa`, `documents`, `edi`, `mletr`, `pdf`, `routing`, `telemetry`, and `__tests__`.
- Operational domains remain canonically structured in `src/modules/*` following Domain-Driven Design (DDD) modularity.

### 2.3. Eliminated Dead Mock Data in Rate-Comparer
- Removed `packages/rate-comparer/src/data/datos.ts` (-6,145 lines) and `raw_rates.csv`.
- Verified that `@atlas/rate-comparer` builds and operates 100% against live API endpoints without mock dependencies.

### 2.4. Modular Decomposition of `ShipmentWorkspace360Module.tsx`
Refactored the initial 3,385-line view:
1. **Domain Types Extraction**: Created `packages/frontend/src/types/shipment-workspace360.types.ts` assembling canonical BFF models (`OperationalShipment360View`, `ShipmentGreenComplianceReadModel`, `MletrRecordSummary`, etc.).
2. **`ShipmentOverviewTab.tsx`**: Extracted operational overview perspective (325 lines) into `packages/frontend/src/components/workspace360/ShipmentOverviewTab.tsx`.
3. **`ShipmentGreenComplianceTab.tsx`**: Extracted Scope 3 GLEC v3, CBAM, and customs perspective (545 lines) into `packages/frontend/src/components/workspace360/ShipmentGreenComplianceTab.tsx`.
4. **Complexity Reduction**: Dropped line count by over 1,240 lines (-36.5%) in initial phase, laying the groundwork for full sub-1,000 line modularity.

---

## 3. Impact Metrics & Verification

| Metric | Before | After | Impact |
| :--- | :--- | :--- | :--- |
| **`datos.ts` (mock data)** | 6,145 lines | 0 (deleted) | -100% dead code |
| **`ShipmentWorkspace360`** | 3,385 lines | 2,140 lines | -36.5% initial reduction |
| **Proxy Directories in `services/`** | 28 | 10 (active only) | -64% redundant indirection |
| **Markdown Files in Root** | 13 | 6 canonical | 100% Diátaxis hygiene |
| **TypeScript Type-Check** | - | 0 errors (`tsc --noEmit`) | Strict type safety passed |
| **Frontend Vite Build** | - | Success (PWA valid) | Zero build regressions |
| **Backend Vitest Tests** | - | 22/22 suites passing | 100% green |

---

## 4. References & Diátaxis Links
- [AGENTS.md](../../AGENTS.md) - Development Guidelines, Guardrails, and Root Governance.
- [0010-zero-mock-live-persistence-standard.md](0010-zero-mock-live-persistence-standard.md) - Zero Mocks Standard.
- [0017-fueleu-maritime-ets-carbon-insetting.md](0017-fueleu-maritime-ets-carbon-insetting.md) - FuelEU Maritime & Carbon Insetting.

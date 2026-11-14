# Atlas Logistics - Development Guidelines and Repository Guardrails

## 1. Database Integrity & Seeders (SQLite & Drizzle)
- **Mandatory Foreign Keys**: SQLite operates in WAL mode with active foreign key constraints (`PRAGMA foreign_keys = ON;`).
- **Deterministic Seeds & Referential Integrity**:
  - When implementing or modifying seeders in `src/db/seeds/`, never assume parent records exist randomly or asynchronously.
  - The canonical shipment `sh_demo_01` (`BK-2026-67116`, company `c-1`, container `MSKU9284712`) must be generated deterministically in Phase 1 (`seedPhase1` or `operations.seed.ts`).
  - Any seeder depending on base entities must implement defensive check/initialization of the parent record if it does not exist.
  - For upserts in seeds, always use `.onConflictDoUpdate()` with binding fields rather than `.onConflictDoNothing()`, preventing null or stale references on existing records.
  - **Drizzle Schema Boundaries**: When defining relational foreign keys (`references(() => table.id)`), import the parent table from its exact canonical submodule in `src/db/schema/` (e.g. `documents` resides in `./support.js`, not `./core.js`), avoiding `undefined` type errors during `drizzle-kit generate`.
  - **Drizzle v1.0.0-rc.5 Migration Hierarchy**: Migrations under `drizzle/` must strictly use folder-based snapshots (`drizzle/<timestamp>_<tag>/migration.sql` accompanied by `drizzle/meta/_journal.json`). Flat `.sql` migration files placed directly in `drizzle/` are rejected by Drizzle migrator with `No migration found`.

## 2. Git Workflow & Code Security
- **Git Flow & Remote Synchronization**:
  - Work and commit directly on the `main` branch.
  - **Authorized Exception for Atlas-Logistics**: Sychronization and execution of `git push origin main` is authorized exclusively for this repository (`xpallares1987-ai/Atlas-Logistics`) to maintain 100% alignment with GitHub and trigger CI/CD pipelines, provided tests and leak audits pass with exit code 0.
  - Never configure unofficial remote repositories or force push to protected branches.
- **Information Leak Prevention**:
  - Never commit reserved real-world customer or partner identifiers.
  - Before every commit, verify that `pnpm run audit:leaks:staged` (or the guardrail script) exits with code 0 without alerts.
- **Isolation of C:\PowerShell**: Strictly prohibited from creating git repositories or modifying remotes in `C:\PowerShell`.

## 3. Architecture & Verification
- **Fastify & API Contracts**: All endpoints serving data to the UI must prioritize real relational SQLite entities over in-memory mocks.
- **TDD & Verification**: Always run unit and integration tests (`pnpm vitest run ...`) before declaring a task complete.
- **Auth Mocks in Fastify Controller Tests**: In controller test suites (`app.inject()`), explicitly mock `../../middleware/auth.js` (`authMiddleware: vi.fn()`, `requireRole: vi.fn()`) and `oslo/password` to prevent `401 Unauthorized` failures on protected routes.

## 4. UI/Frontend: Live Data Binding & Zero Mocks Standard
- **Exclusive Consumption of SQLite/Fastify**: Every action, mutation, or visualization in the UI must query and send data to real Fastify endpoints backed by Drizzle ORM and SQLite.
- **Elimination of Artificial Mock Buttons**: Prohibited from adding or maintaining mock/simulation data buttons when operational domain endpoints exist.
- **Dynamic Entity Selectors**: Views requiring an active shipment or operational entity must provide dynamic selectors populated from the database (with fallback to the canonical shipment `sh_demo_01`), rather than hardcoded IDs or static states.

## 5. Diátaxis Documentation Governance & Root Hygiene
- **Root Directory Hygiene**: The repository root contains only six canonical documentation files: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, and `CODE_OF_CONDUCT.md`; operational and tool configuration files remain at the root where required. Prohibited from accumulating specs, scratch files, or loose guides in the root.
- **Four-Quadrant Diátaxis Structure**: All technical documentation must reside in its corresponding quadrant within `docs/`:
  - **Tutorials**: `docs/tutorials/` (developer learning-oriented).
  - **How-To Guides**: `docs/setup-guides/`, `docs/runbooks/`, and `docs/deployment/` (task-oriented recipes).
  - **Reference**: `docs/reference/`, `docs/api/`, and `docs/superpowers/specs/` (technical contracts and specifications).
  - **Explanation & Decisions**: `docs/architecture/` and `docs/adr/` (conceptual deep-dives and numbered ADRs `0001-...`).
- **Architectural Decision Records (ADRs)**: Any architectural change or technical standard must be documented via a numbered ADR in `docs/adr/`.

## 6. Language Standards & Code Documentation
- **Strict English Technical Standard**: 100% of codebase files, JSDoc/TSDoc comments, Architectural Decision Records (ADRs), Diátaxis documentation (`docs/`), GitHub Wiki pages, and git commit messages must be authored strictly in standard technical English.
- **File Utility Header Standard**: Every source file (`.ts`, `.tsx`, `.mjs`) must begin with a descriptive JSDoc block declaring its utility:
  ```typescript
  /**
   * @file ComponentName.tsx
   * @description Operational summary of the module's utility and single responsibility.
   * @module @atlas/package-name/submodule
   * @see {@link docs/adr/XXXX-title.md}
   */
  ```
- **In-Situ Sectional Commenting**: Maintain clear structural dividers across components and backend services:
  ```typescript
  // ============================================================================
  // 1. STATE & HOOKS
  // ============================================================================
  ```
- **Self-Documenting Complex Domain Logic**: Algorithmic transformations, financial formulas (e.g., BAF fuel surcharges, EU ETS Maritime calculations), and cryptographic operations must document parameters, return values, and domain assumptions.

## 7. Frontend Architecture & Non-Redundant (DRY) Hierarchy
- **Semantic Subdirectory Segregation**: Allocate repetitive or specialized components into dedicated semantic subdirectories:
  - `Tab/`: Tab views and navigational panels.
  - `Modal/`: Dialogs, interactive popups, and confirmation screens.
  - `Banner/`: Hero banners, summary KPI strips, and execution confirmation bars.
  - `Drawer/`: Contextual side panels and payload inspectors.
  - `Queue/` & `Panel/`: Work item triage cards, filter controls, and action execution forms.
- **Non-Redundant (DRY) File & Folder Naming**: Child files and subdirectories must NEVER repeat the parent directory name or category within their filename:
  - *Correct*: `components/Shipment/Tab/Overview.tsx`, `components/ControlTower/Modal/ResolveIncident.tsx`, `components/Cockpit/Queue/ItemCard.tsx`.
  - *Prohibited*: `components/Shipment/Tab/ShipmentOverviewTab.tsx`, `components/ControlTower/Modal/ResolveIncidentModal.tsx`, `components/Cockpit/CockpitHeader.tsx`.
- **Canonical Barrel Exports (`index.ts`)**: Every component module root must provide a barrel `index.ts` exporting clean atomic names, while maintaining backwards-compatible aliases where needed.
- **Modular File Size Guardrails (ADR 0020)**: Page module files (`packages/frontend/src/pages/*.tsx`) must remain strictly under 1,000 lines (target <700 lines). Enforced continuously via `node scripts/check-file-sizes.mjs`.

## 8. Windows Process & Concurrency Guardrails (Daemons & File Locks)
- **Filesystem Locking during Refactorings**: Background Vite dev server processes lock source directories on Windows, causing `git mv` or directory renames to fail with `Permission denied`. Always terminate Vite dev daemons before moving or renaming component directories, and restart them afterwards.
- **SQLite Concurrency & Test Isolation**: Long-running Fastify backend daemons hold open WAL connections on `data/dev.db`. Running full database integration tests (such as authoritative projection rebuilds) concurrently against the locked database causes lock contention and test timeouts. Always suspend background backend daemons before executing heavy database integration test suites (`pnpm vitest run ...`), and restart them upon test completion.

## 9. Documentation & Diagramming Formatting Guardrails (GitHub & Wiki)
- **Quoted Node Labels in Mermaid Diagrams**: When generating Mermaid diagrams for GitHub Wiki, READMEs, or Diátaxis docs, node labels containing special characters (parentheses `()`, brackets `[]`, slashes `/`, colons, hyphens) must ALWAYS be enclosed in double quotes:
  - *Correct*: `D["Append Log (data/dev.db-wal)"]` or `T1["Tarea 1: ShipmentWorkspace360Module (2,125 -> <800 lns)"]`
  - *Prohibited*: `D[Append Log (data/dev.db-wal)]` (causes GitHub Mermaid parser syntax errors).

## 10. Logistics Entity Taxonomy & Master Catalog Governance
- **Corporate Holding Groups vs. Operational Addresses**:
  - Corporate Groups (e.g., A.P. Moller - Maersk, CMA CGM Group, MSC Group, Evergreen Group) are financial and ownership holding entities residing strictly in `companies` with `company_type = 'HOLDING'`.
  - Corporate groups are linked to physical subsidiary addresses and operational accounts exclusively through authorized accounting, finance, controlling, or admin roles.
  - **Prohibited**: Corporate groups must NEVER be selectable or displayed as operational addresses, pickup/delivery locations, or terminal facilities across shipment workflows.
- **Single Canonical Registry for Logistics Entities (`addresses`)**:
  - Logistics trading partners must NEVER be scattered across isolated legacy tables (`carriers`, `customs_brokers`, `destination_agents`).
  - All operational logistics entities belong strictly to `addresses` with explicit `address_type` tags:
    - `'CAR'`: Ocean / Air / Rail Carrier
    - `'CB'`: AEO-Licensed Customs Broker
    - `'AG'`: Destination / Origin Forwarding Agent
    - `'FWD'`: Freight Forwarder
    - `'TRM'`: Port / Rail / Inland Container Terminal
    - `'WH'`: Customs Warehouse / Depósito Aduanero
  - Official industry codes (SCAC, IATA, EORI, AEO, UN/LOCODE, IMO, UIC) must be stored in `address_identifiers`.
- **Top-Tier Realistic Domain Entities**:
  - Master catalogs and seeders must prioritize top-tier, realistic industry actors (e.g., Top 10 ocean container carriers, verified AEO customs brokers) over arbitrary synthetic Faker noise.
- **Master Logistics Catalogs**:
  - Standard container types must reference `container_iso_types` (ISO 668/6346). Container identifiers must be validated via standard ISO 6346 modulus-11 check-digit algorithms (`@atlas/shared/iso6346`).
  - Gateway locations must reference canonical UNECE UN/LOCODE entries (`unlocodes`) preserving official standard publication fields.



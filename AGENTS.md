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
- **SQLite Online Backup & Disaster Recovery Verification**:
  - **Concurrency Timeout**: Always execute `PRAGMA busy_timeout = 5000;` on all database connection handles before running checkpoints or backups, preventing lock aborts when writers are active.
  - **Atomic Online Snapshot**: Use `VACUUM INTO '<backup_path>'` for online backups rather than file-copying `data/dev.db` while WAL frames are pending.
  - **Full Inventory & Parity Check**: Backup verification must assert 100% table row count parity across **all physical tables** in `sqlite_master` (not just sample tables), accompanied by deterministic SHA-256 checksums of core domain tables.
  - **Disaster Recovery Simulation**: Automated test suites (`pnpm run test:backup-restore`) must mount the restored snapshot in an isolated database file, re-enable `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;`, and assert successful query execution against canonical entities (e.g. `sh_demo_01`).

## 2. Git Workflow & Code Security
- **Git Flow & Remote Synchronization**:
  - Work and commit directly on the `main` branch.
  - **Authorized Exception for Atlas-Logistics**: Sychronization and execution of `git push origin main` is authorized exclusively for this repository (`xpallares1987-ai/Atlas-Logistics`) to maintain 100% alignment with GitHub and trigger CI/CD pipelines, provided tests and leak audits pass with exit code 0.
  - Never configure unofficial remote repositories or force push to protected branches.
  - **Explicit File Staging on Windows**: Always stage modified files by explicit path (`git add <file1> <file2>`) rather than `git add -A` or `git add .`, preventing `core.autocrlf` stat-cache refreshes from marking untouched files dirty.
- **Zero-Cost Infrastructure & CI Mandate**:
  - Every GitHub Actions workflow, security scanner, and deployment target must operate at **$0.00 cost** (standard `ubuntu-24.04` runners on public GitHub, GitHub Pages, GHCR, native Advisory DB, OpenSSF Scorecard). Never wire automatic `push` triggers to paid cloud compute (e.g., Cloud Run / Railway auto-deploys), and add standalone governance workflows to `ci.yml` `paths-ignore`.
  - **Zero External Reporting, Charting, or BPM SaaS**: Strictly prohibited from integrating external reporting, charting, coverage, or workflow SaaS services (such as **Codecov**, **Grafana**, external **Prometheus** SaaS, or **Camunda 8**). Test coverage summaries must be published natively to GitHub Actions `$GITHUB_STEP_SUMMARY` from Vitest's `coverage/coverage-summary.json`, and telemetry/workflows must use the native SQLite/Fastify engines.
  - **GitHub Pages Primary Deployment Ordering (`pages-deploy.yml`)**: Always execute `actions/upload-pages-artifact` and `actions/deploy-pages@v4` **before** any optional `peaceiris/actions-gh-pages` branch mirror (which must set `continue-on-error: true` so branch protection rulesets on `gh-pages` never abort the official Pages deployment).
- **Information Leak Prevention**:
  - Never commit reserved real-world customer or partner identifiers.
  - When provided live credentials or tokens, store them exclusively in gitignored `.env.local` and GitHub Actions Secrets (`gh secret set`), referencing `${VAR:-default}` in tracked configuration files.
  - Before every commit, verify that `pnpm run audit:leaks:staged` (or the guardrail script) exits with code 0 without alerts.
- **Isolation of C:\PowerShell**: Strictly prohibited from creating git repositories or modifying remotes in `C:\PowerShell`.

## 3. Architecture & Verification
- **Fastify & API Contracts**: All endpoints serving data to the UI must prioritize real relational SQLite entities over in-memory mocks.
  - **Hardened Public-Route Auth Hook (`src/middleware/public-routes.ts`)**: Never evaluate public or document-export routes using `request.url.includes("/pdf" | "/xml" | "/csv")` on the raw URL (which includes query strings and enables `?x=/pdf` auth bypass). Always strip `?query` and `#fragment`, reject traversal/encoded separators (`..`, `%2e`, `\`, `%5c`, `%00`), enforce segment-bounded prefixes, and match export suffixes (`/(?:\/pdf|-pdf|\/xml|-xml|\/csv|-csv|\/xfwb|\/fwb)$/i`) strictly at the end of the normalized `pathname`.
  - **Fastify v5 OpenAPI Route Schemas (`src/routes/openapi.schemas.ts`)**: When declaring `schema.response`, preserve literal HTTP status-code keys (`{ [K in T[number]]: ... }` via `buildErrorResponses`) so `reply.code(400|404|500)` satisfies Fastify v5 strict type inference. Use `additionalProperties: true` on object response schemas so `fast-json-stringify` does not strip relational fields, and omit `200` JSON object schemas on binary PDF (`Buffer`) and XML endpoints.
- **TDD & Verification**: Always run unit and integration tests (`pnpm vitest run ...`) before declaring a task complete.
- **Auth Mocks in Fastify Controller Tests**: In controller test suites (`app.inject()`), explicitly mock `../../middleware/auth.js` (`authMiddleware: vi.fn()`, `requireRole: vi.fn()`) to prevent `401 Unauthorized` failures on protected routes.
- **Prometheus Registry Ownership**: Metrics use `@prometheus-io/client` (not `prom-client`). `fastify-metrics` owns `http_request_duration_seconds` on the shared global registry — never re-declare it; resolve it via `register.getSingleMetric()`. Proxy wrappers around metric methods must narrow arguments (`typeof x === "number"`) before calling `observe`/`inc`, because the library's strict overloads reject `any` pass-through.
- **Environment Contract Parity (`src/config/env.ts`)**: Enforce strict 3-bucket separation across `ENV_CONTRACT_CATALOG` and `.env.example`: `frontend-public` (`VITE_*`, plaintext in browser — NEVER secrets), `backend-config` (non-secret runtime/dev settings using `FRONTEND_PORT` instead of `VITE_PORT`), and `backend-secret` (encrypted in Secret Manager / gitignored `.env.local`). `tests/env-contract-validation.test.ts` enforces 100% parity, zero secrets in `VITE_*`, and an anti-zombie guard failing CI if any catalogued variable has zero active code references. Pure domain engines (`src/scm/engines/**`) must never import `drizzle-orm`, `@libsql/client`, or `fastify` (enforced by ESLint `no-restricted-imports`).

## 4. UI/Frontend: Live Data Binding & Zero Mocks Standard
- **Exclusive Consumption of SQLite/Fastify**: Every action, mutation, or visualization in the UI must query and send data to real Fastify endpoints backed by Drizzle ORM and SQLite.
- **Elimination of Artificial Mock Buttons**: Prohibited from adding or maintaining mock/simulation data buttons when operational domain endpoints exist.
- **Dynamic Entity Selectors**: Views requiring an active shipment or operational entity must provide dynamic selectors populated from the database (with fallback to the canonical shipment `sh_demo_01`), rather than hardcoded IDs or static states.
- **Vite 8 (Rolldown) + Module Federation Chunk Isolation (`packages/frontend/vite.config.ts`)**: Always keep `federation-runtime` (`__federation_fn_import` / `__federation_fn_satisfy`), `react-core` (`react` + `scheduler`), and `react-dom-core` isolated in `manualChunks` so `__federation_shared_*` chunks never statically import TLA vendor chunks (`recharts-vendor`, `lucide-icons`, etc.) and cause silent production deadlocks (enforced by `.github/workflows/pages-deploy.yml`). Keep `NODE_ENV=production` in `vercel.json`, `engines.node: "22.x"`, and `VitePWA({ useCredentials: true })`.
- **Strict Zero-innerHTML Standard & Safe DOM Construction**:
  - When rendering dynamic, library, or model-derived data in frontend, sidebar, or canvas extension views, NEVER interpolate raw concatenated strings directly into `innerHTML` sinks (violates CWE-79 / CWE-116 and flags `js/html-constructed-from-input`).
  - Prohibited from using `dangerouslySetInnerHTML` in React or string concatenation into `innerHTML` in vanilla DOM helpers.
  - Always construct DOM nodes programmatically using `document.createElement()` and assign untrusted or external strings to `element.textContent`, or use `setAttribute()` with sanitized attributes. `textContent` is a native browser boundary that guarantees zero script execution and permanently severs taint-tracking flows in CodeQL AST analysis.

## 5. Diátaxis Documentation Governance & Root Hygiene
- **Root Directory Hygiene**: The repository root contains only six canonical documentation files (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`), alongside required source, build, workspace and tool configuration files. Prohibited from accumulating specs, scratch files, or loose guides in the root.
- **Four-Quadrant Diátaxis Structure**: All technical documentation must reside in its corresponding quadrant within `docs/`:
  - **Tutorials**: `docs/tutorials/` (developer learning-oriented).
  - **How-To Guides**: `docs/setup-guides/`, `docs/runbooks/`, and `docs/deployment/` (task-oriented recipes).
  - **Reference**: `docs/reference/`, `docs/api/`, and `docs/superpowers/specs/` (technical contracts and specifications).
  - **Explanation & Decisions**: `docs/architecture/` and `docs/adr/` (conceptual deep-dives and numbered ADRs `0001-...`).
- **Architectural Decision Records (ADRs)**: Any architectural change or technical standard must be documented via a numbered ADR in `docs/adr/`.
- **Markdown Relative Link Integrity & Indexing**:
  - All relative links in `README.md` and `docs/` must resolve strictly to physical files or directories on disk. Local machine absolute URIs (`file:///...`) are strictly prohibited.
  - Any newly authored documentation or Architectural Decision Record (ADR) must be indexed in `docs/README.md` (or `docs/adr/`) and verified via `pnpm run audit:links` (`scripts/check-markdown-links.mjs`) prior to commit.
- **Tripartite Architectural Distinction**:
  - Maintain a strict conceptual and operational distinction between:
    1. **GitHub Pages Deployment**: The live production SPA web application build (`https://xpallares1987-ai.github.io/Atlas-Logistics/`).
    2. **Diátaxis Documentation (`docs/`)**: The in-repo technical source of truth.
    3. **GitHub Wiki**: The synchronized public mirror updated via `pnpm run wiki:sync`.

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
  - All operational logistics entities and gateway locations belong strictly to `addresses` with explicit, unique 3-letter `address_type` tags:
    - **`'MCC'`**: Main Customer Company (Beneficial Cargo Owner / Shipper / Consignee / Merchant)
    - **`'OCA'`**: Ocean Carrier (Vessel-Operating Common Carrier / Shipping Line)
    - **`'ACA'`**: Airline Carrier (Commercial Air Cargo Carrier / Cargo Airline)
    - **`'RCA'`**: Rail Carrier (Intermodal Freight Rail Operator / Railway Undertaking)
    - **`'CLA'`**: Carrier Line Agency (Authorized Liner Shipping Agency / Agencia Consignataria)
    - **`'CBA'`**: Customs Broker Agency (AEO-Licensed Customs House Broker / Fiscal Representative)
    - **`'OAG'`**: Representative Agent for the country of Origin (Origin Forwarding Agent)
    - **`'DAG'`**: Representative Agent for the country of Destination (Destination Delivery Agent)
    - **`'FFC'`**: Freight Forwarding Company (NVOCC / Freight Forwarder / 3PL Orchestrator)
    - **`'SPT'`**: Seaport Terminal (Deep-sea Container Terminal / Stevedoring Port Facility)
    - **`'RST'`**: Railway Station Terminal (Intermodal Railhead Freight Depot / Rail Container Terminal)
    - **`'OIC'`**: Inland Container Terminal at Origin (Origin Dry Port / Inland Container Yard)
    - **`'DIC'`**: Inland Container Terminal at Destination (Destination Dry Port / Inland Container Depot)
    - **`'OEW'`**: External Warehouse at Origin (Third-party 3PL Contracted Warehouse at Origin)
    - **`'DEW'`**: External Warehouse at Destination (Third-party 3PL Contracted Warehouse at Destination)
    - **`'OWO'`**: Owned Warehouse at Origin (Company-owned & Operated Warehouse at Origin)
    - **`'DWO'`**: Owned Warehouse at Destination (Company-owned & Operated Warehouse at Destination)
    - **`'OHA'`**: Haulier at Origin (Pre-carriage Drayage / Trucking Fleet at Origin)
    - **`'DHA'`**: Haulier at Destination (On-carriage Drayage / Delivery Trucking Fleet at Destination)
    - **`'INS'`**: Marine Cargo Insurer (Cargo Underwriter / P&I Club / Claims Adjuster)
    - **`'PLL'`**: Place of Loading Location (Factory / Farm / Consolidation Loading Point)
    - **`'PDL'`**: Place of Delivery Location (Consignee Facility / Final Receiver Delivery Point)
    - **`'POL'`**: Port of Loading (Origin Seaport / Airport of Loading)
    - **`'POD'`**: Port of Discharge (Destination Seaport / Airport of Discharge)
    - **`'TSP'`**: Transhipment Port (Intermediate Transshipment Port / Hub)
  - **Strict Code Uniqueness**: Every entity code in this taxonomy MUST be strictly unique across the system without collisions.
  - Official industry codes (SCAC, IATA, EORI, AEO, UN/LOCODE, IMO, UIC) must be stored in `address_identifiers`.
- **Top-Tier Realistic Domain Entities**:
  - Master catalogs and seeders must prioritize top-tier, realistic industry actors (e.g., Top 10 ocean container carriers, verified AEO customs brokers) over arbitrary synthetic Faker noise.
- **Master Logistics Catalogs**:
  - Standard container types must reference `container_iso_types` (ISO 668/6346). Container identifiers must be validated via standard ISO 6346 modulus-11 check-digit algorithms (`@atlas/shared/iso6346`).
  - Gateway locations must reference canonical UNECE UN/LOCODE entries (`unlocodes`) preserving official standard publication fields.



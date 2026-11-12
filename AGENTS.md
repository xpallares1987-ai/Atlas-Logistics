# Atlas Logistics - Development Guidelines and Repository Guardrails

## 1. Database Integrity & Seeders (SQLite & Drizzle)
- **Mandatory Foreign Keys**: SQLite operates in WAL mode with active foreign key constraints (`PRAGMA foreign_keys = ON;`).
- **Deterministic Seeds & Referential Integrity**:
  - When implementing or modifying seeders in `src/db/seeds/`, never assume parent records exist randomly or asynchronously.
  - The canonical shipment `sh_demo_01` (`BK-2026-67116`, company `c-1`, container `MSKU9284712`) must be generated deterministically in Phase 1 (`seedPhase1` or `operations.seed.ts`).
  - Any seeder depending on base entities must implement defensive check/initialization of the parent record if it does not exist.
  - For upserts in seeds, always use `.onConflictDoUpdate()` with binding fields rather than `.onConflictDoNothing()`, preventing null or stale references on existing records.
  - **Drizzle Schema Boundaries**: When defining relational foreign keys (`references(() => table.id)`), import the parent table from its exact canonical submodule in `src/db/schema/` (e.g. `documents` resides in `./support.js`, not `./core.js`), avoiding `undefined` type errors during `drizzle-kit generate`.

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
- **Root Directory Hygiene**: The repository root must contain exclusively the 6 standard canonical files: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, and `CODE_OF_CONDUCT.md`. Prohibited from accumulating specs, scratch files, or loose guides in the root.
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

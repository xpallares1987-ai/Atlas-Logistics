# Atlas Logistics — GitHub Copilot Custom Instructions

These instructions guide GitHub Copilot when generating code, answering queries, creating PR reviews, or suggesting architectural modifications across the `Atlas-Logistics` monorepo.

---

## 1. Architecture & Stack Overview
- **Monorepo Manager**: `pnpm` workspaces + Turborepo (`turbo`).
- **Commands**:
  - `pnpm install` (Install dependencies with frozen lockfile)
  - `pnpm run build` (Turborepo build across all packages)
  - `pnpm run test` (Vitest unit and integration test suite)
  - `pnpm run type-check` (TypeScript check for backend and frontend)
  - `pnpm run eslint` (ESLint code style and linting)
  - `pnpm run audit:leaks` (Sensitive token and leak prevention scanner)
- **Backend**: Node.js 22 + Fastify (`src/server.ts`, `src/app.ts`), TypeScript, Zod validation schemas (`@atlas/shared`), Oslo/Argon2 password hashing.
  - Workers: AtlasEngine BullMQ workers in `src/bpm/workers/` and GCP PubSub handlers in `src/pubsub-workers/`.
- **Frontend**: Vite + React 19 + Tailwind CSS v4 (`packages/frontend`), TanStack Query, Lucide icons, Leaflet.
- **Database & ORM**: SQLite in WAL mode via Drizzle ORM (`drizzle-orm/better-sqlite3` and `libsql`), located at `src/db/`.
- **Testing**: Vitest (`vitest run`), Playwright E2E (`playwright test`).

---

## 2. Core Guardrails & Development Principles

### 2.1 Database Integrity & Foreign Keys (SQLite & Drizzle)
- SQLite runs with foreign keys enabled (`PRAGMA foreign_keys = ON;`).
- When defining foreign key relations in Drizzle (`src/db/schema/`), always import the referenced table from its canonical submodule (e.g., `documents` resides in `./support.js`, not `./core.js`).
- Seeders in `src/db/seeds/` must never assume parents exist arbitrarily. The canonical demo shipment `sh_demo_01` (`BK-2026-67116`, company `c-1`, container `MSKU9284712`) is seeded deterministically.
- Always use `.onConflictDoUpdate()` with binding keys instead of `.onConflictDoNothing()` for upserts.

### 2.2 Zero Mocks in UI & Real Data Binding
- **No Mock Toggles**: All user actions, telemetry, charts, and mutations in the frontend must query and mutate real Fastify endpoints backed by SQLite and Drizzle.
- Do not introduce simulated UI state or hardcoded mock buttons when operational endpoints exist.
- Dynamic entity pickers should load values from `/api/` endpoints (with a default fallback to `sh_demo_01`).

### 2.3 Documentation Governance (Diátaxis Framework)
- **Root Hygiene**: The repository root must strictly contain ONLY the 6 canonical files:
  - `README.md`
  - `AGENTS.md`
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `CHANGELOG.md`
  - `CODE_OF_CONDUCT.md`
- All architectural and technical documentation belongs in `docs/` according to Diátaxis:
  - **Tutorials**: `docs/tutorials/`
  - **How-to Guides**: `docs/setup-guides/`, `docs/runbooks/`, `docs/deployment/`
  - **Reference**: `docs/reference/`, `docs/api/`
  - **Explanations & Decisions**: `docs/architecture/`, `docs/adr/` (ADR-0001...)

### 2.4 Security & Leak Prevention
- Never commit real customer, company, or third-party proprietary identifiers.
- Pre-commit leak guard (`pnpm run audit:leaks:staged` or `pnpm run audit:leaks`) must always pass with exit code 0.
- All secrets must use environment variables (`process.env.*`); do not hardcode secrets or credentials in code or test mocks.

### 2.5 Code Quality & Testing Verification
- Before submitting any changes or completing a task, verify:
  1. `pnpm type-check` (passes with 0 TypeScript errors).
  2. `pnpm vitest run` (all tests pass).
  3. `pnpm run eslint` (passes with 0 lint violations).
- Use Conventional Commits (`feat:`, `fix:`, `perf:`, `docs:`, `chore:`, `refactor:`).

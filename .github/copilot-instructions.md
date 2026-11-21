# Atlas Logistics — GitHub Copilot Custom Instructions

These instructions guide GitHub Copilot across the `Atlas-Logistics` monorepo (`C:\Users\xpall\Source\Atlas-Logistics`, GitHub: `xpallares1987-ai/Atlas-Logistics`). Always treat `AGENTS.md` in the repository root as the authoritative policy baseline.

---

## 1. Architecture & Stack Overview

- **Monorepo Layout**: Flat `pnpm` workspace (`pnpm@11.5.1`) + Turborepo (`turbo@2.11+`), **Node.js `22.x`** (`package.json#engines.node`). No Git submodules.
- **Workspace Packages (`packages/*`)**:
  - `@atlas/frontend`: Primary Vite 8 (Rolldown) + React 19 + Tailwind CSS v4 + React Router v7 + TanStack Query + Zustand SPA shell.
  - `@atlas/dashboard`: Executive & operational dashboard micro-frontend.
  - `@atlas/rate-comparer`: Freight rate comparison & quoting micro-frontend (`FreightComparerApp.tsx`).
  - `@atlas/bpmn-modeler`: Native workflow / BPMN visual modeler (`Zero-innerHTML` enforced).
  - `@atlas/warehouse-ops`: CFS & warehouse operations micro-frontend.
  - `@atlas/ui`: Shared React UI component library (`Modal/`, `Toast/`, `auth/`, `layout/`, `hooks/`, `utils/` with canonical `index.ts` barrels).
  - `@atlas/shared`: Shared domain types, Zod contracts, crypto, and offline sync utilities.
- **Backend (`src/`)**: Fastify v5 (`src/server.ts`, `src/app.ts`), TypeScript strict mode (**0 explicit `any`** across non-test `src/**/*.ts`), Zod validation, **100% OpenAPI 3.x schema coverage** across all 90 `*.routes.ts` files (`src/routes/openapi.schemas.ts`), native `@prometheus-io/client` telemetry, BullMQ workers (`src/bpm/workers/`).
- **Database & ORM (`src/db/`)**: SQLite in WAL mode (`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;`) via **Drizzle ORM `1.0.0-rc.5`** (`better-sqlite3` / `@libsql/client`). PostgreSQL, MongoDB, Grafana Cloud SaaS, Codecov, and Camunda 8 are strictly prohibited.
- **Deployments**:
  - **Vercel Production SPA**: Built via `vercel.json` (`NODE_ENV=production pnpm --filter @atlas/frontend build`, output `packages/frontend/dist`), with `@vercel/speed-insights/react` (`RouteAwareSpeedInsights` in `packages/frontend/src/App.tsx`).
  - **GitHub Pages SPA**: Deployed via `.github/workflows/pages-deploy.yml` (`actions/deploy-pages@v4` with `VITE_BASE_PATH="/Atlas-Logistics/"`).
  - **Vite 8 (Rolldown) + Module Federation Safety**: `packages/frontend/vite.config.ts` MUST keep `federation-runtime`, `react-core` (`react` + `scheduler`), and `react-dom-core` isolated in `manualChunks` so `__federation_shared_*` chunks never statically import TLA vendor chunks (`recharts-vendor`, `lucide-icons`, etc.), preventing silent circular Top-Level `await` deadlocks in production builds.

---

## 2. Core Commands

Run from repository root (`C:\Users\xpall\Source\Atlas-Logistics`):

```bash
pnpm install --frozen-lockfile   # Install dependencies
pnpm run build                   # Turborepo build across all 7 workspace packages
pnpm run type-check              # TypeScript check (backend + @atlas/frontend)
pnpm run lint                    # ESLint across the monorepo
pnpm run test                    # Vitest unit & integration suite (--fileParallelism=false)
pnpm run test:e2e                # Playwright E2E suite
```

Quality & security audit gates (enforced in CI):

```bash
pnpm run audit:leaks             # Sensitive token & proprietary identifier leak scanner
pnpm run audit:innerhtml         # Zero-innerHTML / Zero-dangerouslySetInnerHTML DOM safety
pnpm run audit:naming            # DRY file & folder naming convention guardrail
pnpm run audit:ddl-drift         # Zero SQLite DDL schema drift check
pnpm run audit:links             # Markdown relative link integrity check
pnpm run check:file-sizes        # Page module <1,000 lines guardrail (ADR 0020)
pnpm run test:backup-restore     # SQLite VACUUM INTO backup & disaster recovery test
```

---

## 3. Core Guardrails & Development Principles

### 3.1 Database Integrity & Seeders (SQLite WAL + Drizzle `1.0.0-rc.5`)
- Always import foreign-key target tables from their canonical `src/db/schema/` submodule (e.g., `documents` lives in `./support.js`, not `./core.js`).
- Migrations under `drizzle/` must be folder-based (`drizzle/<timestamp>_<tag>/migration.sql` + `drizzle/meta/_journal.json`).
- Seeders in `src/db/seeds/` must be idempotent using `.onConflictDoUpdate()`. Canonical demo shipment: `sh_demo_01` (`BK-2026-67116`, company `c-1`, container `MSKU9284712`).
- Master data uses corporate holdings in `companies` (`company_type = 'HOLDING'`) and all operational partners/locations in the single canonical `addresses` registry with 3-letter `address_type` codes (`MCC`, `OCA`, `ACA`, etc.).

### 3.2 Environment & Secrets Contract (3 Strict Buckets — Never Mix)
Defined centrally in `src/config/env.ts` (`ENV_CONTRACT_CATALOG` + `envSchema`), mirrored in `.env.example`, and enforced by `tests/env-contract-validation.test.ts`:
1. **`frontend-public` (`VITE_*`)**: Bundled in plaintext into browser JS (**NEVER** store secrets here). Configure in Vercel SPA / GitHub Pages build (`VITE_API_URL`, optional `VITE_CARTO_API_KEY`, optional `VITE_SPEED_INSIGHTS_DSN`).
2. **`backend-config` (non-secret)**: `NODE_ENV`, `LOG_LEVEL`, `DATABASE_URL`, `BACKEND_PORT`, `FRONTEND_PORT` (local Vite dev port), `GEMINI_MODEL`. Configure in `.env.local` or Cloud Run env vars — never in Vercel SPA.
3. **`backend-secret` (encrypted)**: `JWT_SECRET` (≥32 chars), `COOKIE_SECRET` (≥32 chars), `DATABASE_AUTH_TOKEN`, `GEMINI_API_KEY`, `REDIS_URL`, `TEAMS_WEBHOOK_ALLOWLIST` (SSRF guard for outbound Teams webhooks). Store exclusively in gitignored `.env.local` or Cloud Run Secret Manager / GitHub Actions Secrets.
- **Anti-Zombie Rule**: `tests/env-contract-validation.test.ts` fails if any variable in `ENV_CONTRACT_CATALOG` has zero active references in `src/`, `packages/`, or `.github/`. Remove env variables whenever removing a component.

### 3.3 Security, Zero-`innerHTML` & API Standards
- **Zero Mocks in UI**: All frontend actions, tables, and charts bind to live Fastify + SQLite endpoints.
- **Zero-`innerHTML`**: Never use `innerHTML` or `dangerouslySetInnerHTML`; construct DOM nodes with `document.createElement()` + `textContent`.
- **SSRF & Path Injection Guards**: Outbound Teams webhooks must match `TEAMS_WEBHOOK_ALLOWLIST` (`redirect: "error"`); document generation must map `OfficialDocumentType` via a static `Map` and verify `path.resolve()` stays inside `STORAGE_DIR`; avoid dynamic bracket indexing on plain objects (use `Map`).
- **Fastify v5 OpenAPI**: Every route must declare `schema` with literal status keys via `buildErrorResponses(...)` (`src/routes/openapi.schemas.ts`) and `additionalProperties: true` on flexible response objects.

### 3.4 DRY Naming, Language & Documentation Governance
- **Technical English Only**: Code, JSDoc file utility headers (`@file`, `@description`, `@module`), ADRs, `docs/`, and Conventional Commits (`feat:`, `fix:`, `refactor:`, `perf:`, `docs:`, `chore:`) must be in standard technical English.
- **DRY Naming**: Place specialized UI pieces in `Tab/`, `Modal/`, `Banner/`, `Drawer/`, `Queue/`, `Panel/` without repeating parent names in filenames, and export clean atomic names from `index.ts` barrels.
- **Root Hygiene (Diátaxis)**: Keep only 6 canonical markdown files in repo root (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`). All other docs go in `docs/` (`tutorials/`, `setup-guides/`, `runbooks/`, `deployment/`, `reference/`, `api/`, `architecture/`, `adr/`).
- **Windows Git Staging**: Stage files explicitly (`git add <file1> <file2>`) rather than `git add -A`.

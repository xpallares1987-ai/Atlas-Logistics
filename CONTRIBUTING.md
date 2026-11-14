# Contributing to Atlas Logistics

Thank you for contributing to Atlas Logistics! We maintain high engineering standards to ensure platform stability, deterministic regulatory calculations, and zero-cost local execution.

---

## 🛠️ Development Workflow (Git Flow & Conventional Commits)

1. **Branching & Commit Signing**:
   - Work directly on `main` for authorized core maintainers, or use descriptive feature branches (`feat/feature-name`, `fix/bug-description`).
   - All commits must be cryptographically signed using GPG or SSH (`git commit -S -m "..."`).
2. **Commit Standards**: We strictly enforce [Conventional Commits](https://www.conventionalcommits.org/) via `commitlint`:
   ```bash
   feat(claims): add Hague-Visby statutory SDR carrier liability calculator
   fix(customs): correct TARIC antidumping duty formula for steel fasteners
   docs(architecture): update e-CMR and dispatch engine specification
   ```
3. **Leak Prevention**:
   - Before committing, verify that staged files do not contain confidential partner identifiers or credentials:
   ```bash
   pnpm run audit:leaks:staged
   ```
4. **Pull Requests & CI Verification**:
   - All PRs must pass the root build (`pnpm run build`), ESLint checks (`pnpm run lint`), DDL drift detection (`pnpm run audit:ddl-drift`), and the full test suite (`pnpm test`).
   - GitHub Advanced Security (CodeQL SAST, njsscan, Dependabot) scans must pass with zero critical alerts before merging.

---

## 🏗️ Monorepo Guidelines

- **Package Management**: We use `pnpm` (v10+) with Turborepo workspaces (`packages/*`).
- **Shared Code**: Shared TypeScript types, utility functions, and Zod schemas reside in `@atlas/shared` (`packages/shared`).
- **UI Components**: Visual components, glassmorphism tokens, and interactive widgets belong in `@atlas/ui` (`packages/ui`).
- **File Size Guardrails**: Page modules under `packages/frontend/src/pages/` must remain strictly under 1,000 lines (target <700 lines), enforced via `pnpm run check:file-sizes`.

---

## 🗄️ Database & Schema Standards

- **Local Persistence & Environment Isolation**:
  - State is stored in embedded SQLite via the `@libsql/client` driver and **Drizzle ORM**.
  - Development defaults to `file:data/dev.db` with mandatory WAL mode and foreign key enforcement (`PRAGMA foreign_keys = ON;`).
  - Production defaults to `file:/app/data/prod.db` (or custom `DATABASE_URL`).
- **Schema Modifications Workflow**:
  1. Add or modify table schemas under `src/db/schema/*.ts`.
  2. Export schema definitions in `src/db/schema/index.ts`.
  3. Generate migrations using `pnpm run db:generate`.
  4. Verify schema parity and migration snapshot consistency:
     ```bash
     pnpm run audit:ddl-drift
     ```
  5. Apply migrations on development DB via `pnpm run db:migrate`.
  6. Add deterministic seed data in `src/db/seeds/` ensuring parent referential integrity (e.g. canonical shipment `sh_demo_01`). Tested with `pnpm run db:seed`.

---

## ⚙️ Backend API & Deterministic Engines

- **Fastify REST Routes**: Group endpoints cleanly by domain in `src/routes/*.routes.ts` and register them with appropriate prefixes in `src/app.ts`.
- **RBAC Guards**: Secure sensitive operational and financial routes using `@fastify/jwt` role validation.
- **Deterministic Services**: All regulatory, customs, air freight rating, Incoterms risk matrices, and legal liability calculations must be 100% deterministic, testable with unit tests, and devoid of non-deterministic side-effects.

---

## 🧪 Testing Standards

- **Unit & Integration Tests**: Every new service or route must have corresponding Vitest test files (`*.test.ts`) covering normal cases, boundary values, and error conditions.
- **E2E Tests**: Significant user flows and workbench modules should be accompanied by Playwright tests under `tests/e2e/*.spec.ts`.
- Run all tests locally before submitting a PR:
  ```bash
  pnpm test
  npx playwright test
  ```

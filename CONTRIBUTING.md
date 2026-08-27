# Contributing to Atlas Logistics

Thank you for contributing to Atlas Logistics! We maintain high engineering standards to ensure platform stability, deterministic regulatory calculations, and zero-cost local execution.

---

## 🛠️ Development Workflow (Git Flow & Conventional Commits)

1. **Branching**: Create feature branches from `main` using descriptive naming:
   - `feat/feature-name` (e.g. `feat/air-cargo-rating`, `feat/road-freight-ecmr`)
   - `fix/bug-description` (e.g. `fix/customs-taric-calculation`)
2. **Commit Standards**: We strictly enforce [Conventional Commits](https://www.conventionalcommits.org/) via `commitlint`:
   ```bash
   feat(claims): add Hague-Visby statutory SDR carrier liability calculator
   fix(customs): correct TARIC antidumping duty formula for steel fasteners
   docs(architecture): update e-CMR and dispatch engine specification
   ```
3. **Pull Requests**:
   - All PRs must pass the root build (`pnpm run build`), ESLint checks, and the full Vitest suite (`pnpm test`).
   - GitHub Advanced Security (CodeQL SAST and Dependabot) scans must pass with zero critical alerts before merging.

---

## 🏗️ Monorepo Guidelines

- **Package Management**: We use `pnpm` (v10+) with Turborepo workspaces (`packages/*`).
- **Shared Code**: Shared TypeScript types, utility functions, and Zod schemas should reside in `@atlas/shared` (`packages/shared`).
- **UI Components**: Visual components, glassmorphism tokens, and interactive widgets belong in `@atlas/ui` (`packages/ui`).

---

## 🗄️ Database & Schema Standards

- **Local Persistence ($0 Cloud Cost)**: State is stored locally in SQLite via the `@libsql/client` driver and **Drizzle ORM**.
- **Schema Modifications**:
  1. Add or modify table schemas under `src/db/schema/*.ts`.
  2. Export schema definitions in `src/db/schema/index.ts`.
  3. Generate migrations using `pnpm run db:generate`.
  4. Apply migrations locally via `pnpm run db:migrate`.
  5. Add realistic seed data in `src/db/seed.ts`.

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

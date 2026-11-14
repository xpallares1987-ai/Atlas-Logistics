# Atlas Logistics — Local Development & Setup Guide

This guide is the primary walkthrough for setting up, developing, testing, and contributing to the Atlas Logistics platform.

---

## 1. Prerequisites

* **Node.js**: `v22.x` (LTS recommended) or `v24.x`
* **Package Manager**: `pnpm` (Corepack enabled: `corepack enable pnpm`)
* **Database**: Embedded SQLite (`data/dev.db`, no external DB server required for development)
* **Optional**: Docker Desktop (for Redis or Observability profile)

---

## 2. Initial Setup (Step-by-Step)

```bash
# 1. Clone repository
git clone https://github.com/xpallares1987-ai/Atlas-Logistics.git
cd Atlas-Logistics

# 2. Install dependencies with pnpm
pnpm install

# 3. Initialize environment file (.env.local)
cp .env.example .env.local

# 4. Apply database migrations and seed baseline data
pnpm run db:migrate
pnpm run db:seed

# 5. Verify DDL Parity, Leak Prevention Guard & Code Quality
pnpm run audit:ddl-drift
pnpm run audit:leaks:staged
pnpm run lint
npx tsc --noEmit
```

---

## 3. Development Workflows

### Two-Terminal Workflow (Recommended)

* **Terminal 1: Backend Fastify API**
  ```bash
  pnpm dev:backend
  # Listens on http://localhost:3001
  ```
* **Terminal 2: Frontend PWA Host (React 19 + Vite)**
  ```bash
  pnpm dev:frontend
  # Listens on http://localhost:3000
  ```

### Single Command All-in-One
```bash
pnpm dev
```

---

## 4. Verification & Testing Reference

| Command | Purpose | When to Run |
| :--- | :--- | :--- |
| `pnpm test` | Run all unit & integration test suites across the repository | Prior to commits |
| `pnpm vitest run tests/scm-*` | Run SCM domain control engine test suites | SCM development |
| `pnpm run audit:ddl-drift` | Validate Drizzle snapshot parity and replay integrity | Schema changes |
| `pnpm run check:file-sizes` | Enforce <1,000 line modularity guardrail on page modules | Frontend changes |
| `pnpm run lint` | Run ESLint across root and monorepo packages | Prior to commits |
| `npx tsc --noEmit` | Strict TypeScript compiler check across workspaces | Prior to commits |
| `pnpm run audit:leaks:staged` | Scan staged files for confidential partner identifiers | Pre-commit hook & CI |
| `npx playwright test` | Run end-to-end browser test suites | Pre-release |

---

## 5. Pre-Commit Hooks & Quality Gates

The repository is configured with `husky` and `lint-staged`:
* On `git commit` (mandatory signed with `-S`), the pre-commit hook automatically executes:
  1. `scripts/check-sensitive-leaks.cjs --staged` (Zero-leak policy)
  2. `eslint --fix` on staged files
  3. `prettier --write` on staged files

# Atlas Logistics — Local Development & Setup Guide

This guide is the primary walkthrough for setting up, developing, testing, and contributing to the Atlas Logistics platform.

---

## 1. Prerequisites

* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **Package Manager**: `pnpm` (Corepack enabled: `corepack enable pnpm`)
* **Database**: Embedded SQLite (no external DB server required for development)
* **Optional**: Docker Desktop (for Redis or Observability profile)

---

## 2. Initial Setup (Step-by-Step)

```bash
# 1. Clone repository (local only - see security policies)
cd Atlas-Logistics

# 2. Install dependencies with pnpm
pnpm install

# 3. Initialize environment file (.env.local)
cp .env.example .env.local

# 4. Verify Leak Prevention Guard & Code Quality
pnpm audit:leaks
pnpm eslint
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
* **Terminal 2: Frontend Next.js / Web Workspace**
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
| `pnpm test` | Run all test suites across the repository | Prior to commits |
| `pnpm vitest run tests/scm-*` | Run SCM domain test suites | SCM development |
| `pnpm eslint` | Run linter and style checks | Prior to commits |
| `npx tsc --noEmit` | Strict TypeScript compiler check | Prior to commits |
| `pnpm audit:leaks` | Scan for accidental confidential tokens | Pre-commit hook & CI |

---

## 5. Pre-Commit Hooks & Quality Gates

The repository is configured with `husky` and `lint-staged`:
* On `git commit`, the pre-commit hook automatically executes:
  1. `scripts/check-sensitive-leaks.cjs` (Zero-leak policy)
  2. `eslint --fix` on staged files
  3. `prettier --write` on staged files

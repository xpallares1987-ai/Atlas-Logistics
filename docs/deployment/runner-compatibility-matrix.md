# Runner OS & Platform Compatibility Matrix

**Module:** `@atlas/deployment/ci-runner-matrix`  
**Standard:** Diátaxis Deployment Reference  
**Tracking Issue:** [#6](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/6)  
**Upstream Reference:** [actions/runner-images#14748](https://github.com/actions/runner-images/issues/14748)  

---

## 1. Overview & Migration Timeline

GitHub Actions is migrating the default `ubuntu-latest` runner virtual environment to **Ubuntu 26.04 LTS** (Noble Numbat successor) between October 19, 2026, and November 19, 2026.

This matrix ensures forward-compatibility and prevents toolchain regressions across:
1. Native SQLite C bindings (`@libsql/client`, `libsql`).
2. Node.js LTS versions (v22 Active LTS, v24 Current/Next).
3. Playwright browser dependencies (Chromium, WebKit, Firefox system libraries).
4. Container toolchains (`docker buildx`, BuildKit daemon, Docker Compose v2).

---

## 2. Certified Runner Environments

| Runner Label | OS Release | Node.js | Status | Purpose |
| :--- | :--- | :---: | :---: | :--- |
| **`ubuntu-latest`** | Dynamic alias (`ubuntu-24.04` / `ubuntu-26.04`) | 22 LTS | **Primary** | Default CI/CD pipeline, PR checks, deployments |
| **`ubuntu-26.04`** | Ubuntu 26.04 LTS | 22 & 24 | **Certified** | Weekly scheduled platform matrix validation |
| **`ubuntu-24.04`** | Ubuntu 24.04 LTS | 22 & 24 | **Certified** | Pinned fallback and legacy stability baseline |

---

## 3. Automated Validation Workflow

Proactive validation is executed by [.github/workflows/ubuntu-26-validation.yml](../../.github/workflows/ubuntu-26-validation.yml):

- **Trigger Schedule:** Weekly on Mondays at 03:00 UTC, on `workflow_dispatch`, and on PRs modifying `package.json`, `pnpm-lock.yaml`, or `.github/workflows/**`.
- **Validation Scope:**
  - Full dependency installation with frozen lockfile.
  - Zero confidential data leak audit (`pnpm run audit:leaks`).
  - Strict ESLint and TypeScript type checking.
  - Turborepo monorepo build (`turbo run build`).
  - SQLite database migration and seeding (`pnpm run db:migrate`, `pnpm run db:seed`).
  - 100% Vitest unit and integration suites (including migration reproducibility and upgrade continuity tests).
  - Production Docker Compose configuration syntax validation (`docker compose -f docker-compose.prod.yml config`).

---

## 4. Key Platform Dependencies & Verification Guardrails

### 4.1. Native SQLite Engine
- **Requirement:** `@libsql/client` compiles against native glibc without ABI breakage.
- **Verification:** Both Node 22 and Node 24 execute `tests/db-reproducibility-and-integrity.test.ts` cleanly.

### 4.2. Playwright System Dependencies
- **Requirement:** Headless browser automation libraries must resolve on Ubuntu 26 package mirrors.
- **Verification:** Playwright system dependency installer (`npx playwright install-deps chromium`) runs without missing shared libraries.

### 4.3. Docker Compose v2
- **Requirement:** Compose file version specifications must adhere strictly to Compose Specification without deprecated syntax.
- **Verification:** `docker compose -f docker-compose.prod.yml config` passes with zero errors.

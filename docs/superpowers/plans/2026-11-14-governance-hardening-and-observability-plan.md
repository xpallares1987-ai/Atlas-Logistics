# Governance Hardening & Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the prioritized audit recommendations covering GitHub branch protection rules, runner pinning to `ubuntu-24.04`, SCM coverage threshold enforcement, Grafana alerting rules provisioning, and OpenTelemetry tracing instrumentation.

**Architecture:** 
- Repository security and governance are codified through GitHub repository rulesets (`gh api`) and pinned workflow runners.
- Test rigor is locked in via path-specific coverage thresholds in `vitest.config.ts`.
- Observability is enhanced via declarative Grafana alerting YAML rules and native in-process `@opentelemetry/api` spans around Fastify HTTP requests and SCM transactional outbox event deliveries.

**Tech Stack:** Fastify, Drizzle ORM (SQLite WAL mode), GitHub Actions, Vitest v8 coverage, Grafana / Prometheus Alerting, OpenTelemetry (`@opentelemetry/api`).

---

## Global Constraints

- **Single Branch Flow**: Commits are applied directly to `main` with GPG/ED25519 cryptographic signatures (`-S`).
- **Terminal Guardrail**: Prepend `$env:GITHUB_TOKEN="";` before all `gh` CLI commands to clear sandbox dummy tokens.
- **SQLite Concurrency & WAL Integrity**: Maintain `PRAGMA busy_timeout = 5000;`, atomic snapshots (`VACUUM INTO`), and 100% row count parity across all 237 physical tables.
- **Zero Information Leaks**: `pnpm run audit:leaks:staged` must exit 0 before any commit.
- **Root Hygiene**: Exactly 6 canonical documentation files in repository root (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`).
- **Strict English Standard**: 100% English across code, JSDoc, tests, docs, and commit messages.

---

## Review Focus

1. **GitHub Ruleset Bypass**: Verify that repository administrators and automated workflows retain bypass capability so that automated CI/CD releases and push synchronizations are never deadlocked.
2. **Runner Pinning Parity**: Ensure that pinning `ubuntu-24.04` does not break container buildx drivers, Playwright dependencies, or SLSA provenance attestations.
3. **Coverage Threshold Granularity**: Verify that setting coverage thresholds on `src/scm/**` does not cause false negatives during single-file test runs or CI pipeline execution.
4. **Grafana Prometheus Syntax**: Validate that Prometheus PromQL expressions in alerting rules are syntactically valid and have corresponding scrape targets in `prometheus.yml`.
5. **OpenTelemetry Overhead**: Ensure `@opentelemetry/api` is lightweight, fail-safe (spans silently no-op if no collector is running), and adds negligible overhead to Fastify request dispatch and outbox relays.

---

### Task 1: GitHub Branch Protection & Ruleset Enhancement (F-02 & F-03)

**Files:**
- Modify via API: GitHub Repository Ruleset `Main Ruleset` (ID `26896465`)
- Create: `docs/runbooks/github-branch-governance.md`

- [ ] **Step 1.1: Fetch and inspect the current ruleset definition**
  Run: `$env:GITHUB_TOKEN=""; gh api repos/xpallares1987-ai/Atlas-Logistics/rulesets/26896465`

- [ ] **Step 1.2: Update Main Ruleset via GitHub REST API**
  Update `Main Ruleset` (ID `26896465`) to:
  1. Scope `conditions.ref_name.include` strictly to `["~DEFAULT_BRANCH"]` (`refs/heads/main`).
  2. Enforce required status checks:
     - `"Lint, Type Check, Build & Test (22)"`
     - `"Analyze (javascript-typescript)"` (CodeQL)
     - `"njsscan code scanning"`
     - `"End-to-End Playwright Tests"`
  3. Enforce `required_linear_history`, `deletion`, and `non_fast_forward`.
  4. Ensure `bypass_actors` contains DeployKey and RepositoryRole (Admin) with `bypass_mode: "always"`.
  Command:
  `$env:GITHUB_TOKEN=""; gh api --method PUT repos/xpallares1987-ai/Atlas-Logistics/rulesets/26896465 --input payload.json`

- [ ] **Step 1.3: Document Branch Protection & Ruleset Governance in Diátaxis How-To Guide**
  Author `docs/runbooks/github-branch-governance.md` detailing:
  - Branch ruleset hierarchy and enforced status checks.
  - Bypass conditions for emergency hotfixes and automated release pipelines.
  - Verification procedure via GitHub CLI.

- [ ] **Step 1.4: Update documentation index and verify link integrity**
  Add entry in `docs/README.md` and verify with `pnpm run audit:links`.

---

### Task 2: Runner Pinning to `ubuntu-24.04` (F-10)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/docker-build.yml`
- Modify: `.github/workflows/njsscan.yml`
- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/cache-clean.yml`
- Modify: `.github/workflows/db-push.yml`
- Modify: `.github/workflows/dependabot.yml`
- Modify: `.github/workflows/wiki-sync.yml`
- Modify: `.github/workflows/greetings.yml`
- Modify: `.github/workflows/label.yml`

- [ ] **Step 2.1: Replace `runs-on: ubuntu-latest` with `runs-on: ubuntu-24.04` across all workflows**
  Pin all 6 jobs in `.github/workflows/ci.yml`:
  - `validate-compose`: `runs-on: ubuntu-24.04`
  - `lint-and-build`: `runs-on: ubuntu-24.04`
  - `e2e-playwright`: `runs-on: ubuntu-24.04`
  - `build-images`: `runs-on: ubuntu-24.04`
  - `verify-slsa`: `runs-on: ubuntu-24.04`
  - `notify`: `runs-on: ubuntu-24.04`
  Pin all jobs in other workflow files (`njsscan.yml`, `release.yml`, etc.) to `ubuntu-24.04`.

- [ ] **Step 2.2: Validate YAML syntax across all workflow files**
  Verify with `node -e "..."` or dry-run validation to guarantee zero syntax or indentation errors.

---

### Task 3: Coverage Threshold Enforcement for SCM & Compliance (F-06)

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 3.1: Configure scoped coverage thresholds in `vitest.config.ts`**
  Add threshold rules specifically targeting SCM domain engines:
  ```typescript
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 60,
    statements: 70,
    "src/scm/contexts/orders/**": { lines: 80, statements: 80 },
    "src/scm/contexts/shipment-execution/**": { lines: 85, statements: 85 },
    "src/scm/contexts/transport-planning/**": { lines: 85, statements: 85 },
    "src/scm/contexts/shipment-consolidation/**": { lines: 85, statements: 85 },
  }
  ```

- [ ] **Step 3.2: Verify threshold evaluation locally**
  Run `pnpm vitest run tests/scm-control-engines.test.ts` and ensure all tests pass.

---

### Task 4: Grafana Alerting Rules Provisioning (F-12)

**Files:**
- Modify: `grafana/rules/atlas-alerts.yml`
- Create: `grafana/provisioning/alerting/rules.yml`
- Create: `grafana/provisioning/alerting/contact-points.yml`

- [ ] **Step 4.1: Extend Prometheus alerting rules in `grafana/rules/atlas-alerts.yml`**
  Add:
  - `SQLiteWALCheckpointStall`: Alert when `sqlite_wal_frames > 10000` for > 3 minutes.
  - `SQLiteBusyTimeoutErrors`: Alert when `rate(sqlite_busy_timeout_errors_total[5m]) > 0`.
  - `RedisCommandLatencyHigh`: Alert when Redis command duration exceeds 50ms.
  - `HTTP5xxSpike`: Alert when HTTP 5xx error rate exceeds 2% of total traffic.

- [ ] **Step 4.2: Provision native Grafana Alerting files in `grafana/provisioning/alerting/`**
  Author:
  - `grafana/provisioning/alerting/rules.yml`: Declarative Grafana Alerting rule group definition.
  - `grafana/provisioning/alerting/contact-points.yml`: Default webhook / log notifier contact point.

- [ ] **Step 4.3: Verify YAML syntax and Prometheus scrape configuration**
  Verify that `grafana/prometheus.yml` rule_files continues to load `grafana/rules/atlas-alerts.yml`.

---

### Task 5: OpenTelemetry Distributed Tracing Instrumentation (F-15)

**Files:**
- Modify: `package.json`
- Create: `src/observability/tracer.ts`
- Modify: `src/app.ts`
- Modify: `src/scm/kernel/outbox-bus.ts`
- Create: `tests/observability-tracing.test.ts`

- [ ] **Step 5.1: Install `@opentelemetry/api`**
  Run: `pnpm add @opentelemetry/api`

- [ ] **Step 5.2: Create `src/observability/tracer.ts`**
  Implement:
  - `getTracer()`: returns OpenTelemetry Tracer (`atlas-logistics`).
  - `traceSpan<T>(name: string, attributes: Record<string, any>, fn: (span: Span) => Promise<T>): Promise<T>`:
    Safely creates an active span, sets attributes, records exceptions on error, and ends the span cleanly.

- [ ] **Step 5.3: Instrument Fastify HTTP Request Lifecycle in `src/app.ts`**
  Add hooks:
  - `onRequest`: Open span `http.request` with `http.method`, `http.url`, `station.id`. Attach span to request context.
  - `onResponse`: Set `http.status_code`, record duration, end span.
  - `onError`: Set span status `ERROR`, record exception details.

- [ ] **Step 5.4: Instrument SCM Transactional Outbox in `src/scm/kernel/outbox-bus.ts`**
  Wrap:
  - `publish()`: Trace `outbox.publish` with `event_type`, `aggregate_id`, `message_id`.
  - `relayPendingEvents()`: Trace `outbox.relay` with batch count and duration.
  - `dispatchToSubscribers()`: Trace `outbox.dispatch` with subscriber count and individual handler execution.

- [ ] **Step 5.5: Create Unit Test Suite in `tests/observability-tracing.test.ts`**
  Verify:
  - Fastify requests generate spans with correct HTTP attributes.
  - Errors record exceptions on spans.
  - SCM outbox publish and relay generate trace spans without throwing.

---

### Task 6: Comprehensive Verification & Remote CI/CD Sync

**Files:**
- Verify: Whole monorepo

- [ ] **Step 6.1: Run TypeScript Type Check**
  Run: `pnpm run type-check`

- [ ] **Step 6.2: Run File Size Guardrail**
  Run: `pnpm run check:file-sizes` (confirm <1,000 lines across all pages).

- [ ] **Step 6.3: Run Unit & Integration Test Suites**
  Run: `pnpm vitest run tests/observability-tracing.test.ts tests/station-context-middleware.test.ts tests/scm-cockpit-station-scoping.test.ts`

- [ ] **Step 6.4: Run Governance Audits**
  Run: `pnpm run audit:links && pnpm run audit:legacy-docs && pnpm run test:backup-restore`

- [ ] **Step 6.5: Run Pre-Commit Leak Prevention**
  Run: `pnpm run audit:leaks:staged`

- [ ] **Step 6.6: Create Cryptographically Signed Git Commit**
  Run: `git commit -S -m "feat(governance): enforce branch rulesets, runner pinning, alerting and tracing"`

- [ ] **Step 6.7: Push to `origin/main` & Monitor GitHub Actions**
  Run: `$env:GITHUB_TOKEN=""; git push origin main`
  Monitor: `gh run list --limit 5` to confirm 100% green CI/CD pipeline.

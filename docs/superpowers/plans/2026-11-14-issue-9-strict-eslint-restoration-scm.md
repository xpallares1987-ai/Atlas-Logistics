# Issue #9 Phase 1: Strict TypeScript ESLint Restoration (SCM Domain) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This implementation plan delivers **Phase 1 of [Issue #9](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/9)**: systematically restoring strict TypeScript ESLint rules (`@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars`) across the core Supply Chain Management (SCM) domain without introducing regressions, breaking contracts, or blocking CI.

---

## 1. Context & Architectural Objectives

To accelerate CI unblocking, `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` were globally set to `"off"` in `eslint.config.js`. While this achieved green pipelines, it permits typing drift in mission-critical domain logic.

**Phase 1 Focus:**
- Target directory: `src/scm/**` (23 source files comprising Kernel, Operational Core, Operational Intelligence, and Workflow engines).
- Eliminate all 103 current ESLint violations under strict rule configuration.
- Elevate `src/scm/**` to `@typescript-eslint/no-explicit-any: "error"` and `@typescript-eslint/no-unused-vars: "error"`.
- Maintain 100% test pass rate across Vitest suites and 0 DDL/type regressions.

---

## 2. Target File Map

| Subsystem | Target Files | Responsibility |
| :--- | :--- | :--- |
| **Tooling** | `eslint.config.js` | Scoped ESLint rules with standard ignore patterns (`_` prefix) |
| **Kernel** | `src/scm/kernel/primitives.ts`<br>`src/scm/kernel/outbox-bus.ts`<br>`src/scm/kernel/transport-mode.ts` | Base primitives, event bus, and outbox relay engine |
| **Operational Core** | `src/scm/contexts/operational-core/operational-core.context.ts`<br>`src/scm/contexts/orders/order.context.ts`<br>`src/scm/contexts/shipment-execution/shipment.context.ts`<br>`src/scm/contexts/transport-planning/route-plan.context.ts` | Canonical shipment execution, orders, and route planning |
| **Operational Intelligence** | `src/scm/contexts/operational-intelligence/green-compliance.projector.ts`<br>`src/scm/contexts/operational-intelligence/operational-exceptions.context.ts`<br>`src/scm/contexts/operational-intelligence/operations-cockpit-bff.context.ts`<br>`src/scm/contexts/operational-intelligence/operations-cockpit.projector.ts`<br>`src/scm/contexts/operational-intelligence/shipment360.projector.ts` | Cockpit projectors, station context aggregations, and environmental telemetry |
| **Business Engines & Automation** | `src/scm/contexts/automation/workflow-rules.context.ts`<br>`src/scm/contexts/control-engines/control-engines.context.ts`<br>`src/scm/contexts/finance-billing/finance-billing.context.ts`<br>`src/scm/contexts/trade-consolidation/trade-consolidation.context.ts`<br>`src/scm/contexts/work-management/work-management.context.ts`<br>`src/scm/contexts/workflow-engine/workflow-engine.context.ts`<br>`src/scm/contexts/tracking-events/tracking-events.context.ts`<br>`src/scm/contexts/cargo-equipment/cargo-equipment.context.ts` | Automated business rules, milestone tracking, billing, and task transitions |

---

## 3. Tasks & Deliverables

### Task 1: ESLint Configuration & Variable Pattern Calibration

- [ ] **Step 1.1**: Update `eslint.config.js` with standard unused variable patterns (`argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`, `caughtErrorsIgnorePattern: "^_"`).
- [ ] **Step 1.2**: Add a dedicated override block for `src/scm/**/*.ts` configured with `@typescript-eslint/no-unused-vars: "error"` and `@typescript-eslint/no-explicit-any: "warn"`.
- [ ] **Step 1.3**: Run `npx eslint src/scm` to verify that underscore-prefixed variables are cleanly exempted while unreferenced imports and vars are correctly flagged.
- [ ] **Step 1.4**: Commit changes: `git commit -S -m "chore(lint): configure scoped rules and ignore patterns for scm domain"`.

### Task 2: Kernel & Foundation Layer Strict Typing (`src/scm/kernel/**`)

- [ ] **Step 2.1**: Audit `src/scm/kernel/primitives.ts`:
  - Replace `any` in dictionary definitions with `unknown` or typed value constraints.
- [ ] **Step 2.2**: Audit `src/scm/kernel/outbox-bus.ts`:
  - Replace `any` in outbox event envelopes, handlers, database transaction options, and OpenTelemetry trace attributes with `Record<string, unknown>` or typed generics `TEventPayload`.
- [ ] **Step 2.3**: Run `npx eslint src/scm/kernel` and assert 0 errors and 0 warnings.
- [ ] **Step 2.4**: Run `npx vitest run tests/observability-tracing.test.ts` to assert that all 8 outbox bus and tracing tests continue passing.
- [ ] **Step 2.5**: Commit changes: `git commit -S -m "refactor(scm): eliminate loose any types in scm kernel and outbox bus"`.

### Task 3: Operational Core & Execution Contexts

- [ ] **Step 3.1**: Clean up dead imports and unused handlers in `src/scm/contexts/operational-core/operational-core.context.ts`.
- [ ] **Step 3.2**: Refactor `src/scm/contexts/orders/order.context.ts`, `shipment.context.ts`, and `route-plan.context.ts`:
  - Replace wildcard parameters with typed domain entities (`ShipmentRecord`, `OrderRecord`, `RouteLegRecord`).
- [ ] **Step 3.3**: Run `npx eslint src/scm/contexts/operational-core src/scm/contexts/orders src/scm/contexts/shipment-execution src/scm/contexts/transport-planning` to assert 0 errors.
- [ ] **Step 3.4**: Run `pnpm run type-check` across the monorepo.
- [ ] **Step 3.5**: Commit changes: `git commit -S -m "refactor(scm): enforce strict typing in operational core and execution contexts"`.

### Task 4: Operational Intelligence & Cockpit Projectors

- [ ] **Step 4.1**: Audit `green-compliance.projector.ts` and `operational-exceptions.context.ts`:
  - Remove unreferenced imports (`OperationalShipment360View`, `isCbamEligible`).
  - Type GHG emission calculations and compliance metadata without `any`.
- [ ] **Step 4.2**: Audit `operations-cockpit-bff.context.ts` and `operations-cockpit.projector.ts`:
  - Type query results, Drizzle aggregates, and BFF filter payloads.
  - Refactor loose `any` casts in station context validation.
- [ ] **Step 4.3**: Audit `shipment360.projector.ts`:
  - Type shipment projection state and milestone events.
- [ ] **Step 4.4**: Run `npx eslint src/scm/contexts/operational-intelligence` to verify 0 errors.
- [ ] **Step 4.5**: Run `npx vitest run tests/scm-cockpit-station-scoping.test.ts` to verify station authorization integrity.
- [ ] **Step 4.6**: Commit changes: `git commit -S -m "refactor(scm): strict typing for cockpit projectors and operational intelligence"`.

### Task 5: Business Engines & Automation Contexts

- [ ] **Step 5.1**: Audit `src/scm/contexts/automation/workflow-rules.context.ts` (13 violations):
  - Strongly type rule trigger conditions, actions, and evaluation context.
- [ ] **Step 5.2**: Audit `src/scm/contexts/control-engines/control-engines.context.ts` and `finance-billing.context.ts`:
  - Type invoice item calculations, rate structures, and milestone control triggers.
- [ ] **Step 5.3**: Audit `src/scm/contexts/work-management/work-management.context.ts` and `workflow-engine.context.ts`:
  - Type task creation payloads, state machine transitions, and assignees.
- [ ] **Step 5.4**: Audit `src/scm/contexts/trade-consolidation/trade-consolidation.context.ts`, `cargo-equipment.context.ts`, and `tracking-events.context.ts`:
  - Type container consolidation records and carrier tracking event streams.
- [ ] **Step 5.5**: Run `npx eslint src/scm/contexts/` to verify 0 errors across all context files.
- [ ] **Step 5.6**: Commit changes: `git commit -S -m "refactor(scm): eliminate explicit any across automation and business engine contexts"`.

### Task 6: Strict Error Elevation & Monorepo CI Validation

- [ ] **Step 6.1**: In `eslint.config.js`, elevate `src/scm/**/*.ts` to `@typescript-eslint/no-explicit-any: "error"` (blocking error gate).
- [ ] **Step 6.2**: Run full lint suite: `pnpm run lint` (assert 0 errors and 0 warnings).
- [ ] **Step 6.3**: Run TypeScript strict type-check: `pnpm run type-check` (assert 0 errors).
- [ ] **Step 6.4**: Run file-size and markdown link audits: `pnpm run check:file-sizes && pnpm run audit:links`.
- [ ] **Step 6.5**: Run complete test suite: `pnpm test`.
- [ ] **Step 6.6**: Run leak audit: `pnpm run audit:leaks:staged`.
- [ ] **Step 6.7**: Commit and push: `git commit -S -m "feat(quality): enforce blocking strict eslint rules on scm domain (issue #9 phase 1)"` and `$env:GITHUB_TOKEN=""; git push origin main`.
- [ ] **Step 6.8**: Update [Issue #9](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/9) with Phase 1 completion notes and transition [Atlas Project #4](https://github.com/users/xpallares1987-ai/projects/4) item status.

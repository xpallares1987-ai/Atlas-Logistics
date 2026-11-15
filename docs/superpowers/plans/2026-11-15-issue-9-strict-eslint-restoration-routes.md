# Issue #9 Phase 3: Strict TypeScript ESLint Restoration (Operational Controllers & Routes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This implementation plan delivers **Phase 3 of [Issue #9](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/9)**: systematically restoring strict TypeScript ESLint rules (`@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars`) across all Operational Controllers and Fastify Route Handlers (`src/routes/**`).

---

## 1. Context & Architectural Objectives

With Phase 1 (SCM domain) and Phase 2 (Security & Identity layer) completed and merged to `main`, Phase 3 addresses the HTTP controller layer (`src/routes/**`).
Controllers frequently declare untyped query strings (`request.query as any`), untyped request bodies (`request.body as any`), route parameters (`request.params as any`), and catch blocks (`catch (err: any)`).

**Phase 3 Focus:**
- Target directory: `src/routes/**` (34 source files, 430 total warnings).
- Eliminate all explicit `any` and unhandled unused variables across route handlers.
- Elevate `src/routes/**/*.ts` (excluding tests) to `@typescript-eslint/no-explicit-any: "error"` and `@typescript-eslint/no-unused-vars: "error"`.
- Use Fastify's native route generics `<{ Body: ..., Querystring: ..., Params: ... }>` or typed payload interfaces.
- Leverage `AuthUserContext` from `src/middleware/auth.ts` on `request.user` without runtime casting.
- Maintain 0 ESLint errors/warnings (`pnpm run lint`), 0 TypeScript errors (`pnpm run type-check`), passing Vitest tests (`pnpm test`), 0 sensitive data leaks, and 0 broken links.

---

## 2. Execution Batches

### Batch 3A: Core Logistics & Operations Routes (194 warnings)
1. `src/routes/scm-v1.routes.ts` (55)
2. `src/routes/quotes.routes.ts` (38)
3. `src/routes/addresses.routes.ts` (37)
4. `src/routes/shipments.routes.ts` (16)
5. `src/routes/bookings.routes.ts` (15)
6. `src/routes/drayage.routes.ts` (13)
7. `src/routes/tracking.routes.ts` (7)
8. `src/routes/schedules.routes.ts` (4)
9. `src/routes/tasks.routes.ts` (3)
10. `src/routes/dashboard.routes.ts` (3)
11. `src/routes/health.routes.ts` (3)

### Batch 3B: Operations Submodules & Warehouse Routes (52 warnings)
12. `src/routes/operations/lcl.routes.ts` (20)
13. `src/routes/warehouse.routes.ts` (17)
14. `src/routes/operations/demurrage.routes.ts` (8)
15. `src/routes/operations/warehouse-traffic.routes.ts` (6)
16. `src/routes/operations/seed-data.ts` (1)

### Batch 3C: Financial & Integration Routes (61 warnings)
17. `src/routes/edi.routes.ts` (16)
18. `src/routes/dcsa.routes.ts` (14)
19. `src/routes/documents.routes.ts` (13)
20. `src/routes/events.routes.ts` (11)
21. `src/routes/financial/invoices.routes.ts` (7)
22. `src/routes/financial/analytics.routes.ts` (5)
23. `src/routes/financial/settlements.routes.ts` (5)

### Batch 3D: Governance, AI & Admin Routes (88 warnings)
24. `src/routes/external-governance.routes.ts` (15)
25. `src/routes/organization.routes.ts` (14)
26. `src/routes/ai.routes.ts` (12)
27. `src/routes/carbon.routes.ts` (11)
28. `src/routes/control-tower.routes.ts` (11)
29. `src/routes/auth.routes.ts` (10)
30. `src/routes/bpmn.routes.ts` (8)
31. `src/routes/telemetry.routes.ts` (8)
32. `src/routes/settings.routes.ts` (6)
33. `src/routes/admin-db.routes.ts` (6)
34. `src/routes/admin-seed.routes.ts` (3)

---

## 3. Tasks & Deliverables

### Task 1: Batch 3A — Core Logistics & Operations Routes
- [ ] Refactor `scm-v1.routes.ts`, `quotes.routes.ts`, `addresses.routes.ts`, `shipments.routes.ts`, `bookings.routes.ts`, `drayage.routes.ts`, `tracking.routes.ts`, `schedules.routes.ts`, `tasks.routes.ts`, `dashboard.routes.ts`, and `health.routes.ts`.
- [ ] Verify with `npx eslint` and `npx tsc --noEmit`.

### Task 2: Batch 3B — Operations Submodules & Warehouse Routes
- [ ] Refactor `operations/lcl.routes.ts`, `warehouse.routes.ts`, `operations/demurrage.routes.ts`, `operations/warehouse-traffic.routes.ts`, and `operations/seed-data.ts`.
- [ ] Verify with `npx eslint` and `npx tsc --noEmit`.

### Task 3: Batch 3C — Financial & Integration Routes
- [ ] Refactor `edi.routes.ts`, `dcsa.routes.ts`, `documents.routes.ts`, `events.routes.ts`, `invoices.routes.ts`, `analytics.routes.ts`, and `settlements.routes.ts`.
- [ ] Verify with `npx eslint` and `npx tsc --noEmit`.

### Task 4: Batch 3D — Governance, AI & Admin Routes
- [ ] Refactor `external-governance.routes.ts`, `organization.routes.ts`, `ai.routes.ts`, `carbon.routes.ts`, `control-tower.routes.ts`, `auth.routes.ts`, `bpmn.routes.ts`, `telemetry.routes.ts`, `settings.routes.ts`, `admin-db.routes.ts`, and `admin-seed.routes.ts`.
- [ ] Verify with `npx eslint` and `npx tsc --noEmit`.

### Task 5: Final Elevation, Whole-Repo Verification & Push
- [ ] In `eslint.config.js`, elevate `src/routes/**/*.ts` (excluding tests) from `"warn"` to `"error"`.
- [ ] Run `pnpm run lint` (0 errors, 0 warnings).
- [ ] Run `pnpm run type-check` (0 errors).
- [ ] Run targeted Vitest test suites.
- [ ] Run guardrail checks (`check:file-sizes`, `audit:links`, `audit:leaks:staged`).
- [ ] Signed commit and push to `origin/main`.
- [ ] Update Issue #9 and Atlas Project #4.

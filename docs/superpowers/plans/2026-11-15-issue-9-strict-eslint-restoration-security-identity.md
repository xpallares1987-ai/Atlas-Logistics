# Issue #9 Phase 2: Strict TypeScript ESLint Restoration (Security & Identity Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This implementation plan delivers **Phase 2 of [Issue #9](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/9)**: systematically restoring strict TypeScript ESLint rules (`@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars`) across the Security & Identity Layer (`src/middleware/**`, `src/config/**`) without introducing regressions, breaking contracts, or blocking CI.

---

## 1. Context & Architectural Objectives

Following the completion of Phase 1 (SCM domain), Phase 2 targets the Security and Identity Layer of the backend API. Fastify request decorators (`request.user`, `request.stationContext`, `request.correlationId`), Lucia session objects, and Redis connection handlers previously contained wildcard `any` types that cascaded loose typing across downstream route handlers.

**Phase 2 Focus:**
- Target directories: `src/middleware/**` (4 files) and `src/config/**` (5 source files, 2 test files).
- Eliminate all 24 initial ESLint violations under strict rule configuration.
- Elevate `src/middleware/**/*.ts` and `src/config/**/*.ts` to `@typescript-eslint/no-explicit-any: "error"` and `@typescript-eslint/no-unused-vars: "error"`.
- Augment Fastify's native types (`FastifyJWT` and `FastifyRequest`) with a strongly typed `AuthUserContext`.
- Eliminate the long-standing type cast `(request.user as any)?.role` across middleware and route guards.
- Maintain 100% test pass rate across Vitest suites and 0 sensitive data leaks.

---

## 2. Target File Map

| Subsystem | Target Files | Responsibility |
| :--- | :--- | :--- |
| **Tooling** | `eslint.config.js` | Scoped ESLint rules enforcing strict typing on middleware and config |
| **Authentication & RBAC** | `src/middleware/auth.ts` | JWT verification, Lucia session validation, and `requireRole` guard |
| **Distributed Tracing** | `src/middleware/correlation-id.ts` | Fastify request correlation ID plugin and logging context injection |
| **Station Context** | `src/middleware/station-context.ts` | Global station context resolution and cross-station mutation authorization |
| **Schema Validation** | `src/middleware/validate.ts` | Generic Zod schema validation middleware |
| **Configuration** | `src/config/jwt.ts`<br>`src/config/logger.ts`<br>`src/config/redis.ts`<br>`src/config/secrets.ts`<br>`src/config/security-headers.ts` | Cryptographic JWT configuration, Pino logging, Redis connection lifecycle, secrets loader, and OWASP security headers |
| **Security Tests** | `src/config/__tests__/jwt.security.test.ts`<br>`src/config/__tests__/security-headers.test.ts` | Cryptographic entropy, fallback resistance, and header validation tests |

---

## 3. Tasks & Deliverables

### Task 1: Scoped ESLint Rule Configuration

- [x] **Step 1.1**: Add a scoped override block in `eslint.config.js` targeting `["src/middleware/**/*.ts", "src/config/**/*.ts"]` with `@typescript-eslint/no-explicit-any: "error"` and `@typescript-eslint/no-unused-vars: "error"`.
- [x] **Step 1.2**: Audit initial violations (24 problems across 8 files) and map remediation targets.

### Task 2: Authentication & Middleware Strict Typing (`src/middleware/**`)

- [x] **Step 2.1**: Define canonical `AuthUserContext` in `src/middleware/auth.ts` and augment `FastifyJWT` and `FastifyRequest`.
- [x] **Step 2.2**: Replace wildcard `session: any` with Lucia's native `Session | null`.
- [x] **Step 2.3**: Refactor `requireRole` to safely read `request.user?.role` without casting to `any`.
- [x] **Step 2.4**: Refactor `src/middleware/correlation-id.ts` to type `fastify: FastifyInstance` and assign directly to `request.id`.
- [x] **Step 2.5**: Clean `src/middleware/station-context.ts` removing unused `FastifyReply` and replacing `(request as any).user` with typed property access.
- [x] **Step 2.6**: Refactor `src/middleware/validate.ts` with type-safe schema shape discovery for Zod contracts.

### Task 3: Infrastructure & Configuration Hardening (`src/config/**`)

- [x] **Step 3.1**: Refactor `src/config/redis.ts` to strongly type Redis mock constructor and connection error handlers without `any`.
- [x] **Step 3.2**: Genericize `registerSecurityHeaders` and `enforceHTTPS` in `src/config/security-headers.ts` using native Fastify generic arguments (`RawServer`, `RawRequest`, `RawReply`, `Logger`, `TypeProvider`) to support Pino loggers seamlessly.
- [x] **Step 3.3**: Clean unused variables in `src/config/jwt.ts` and `src/config/__tests__/jwt.security.test.ts`.
- [x] **Step 3.4**: Translate legacy Spanish comments to technical English and add standardized JSDoc file headers across all touched config files.

### Task 4: Sequential Reference Hardening

- [x] **Step 4.1**: Refactor drayage order generation in `src/services/booking-lifecycle.service.ts` with candidate existence verification, eliminating database uniqueness collisions while strictly adhering to the 4-digit sequential reference contract (`^DRY-\d{6}-\d{4}$`).

### Task 5: Comprehensive Verification & Remote Synchronization

- [x] **Step 5.1**: Execute `pnpm run lint` and verify 0 errors and 0 warnings across the entire repository.
- [x] **Step 5.2**: Execute `pnpm run type-check` and verify 0 TypeScript compilation errors in backend and frontend.
- [x] **Step 5.3**: Run targeted test suites: `tests/observability-tracing.test.ts`, `src/config/__tests__/*`, `tests/station-context-middleware.test.ts`, `tests/scm-cockpit-station-scoping.test.ts`, `tests/organization-routes.test.ts`, and `tests/rate-comparer-drayage-booking.test.ts`.
- [x] **Step 5.4**: Run file size guardrail (`pnpm run check:file-sizes`), relative markdown link checker (`pnpm run audit:links`), and sensitive leak audit (`pnpm run audit:leaks:staged`).
- [x] **Step 5.5**: Commit signed changes (`git commit -S`) and push to `origin/main` (`d738a06`).
- [x] **Step 5.6**: Synchronize progress with GitHub Issue #9 and Atlas Project #4.

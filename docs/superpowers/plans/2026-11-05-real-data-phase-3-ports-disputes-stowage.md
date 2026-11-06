# Phase 3 Real Data Implementation Plan: Demurrage Disputes, DCSA Ocean Bookings & 3D Stowage Planner

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all remaining static presets (`DEMURRAGE_DISPUTE_PRESETS`, `OCEAN_BOOKING_PRESETS`, and `STOWAGE_DEMO_PRESETS`) in Demurrage Alerts, Booking Management, and 3D Container Planner by introducing formal Drizzle schemas, SQLite WAL migrations, a Phase 5 relational seed pipeline tied to `sh_demo_01`, reactive Fastify endpoints, and direct operational UI actions.

**Architecture:** Extend SQLite schema with typed Drizzle tables for Demurrage (`demurrage_invoices`, `demurrage_suspensions`, `demurrage_disputes`), DCSA Ocean Bookings (`ocean_booking_details`), and Stowage (`container_stowage_plans`). Implement a deterministic Phase 5 seed bound to canonical shipment `sh_demo_01`, container `cnt_msku_9284712`, and booking `bk_demo_01`. Refactor Fastify route controllers and React modules to query live SQLite data and trigger direct mutations with zero mock fallbacks.

**Tech Stack:** Fastify, TypeScript, Drizzle ORM, SQLite (`better-sqlite3` / `libsql`), React, `@tanstack/react-query`, Three.js (`@react-three/fiber`), Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-05-real-data-phase-3-design.md`](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/superpowers/specs/2026-11-05-real-data-phase-3-design.md)

## Global Constraints

- **Local Git Only**: All commits must be made strictly on local `main`. Never configure remote tracking or execute `git push`.
- **Sandbox Isolation**: Never create repositories or modify files in `C:\PowerShell` or its subdirectories.
- **Zero Sensitive Data Leaks**: Never introduce real customer identifiers or reserved keywords (`CANTUNIS`, `TLSA`, `BERRIO`, `Can Tunis`). Always run `pnpm run audit:leaks:staged` before every commit.
- **SQLite WAL & Foreign Keys**: SQLite operates with `PRAGMA foreign_keys = ON;`. All child entities must refer to existing parent rows.
- **Idempotent Seeds**: All inserts in `src/db/seeds/` must use `.onConflictDoNothing()` or `.onConflictDoUpdate()` with explicit conflict targets.
- **Zero Mocks**: UI components must fetch from Fastify endpoints backed by Drizzle and SQLite; no hardcoded preset arrays as runtime fallbacks.

## Review Focus

1. **Foreign key failure on re-seed**: If `seedPhase5()` runs before Phase 1 is in the database, missing `sh_demo_01` or `cnt_msku_9284712` will trigger an SQLite constraint crash. Pin defensive parent verification in `seedPhase5()`.
2. **Missing container items in 3D scene**: If a container has no placed cargo items in `cargo_items`, the 3D canvas must render an empty container mesh gracefully without crashing Three.js.
3. **Empty dispute array handling**: When displaying an invoice with zero suspensions or zero disputes, the demurrage tab must render clean empty states without reading undefined properties.
4. **FMC Part 541 statutory validation**: If a demurrage invoice lacks required carrier identification or availability timestamps, `fmcCompliant` must be false and highlighted as non-compliant.
5. **Axle overload detection**: When cargo placement exceeds front or rear legal axle limits (e.g. front > 12,000 kg or rear tridem > 24,000 kg), `isCompliant` must return false and display a warning banner.

---

### Task 1: Drizzle Schemas for Demurrage Disputes, Ocean Bookings, and 3D Stowage

**Files:**
- Create: `src/db/schema/demurrage_dispute.ts`
- Create: `src/db/schema/ocean_bookings.ts`
- Create: `src/db/schema/stowage_plans.ts`
- Modify: `src/db/schema/index.ts`
- Test: `src/db/schema/__tests__/phase5_schemas.test.ts`

**Interfaces:**
- Consumes: `shipments`, `shipmentContainers`, `bookings`, `documents` from `src/db/schema/operations.ts` and `src/db/schema/core.ts`
- Produces:
  - `demurrageInvoices`: `{ id, shipmentId, containerNumber, carrierScac, carrierName, billOfLading, pod, terminalName, vesselDischargeDate, gateInDate, gateOutDate, freeDaysGranted, dailyRateUsd, totalInvoicedUsd, status, fmcCompliant, ... }`
  - `demurrageSuspensions`: `{ id, invoiceId, startDate, endDate, daysSuspended, reason, justificationText, evidenceDocumentId, approved, ... }`
  - `demurrageDisputes`: `{ id, invoiceId, disputedAmountUsd, revisedPayableUsd, fmcRuleClause, status, formalLetterPayload, submittedAt, resolvedAt, ... }`
  - `oceanBookingDetails`: `{ id, bookingId, shipmentId, carrierScac, serviceContractNumber, cargoCutOff, vcsCutOff, docCutOff, siCutOff, siStatus, draftBlStatus, hazardousDeclaration, specialInstructions, ... }`
  - `containerStowagePlans`: `{ id, containerId, shipmentId, totalCargoWeightKg, maxPayloadKg, tareWeightKg, volumeUtilizationPercent, weightUtilizationPercent, centerOfGravityJson, axleLoadDistributionJson, stabilityCertified, certifiedBy, certifiedAt, stowageSequenceJson, ... }`

- [ ] **Step 1: Write failing test for Phase 5 schemas**

Create `src/db/schema/__tests__/phase5_schemas.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  demurrageInvoices,
  demurrageSuspensions,
  demurrageDisputes,
  oceanBookingDetails,
  containerStowagePlans,
} from "../index.js";

describe("Phase 5 Drizzle Schemas", () => {
  it("exports demurrage tables with required FMC columns", () => {
    expect(demurrageInvoices).toBeDefined();
    expect(demurrageInvoices.id).toBeDefined();
    expect(demurrageInvoices.fmcCompliant).toBeDefined();
    expect(demurrageInvoices.totalInvoicedUsd).toBeDefined();

    expect(demurrageSuspensions).toBeDefined();
    expect(demurrageSuspensions.invoiceId).toBeDefined();
    expect(demurrageSuspensions.reason).toBeDefined();

    expect(demurrageDisputes).toBeDefined();
    expect(demurrageDisputes.invoiceId).toBeDefined();
    expect(demurrageDisputes.fmcRuleClause).toBeDefined();
  });

  it("exports ocean_booking_details with DCSA cut-off and SI columns", () => {
    expect(oceanBookingDetails).toBeDefined();
    expect(oceanBookingDetails.bookingId).toBeDefined();
    expect(oceanBookingDetails.siStatus).toBeDefined();
    expect(oceanBookingDetails.draftBlStatus).toBeDefined();
  });

  it("exports container_stowage_plans with CoG and stability certification columns", () => {
    expect(containerStowagePlans).toBeDefined();
    expect(containerStowagePlans.containerId).toBeDefined();
    expect(containerStowagePlans.centerOfGravityJson).toBeDefined();
    expect(containerStowagePlans.axleLoadDistributionJson).toBeDefined();
    expect(containerStowagePlans.stabilityCertified).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/db/schema/__tests__/phase5_schemas.test.ts`
Expected: FAIL ("Cannot find module '../demurrage_dispute.js'" or similar)

- [ ] **Step 3: Implement schemas and export in `index.ts`**

1. Create `src/db/schema/demurrage_dispute.ts` with `demurrageInvoices`, `demurrageSuspensions`, `demurrageDisputes`.
2. Create `src/db/schema/ocean_bookings.ts` with `oceanBookingDetails`.
3. Create `src/db/schema/stowage_plans.ts` with `containerStowagePlans`.
4. Export all new tables in `src/db/schema/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/db/schema/__tests__/phase5_schemas.test.ts`
Expected: PASS (all 3 tests pass)

- [ ] **Step 5: Run leak audit and commit**

```bash
pnpm run audit:leaks:staged
git add src/db/schema/
git commit -m "feat(schema): add Drizzle tables for demurrage disputes, ocean bookings, and 3D stowage"
```

---

### Task 2: Database Migration & SQLite DDL Application

**Files:**
- Create/Apply: Migration script or DDL execution in `src/db/index.ts` / SQLite `dev.db`
- Test: `src/db/__tests__/phase5_migration.test.ts`

**Interfaces:**
- Consumes: Drizzle database instance `db` from `src/db/index.ts`
- Produces: Physical tables `demurrage_invoices`, `demurrage_suspensions`, `demurrage_disputes`, `ocean_booking_details`, `container_stowage_plans` created in SQLite `dev.db`.

- [ ] **Step 1: Write failing test verifying physical tables in SQLite**

Create `src/db/__tests__/phase5_migration.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { db } from "../index.js";
import { sql } from "drizzle-orm";

describe("Phase 5 Database Tables in SQLite", () => {
  it("verifies all Phase 5 tables exist in sqlite_master", async () => {
    const tables = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name IN (
        'demurrage_invoices',
        'demurrage_suspensions',
        'demurrage_disputes',
        'ocean_booking_details',
        'container_stowage_plans'
      )`
    );
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("demurrage_invoices");
    expect(tableNames).toContain("demurrage_suspensions");
    expect(tableNames).toContain("demurrage_disputes");
    expect(tableNames).toContain("ocean_booking_details");
    expect(tableNames).toContain("container_stowage_plans");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/db/__tests__/phase5_migration.test.ts`
Expected: FAIL (tables missing in `sqlite_master`)

- [ ] **Step 3: Execute migration / DDL script to create tables in SQLite**

Run migration or execute DDL queries using Drizzle `sql` helper on `dev.db` to create the 5 tables with proper foreign keys and indices.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/db/__tests__/phase5_migration.test.ts`
Expected: PASS (all 5 tables found)

- [ ] **Step 5: Run leak audit and commit**

```bash
pnpm run audit:leaks:staged
git add src/db/
git commit -m "feat(db): apply DDL migration for Phase 5 tables in SQLite"
```

---

### Task 3: Phase 5 Deterministic Seeders & Admin Seed Pipeline

**Files:**
- Create: `src/db/seeds/demurrage-dispute.seed.ts`
- Create: `src/db/seeds/ocean-booking.seed.ts`
- Create: `src/db/seeds/stowage.seed.ts`
- Modify: `src/db/seeds/index.ts`
- Modify: `src/routes/admin-seed.routes.ts`
- Test: `src/routes/__tests__/admin-seed-phase5.routes.test.ts`

**Interfaces:**
- Consumes: `sh_demo_01`, `cnt_msku_9284712`, `bk_demo_01` from Phase 1
- Produces:
  - `seedPhase5()`: Injects `dinv_sh_demo_01`, `dsusp_01`, `ddisp_01`, `bkg_sh_demo_01`, `stow_cnt_msku_9284712`.
  - `GET /api/admin/seed/status`: returns `stats.phase5: { demurrageInvoices, demurrageDisputes, oceanBookings, stowagePlans }`.
  - `POST /api/admin/seed/5`: triggers `seedPhase5()`.
  - `POST /api/admin/seed/all`: executes Fases 1, 2, 3, 4 y 5.

- [ ] **Step 1: Write failing test for Admin Seed Phase 5 API**

Create `src/routes/__tests__/admin-seed-phase5.routes.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../../app.js";

describe("Admin Seed Phase 5 API", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/admin/seed/5 should seed phase 5 records linked to sh_demo_01", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/seed/5",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.phase).toBe("5");
  });

  it("GET /api/admin/seed/status should include phase 5 telemetry", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/seed/status",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.stats.phase5).toBeDefined();
    expect(body.stats.phase5.demurrageInvoices).toBeGreaterThan(0);
    expect(body.stats.phase5.oceanBookings).toBeGreaterThan(0);
    expect(body.stats.phase5.stowagePlans).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/routes/__tests__/admin-seed-phase5.routes.test.ts`
Expected: FAIL (400 Unknown phase: '5')

- [ ] **Step 3: Implement seeders and integrate into `admin-seed.routes.ts`**

1. Create `src/db/seeds/demurrage-dispute.seed.ts` seeding `dinv_sh_demo_01`, `dsusp_01`, `ddisp_01` (with `.onConflictDoNothing()`).
2. Create `src/db/seeds/ocean-booking.seed.ts` seeding `bkg_sh_demo_01` (with `.onConflictDoNothing()`).
3. Create `src/db/seeds/stowage.seed.ts` seeding `stow_cnt_msku_9284712` (with `.onConflictDoNothing()`).
4. Implement `seedPhase5()` in `src/db/seeds/index.ts` with defensive checks for Phase 1 canonical IDs.
5. In `src/routes/admin-seed.routes.ts`:
   - Add counts for Phase 5 in `GET /status`.
   - Add `case "5": await seedPhase5();` in `POST /:phase`.
   - Call `await seedPhase5(p1);` in `runAllSeeds()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/routes/__tests__/admin-seed-phase5.routes.test.ts`
Expected: PASS

- [ ] **Step 5: Run leak audit and commit**

```bash
pnpm run audit:leaks:staged
git add src/db/seeds/ src/routes/admin-seed.routes.ts
git commit -m "feat(seed): add Phase 5 seeders for demurrage, ocean bookings, and stowage"
```

---

### Task 4: Fastify Backend Controllers & Relational Endpoints

**Files:**
- Create/Modify: `src/modules/demurrage-dispute/demurrage-dispute.routes.ts`
- Create/Modify: `src/modules/ocean-booking/ocean-booking.routes.ts`
- Create/Modify: `src/modules/stowage/stowage.routes.ts`
- Test: `src/modules/demurrage-dispute/demurrage-dispute.test.ts`
- Test: `src/modules/ocean-booking/ocean-booking.test.ts`
- Test: `src/modules/stowage/stowage.routes.test.ts`

**Interfaces:**
- Demurrage Routes:
  - `GET /api/demurrage-dispute/invoices?shipmentId=sh_demo_01` -> returns list of invoices with nested suspensions and disputes.
  - `POST /api/demurrage-dispute/suspension` -> inserts/updates `demurrage_suspensions` row and recalculates audit.
  - `POST /api/demurrage-dispute/dispute` -> inserts/updates `demurrage_disputes` row with FMC statutory citation.
- Ocean Booking Routes:
  - `GET /api/ocean-booking/details?shipmentId=sh_demo_01` (or `bookingId=bk_demo_01`) -> returns DCSA booking record.
  - `POST /api/ocean-booking/:id/shipping-instructions` -> transitions `siStatus` to `CONFIRMED` and stores verified gross mass (VGM).
  - `POST /api/ocean-booking/:id/generate-draft-bl` -> generates draft bill of lading and updates `draftBlStatus` to `ISSUED`.
- Stowage Routes:
  - `GET /api/stowage/plan?containerId=cnt_msku_9284712` -> returns stowage plan with cargo items, CoG, and axle weights.
  - `POST /api/stowage/calculate-stability` -> runs physical balance algorithm, updates `container_stowage_plans`, and marks `stabilityCertified = true`.

- [ ] **Step 1: Write failing tests for Fastify relational endpoints**

Update tests in `src/modules/demurrage-dispute/demurrage-dispute.test.ts`, `src/modules/ocean-booking/ocean-booking.test.ts`, and `src/modules/stowage/stowage.routes.test.ts` asserting queries and mutations on SQLite tables.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/modules/demurrage-dispute/ src/modules/ocean-booking/ src/modules/stowage/`
Expected: FAIL on new relational endpoints.

- [ ] **Step 3: Implement database-backed controller handlers**

In `demurrage-dispute.routes.ts`, `ocean-booking.routes.ts`, and `stowage.routes.ts`, wire Drizzle queries selecting from and inserting into the SQLite tables created in Task 1.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/modules/demurrage-dispute/ src/modules/ocean-booking/ src/modules/stowage/`
Expected: PASS

- [ ] **Step 5: Run leak audit and commit**

```bash
pnpm run audit:leaks:staged
git add src/modules/
git commit -m "feat(api): connect demurrage, ocean bookings, and stowage controllers to SQLite"
```

---

### Task 5: Frontend Refactoring - Demurrage & Detention Module (`DemurrageAlertsModule.tsx`)

**Files:**
- Modify: `packages/frontend/src/pages/DemurrageAlertsModule.tsx`

**Interfaces:**
- Consumes: `GET /api/demurrage-dispute/invoices?shipmentId=...`, `POST /api/demurrage-dispute/suspension`, `POST /api/demurrage-dispute/dispute`, `GET /api/shipments`
- Produces: Zero-mock Demurrage screen with live shipment selector (defaults to `sh_demo_01`), FMC 46 CFR Part 541 audit badges, live Clock Stop registration, and FMC Dispute generation.

- [x] **Step 1: Replace `DEMURRAGE_DISPUTE_PRESETS` with live React Query / API calls**

1. Add shipment dropdown selector querying `GET /api/shipments` (default: `sh_demo_01`).
2. Fetch invoices for active shipment via `GET /api/demurrage-dispute/invoices`.
3. Connect "Aplicar Suspensión de Reloj (Clock Stop)" modal to `POST /api/demurrage-dispute/suspension`.
4. Connect "Presentar Disputa Legal FMC" button to `POST /api/demurrage-dispute/dispute`.
5. Remove static preset state and hardcoded sample arrays.

- [x] **Step 2: Verify TypeScript compilation & frontend build**

Run: `pnpm --filter @atlas/frontend build`
Expected: Build succeeds with code 0.

- [x] **Step 3: Run leak audit and commit**

```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/DemurrageAlertsModule.tsx
git commit -m "feat(frontend): refactor DemurrageAlertsModule to live SQLite queries and FMC actions"
```

---

### Task 6: Frontend Refactoring - Ocean Booking Module (`BookingManagementModule.tsx`)

**Files:**
- Modify: `packages/frontend/src/pages/BookingManagementModule.tsx`

**Interfaces:**
- Consumes: `GET /api/ocean-booking/details`, `POST /api/ocean-booking/:id/shipping-instructions`, `POST /api/ocean-booking/:id/generate-draft-bl`, `GET /api/bookings`
- Produces: Zero-mock Ocean Booking screen with live booking selector (defaults to `bk_demo_01` / `BK-2026-67116`), real DCSA cut-off radar, operational DCSA Shipping Instruction submission, and Official Draft B/L issuance.

- [x] **Step 1: Replace `OCEAN_BOOKING_PRESETS` with live DB Bookings**

1. Add booking selector populated by `GET /api/bookings` (defaulting to `bk_demo_01`).
2. Query live booking details from `GET /api/ocean-booking/details`.
3. Wire "Emitir Instrucciones de Embarque (DCSA SI)" button to `POST /api/ocean-booking/:id/shipping-instructions`.
4. Wire "Generar Borrador B/L Oficial" button to `POST /api/ocean-booking/:id/generate-draft-bl`.
5. Render dynamic cut-offs countdown based on database timestamps (`cargoCutOff`, `docCutOff`, `vcsCutOff`).

- [x] **Step 2: Verify TypeScript compilation & frontend build**

Run: `pnpm --filter @atlas/frontend build`
Expected: Build succeeds with code 0.

- [x] **Step 3: Run leak audit and commit**

```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/BookingManagementModule.tsx
git commit -m "feat(frontend): refactor BookingManagementModule to live DCSA database state"
```

---

### Task 7: Frontend Refactoring - Container 3D Stowage Planner (`ContainerPlannerModule.tsx`)

**Files:**
- Modify: `packages/frontend/src/pages/ContainerPlannerModule.tsx`

**Interfaces:**
- Consumes: `GET /api/stowage/plan?containerId=...`, `POST /api/stowage/calculate-stability`, `GET /api/shipments`
- Produces: Zero-mock 3D container visualization loading real `cargo_items` from SQLite (`cnt_msku_9284712`), dynamic Center of Gravity rendering, axle weight distribution gauges, and "Calcular CoG y Certificar Plan de Carga 3D" operational button.

- [x] **Step 1: Replace `STOWAGE_DEMO_PRESETS` with live container data**

1. Add container selector querying containers for the selected shipment (defaulting to `cnt_msku_9284712`).
2. Fetch stowage plan and items via `GET /api/stowage/plan`.
3. Bind 3D mesh rendering (`CargoBox3D`) to coordinates and dimensions returned from database.
4. Wire "Calcular CoG y Certificar Plan de Carga 3D" action button to `POST /api/stowage/calculate-stability`.
5. Render stability certification badge with timestamp and certifier once certified.

- [x] **Step 2: Verify TypeScript compilation & frontend build**

Run: `pnpm --filter @atlas/frontend build`
Expected: Build succeeds with code 0.

- [x] **Step 3: Run leak audit and commit**

```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/ContainerPlannerModule.tsx
git commit -m "feat(frontend): refactor ContainerPlannerModule to live cargo_items and stability certification"
```

---

### Task 8: System Panel Module Integration & Seed Telemetry (`SystemPanelModule.tsx`)

**Files:**
- Modify: `packages/frontend/src/pages/SystemPanelModule.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/seed/status`, `POST /api/admin/seed/5`
- Produces: Updated System Panel displaying Phase 5 card with live telemetry (`demurrageInvoices`, `demurrageDisputes`, `oceanBookings`, `stowagePlans`), `Inject Phase 5` trigger button, and `5 Phases` tab badge.

- [x] **Step 1: Update `SystemPanelModule.tsx`**

1. Update `seedStatus` typing to include `phase5: { demurrageInvoices, demurrageDisputes, oceanBookings, stowagePlans }`.
2. Update `triggerSeed` type signature to `"1" | "2" | "3" | "4" | "5" | "all"`.
3. Update tab badge to `5 Phases` and grid layout.
4. Add Phase 5 card ("Phase 5: FMC Demurrage, DCSA Bookings & 3D Stowage") with live count badges and `Inject Phase 5` button.

- [x] **Step 2: Verify TypeScript compilation & frontend build**

Run: `pnpm --filter @atlas/frontend build`
Expected: Build succeeds with code 0.

- [x] **Step 3: Run leak audit and commit**

```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/SystemPanelModule.tsx
git commit -m "feat(system-panel): integrate Phase 5 seed telemetry and execution button"
```

---

### Task 9: End-to-End Verification, Zero-Leak Audit & Clean Execution

**Files:**
- All touched files

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Run frontend production build**

Run: `pnpm --filter @atlas/frontend build`
Expected: Vite build succeeds with code 0.

- [ ] **Step 3: Run full Vitest test suite**

Run: `pnpm vitest run src/db/schema/__tests__/phase5_schemas.test.ts src/db/__tests__/phase5_migration.test.ts src/routes/__tests__/admin-seed-phase5.routes.test.ts src/modules/demurrage-dispute/ src/modules/ocean-booking/ src/modules/stowage/`
Expected: All tests pass.

- [ ] **Step 4: Live interactive verification via Chrome DevTools MCP**

1. Navigate to `http://localhost:3100/system-panel`, click `Inject Phase 5`, verify live counts increment.
2. Navigate to `http://localhost:3100/demurrage`, check `sh_demo_01` and `MSKU9284712`, click "Presentar Disputa Legal FMC".
3. Navigate to `http://localhost:3100/bookings`, check `BK-2026-67116`, click "Emitir Instrucciones de Embarque (DCSA SI)".
4. Navigate to `http://localhost:3100/planner`, check `cnt_msku_9284712`, verify 3D boxes render, click "Calcular CoG y Certificar Plan de Carga 3D".
5. Confirm 0 console errors in DevTools.

- [ ] **Step 5: Execute security leak audit**

Run: `pnpm run audit:leaks:staged`
Expected: Exit code 0, 0 leaks detected.

- [ ] **Step 6: Final Git status check**

```bash
git status
```
Confirm clean working tree.

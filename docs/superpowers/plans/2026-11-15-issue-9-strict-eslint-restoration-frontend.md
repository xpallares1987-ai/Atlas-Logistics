# Issue #9 Phase 4: Strict TypeScript ESLint Restoration (Frontend Component Boundaries) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systematically eliminate all `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `no-console`, and `@typescript-eslint/ban-ts-comment` violations across `packages/frontend/src/**/*.{ts,tsx}` and elevate the frontend quadrant in `eslint.config.js` to blocking error level (`error`), completing the 4-phase roadmap of Issue #9 with zero warnings and zero errors monorepo-wide.

**Architecture:** Refactor types from the ground up: first clean foundation domain types (`types/**`), then strongly type custom API hooks (`components/*/hooks/**`), followed by decomposed UI presentation components and tabs (`components/**/Tab/**`, `Modal/**`), and finally top-level pages (`pages/**`), utilities (`utils/**`), and root app boundaries (`App.tsx`, `federation/**`).

**Tech Stack:** React 19, TypeScript 5.8, ESLint 9 (Flat Config), `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, Vite 6, Tailwind CSS 3, Vitest.

**Spec:** [GitHub Issue #9: quality(tooling): progressive restoration of strict eslint rules and quadrant type safety](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/9)

---

## Global Constraints

- **Strict TypeScript Standard**: Zero explicit `any` (`@typescript-eslint/no-explicit-any: "error"`). Use discriminated unions, branded types, `unknown` with type guards, or domain interfaces.
- **Unused Variables Standard**: Zero unhandled unused variables (`@typescript-eslint/no-unused-vars: ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }]`).
- **No Console Standard**: Only `console.warn`, `console.error`, and `console.info` are permitted (`no-console: ["error", { allow: ["warn", "error", "info"] }]`).
- **TS Directive Standard**: Ban `@ts-ignore` in favor of `@ts-expect-error` with descriptive comment justification (`@typescript-eslint/ban-ts-comment`).
- **Zero innerHTML / Direct DOM Injection**: Programmatic DOM construction via React JSX or `document.createElement()` with `textContent` (AGENTS.md rule 4).
- **Strict English Technical Standard**: 100% standard technical English for all code, comments, JSDoc headers, and git messages (AGENTS.md rule 6).
- **Modular File Size Guardrail**: Pages in `packages/frontend/src/pages/*.tsx` must remain strictly under 1,000 lines (target < 700 lines) enforced by `node scripts/check-file-sizes.mjs` (AGENTS.md rule 7).
- **Monorepo Link & Secret Integrity**: All markdown relative links must be valid (`pnpm run audit:links`) and 0 sensitive data leaks (`pnpm run audit:leaks:staged`).

---

## Review Focus

1. **API Response Hydration**: Backend Fastify endpoints return typed JSON payloads. Where generic fetchers previously returned `any`, typed interfaces must represent optional/nullable database fields defensively without causing undefined property access.
2. **React Event & Callback Signatures**: Input events, change handlers, and modal callbacks must use standard `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent`, or explicit parameter types instead of `(e: any) => void`.
3. **Table Column & Cell Renderers**: Data tables and summary matrices rendering dynamic values must use typed row objects instead of `(item: any, idx: any)`.
4. **Third-Party / MFE Integration Boundaries**: Micro-frontend loaders (`SafeRemoteLoader.tsx`, `remoteImports.ts`) and PDF utilities (`booking-pdf.utils.ts`) must use typed records (`Record<string, unknown>`) and proper type guards rather than casting to `any`.
5. **Component Export & JSDoc Headers**: Refactored files must preserve standard file utility headers (`@file`, `@description`, `@module`) and canonical named exports.

---

## Task Decomposition

### Task 1: Batch 4A — Shared & Domain Types (`packages/frontend/src/types/**`, `globals.d.ts`)

**Files:**
- Modify: `packages/frontend/src/types/carbon-emissions.types.ts` (15 warnings)
- Modify: `packages/frontend/src/types/iot-control-tower.types.ts` (12 warnings)
- Modify: `packages/frontend/src/types/fueleu.types.ts` (10 warnings)
- Modify: `packages/frontend/src/types/edi-integration.types.ts` (6 warnings)
- Modify: `packages/frontend/src/types/document-vault.types.ts` (5 warnings)
- Modify: `packages/frontend/src/types/booking-management.types.ts` (4 warnings)
- Modify: `packages/frontend/src/types/bpmn-js.d.ts` (4 warnings)
- Modify: `packages/frontend/src/types/cockpit.types.ts` (3 warnings)
- Modify: `packages/frontend/src/types/smart-contracts.types.ts` (3 warnings)
- Modify: `packages/frontend/src/types/control-tower.types.ts` (2 warnings)
- Modify: `packages/frontend/src/types/rail-freight.types.ts` (1 warning)
- Modify: `packages/frontend/src/types/security-risk.types.ts` (1 warning)
- Modify: `packages/frontend/src/globals.d.ts` (3 warnings)

**Interfaces:**
- Consumes: `@atlas/shared` canonical schemas and Drizzle entity types where applicable.
- Produces: Concrete TypeScript interfaces for emission journeys, IoT telemetry events, FuelEU pooling records, EDI envelope/segments, and booking lifecycle state.

- [ ] **Step 1: Audit and replace all explicit `any` in `types/**` and `globals.d.ts`**
  - Replace `rawPayload: any` with `rawPayload: Record<string, unknown> | null`.
  - Replace `metadata?: any` with `metadata?: Record<string, unknown>`.
  - Replace `callback: (data: any) => void` with typed payloads or generic `<T = unknown>`.
  - Fix window augmentation in `globals.d.ts` with strongly-typed properties.
- [ ] **Step 2: Run verification**
  Run: `npx eslint packages/frontend/src/types/ packages/frontend/src/globals.d.ts`
  Expected: 0 warnings, 0 errors.
- [ ] **Step 3: Run TypeScript compiler check on types**
  Run: `npx tsc --project packages/frontend/tsconfig.json --noEmit`
  Expected: Clean compilation or only downstream consumer notices.

---

### Task 2: Batch 4B — Custom Domain Data Hooks (`packages/frontend/src/components/*/hooks/**`)

**Files:**
- Modify: `packages/frontend/src/components/CarbonEmissions/hooks/useCarbonEmissions.ts` (20 warnings)
- Modify: `packages/frontend/src/components/bookings/hooks/useBookingManagement.ts` (13 warnings)
- Modify: `packages/frontend/src/components/bookings/hooks/bookingHelpers.ts` (4 warnings)
- Modify: `packages/frontend/src/components/FuelEu/hooks/useFuelEuMaritime.ts` (11 warnings)
- Modify: `packages/frontend/src/components/IoTControlTower/hooks/useIoTControlTower.ts` (10 warnings, 1 unused-var)
- Modify: `packages/frontend/src/components/RailFreight/hooks/useRailFreight.ts` (9 warnings)
- Modify: `packages/frontend/src/components/AeoSecurity/hooks/useAeoSecurity.ts` (8 warnings)
- Modify: `packages/frontend/src/components/EFirmaHub/hooks/useEFirmaHub.ts` (7 warnings)
- Modify: `packages/frontend/src/components/Demurrage/hooks/useDemurrageManager.ts` (6 warnings)
- Modify: `packages/frontend/src/components/Demurrage/hooks/demurrageHelpers.ts` (3 warnings)
- Modify: `packages/frontend/src/components/Demurrage/hooks/demurragePdfExporter.ts` (2 warnings)
- Modify: `packages/frontend/src/components/SmartContracts/hooks/useSmartContracts.ts` (6 warnings)
- Modify: `packages/frontend/src/components/ContainerPlanner/hooks/useContainerPlanner.ts` (5 warnings)
- Modify: `packages/frontend/src/components/OmnichannelNotifications/hooks/useOmnichannelNotifications.ts` (5 warnings)
- Modify: `packages/frontend/src/components/CrossBorder/hooks/useCrossBorder.ts` (4 warnings)
- Modify: `packages/frontend/src/components/CarbonInsetting/hooks/useCarbonInsetting.ts` (4 warnings)
- Modify: `packages/frontend/src/components/IataOneRecord/hooks/useIataOneRecord.ts` (4 warnings)
- Modify: `packages/frontend/src/components/IncotermsContracts/hooks/useIncotermsContracts.ts` (4 warnings)
- Modify: `packages/frontend/src/components/SecurityRisk/hooks/useSecurityRisk.ts` (3 warnings)
- Modify: `packages/frontend/src/components/Settings/hooks/useDatabaseManager.ts` (3 warnings)
- Modify: `packages/frontend/src/components/Settings/hooks/useSecuritySettings.ts` (3 warnings)
- Modify: `packages/frontend/src/components/AirCargo/hooks/useAirCargo.ts` (2 warnings)
- Modify: `packages/frontend/src/components/PortCongestion/hooks/usePortCongestion.ts` (1 warning)
- Modify: `packages/frontend/src/components/SystemPanel/hooks/useDatabaseSeed.ts` (1 warning)
- Modify: `packages/frontend/src/components/SystemPanel/hooks/useGeminiGateway.ts` (1 warning)

**Interfaces:**
- Consumes: Strongly-typed contracts from Task 1 (`packages/frontend/src/types/**`).
- Produces: Type-safe hook returns `{ data: T[], loading: boolean, error: string | null, mutate: () => Promise<void> }`.

- [ ] **Step 1: Refactor all custom hooks to eliminate `any` and unhandled error vars**
  - Type all `fetch` / `api` query responses using domain interfaces.
  - In catch blocks, use `catch (err)` with `err instanceof Error ? err.message : String(err)` instead of `catch (e: any)`.
  - Prefix unused error catches with `_err` or `_e`.
- [ ] **Step 2: Run verification**
  Run: `npx eslint "packages/frontend/src/components/**/hooks/**/*.{ts,tsx}"`
  Expected: 0 warnings, 0 errors.
- [ ] **Step 3: Run existing unit tests for hooks**
  Run: `pnpm vitest run packages/frontend/src/components/`
  Expected: All hook test suites pass.

---

### Task 3: Batch 4C — Decomposed UI Components, Tabs & Modals (`packages/frontend/src/components/**`)

**Files:**
- Modify: `packages/frontend/src/components/edi/Tab/Outbound.tsx` (24 warnings)
- Modify: `packages/frontend/src/components/edi/Tab/Dcsa.tsx` (10 warnings)
- Modify: `packages/frontend/src/components/edi/Tab/Studio.tsx` (6 warnings)
- Modify: `packages/frontend/src/components/edi/Modal/DcsaSubscription.tsx` (3 warnings)
- Modify: `packages/frontend/src/components/edi/Tab/Audit.tsx` (1 warning)
- Modify: `packages/frontend/src/components/drayage/ShipmentDrayageDrawer.tsx` (7 warnings)
- Modify: `packages/frontend/src/components/mfe/SafeRemoteLoader.tsx` (7 warnings)
- Modify: `packages/frontend/src/components/RailFreight/Tab/Consignments.tsx` (6 warnings)
- Modify: `packages/frontend/src/components/AeoSecurity/Tab/SevenPointSeals.tsx` (5 warnings)
- Modify: `packages/frontend/src/components/AeoSecurity/Tab/CaeAudits.tsx` (4 warnings)
- Modify: `packages/frontend/src/components/AeoSecurity/Tab/PartnersRisk.tsx` (3 warnings)
- Modify: `packages/frontend/src/components/EFirmaHub/Banner/RelationalDocumentSelector.tsx` (5 warnings)
- Modify: `packages/frontend/src/components/EFirmaHub/Tab/PublicVerifier.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/ContainerPlanner/Banner/EntitySelector.tsx` (4 warnings)
- Modify: `packages/frontend/src/components/ContainerPlanner/Tab/Manifest.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/bookings/Panel/BookingInbox.tsx` (3 warnings)
- Modify: `packages/frontend/src/components/bookings/Banner/RelationalContext.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/bookings/Banner/KanbanSummary.tsx` (1 warning)
- Modify: `packages/frontend/src/components/Demurrage/Banner/ShipmentContext.tsx` (3 warnings)
- Modify: `packages/frontend/src/components/Demurrage/Tab/Radar.tsx` (3 warnings)
- Modify: `packages/frontend/src/components/Demurrage/Navigation.tsx` (1 warning)
- Modify: `packages/frontend/src/components/Demurrage/Tab/Audit.tsx` (1 warning)
- Modify: `packages/frontend/src/components/Demurrage/Tab/Dossier.tsx` (1 warning)
- Modify: `packages/frontend/src/components/CrossBorder/Banner/ShipmentSelector.tsx` (3 warnings)
- Modify: `packages/frontend/src/components/CrossBorder/Tab/CustomsMl.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/CrossBorder/Tab/UsmcaImmex.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/ControlTower/Tab/Spot.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/ControlTower/Modal/ResolveIncident.tsx` (1 warning)
- Modify: `packages/frontend/src/components/CarbonEmissions/Modal/OffsetPurchase.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/CarbonEmissions/Tab/Journeys.tsx` (1 warning)
- Modify: `packages/frontend/src/components/AirCargo/Modal/Simulator.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/IncotermsContracts/Modal/Simulator.tsx` (3 warnings)
- Modify: `packages/frontend/src/components/Cockpit/Panel/Action.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/CustomsClearance/types/index.ts` (2 warnings)
- Modify: `packages/frontend/src/components/PortCongestion/Tab/DdSuspension.tsx` (1 warning)
- Modify: `packages/frontend/src/components/SmartContracts/Modal/EndorseTitle.tsx` (1 warning)
- Modify: `packages/frontend/src/components/SystemPanel/Header.tsx` (1 warning)
- Modify: `packages/frontend/src/components/SystemPanel/Modal/NewNote.tsx` (1 warning)
- Modify: `packages/frontend/src/components/documents/Modal/Viewer.tsx` (1 warning)
- Modify: `packages/frontend/src/components/documents/Tab/Studio.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/documents/Tab/OcrStudio.tsx` (1 warning)
- Modify: `packages/frontend/src/components/documents/Tab/Vault.tsx` (1 warning)
- Modify: `packages/frontend/src/components/documents/Tab/Verify.tsx` (1 warning)
- Modify: `packages/frontend/src/components/external-governance/Modal/CreateEntityLink.tsx` (1 warning)
- Modify: `packages/frontend/src/components/external-governance/Modal/IngestRecord.tsx` (1 warning)
- Modify: `packages/frontend/src/components/external-governance/Modal/UpsertUnlocode.tsx` (1 warning)
- Modify: `packages/frontend/src/components/external-governance/Tab/RawRecordsLedger.tsx` (1 warning)
- Modify: `packages/frontend/src/components/Settings/Tab/Company.tsx` (1 warning)
- Modify: `packages/frontend/src/components/Settings/Tab/Database.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/Settings/Tab/Profile.tsx` (1 warning)
- Modify: `packages/frontend/src/components/Settings/Tab/Resolutions.tsx` (1 warning)
- Modify: `packages/frontend/src/components/Shipment/Tab/Overview.tsx` (1 warning)
- Modify: `packages/frontend/src/components/ActiveShipments.tsx` (3 warnings)
- Modify: `packages/frontend/src/components/AiQuotaStatusBadge.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/CreateInvoiceModal.tsx` (1 warning)
- Modify: `packages/frontend/src/components/ScheduleBookingModal.tsx` (1 warning)
- Modify: `packages/frontend/src/components/SettlementDetailsDrawer.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/layout/TopNavbar.tsx` (2 warnings)
- Modify: `packages/frontend/src/components/layout/AppRoutes.tsx` (1 error: `@ts-ignore` -> `@ts-expect-error`)

**Interfaces:**
- Consumes: Clean types from Task 1 and typed hooks from Task 2.
- Produces: Strictly-typed React component props, event handlers, and render methods.

- [ ] **Step 1: Refactor all presentation components, tabs, modals, and drawers**
  - Strongly type table rows, form event callbacks, and modal handlers.
  - In `AppRoutes.tsx:63`, replace `@ts-ignore` with `@ts-expect-error` and descriptive justification.
- [ ] **Step 2: Run verification**
  Run: `npx eslint "packages/frontend/src/components/**/*.{ts,tsx}"`
  Expected: 0 warnings, 0 errors.

---

### Task 4: Batch 4D — Module Pages, Utilities, Federation & Root App

**Files:**
- Modify: `packages/frontend/src/pages/DocumentVaultModule.tsx` (15 warnings)
- Modify: `packages/frontend/src/pages/EdiIntegrationModule.tsx` (12 warnings)
- Modify: `packages/frontend/src/pages/ErpIntegrationsModule.tsx` (12 warnings)
- Modify: `packages/frontend/src/pages/TreasurySettlementsModule.tsx` (12 warnings)
- Modify: `packages/frontend/src/pages/ControlTowerModule.tsx` (8 warnings)
- Modify: `packages/frontend/src/pages/DrayageHaulageModule.tsx` (6 warnings)
- Modify: `packages/frontend/src/pages/AddressesHubModule.tsx` (5 warnings)
- Modify: `packages/frontend/src/pages/BookingManagementModule.tsx` (5 warnings)
- Modify: `packages/frontend/src/pages/CustomerPortalModule.tsx` (5 warnings)
- Modify: `packages/frontend/src/pages/InvoicingModule.tsx` (5 warnings, 1 unused-var `err`)
- Modify: `packages/frontend/src/pages/RoadFreightModule.tsx` (5 warnings)
- Modify: `packages/frontend/src/pages/WarehouseOpsModule.tsx` (5 warnings)
- Modify: `packages/frontend/src/pages/OperationsCockpitModule.tsx` (4 warnings)
- Modify: `packages/frontend/src/pages/CargoClaimsModule.tsx` (3 warnings)
- Modify: `packages/frontend/src/pages/PublicTracking.tsx` (3 warnings)
- Modify: `packages/frontend/src/pages/ShipmentWorkspace360Module.tsx` (3 warnings)
- Modify: `packages/frontend/src/pages/WorkflowManagerModule.tsx` (3 warnings)
- Modify: `packages/frontend/src/pages/DashboardModule.tsx` (2 warnings)
- Modify: `packages/frontend/src/pages/CargoInsuranceModule.tsx` (1 warning)
- Modify: `packages/frontend/src/pages/CharteringLaytimeModule.tsx` (1 warning)
- Modify: `packages/frontend/src/pages/DangerousGoodsModule.tsx` (1 warning)
- Modify: `packages/frontend/src/pages/DemurrageAlertsModule.tsx` (1 warning)
- Modify: `packages/frontend/src/pages/GeneralAverageModule.tsx` (1 warning)
- Modify: `packages/frontend/src/pages/GlobeTrackerModule.tsx` (1 warning, 1 error: `@ts-ignore` -> `@ts-expect-error`)
- Modify: `packages/frontend/src/pages/Login.tsx` (1 warning)
- Modify: `packages/frontend/src/pages/SystemPanelModule.tsx` (1 warning)
- Modify: `packages/frontend/src/pages/WikiHubModule.tsx` (1 warning)
- Modify: `packages/frontend/src/utils/booking-pdf.utils.ts` (5 warnings)
- Modify: `packages/frontend/src/hooks/useExternalGovernance.ts` (4 warnings)
- Modify: `packages/frontend/src/features/portal/DocumentUpload.tsx` (2 warnings)
- Modify: `packages/frontend/src/features/portal/QuoteWizardModal.tsx` (2 warnings)
- Modify: `packages/frontend/src/features/portal/ShipmentTracker.tsx` (2 warnings)
- Modify: `packages/frontend/src/lib/mfe/mfe-config.ts` (2 warnings)
- Modify: `packages/frontend/src/federation/remoteImports.ts` (1 error: `@ts-ignore` -> `@ts-expect-error`)
- Modify: `packages/frontend/src/lib/mfe/mfe-config.test.ts` (1 error: `@ts-ignore` -> `@ts-expect-error`)
- Modify: `packages/frontend/src/App.tsx` (1 warning)
- Modify: `packages/frontend/src/contexts/ApiStatusContext.tsx` (1 warning)
- Modify: `packages/frontend/src/features/invoicing/ReportsDashboard.tsx` (1 warning)
- Modify: `packages/frontend/src/hooks/useAppWebSocket.ts` (1 warning)
- Modify: `packages/frontend/src/hooks/useNotificationsWebSocket.ts` (1 no-console warning)
- Modify: `packages/frontend/src/main.tsx` (1 no-console warning)
- Modify: `packages/frontend/src/store/useOrganizationStore.ts` (1 warning)

**Interfaces:**
- Consumes: Refactored components, hooks, and types.
- Produces: Completely type-safe page modules and application roots.

- [ ] **Step 1: Refactor all page modules, utilities, and root application files**
  - Eliminate all remaining `any`, `console.log` statements, and replace `@ts-ignore` with `@ts-expect-error`.
  - In `InvoicingModule.tsx:183`, rename `catch (err)` to `catch (_err)`.
  - In `useNotificationsWebSocket.ts:9` and `main.tsx:17`, replace `console.log` with `console.info` or remove debug logs.
  - In `GlobeTrackerModule.tsx:7`, `remoteImports.ts:5`, and `mfe-config.test.ts:36`, replace `@ts-ignore` with `@ts-expect-error`.
- [ ] **Step 2: Run verification**
  Run: `npx eslint packages/frontend/src/`
  Expected: 0 warnings, 0 errors.

---

### Task 5: Elevate Frontend ESLint Rules to Blocking Errors in `eslint.config.js`

**Files:**
- Modify: `eslint.config.js`

- [ ] **Step 1: Elevate rules in `eslint.config.js`**
  Change:
  ```javascript
  {
    files: ["packages/frontend/src/**/*.{ts,tsx}"],
    ignores: [
      "packages/frontend/src/**/__tests__/**",
      "packages/frontend/src/**/*.test.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  }
  ```
- [ ] **Step 2: Run monorepo-wide ESLint**
  Run: `pnpm run lint`
  Expected: 0 errors, 0 warnings across whole repository.

---

### Task 6: Whole-Repo Verification, Commit, Push, and Issue Closure

**Deliverable:** Pass all validation gates, commit with cryptographic signature, push to `origin/main`, close GitHub Issue #9, and advance Atlas Project #4 board card.

- [ ] **Step 1: Run TypeScript compiler across all workspaces**
  Run: `pnpm run type-check`
  Expected: Exit code 0, 0 compiler errors.
- [ ] **Step 2: Run Vitest test suite**
  Run: `pnpm test`
  Expected: All 205 test files pass (1,316+ tests).
- [ ] **Step 3: Run repository hygiene and guardrails**
  Run: `node scripts/check-file-sizes.mjs`
  Run: `pnpm run audit:links`
  Run: `pnpm run audit:leaks:staged`
  Expected: All 65 pages < 1,000 lines, 100% valid relative links, 0 secrets.
- [ ] **Step 4: Cryptographically signed git commit**
  ```bash
  git add eslint.config.js packages/frontend/src/
  git commit -S -m "feat(quality): enforce blocking strict eslint rules on frontend boundaries (issue #9 phase 4)"
  ```
- [ ] **Step 5: Push to remote main**
  ```bash
  $env:GITHUB_TOKEN=""; git push origin main
  ```
- [ ] **Step 6: Close Issue #9 and update Project #4**
  ```bash
  $env:GITHUB_TOKEN=""; gh issue close 9 --comment "Phase 4 complete. Strict TypeScript ESLint rules (@typescript-eslint/no-explicit-any and @typescript-eslint/no-unused-vars) restored to blocking errors monorepo-wide across backend domain core, security layer, operational routes, and frontend boundaries."
  ```
  Advance Atlas Project #4 card `PVTI_lAHODX38a84BZ46ezhIpuL8` to "Done".

---

## Self-Review

1. **Spec coverage:** Covers all remaining 525 ESLint problems identified in Phase 4 of Issue #9.
2. **Step scan:** Each task is right-sized and has concrete verification commands (`npx eslint`, `pnpm run type-check`, `pnpm test`).
3. **Type consistency:** Task 1 defines the types needed by Task 2 (hooks), which feeds Task 3 (components), which feeds Task 4 (pages).
4. **Review Focus:** Explicitly targets API hydration, event signatures, table renderers, MFE boundaries, and JSDoc headers.
5. **Proportion:** Clear, structured, bite-sized tasks.

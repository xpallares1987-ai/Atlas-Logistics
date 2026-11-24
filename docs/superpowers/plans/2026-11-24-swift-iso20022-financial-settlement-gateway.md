# SWIFT ISO 20022 Financial Settlement Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the SWIFT ISO 20022 Financial Settlement Gateway (T-69) providing bidirectional payment initiation (pacs.008/pain.001), bank statement ingestion & automatic AP/AR reconciliation (camt.053), e-B/L letter of credit tracking (tsmt.019), and UI visualization integrated with the Financial Clearing Ledger.

**Architecture:** A pure deterministic conversion engine (SWIFT MT <-> ISO 20022 MX) backed by relational Drizzle SQLite tables (`banking_transmissions`, `bank_statement_entries`), Fastify v5 REST endpoints with strict TypeBox OpenAPI schemas, Transactional Outbox event dispatching, and a modularized React UI tab in `FinancialClearingModule.tsx`.

**Tech Stack:** TypeScript, Drizzle ORM v1.0.0-rc.6, SQLite (WAL mode), Fastify v5, TypeBox, Vitest, React, Tailwind CSS, Lucide icons, Dexie.js.

**Spec:** [docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md](../../adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md) & [docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md](../../adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md).

## Global Constraints

- **$0.00 Infrastructure Mandate**: Zero paid SaaS compute, zero external telemetry or banking SaaS dependencies.
- **Strict Monorepo Guardrails**: Zero `any`, Zero-`innerHTML` (DOM XSS prevention), non-redundant (DRY) architectural naming.
- **ADR 0020 Page Modularity**: All page modules under 1,000 lines (target <700 lines).
- **SQLite WAL Concurrency**: `PRAGMA busy_timeout = 5000;`, `PRAGMA foreign_keys = ON;`, `PRAGMA journal_mode = WAL;`.
- **Drizzle v1.0.0-rc.6 Folder-Based Migrations**: Migrations must reside in `drizzle/<timestamp>_<tag>/migration.sql` with updated `drizzle/meta/_journal.json`.

## Review Focus

1. **XML Entity Escaping & Injection**: Unsanitized payload strings must never break XML envelope or enable XXE.
2. **Monetary Precision & Currency Rounding**: All currency amounts must preserve exact 2-decimal formatting (or zero-decimal for currencies like JPY) without floating-point drift.
3. **Regulatory Hold & Netting Cycle Immutability**: Closed or settled netting cycles must be strictly immutable; payment instructions cannot be regenerated for settled cycles.
4. **Statement Reconciliation Discrepancy Handling**: Unmatched statement lines must be classified as `UNMATCHED` or `DISPUTED` without corrupting existing ledgers.
5. **Fastify v5 Schema Ajv Validation**: All array schemas in OpenAPI responses must include explicit `items` definitions and use `anyOf` instead of type arrays.

---

### Task 1: Relational Schema & Snapshot Migration (Drizzle SQLite WAL)

**Files:**
- Modify: `src/db/schema/financial_clearing.ts`
- Modify: `src/db/schema/index.ts`
- Create: `drizzle/<timestamp>_swift_iso20022_clearing/migration.sql`
- Modify: `drizzle/meta/_journal.json`
- Test: `tests/db-reproducibility-and-integrity.test.ts`

**Steps:**
- [ ] Add `banking_transmissions` table:
  - Columns: `id` (text PK), `transmissionNumber` (unique text), `nettingCycleId` (FK to `bilateral_netting_cycles.id`), `messageType` (`PAIN_001`, `PACS_008`, `TSMT_019`), `bahMessageId` (text), `senderBic` (text), `receiverBic` (text), `totalAmount` (numeric), `currency` (text), `payloadXml` (text), `payloadHashSha256` (text), `status` (`PENDING`, `TRANSMITTED`, `ACKED`, `REJECTED`), `transmittedAt` (timestamp mode), `ackReceivedAt` (timestamp mode), `failureReason` (text), standard audit timestamps (`mode: "timestamp"`).
- [ ] Add `bank_statement_entries` table:
  - Columns: `id` (text PK), `statementId` (text), `transmissionId` (FK to `banking_transmissions.id`, optional), `bookingDate` (text YYYY-MM-DD), `valueDate` (text YYYY-MM-DD), `creditDebitIndicator` (`CRDT`, `DBIT`), `amount` (numeric), `currency` (text), `accountIban` (text), `accountBic` (text), `endToEndId` (text), `paymentInformationId` (text), `remittanceInformation` (text), `reconciliationStatus` (`UNMATCHED`, `PARTIALLY_MATCHED`, `RECONCILED`, `DISPUTED`), `matchedInvoiceId` (text, optional), `matchedCompanyId` (text, optional), standard audit timestamps.
- [ ] Generate Drizzle migration folder: `pnpm run db:generate`.
- [ ] Verify migration snapshot consistency with `pnpm run audit:ddl-drift`.
- [ ] Run `pnpm vitest run tests/db-reproducibility-and-integrity.test.ts` to assert 100% parity across physical tables.

---

### Task 2: Backend Banking Clearing Service & Transactional Outbox Integration

**Files:**
- Create: `src/services/swift-iso20022.service.ts`
- Test: `tests/swift-iso20022-service.test.ts`

**Steps:**
- [ ] Implement `SwiftIso20022Service`:
  - `generateSettlementPayment(nettingCycleId: string)`: Retrieves settled cycle, maps debtor/creditor parties, formats `head.001.001.02` BAH, computes SHA-256 payload digest, generates `pain.001.001.09` or `pacs.008.001.08` XML, saves to `banking_transmissions`, and publishes an outbox event `financial.banking.payment_initiated` via `outboxBus`.
  - `ingestBankStatement(xmlContent: string)`: Parses `camt.053.001.08` XML, extracts statement entries, matches against open AR/AP invoices by `endToEndId` and remittance references, updates `bank_statement_entries`, and reconciles invoice statuses atomically in a SQLite transaction.
  - `parseLetterOfCredit(mt700Payload: string)`: Translates incoming MT700 or `tsmt.019` into structured trade finance records for shipment e-B/L presentation.
  - `listTransmissions(filter)`: Queries paginated transmission history with filter by status or currency.
  - `getTransmissionDetails(id)`: Returns full payload, audit trail, and associated statement reconciliation lines.
- [ ] Author comprehensive service test suite in `tests/swift-iso20022-service.test.ts` covering payment generation, statement parsing, invoice matching, and outbox event publishing.
- [ ] Run `pnpm vitest run tests/swift-iso20022-service.test.ts tests/swift-iso20022-engine.test.ts` and verify 100% PASS.

---

### Task 3: Fastify REST API Routes & OpenAPI TypeBox Contracts

**Files:**
- Create: `src/routes/financial/iso20022.routes.ts`
- Modify: `src/routes/index.ts`
- Test: `tests/swift-iso20022-routes.test.ts`

**Steps:**
- [ ] Implement Fastify plugin `iso20022Routes` in `src/routes/financial/iso20022.routes.ts`:
  - `POST /api/financial/iso20022/payments/generate`: Generates payment batch from netting cycle ID.
  - `POST /api/financial/iso20022/statements/reconcile`: Ingests and reconciles `camt.053` XML.
  - `POST /api/financial/iso20022/mt/translate`: Converts MT103 to `pacs.008` or MT700 to `tsmt.019`.
  - `GET /api/financial/iso20022/transmissions`: Lists recent banking transmissions.
  - `GET /api/financial/iso20022/transmissions/:id/xml`: Streams raw canonical XML with appropriate headers (`application/xml`).
  - `GET /api/financial/iso20022/statements`: Lists statement entries with reconciliation statuses.
- [ ] Enforce Fastify v5 OpenAPI schemas with TypeBox and `buildErrorResponses([400, 404, 500])`.
- [ ] Register `iso20022Routes` in `src/routes/index.ts`.
- [ ] Author controller test suite in `tests/swift-iso20022-routes.test.ts` using `app.inject()`.
- [ ] Run `pnpm vitest run tests/swift-iso20022-routes.test.ts` and verify 100% PASS.

---

### Task 4: Frontend UI Tab `Banking & ISO 20022` in `FinancialClearingModule.tsx`

**Files:**
- Create: `packages/frontend/src/components/FinancialClearing/Tab/BankingIso20022/index.ts`
- Create: `packages/frontend/src/components/FinancialClearing/Tab/BankingIso20022/XmlInspector.tsx`
- Create: `packages/frontend/src/components/FinancialClearing/Tab/BankingIso20022/StatementReconciliation.tsx`
- Create: `packages/frontend/src/components/FinancialClearing/Tab/BankingIso20022/LetterOfCreditViewer.tsx`
- Modify: `packages/frontend/src/pages/FinancialClearingModule.tsx`
- Test: `tests/financial-clearing-banking-tab.test.ts`

**Steps:**
- [ ] Create semantic subcomponents in `packages/frontend/src/components/FinancialClearing/Tab/BankingIso20022/`:
  - `XmlInspector.tsx`: Interactive viewer with syntax-highlighted XML preview, copy-to-clipboard, download button, and SHA-256 integrity indicator.
  - `StatementReconciliation.tsx`: Drag-and-drop zone for `camt.053` XML files, tabular display of reconciled vs. unmatched invoice lines, and status badges.
  - `LetterOfCreditViewer.tsx`: Card grid displaying active documentary credits (`tsmt.019`), expiry dates, and e-B/L endorsement readiness.
- [ ] Integrate new Tab `"Banking & ISO 20022"` into `FinancialClearingModule.tsx`, preserving line count well below 700 lines.
- [ ] Verify zero DOM XSS sinks: `node scripts/check-zero-innerhtml.mjs`.
- [ ] Verify DRY naming: `node scripts/check-naming-conventions.mjs`.
- [ ] Verify page file size: `node scripts/check-file-sizes.mjs`.
- [ ] Verify frontend compilation: `pnpm --filter @atlas/frontend type-check`.

---

### Task 5: Monorepo Verification, GitHub Alignment & Project Synchronization

**Files:**
- Tracked & Staged Files for T-69
- SharedBoard: `shared-board.json`
- Atlas Project #4: GitHub Project sync

**Steps:**
- [ ] Run all static security and repository guardrails in batch:
  ```powershell
  node scripts/check-markdown-links.mjs; node scripts/check-file-sizes.mjs; node scripts/check-zero-innerhtml.mjs; node scripts/check-naming-conventions.mjs; node scripts/check-sensitive-leaks.cjs --all; pnpm run type-check; pnpm test:backup-restore
  ```
- [ ] Acquire Git Lock on Antigravity-IPC SharedBoard: `node board.mjs git-lock --owner terminal-a --task-id T-69`.
- [ ] Commit explicit files with Conventional Commit: `feat(banking): implement SWIFT ISO 20022 clearing gateway, camt.053 reconciliation & UI tab (T-69)`.
- [ ] Push to `origin/main` using `$env:GITHUB_TOKEN=""; git push origin main`.
- [ ] Release Git Lock and complete task T-69 on SharedBoard.
- [ ] Synchronize Atlas Project #4: `node scripts/sync-atlas-project.mjs` (mapping Issue to `DONE` and Roadmap dates).
- [ ] Add note N-53 to SharedBoard.

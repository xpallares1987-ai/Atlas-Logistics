# Frontend Monoliths Modular Decomposition & Complexity Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modularize the two largest remaining frontend monoliths (`DocumentVaultModule.tsx` ~2,735 lines and `EdiIntegrationModule.tsx` ~2,401 lines) into decoupled tabs, modals, and typed contracts (<1,000 lines per orchestrator), formalize Diátaxis ADR 0020, and introduce an automated file size guardrail script.

**Architecture:** Decompose page monoliths into domain components (`packages/frontend/src/components/documents/` and `packages/frontend/src/components/edi/`) with explicit TypeScript props interfaces (`packages/frontend/src/types/`). The main page orchestrators retain state and Fastify/BFF communication while delegating tab and modal rendering to isolated child modules. An automated guardrail script (`scripts/check-file-sizes.mjs`) enforces that page components stay strictly under the 1,000-line threshold.

**Tech Stack:** React 18, TypeScript 5.5, Vite 5, Tailwind CSS, Lucide React, Framer Motion, Vitest, Fastify Backend with SQLite/Drizzle.

**Spec:** User alignment from `/grill-me` session adopting:
1. Frontend modular decomposition of `DocumentVaultModule.tsx` and `EdiIntegrationModule.tsx`.
2. Strict architectural threshold: No page component shall exceed 1,000 lines.
3. Diátaxis ADR 0020 and automated CI guardrail script (`pnpm run check:file-sizes`).

## Global Constraints

- **Strict Root Hygiene**: Only the 6 canonical files in root (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`).
- **Zero Mocks Standard**: All existing live SQLite endpoints, Drizzle models, and Fastify routes must remain 100% operational without mocks.
- **Strict TypeScript**: 0 errors on `pnpm run type-check`.
- **Production Build**: Clean Vite build (`pnpm --filter @atlas/frontend build`).
- **Cryptographic SSH Signatures**: All commits signed via `id_ed25519_sign.pub`.
- **Git Flow**: Direct work on branch `main`, push authorized exclusively to `xpallares1987-ai/Atlas-Logistics`.
- **Security & Privacy**: Clear GITHUB_TOKEN before `gh` CLI commands (`$env:GITHUB_TOKEN="";`), 0 confidential leaks (`pnpm run audit:leaks:staged`).

## Review Focus

1. **Reactive State Binding**: Subcomponents must receive explicit props and callbacks without losing active filters, search inputs, or selected entity IDs.
2. **Tab Switch Integrity**: Switching between tabs must preserve loaded documents, OCR parsing results, and EDI draft payloads in state.
3. **File Upload & Binary Handlers**: File input refs, drag-and-drop, and multimodal base64 OCR attachments must execute correctly across extracted components.
4. **Fastify Proxy URL Parity**: All API calls (`/api/documents/*`, `/api/edi/*`, `/api/dcsa/*`) must retain exact paths and query parameters.
5. **Linting and Bundle Tree Shaking**: Decoupled components must import only the icons and utilities they need, reducing initial chunk evaluation time.

---

### Task 1: File Size Guardrail Script & Automated Check

**Files:**
- Create: `scripts/check-file-sizes.mjs`
- Create: `tests/check-file-sizes.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the failing unit test for the file size scanner**
Write `tests/check-file-sizes.test.ts` testing the threshold evaluator function (detecting files above 1,000 lines in target directory).
- [ ] **Step 2: Run test to confirm failure**
Run `pnpm vitest run tests/check-file-sizes.test.ts` and verify test failure.
- [ ] **Step 3: Implement `scripts/check-file-sizes.mjs`**
Create the scanner supporting configurable thresholds (default 1,000 lines for `packages/frontend/src/pages/`) with colored terminal output and exit code 0/1.
- [ ] **Step 4: Update `package.json`**
Add `"check:file-sizes": "node scripts/check-file-sizes.mjs"` to root `package.json` scripts.
- [ ] **Step 5: Run tests and verify script execution**
Run `pnpm vitest run tests/check-file-sizes.test.ts` and ensure test passes.
Run `pnpm run check:file-sizes` to observe baseline violations before decomposition.

---

### Task 2: Modular Decomposition of `DocumentVaultModule.tsx`

**Files:**
- Create: `packages/frontend/src/types/document-vault.types.ts`
- Create: `packages/frontend/src/components/documents/DocumentStudioTab.tsx`
- Create: `packages/frontend/src/components/documents/DocumentVaultTab.tsx`
- Create: `packages/frontend/src/components/documents/DocumentVerifyTab.tsx`
- Create: `packages/frontend/src/components/documents/DocumentOcrStudioTab.tsx`
- Create: `packages/frontend/src/components/documents/modals/DocumentViewerModal.tsx`
- Modify: `packages/frontend/src/pages/DocumentVaultModule.tsx`

- [ ] **Step 1: Create typed interfaces in `document-vault.types.ts`**
Export `DocumentTemplate`, `VaultDocument`, and all tab/modal prop interfaces (`DocumentStudioTabProps`, `DocumentVaultTabProps`, `DocumentVerifyTabProps`, `DocumentOcrStudioTabProps`, `DocumentViewerModalProps`).
- [ ] **Step 2: Implement `DocumentStudioTab.tsx`**
Extract template cards selector, dynamic schema fields form, document reference input, and generation action buttons.
- [ ] **Step 3: Implement `DocumentVaultTab.tsx`**
Extract search bar, type and status filters, documents ledger table, status badges, and quick action buttons (verify, sign, download).
- [ ] **Step 4: Implement `DocumentVerifyTab.tsx`**
Extract SHA-256 hash input, verify action, verification result card, cryptographic audit trail, and issuer verification breakdown.
- [ ] **Step 5: Implement `DocumentOcrStudioTab.tsx`**
Extract 4-way document extraction workspace, sample preset loaders, raw text/file input, AI extraction button, 4 extracted cards, tripartite cross-check matrix, and regulatory footnote.
- [ ] **Step 6: Implement `modals/DocumentViewerModal.tsx`**
Extract PDF viewer embed, metadata details panel, digital signature form with SAT e.firma / WebCrypto certificate credentials, and download actions.
- [ ] **Step 7: Refactor `DocumentVaultModule.tsx`**
Replace inline JSX with clean subcomponents, retaining core state and API handler orchestration. Confirm lines reduced from 2,735 to <500 lines.
- [ ] **Step 8: Verify TypeScript & Build**
Run `pnpm run type-check` and `pnpm --filter @atlas/frontend build`. Ensure 0 errors.

---

### Task 3: Modular Decomposition of `EdiIntegrationModule.tsx`

**Files:**
- Create: `packages/frontend/src/types/edi-integration.types.ts`
- Create: `packages/frontend/src/components/edi/EdiDcsaTab.tsx`
- Create: `packages/frontend/src/components/edi/EdiStudioTab.tsx`
- Create: `packages/frontend/src/components/edi/EdiOutboundTab.tsx`
- Create: `packages/frontend/src/components/edi/EdiAuditTab.tsx`
- Create: `packages/frontend/src/components/edi/EdiPartnersTab.tsx`
- Create: `packages/frontend/src/components/edi/modals/DcsaSubscriptionModal.tsx`
- Modify: `packages/frontend/src/pages/EdiIntegrationModule.tsx`

- [ ] **Step 1: Create typed interfaces in `edi-integration.types.ts`**
Export `EdiMessageRecord`, `PartnerRecord`, `DcsaEventItem`, `DcsaSubscriptionItem`, and tab props (`EdiDcsaTabProps`, `EdiStudioTabProps`, `EdiOutboundTabProps`, `EdiAuditTabProps`, `EdiPartnersTabProps`, `DcsaSubscriptionModalProps`).
- [ ] **Step 2: Implement `EdiDcsaTab.tsx`**
Extract DCSA 3.0 event stream, event type filters, real-time simulator panel, disruption injector, and subscriptions list.
- [ ] **Step 3: Implement `EdiStudioTab.tsx`**
Extract EDI raw message textarea, syntax parser, segment tree inspector, and translation controls.
- [ ] **Step 4: Implement `EdiOutboundTab.tsx`**
Extract outbound generator form (EDI 304 Shipping Instructions & SOLAS VGM, EDI 310, IFTMIN, EDI 204), payload preview, and transmission dispatcher.
- [ ] **Step 5: Implement `EdiAuditTab.tsx`**
Extract inbound/outbound transmission audit ledger, ACK/NACK status badges, and payload inspection modal.
- [ ] **Step 6: Implement `EdiPartnersTab.tsx`**
Extract trading partners grid, AS2/SFTP protocol endpoints, EDI qualifiers, and test mode toggles.
- [ ] **Step 7: Implement `modals/DcsaSubscriptionModal.tsx`**
Extract modal dialog for registering carrier webhook event subscriptions.
- [ ] **Step 8: Refactor `EdiIntegrationModule.tsx`**
Replace inline JSX with decoupled subcomponents, preserving all state hooks and API routes. Confirm lines reduced from 2,401 to <500 lines.
- [ ] **Step 9: Verify TypeScript & Build**
Run `pnpm run type-check` and `pnpm --filter @atlas/frontend build`. Ensure 0 errors.

---

### Task 4: Diátaxis ADR 0020 & Guardrail Validation

**Files:**
- Create: `docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md`

- [ ] **Step 1: Document ADR 0020**
Write ADR 0020 in Diátaxis Explanation quadrant documenting the context, architectural decision (<1,000 lines limit per page module, subcomponent extraction pattern), and consequences.
- [ ] **Step 2: Run file size guardrail check**
Execute `pnpm run check:file-sizes` and confirm that `DocumentVaultModule.tsx` and `EdiIntegrationModule.tsx` pass without warnings.
- [ ] **Step 3: Run comprehensive verification**
Execute `pnpm run type-check`, all Vitest suites, and `pnpm run audit:leaks:staged`. Ensure 100% green.

---

### Task 5: Cryptographic Commit and GitHub Push

**Files:**
- Commit staged changes

- [ ] **Step 1: Check git status and staged diff**
Verify root directory hygiene (exactly 6 standard files).
- [ ] **Step 2: Create cryptographically signed commit**
Commit with SSH signature (`git commit -S -m "refactor(frontend): decompose DocumentVault and EdiIntegration monoliths with file-size guardrails (ADR 0020)"`).
- [ ] **Step 3: Push to remote main**
Push to `origin main` using authorized remote.
- [ ] **Step 4: Verify CI status**
Verify GitHub Actions workflow status via `gh run list`.

# 0020. Frontend Modular Decomposition and File Size Complexity Guardrails (<1,000 Lines)

- **Status**: Accepted
- **Date**: 2026-11-12
- **Context**: Atlas Logistics Architecture Team & Frontend Platform Engineers
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)

---

## Context & Problem Statement

As Atlas Logistics incorporated advanced international trade workflows (DCSA 3.0, customs OCR with multimodal models, PKI traceability with WebCrypto/SAT e.firma seals, and B2B EDIFACT/ANSI X12 orchestration), several UI modules in `packages/frontend/src/pages/` grew disproportionately into massive monolithic components exceeding 2,400 lines of code:

1. `DocumentVaultModule.tsx`: **2,736 lines** (bundled template catalog, filtered document vault, SHA-256 cryptographic verifier, 4-in-1 multimodal OCR studio with 3-way match reconciliation matrix, and digital signature modal).
2. `EdiIntegrationModule.tsx`: **2,402 lines** (bundled DCSA 3.0 telemetric feed with disruption simulator, EDI AST parser, outbound generator for EDI 304 SOLAS VGM and 310 Freight Invoice, audit ledger, and trading partner directory).

This monolithic growth presented significant drawbacks:
- **Cognitive Overhead & Maintenance Friction**: Difficult navigation and elevated risk of cross-regressions during concurrent edits.
- **Degraded Hot Module Replacement (HMR)**: Slower incremental rebuild cycles in Vite.
- **Single Responsibility Principle Violation**: A single orchestrator component managed server state, multiple disjoint functional tab views, and complex modal dialogs simultaneously.

---

## Architectural Decisions

### 1. Mandatory File Size Limit (<1,000 Lines)
Adopted an architectural standard for the monorepo: **No page or orchestrator module in `packages/frontend/src/pages/` shall exceed 1,000 lines of code**. Page orchestrators must strictly limit their scope to:
- Centralizing root reactive state and synchronization with Fastify / SQLite endpoints (Zero Mocks).
- Providing top-level routing, query parameter synchronization, and global event handlers.
- Delegating tab rendering and dialog interactions to specialized subcomponents.

### 2. Canonical Modular Decomposition Pattern
Modules approaching or exceeding the threshold must follow this directory pattern:

```
packages/frontend/src/
├── types/
│   └── <domain>.types.ts               # Typed props contracts and BFF interfaces
├── utils/
│   └── <domain>.utils.tsx              # Rendering helpers, formatters, and icon mappers
├── components/<domain>/
│   ├── <Domain><Tab1>Tab.tsx           # Atomic, decoupled perspective tab 1
│   ├── <Domain><Tab2>Tab.tsx           # Atomic, decoupled perspective tab 2
│   └── modals/
│       └── <Domain><Action>Modal.tsx   # Extracted modal dialogs
└── pages/
    └── <Domain>Module.tsx              # Lean orchestrator (<1,000 lines)
```

### 3. Automated File Size Guardrail Scanner (`check:file-sizes`)
Implemented an automated verification script at `scripts/check-file-sizes.mjs`, accompanied by a unit test suite (`tests/check-file-sizes.test.ts`), registered in `package.json`:
```json
"check:file-sizes": "node scripts/check-file-sizes.mjs"
```
The scanner reports files exceeding the 1,000-line threshold in formatted tables and runs as part of pre-commit and CI quality checks.

---

## Results & Impact Metrics

| Refactored Module | Original Lines | Resulting Lines | Net Reduction | New Atomic Subcomponents |
| :--- | :--- | :--- | :--- | :--- |
| `DocumentVaultModule.tsx` | 2,736 lines | **895 lines** | **-67.3% (-1,841 lines)** | `DocumentStudioTab`, `DocumentVaultTab`, `DocumentVerifyTab`, `DocumentOcrStudioTab`, `DocumentViewerModal`, `document-vault.types`, `document-vault.utils` |
| `EdiIntegrationModule.tsx` | 2,402 lines | **673 lines** | **-72.0% (-1,729 lines)** | `EdiDcsaTab`, `EdiStudioTab`, `EdiOutboundTab`, `EdiAuditTab`, `EdiPartnersTab`, `DcsaSubscriptionModal`, `edi-integration.types` |
| `ShipmentWorkspace360Module.tsx` | 2,125 lines | **934 lines** | **-56.0% (-1,191 lines)** | `ShipmentOverviewTab`, `ShipmentAttentionTab`, `ShipmentJourneyTab`, `ShipmentTasksTab`, `ShipmentExceptionsTab`, `ShipmentCargoRouteTab`, `ShipmentAuditTab`, `ShipmentGreenComplianceTab`, `ShipmentWorkspaceSidebar`, `ShipmentHeroBanner`, `ShipmentWorkspaceHeader`, `ShipmentNavigationTabs`, `ExecuteActionModal`, `RaiseExceptionModal` |
| **Total** | **7,263 lines** | **2,502 lines** | **-65.5% (-4,761 lines)** | **28 new atomic modules** |

---

## Consequences & Verification

### Positive
- **Zero Mocks Standard Preserved**: 100% of integrations with Fastify endpoints (`/api/documents/*`, `/api/dcsa/*`, `/api/edi/*`, `/api/scm/v1/operational/*`) continue querying live SQLite WAL tables via Drizzle ORM.
- **Strictly Typed Props Contracts**: Extracted types enable high reuse without inter-component coupling.
- **CI/CD Alignment**: 0 TypeScript compilation errors (`tsc --noEmit`), Vite builds completed in under 14 seconds, and file size guardrail scanner verified.

### Mitigations
- Maintain automated enforcement via `scripts/check-file-sizes.mjs` to systematically decompose remaining backlog modules (`ControlTowerModule`, `OperationsCockpitModule`, `SettingsModule`).

# 0019. Modular Decomposition of Booking Management and Decoupling of PDF Document Generation

- **Status**: Accepted
- **Date**: 2026-11-12
- **Context**: Atlas Logistics Architecture Team & Antigravity Autonomous Agent
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **Applies to**: `packages/frontend/src/pages/BookingManagementModule.tsx`

---

## 1. Context & Problem Statement

The `BookingManagementModule.tsx` page module grew into a 3,077-line monolith bundling:
1. Relational SQLite booking lifecycle state orchestration (Phase 1: PENDING → Phase 2: CONFIRMED with atomic generation of Shipments and operational milestones).
2. UI rendering and interactions for 4 operational tab perspectives (Rate Lock & Spot Corridors, Cut-Off Deadlines Radar, SI Studio EDI 304, Equipment Release with Terminal Gate Pass).
3. 2 complex transactional dialogs (`BookingConfirmModal` and `NewBookingRequestModal`).
4. Three distinct PDF document layout and download routines (`downloadDraftBLModalPdf`, `downloadShippingInstructionsPdf`, `downloadDepotGatePassPdf`) built with `jsPDF` and `jspdf-autotable`.

This coupling caused high cognitive overhead, fragile DOM testing, and difficulties in unit testing PDF layouts in isolation.

---

## 2. Design Decisions

Executed a modular decoupling refactoring structured across three pillars:

1. **Extraction of Types & Props Contracts (`packages/frontend/src/types/booking-management.types.ts`)**:
   - Centralized `TabKey`, form payloads (`BookingConfirmFormData`, `NewBookingFormData`), tab props interfaces (`BookingRateLockTabProps`, `BookingCutoffRadarTabProps`, `BookingSiStudioTabProps`, `BookingEquipmentReleaseTabProps`), and modal props (`BookingConfirmModalProps`, `NewBookingRequestModalProps`).

2. **Decoupling of PDF Generation Engine (`packages/frontend/src/utils/booking-pdf.utils.ts`)**:
   - Extracted all three `jsPDF` routines:
     - `downloadDraftBLModalPdf`: Official multimodal draft bill of lading with watermark and SHA-256 verification hash.
     - `downloadShippingInstructionsPdf`: Standard DCSA v2.0 / EDI 304 shipping instructions manifest.
     - `downloadDepotGatePassPdf`: Container depot gate pass with 4-digit security PIN and kiosk instructions.
   - Comprehensive unit test coverage in `tests/booking-pdf-utils.test.ts`.

3. **Specialized Atomic Tab & Modal Components (`packages/frontend/src/components/bookings/`)**:
   - `BookingRateLockTab.tsx`: Spot rate comparisons and EDI 301 pre-booking previews.
   - `BookingCutoffRadarTab.tsx`: Operational cut-off deadline indicators (Cargo, VGM, Customs, SI) and master booking grid.
   - `BookingSiStudioTab.tsx`: Shipping instructions editor, DCSA Flash-Lite AI audit, multimodal OCR extraction, and EDI 304 transmission.
   - `BookingEquipmentReleaseTab.tsx`: Empty container release tracking, pickup PIN, and digital gate pass.
   - `modals/BookingConfirmModal.tsx`: Transactional confirmation dialog linking B/L addresses.
   - `modals/NewBookingRequestModal.tsx`: Phase 1 booking request intake form.

---

## 3. Consequences & Benefits

- **Complexity Reduction**: `BookingManagementModule.tsx` was reduced from **3,077 to 1,402 lines (-54.4%)**.
- **Zero Mocks Standard Preserved**: Maintains real-time reactive binding with Fastify, SQLite, and Drizzle ORM (`/api/bookings`, `/ocean-booking/details`, `/ocean-booking/.../shipping-instructions`).
- **Testability**: Document generation routines execute in headless isolation with Vitest in `tests/booking-pdf-utils.test.ts` (3/3 passing).
- **Optimized Bundle**: Efficient code splitting in Vite, reducing initial page chunk footprint to 79.76 kB (18.02 kB gzip).

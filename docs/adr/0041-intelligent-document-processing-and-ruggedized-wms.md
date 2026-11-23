# 0041. Intelligent Document Processing (IDP) & Ruggedized Mobile WMS Architecture

- **Status**: Accepted
- **Date**: 2026-11-23
- **Context**: Atlas Logistics Warehouse Management (WMS), Handheld Terminals (Zebra TC21/TC26/MC3300), Document Ingestion Pipeline, Cross-Docking & Wave Picking
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **See Also**: [ADR 0004](0004-zero-cost-local-architecture.md), [ADR 0020](0020-frontend-modular-decomposition-and-file-size-guardrails.md), [ADR 0037](0037-sqlite-wal-concurrency-and-monorepo-invariants.md), [ADR 0039](0039-hybrid-persistence-and-crdt-synchronization.md), [ADR 0040](0040-financial-settlement-automated-clearing-and-outbox-event-bus.md)

---

## 1. Context & Problem Statement

Global contract logistics and freight terminal hubs operate at the intersection of paper-heavy commercial documentation and fast-paced physical handling:

1. **Unstructured Freight Invoice & Manifest Ingestion**:
   Ocean shipping lines (e.g., Maersk, MSC, CMA CGM) and air cargo carriers issue invoices with diverse visual layouts, multi-page itemized charges, and proprietary charge codes (BAF, CAF, PSS, THC, demurrage, chassis splits). Traditional template-based OCR systems fail whenever a carrier adjusts margins or column orders, resulting in manual data entry bottlenecks and delayed 3-Way invoice reconciliation.

2. **Harsh Warehouse Physical Environments**:
   Forklift drivers, stevedores, and warehouse operators use rugged Android handheld mobile computers (such as Zebra TC21/TC26, Zebra MC3300, and Honeywell Dolphin) equipped with integrated 1D/2D laser scan engines and physical keypads. Standard desktop ERP web interfaces fail in these environments due to:
   - Fragile touch targets (<48px) inaccessible while wearing heavy protective work gloves.
   - Low-contrast color palettes illegible under direct sunlight or dim cross-dock loading bays.
   - Unhandled laser scanner keystroke bursts (e.g. rapid character input terminating in `Enter`).
   - Network dead zones in steel-reinforced CFS racking aisles causing lost transactions.

3. **Directed Warehouse Execution Flows**:
   Unassisted warehouse workers waste time locating optimal storage bins and risk cross-docking misroutes. A deterministic, guided system is required for:
   - **Cross-Docking Triage**: Immediate transfer of incoming cargo to outbound shipping lanes without intermediate putaway.
   - **Directed Putaway**: Automated bin recommendation based on cargo dimensions, hazmat segregation, and FIFO rotation.
   - **Wave Picking**: Batching multiple shipment orders into optimized single-pass picking routes with SSCC verification.
   - **Gate-In Inspection**: Immediate verification of tractor, chassis, container number, and security bolt seal integrity.

---

## 2. Decision Drivers

- **Zero-Cost Embedded Architecture ($0.00 SaaS)**: Operates locally and in standard browsers/PWA without proprietary WMS licensing fees or external OCR cloud service charges.
- **Rugged Hardware First**: Full compatibility with Zebra DataWedge, physical keyboard wedges, hardware scan triggers, and high-contrast ambient modes.
- **Touch & Glove Accessibility**: All actionable touch surfaces maintain a minimum hit target of $48 \times 48$ CSS pixels with immediate haptic/audio feedback cues.
- **Offline Resilience**: Mobile operations must continue uninterrupted during WiFi roaming dropouts via IndexedDB caching and optimistic CRDT reconciliation.
- **Strict Security & DOM Safety**: Zero `any` types and zero innerHTML / CWE-79 sinks.

---

## 3. Considered Options

1. **Option A: Native Android Native App (Kotlin / Jetpack Compose)**:
   - *Pros*: Native access to Zebra SDK APIs (`com.symbol.emdk`).
   - *Cons*: High development overhead; requires separate builds, MDM provisioning, and distinct codebase out of sync with the React/TypeScript monorepo.
2. **Option B: Third-Party Mobile WMS SaaS (e.g., Manhattan, Blue Yonder)**:
   - *Pros*: Out-of-the-box features.
   - *Cons*: Violates the $0.00 infrastructure mandate; expensive per-seat recurring fees and proprietary data silos.
3. **Option C: Unified Responsive PWA with Hardware Wedge Keyboard Listeners (Selected)**:
   - *Pros*: Single React/TypeScript codebase (`@atlas/frontend`), instant updates via web/PWA service worker, full hardware barcode scanner integration via keyboard wedge events, zero licensing costs.

---

## 4. Architectural Design & Implementation

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RUGGED MOBILE WMS TERMINAL (PWA)                    │
│   (Zebra TC21 / Android / Physical Keypad / Laser Scan Engine)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Barcode Scan Stream (GS1-128 / SSCC)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               HARDWARE BARCODE WEDGE HOOK & FILTER                    │
│   - Rapid Keystroke Buffer (<50ms inter-character interval)           │
│   - GS1-128 Application Identifier (AI) Parser                         │
│   - Audio (Web Audio API) & Haptic (navigator.vibrate) Feedback        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼──────────────────────────────┐
    ▼                               ▼                              ▼
┌───────────────┐           ┌───────────────┐              ┌───────────────┐
│ CROSS-DOCK    │           │ DIRECTED      │              │ WAVE PICKING  │
│ TRIAGE        │           │ PUTAWAY       │              │ & GATE-IN     │
│ Immediate Staging         │ Capacity & Hazmat            │ Single-Pass   │
│ Outbound Lane Match       │ Bin Recommendation           │ SSCC Audit    │
└───────┬───────┘           └───────┬───────┘              └───────┬───────┘
        │                           │                              │
        └───────────────────────────┼──────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│          OFFLINE-FIRST STORE (IndexedDB & SQLite WAL Engine)          │
│   - Optimistic state updates                                          │
│   - Outbox event queuing on WiFi dropouts                             │
│   - Automatic CRDT delta replication upon reconnection                │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Hardware Barcode Wedge Integration

Handheld barcode scanners configured in "Keystroke Output" mode fire sequential `keydown` events at superhuman speed (typically 5–15ms between characters) terminated with `Enter`.

The WMS Terminal implements a dedicated listener:
1. Detects character streams with an inter-character interval $< 40$ms.
2. Accumulates raw scan payloads without stealing focus from active manual inputs.
3. Emits validated scan payloads with synthetic audio beeps (high pitch for success, low double-buzz for mismatch).

### 4.2 High-Contrast Industrial Theme

To support outdoor ramps, cold storage, and direct sunlight:
- **Default High-Contrast Theme**: Pure black (`#000000`) backgrounds, high-intensity fluorescent accents (`#22c55e` emerald, `#06b6d4` cyan, `#eab308` yellow), and stark white `#ffffff` typography.
- **Physical Key Navigation**: Mappings for hardware keypads (`1`: Cross-Dock, `2`: Putaway, `3`: Wave Pick, `4`: Gate-In, `F1`: Clear, `Enter`: Confirm).

---

## 5. Consequences & Trade-offs

- **Positive**:
  - Operators can execute cross-docking and wave picking at full speed with thick work gloves.
  - Zero deployment friction: instant over-the-air updates without APK side-loading.
  - Full adherence to $0.00 infrastructure costs with local SQLite WAL and PWA caching.
- **Negative / Constraints**:
  - Browser-based audio feedback requires an initial user interaction to unlock the Web Audio API context.
  - Camera-based barcode fallback is slower than dedicated hardware laser scanners on older mobile phones.

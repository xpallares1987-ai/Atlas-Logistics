# 0012 DCSA Ocean Booking Lifecycle and FMC Part 541 Demurrage Dispute Resolution

- **Status**: Accepted
- **Deciders**: Engineering Team & AI Architecture Reviewer
- **Date**: 2026-11-05

## Context and Problem Statement

Maritime container logistics is governed by stringent international digital and legal frameworks:
1. **US Federal Maritime Commission (FMC) 46 CFR Part 541 (OSRA 2022)**: Mandates that carrier demurrage and detention invoices contain specific statutory metadata (container availability dates, free time start/end dates, daily tiered rate breakdowns, and dispute submission windows). Invoices lacking mandatory fields are legally invalid.
2. **DCSA (Digital Container Shipping Association) Standards**: Defines standardized events and deadlines for cargo cut-off, shipping instructions (SI), and verified gross mass (VGM) transmission.
3. **Container 3D Stowage & Stability**: Requires physical verification of Center of Gravity (CoG) and compliance with tractor/chassis highway axle limits before equipment gate-out.

## Decision Drivers

- Immediate detection and legal dispute filing against non-compliant carrier demurrage charges.
- End-to-end maritime booking lifecycle connected to canonical shipment execution.
- Physical balance and cargo stability certification in SQLite to prevent road and marine transit accidents.

## Decision Outcome

1. **Relational FMC Invoicing Tables**: Created `demurrage_invoices`, `demurrage_suspensions`, and `demurrage_disputes` in SQLite modeling carrier charges, clock-pause suspensions (e.g. customs inspections, terminal gate closures), and formal legal dispute letters.
2. **DCSA Ocean Booking Lifecycle**: Created `ocean_booking_details` linking bookings to DCSA cut-off schedules, shipping instructions, and draft bills of lading.
3. **Container 3D Stowage & Axle Stability**: Created `container_stowage_plans` calculating Center of Gravity 3D coordinates and front/rear axle distributions directly from real `cargo_items`.
4. **Phase 5 Relational Seed Pipeline**: Implemented deterministic seeding (`seedPhase5()`) tied to canonical shipment `sh_demo_01`, container `cnt_msku_9284712`, and booking `bk_demo_01`.

### Consequences

- **Good**: Automated detection of invalid carrier demurrage invoices under FMC 46 CFR Part 541.
- **Good**: Full DCSA booking lifecycle traceability from rate lock to equipment release.
- **Good**: Realistic 3D cargo visualization and verifiable weight certification.
- **Bad**: Requires carriers to provide granular availability timestamps to avoid automated dispute triggers.

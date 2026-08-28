# Changelog

All notable changes to the Atlas Logistics monorepo are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-08-28

### 🌟 Added
- **Cold Chain & Temperature-Controlled Pharma/Reefer Monitoring Engine (EU GDP & EN 12830)**:
  - **Regulated Cold Chain Profiles**: Built-in coverage for Ultra-Cold ($-80^\circ\text{C}$ to $-60^\circ\text{C}$ Dry Ice UN 1845), Frozen ($-25^\circ\text{C}$ to $-15^\circ\text{C}$), Refrigerated Pharma ($+2^\circ\text{C}$ to $+8^\circ\text{C}$), Controlled Room Temperature CRT ($+15^\circ\text{C}$ to $+25^\circ\text{C}$), and Fresh Perishables ($+0^\circ\text{C}$ to $+4^\circ\text{C}$).
  - **Arrhenius Mean Kinetic Temperature (MKT) Calculator**: 100% deterministic MKT engine implementing standard activation energy ($\Delta H = 83.144\text{ kJ/mol}$) and thermal excursion duration/severity analysis.
  - **Cold Chain Thermal Physics Simulator**:
    - Dry Ice (UN 1845) sublimation kinetics and remaining transit holdover hours.
    - Reefer Genset diesel fuel burn rate ($\text{L/hr}$) and total trip consumption based on temperature differential ($\Delta T$).
  - **GDP Quality Release & Batch Certificate PDF**:
    - Responsible Person (RP / QP) formal quality release workflow (`RELEASED_FOR_DISTRIBUTION`, `QUARANTINE_INVESTIGATION`, `REJECTED_DISPOSAL`).
    - Official bilingual **Pharma Cold Chain & GDP Release Certificate PDF** (EU GDP Guidelines 2013/C 343/01, WHO TRS 961 and EN 12830).
  - **Interactive Cold Chain Workbench (`/cold-chain`)**: 3-tabbed UI for live datalogger telemetry monitoring, thermal simulators, and batch quality release audit.

## [1.3.0] - 2026-08-27

### 🌟 Added
- **Multi-Currency Treasury, Hedging & IATA CASS / Ocean Carrier Auto-Reconciliation Engine**:
  - **Automated 3-Way Match Algorithm**: Deterministic reconciliation between Carrier Invoices (Airlines/CASS, Ocean Navieras, Road Carriers), Internal Bookings/Quotes, and issued Transport Manifests (B/L, AWB, CMR) with configurable variance tolerance ($\pm 1\%$ or $\pm 5\text{ EUR/USD}$).
  - **Demurrage & Surcharge Audit Engine**: Automatic detection and flagging of unauthorized detention/demurrage charges, double-billed fuel (BAF), and terminal handling (THC) discrepancies.
  - **Multi-Currency Treasury & FX Risk Monitor**: Real-time reference rate matrix (EUR base vs USD, GBP, CNY, JPY, CHF, AED), realized/unrealized FX gains & losses, unhedged exposure risk grading, and 30/60/90-day cash flow liquidity forecasting.
  - **Formal Legal Dispute & Settlement PDFs**:
    - **Carrier Freight Dispute / Debit Note PDF (*Nota de Cargo y Carta de Discrepancia*)** itemizing unauthorized surcharges with formal 14-day credit note requisition.
    - **Official Carrier Settlement Statement PDF (*Estado de Liquidación y Orden de Pago*)** detailing approved net payable amounts, IATA CASS withholdings/commissions, and official treasury sign-off.
  - **Dedicated Treasury Workbench (`/treasury`)**: 3-tabbed interactive UI (3-Way Match Conciliator, FX Treasury Monitor, and Disputes Center) with live 3-way match simulator modal.

## [1.2.0] - 2026-08-27

### 🌟 Added
- **Customs Clearance & TARIC Engine**:
  - Implemented full 54-box **DUA / SAD (Single Administrative Document)** customs declaration workflow.
  - TARIC tariff calculator computing customs duty, VAT basis (DUA Box 46), and anti-dumping rates based on HS / Combined Nomenclature codes.
  - European Union & United Nations trade sanctions screening engine.
  - Telematic export to official DUA XML and bilingual DUA PDF.
- **IATA e-Freight & Air Cargo Engine**:
  - Full e-AWB (MAWB / HAWB) management with automated **IATA Modulo-7 checksum verification**.
  - Air cargo volumetric rating engine with 1:6000 density factor ($1\text{ m}^3 = 167\text{ kg}$).
  - IATA Dangerous Goods Regulations (DGR) and lithium battery (UN 3480 / UN 3481) compliance screening.
  - Cargo-XML / Cargo-IMP (FWB / FHL) EDI messaging engine and official IATA AWB PDF export.
- **Incoterms® 2020 & Commercial Freight Contracting Engine**:
  - Complete 11-rule ICC Incoterms® 2020 catalog (`EXW`, `FCA`, `CPT`, `CIP`, `DAP`, `DPU`, `DDP`, `FAS`, `FOB`, `CFR`, `CIF`) across 10 lifecycle stages.
  - Multimodal and containerized cargo compatibility guardrails (preventing misuse of maritime terms on container freight).
  - Minimum mandatory insurance calculation (Institute Cargo Clauses A for `CIP` vs Clauses C for `CIF` at 110% value).
  - Bidirectional customs valuation normalizer under EU Union Customs Code (UCC) Art. 70–74.
  - Bilingual (EN/ES) commercial contract generation with digital signature blocks.
- **Automated Cargo Claims & Insurance Subrogation Engine**:
  - Statutory carrier liability calculators for **Hague-Visby / Hamburg Rules** ($\max(2.00\text{ SDR/kg}, \; 666.67\text{ SDR/pkg})$), **Montreal Convention 1999** ($22.00\text{ SDR/kg}$), **CMR Convention** ($8.33\text{ SDR/kg}$), and **CIM / COTIF** ($17.00\text{ SDR/kg}$).
  - Dynamic SDR-to-EUR currency converter and statutory notice deadline expiration alerts.
  - Automatic generation of **Notice of Claim / Carrier Protest Letters** and **Subrogation Receipts & Assignment of Rights** (Art. 43 LCS).
- **Automated Road Freight (FTL/LTL) & e-CMR Dispatch Engine**:
  - Dual document generation for **Geneva 24-box e-CMR** and **Spanish Carta de Porte Nacional** (Ley 15/2009 & RDL 3/2022).
  - **ADR 2025 Section 1.1.3.6 (1,000-Point Rule)** small load exemption engine with orange plate requirement indicators and tunnel restriction code screening.
  - Standard 33-Euro-pallet ($13.6\text{ m}$ trailer) / 24,000 kg payload capacity utilization meter.
  - **EU Regulation EC 561/2006** tachograph driver schedule generator computing 4.5h driving segments and 45-minute mandatory rest breaks.

---

## [1.1.0] - 2026-08-08

### Added
- **Security & RBAC**: Implemented JWT Authentication and Role-Based Access Control (`@fastify/jwt`).
- **Real-Time WebSockets**: Fastify WebSocket integration for instant system event dispatching.
- **Micro-Frontends (MFE)**: Extracted Warehouse Operations into a federated MFE using Vite Module Federation.
- **Container Planner 3D & LCL Engine**: 3D visual bin packing, center of gravity, and groupage consolidation.
- **Automated E2E Testing**: Bootstrapped Playwright test suite for super-app regression testing.
- **Dark Glassmorphism Design System**: Unified design tokens with Framer Motion animations across all packages.

---

## [1.0.0] - 2026-06-01

### Added
- Initial stable release of Atlas Logistics Monorepo (Turborepo + pnpm).
- Basic sailing schedules, ocean freight rate comparison, and BPMN 2.0 visual modeler.

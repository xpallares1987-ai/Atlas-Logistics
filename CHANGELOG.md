# Changelog

All notable changes to the Atlas Logistics monorepo are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.9.0] - 2026-08-29

### 🌟 Added
- **International Trade Finance & Documentary Credit Engine (UCP 600 / URDG 758 / URC 522 / SWIFT MT700)**:
  - **ICC Uniform Customs & Practice (UCP 600 & eUCP v2.1)**: Commercial Letters of Credit (Sight, Deferred, Acceptance Usance, Negotiation) with issuing/confirming bank workflows and presentation deadlines.
  - **Demand Guarantees & Standby Letters of Credit (URDG 758 / ISP98)**: International performance bonds, advance payment guarantees, and tender bonds with independent payment undertakings.
  - **Documentary Collections (URC 522)**: Documents against Payment (D/P) and Documents against Acceptance (D/A) processing.
  - **Deterministic UCP 600 & ISBP 745 Discrepancy Validator**:
    - **Presentation Deadline (Art. 14c & ISBP A19)**: 21-calendar-day strict limit after shipped-on-board date.
    - **Tolerance Rules (Art. 30)**: Standard $+/-5\%$ tolerance monitoring on amount and drawings.
    - **Commercial Invoice (Art. 18)**: Strict currency matching and literal goods description verification against Field 45A.
    - **Transport Documents (Arts. 19–27)**: Mandatory *Clean on Board* verification and rejection of claused bills of lading.
    - **Insurance Coverage (Art. 28)**: Statutory minimum $110\%$ CIF/CIP invoice value verification and inception date audit.
  - **Bank Fee & Commission Engine**: Quarterly opening fee calculation ($\ge 90\text{ days}$), confirmation risk spread, discrepancy penalties, and amendment charges.
  - **SWIFT Telematics & Official PDF Output**:
    - Standardized **SWIFT MT700** (Issue of Documentary Credit) and **SWIFT MT734** (Advice of Refusal) generators.
    - Official **Trade Credit Presentation Dossier PDF** under UCP 600.
    - Official **UCP 600 / ISBP 745 Discrepancy Examination Report PDF**.
    - Official **Demand Guarantee Certificate PDF** under URDG 758.
  - **Interactive Workbench (`/trade-finance`)**: 3-tabbed interface with top KPIs, credit inventory, discrepancy auditor, and bank fee simulator.

## [1.8.0] - 2026-08-29

### 🌟 Added
- **FuelEU Maritime, EU ETS & Fleet Decarbonization Engine (Regulation (EU) 2023/1805 & Directive (EU) 2023/959)**:
  - **Well-to-Wake (WtW) GHG Intensity Accounting**: Multi-fuel consumption accounting ($g\text{CO}_2\text{eq/MJ}$) including LCV and WtW factors for VLSFO, MGO, HFO, LNG (with methane slip), Bio-MGO (HVO), Bio-LNG, E-Methanol (RFNBO), and Onshore Power Supply (OPS).
  - **Statutory Reduction Trajectory & Compliance Balance (CB)**: Reduction targets from $91.16\text{ }g/\text{MJ}$ baseline ($-2\%$ 2025–2029: $89.34\text{ }g/\text{MJ}$, $-6\%$ 2030, down to $-80\%$ in 2050).
  - **Remedial Penalty & OPS Berth Non-Compliance**: Deterministic calculation of statutory financial penalties ($2,400\text{ €/t VLSFO-equiv}$) and port hotel load OPS electricity penalties ($1.50\text{ €/kWh}$).
  - **Fleet Compliance Pooling & Flexibility (Arts. 20–21)**: Pooling mechanics enabling zero-penalty neutralization between green vessels (E-Methanol/Biofuel) and conventional vessels (VLSFO), alongside banking and borrowing (1.10x).
  - **EU ETS Maritime & Green BAF Engine**: Geographical scope allocation ($100\%$ intra-EU & berth, $50\%$ extra-EU) covering $\text{CO}_2$, $\text{CH}_4$ (GWP 28), and $\text{N}_2\text{O}$ (GWP 265), with Green BAF surcharge breakdown per TEU and 40ft container.
  - **Telematics & Official Documentation**:
    - Standardized **EMSA THETIS-MRV / FuelEU XML** telematics message generator.
    - Official **FuelEU Maritime & EU ETS Compliance Certificate PDF** for Classification Society verifiers (DNV / Bureau Veritas).
    - Official **Bunker Delivery Note & Voyage GHG Emissions Audit Sheet PDF**.
  - **Dedicated FuelEU Workbench (`/fueleu-maritime`)**: 3-tabbed interactive interface for voyage GHG accounting, EU ETS carbon liability simulator, and fleet pooling manager.

## [1.7.0] - 2026-08-28

### 🌟 Added
- **Customs Warehouse, Free Zone & Special Regimes Engine (CAU Arts. 210–242 & AEAT)**:
  - **Union Customs Code (UCC / CAU) Special Regimes**:
    - **Bonded Customs Warehouse (DA - Regime 7100)**: Indefinite customs duty and import VAT suspension for non-Union goods.
    - **Non-Customs Bonded Warehouse (DDA - Regime 7600)**: VAT exemption under Spanish VAT Act (Ley 37/1992) for operations assimilated to imports.
    - **Temporary Storage Facility (ADT - Art. 149 UCC)**: Automated 90-day maximum stay deadline tracking and infraction alerts.
    - **Free Zone (ZF)**: Fiscal perimeter management for duty-free storage.
  - **Comprehensive Guarantee & Bank Bond (GRN) Management (UCC Arts. 89–98)**:
    - Real-time credit availability tracking ($\text{Available} = \text{Limit} - \sum (\text{Duty} + \text{VAT Suspendido})$).
    - Discharge Tax Settlement Simulator: Free Circulation (Regime 4071) vs Third Country Re-exportation (Regime 3171).
  - **Official Customs Stock Ledger (Libro Oficial de Existencias AEAT)**:
    - Immutable sequential ledger bookkeeping of entries, usual handlings, and discharges.
    - Automated validator of **Authorized Usual Forms of Handling** under Article 220 UCC (Annex 71-03: CE marking, repacking, testing, preservation).
  - **Official Documentation Outputs in PDF**:
    - Official **Customs Bonding Document (DVD PDF)**.
    - Official **Customs Stock & Suspended Debt Certificate PDF**.
  - **Dedicated Customs Warehouse Workbench (`/customs-warehouse`)**: 3-tabbed interactive interface for inventory lots monitoring, bank bond credit tracking, and facility capacity auditing.

## [1.6.0] - 2026-08-28

### 🌟 Added
- **Rail Intermodal Freight & Trans-European Corridors Engine (COTIF / CIM & TEN-T 750m)**:
  - **COTIF / CIM Regulatory Framework**: Uniform Rules governing international carriage of goods by rail, 17 SDR/kg statutory carrier liability limitation, and official **CIM Consignment Note PDF (UIC 992)**.
  - **Train Consist Dynamics & Braking Physics Engine**: Deterministic calculation of total convoy length vs 750m TEN-T corridor limits, train gross tonnage, total braked weight, and statutory brake percentage verification ($\ge 65\%$).
  - **UIC Line Category & Axle Load Auditor (EN 15528)**: Axle load distribution verification against infrastructure classes: Category A (16.0 t/axle), Category B (18.0 t/axle), Category C (20.0 t/axle), Category D (22.5 t/axle).
  - **P400 Rolling Motorway & Intermodal Compatibility**: Dedicated pocket wagons (Sdggmrss T3000e / Sggmrss 90') and gauge clearance checks for P400 semitrailers.
  - **European Union Railway Agency (ERA) TAF-TSI Telematic Messaging**: Standardized **TAF-TSI XML** generator for train composition data interchange with Infrastructure Managers (Adif, SNCF Réseau, DB Netze).
  - **Official Train Composition & Brake Sheet PDF**: Bilingual *Boletín Oficial de Composición de Tren y Frenado* with driver sign-off.
  - **Dedicated Rail Freight Workbench (`/rail-freight`)**: 3-tabbed interactive interface for CIM tracking across Mediterranean (RFC6) & Atlantic (RFC4) corridors, train formation simulator, and rolling stock audit.

## [1.5.0] - 2026-08-28

### 🌟 Added
- **Carbon Border Adjustment Mechanism (CBAM) & Scope 3 Decarbonization Engine (EU Reg. 2023/956)**:
  - **Comprehensive 6-Sector CBAM Catalog**: Mapped CN/TARIC codes and default emission benchmarks for Iron & Steel, Aluminium, Cement, Fertilizers, Hydrogen, and Electricity.
  - **Embedded Emissions Calculation Engine**: 100% deterministic calculation of Direct (Scope 1 process), Indirect (Scope 2 electricity), and complex precursor emissions ($SE_{\text{total}} = SE_{\text{direct}} + SE_{\text{indirect}} + SE_{\text{precursor}}$).
  - **Verified Installation Audit vs EU Defaults**: Benchmarking of verified third-country plant emission certificates against European Commission default baseline values.
  - **Article 9 Foreign Carbon Price Deduction & EU ETS Valuation**:
    - Carbon liability calculation based on weekly average EU ETS quota spot rates (€/tCO2e).
    - Statutory deduction of carbon taxes and ETS certificates effectively paid in country of origin (e.g. UK ETS, China National ETS).
  - **European Commission Official Reporting Formats**:
    - Telematic **XML Generator for the EU CBAM Transitional Registry (DG TAXUD)** following official XSD schema (Header, Declarant, Importer, Emissions, Precursors, Foreign Carbon Credits).
    - Official bilingual **CBAM Embedded Emissions & Carbon Liability Declaration Certificate PDF**.
  - **Dedicated CBAM Workbench (`/cbam`)**: 3-tabbed interactive interface for quarterly filings monitoring, emissions/precursors simulator, and EU ETS financial liability reconciliation.

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

# Atlas Logistics 🌍🚢✈️🚛

Atlas Logistics is an **enterprise-grade, multimodal Supply Chain Management (SCM) Super-App and Freight Forwarding Operating System**. It centralizes mission-critical operations for international freight forwarders, customs brokers, ocean carriers, air cargo operators, and surface logistics providers. 

The platform is architected as a modular monorepo combining a high-throughput Fastify backend, a modern Progressive Web App (PWA) host in `packages/frontend` (React 19, Vite, TailwindCSS), reusable design primitives in `packages/ui`, shared cryptographic and domain types in `packages/shared`, and specialized modules for freight rate comparison, visual BPMN process modeling, and warehouse digital twin operations.

![Atlas Logistics Status](https://img.shields.io/badge/Status-Active-success) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue) ![pnpm](https://img.shields.io/badge/pnpm-v10-orange) ![Fastify](https://img.shields.io/badge/Fastify-5.2+-emerald) ![SLSA Provenance](https://img.shields.io/badge/SLSA%20v1.0-Build%20Level%202-brightgreen) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🚀 Zero-Cost ($0 Cloud) Embedded Local Architecture

Atlas Logistics operates **100% locally with zero cloud subscription costs**, leveraging embedded, high-performance open technologies:

- **Embedded Relational Persistence:** Drizzle ORM + SQLite / libSQL operating in Write-Ahead Logging (WAL) mode with mandatory foreign key enforcement (`PRAGMA foreign_keys = ON;`). Normalized domain schemas cover parties, transport planning, execution, and workflow state.
- **SCM Core & Workflow Engine:** Domain-Driven Design (DDD) with an atomic Transactional Outbox pattern, versioned workflow runtime with topological DAG cycle detection, and high-performance CQRS BFF read models (Shipment 360 and Operations Cockpit).
- **Backend API Server:** Fastify 5 with JWT authentication (`@fastify/jwt`), Role-Based / Attribute-Based Access Control (RBAC/ABAC), and real-time native WebSockets (`ws://`).
- **Background Job Orchestration:** BullMQ + ioredis with transparent in-memory fallback for local single-process development without an external Redis instance.
- **Monorepo Workspaces:** Turborepo + pnpm workspaces with clean modular boundaries (`@atlas/frontend`, `@atlas/ui`, `@atlas/shared`, `@atlas/rate-comparer`, `@atlas/bpmn-modeler`, `@atlas/dashboard`, `@atlas/warehouse-ops`).

---

## 📦 Container Microservices & Cryptographic Provenance

Atlas Logistics builds and publishes three distinct, lightweight container images to GitHub Container Registry (GHCR):

| Container Image | Dockerfile | Purpose | SLSA Level |
| :--- | :--- | :--- | :--- |
| `ghcr.io/xpallares1987-ai/atlas-frontend:latest` | `Dockerfile` | PWA static client served via Nginx | Level 2 (Sigstore Cosign) |
| `ghcr.io/xpallares1987-ai/atlas-backend:latest` | `Dockerfile.backend` | Fastify 5 REST API & WebSocket server | Level 2 (Sigstore Cosign) |
| `ghcr.io/xpallares1987-ai/atlas-worker:latest` | `Dockerfile.worker` | BullMQ asynchronous background queue worker | Level 2 (Sigstore Cosign) |

### Supply Chain Security & Verification Gate
Every container image published to GHCR is cryptographically attested with **SLSA v1.0 Build Provenance** generated via GitHub Actions OIDC and Sigstore Cosign. Downstream deployments are protected by a blocking `verify-provenance` CI/CD gate.

To verify image provenance on any workstation:
```bash
gh attestation verify oci://ghcr.io/xpallares1987-ai/atlas-backend:latest \
  --repo xpallares1987-ai/Atlas-Logistics \
  --signer-workflow xpallares1987-ai/Atlas-Logistics/.github/workflows/ci.yml
```
*(For complete verification instructions, see [docs/setup-guides/container-provenance-verification.md](docs/setup-guides/container-provenance-verification.md)).*

---

## 📚 Technical Documentation Hub

The project's technical documentation is structured according to the **Diátaxis Documentation Framework** across four quadrants in [`docs/`](docs/README.md):

- [**SCM Platform Architecture**](docs/architecture/SCM_PLATFORM_ARCHITECTURE.md) — Aggregate models, transactional outbox, event runtime, and CQRS projections.
- [**Local Development Walkthrough**](docs/setup-guides/development-guide.md) — Setup with `pnpm`, environment variables, migration execution, and test suites.
- [**Docker & Multi-Container Infrastructure**](docs/setup-guides/docker-setup.md) — Execution profiles (default, observability, worker) and BuildKit caching.
- [**Station Context & Navigation Cockpit**](docs/setup-guides/station-context-cockpit-guide.md) — Enterprise forwarding station hierarchy, role-based station switching, and dynamic navigation.
- [**Observability & Telemetry**](docs/setup-guides/observability-monitoring.md) — Prometheus metrics (`/metrics`), Grafana dashboards, and structured Pino logging.
- [**Security & Zero-Leak Policy**](docs/setup-guides/security-backup-policy.md) — Zero-leak pre-commit guard, credential isolation, and SQLite online backup routines.
- [**Architectural Decision Records (ADRs)**](docs/adr/) — Complete historical registry of architectural standards (ADR 0001 through ADR 0022).

---

## 🌟 Platform Modules & Regulatory Capabilities

Atlas Logistics provides end-to-end operational, regulatory, and documentary coverage for multimodal international freight transport, styled with a high-contrast **Dark Glassmorphism** interface:

### 1. 🚢 Ocean Shipping & Container Logistics
- **Sailing Schedules & Demurrage**: Ocean schedule finder, cargo cut-off milestone tracking, and FMC 46 CFR Part 541 compliant Demurrage & Detention auditing.
- **3D Container Packing & Stowage**: Volumetric 3D cargo packing engine with Center of Gravity (CoG) balancing and axle weight distribution calculations.
- **LCL Consolidation Engine**: Cargo consolidation optimizer for shared container loads.
- **GlobeTracker**: Real-time interactive globe visualizer for maritime and air transport trajectories.

### 2. 🛃 Customs Brokerage & TARIC Clearance (54-Box SAD/DUA)
- **54-Box Single Administrative Document (SAD/DUA)**: Complete import/export declaration workbench with European customs syntax validation.
- **TARIC Duty Engine**: Deterministic calculation of import duties, VAT, and anti-dumping measures based on Harmonized System (HS) nomenclature.
- **International Sanctions Screening**: Commercial trade sanctions screening against EU/UN denied party lists.
- **Telematic Export**: Official DUA documents generated in standardized XML and PDF formats.

### 3. ✈️ Air Freight & IATA e-Freight (e-AWB)
- **Air Waybills (MAWB / HAWB)**: Generation and management of air waybills validated via **IATA Modulo-7 check-digit algorithms**.
- **IATA 1:6000 Volumetric Rating**: Automatic chargeable weight calculation based on standard air freight density ($1\text{ m}^3 = 167\text{ kg}$).
- **Dangerous Goods Screening (IATA DGR)**: Lithium battery classification (UN 3480 / UN 3481) and ICAO packaging instruction compliance.
- **EDI e-Freight Messaging**: Cargo-XML and Cargo-IMP (FWB / FHL) messaging alongside official IATA AWB PDFs.

### 4. 📜 Incoterms® 2020 & Commercial Contracting
- **Official 11 Incoterms® 2020 Matrix**: Allocation of operational costs and risk transfer points across 10 distinct transport stages.
- **Customs Valuation Normalizer (DUA Box 46)**: Mathematical calculation of freight/insurance additions and duty deductions under Union Customs Code (UCC Arts. 70–74).
- **Maritime Misuse Gating**: Identification of improper maritime terms (`FOB`/`CIF`) for containerized cargo and automated recommendation of multimodal equivalents (`FCA`/`CIP`).
- **Contract Generator**: Bilingual (English/Spanish) commercial sales and carriage contracts with digital signature blocks.

### 5. ⚖️ Cargo Claims & Statutory Subrogation (SDR / DEG)
- **Statutory Liability Limits (SDR / DEG)**:
  - **Ocean (Hague-Visby Rules)**: $\max(2.00\text{ SDR/kg}, \; 666.67\text{ SDR/package})$.
  - **Air (Montreal Convention 1999)**: $22.00\text{ SDR/kg}$ strict liability limit.
  - **Road (CMR Convention)**: $8.33\text{ SDR/kg}$.
  - **Rail (COTIF / CIM)**: $17.00\text{ SDR/kg}$.
- **Prescription & Notification Calendars**: Automated notifications before formal claim protest windows (3 to 14 days) and legal action statutory deadlines (1 to 2 years) expire.
- **Legal PDF Documentation**: Automatic generation of **Carrier Formal Reservation Letters** and **Subrogation / Discharge Receipts**.

### 6. 🚛 Surface Transport (FTL/LTL) & e-CMR
- **Dual Regulatory Framework**:
  - **Geneva e-CMR (IRU 24-box protocol)** for cross-border traffic.
  - **National Consignment Note** incorporating mandatory driver loading prohibitions and delay surcharges (>1h).
- **ADR 2025 Calculator (Exemption 1.1.3.6)**: Algorithmic calculation of the 1,000-point threshold for orange plate and ADR driver license exemptions.
- **Tachograph & Route Optimizer (EC 561/2006)**: Semi-trailer volume capacity planning (33 Euro-pallets / 24,000 kg) and mandatory 45-minute driver rest schedules.

### 7. 💰 Multi-Currency Treasury & Carrier Reconciliation (3-Way Match & CASS)
- **Automated 3-Way Matching Engine**: Reconciliation between carrier invoices (Airlines/CASS, Shipping Lines, Trucking), internal booking quotes, and transport documents (B/L, AWB, CMR) with configurable tolerances ($\pm 1\%$ or $\pm 5\text{ EUR/USD}$).
- **Demurrage & Surcharge Auditing**: Immediate identification of unjustified detention charges, unauthorized laytime penalties, and duplicate BAF/THC surcharges.
- **FX Currency Risk & Cash Flow Forecasting**: Multi-currency valuation matrix (EUR base vs USD, GBP, CNY, JPY, CHF, AED), latent P&L calculations, and 30/60/90-day liquidity projections.
- **Legal PDF Documentation**: Carrier Debit Notes with 14-day rectification notices and Official Settlement Statements.

### 8. ❄️ Cold Chain, Reefer Monitoring & GDP Pharma (EN 12830)
- **Regulated Thermal Profiles**: Full coverage of Ultra-Cold ($-80^\circ\text{C}$ to $-60^\circ\text{C}$ Dry Ice UN 1845), Frozen ($-25^\circ\text{C}$ to $-15^\circ\text{C}$), Refrigerated Pharma ($+2^\circ\text{C}$ to $+8^\circ\text{C}$), Controlled Room Temperature CRT ($+15^\circ\text{C}$ to $+25^\circ\text{C}$), and Fresh Perishables ($+0^\circ\text{C}$ to $+4^\circ\text{C}$).
- **Mean Kinetic Temperature (MKT - Arrhenius Equation)**: Kinetic temperature calculation ($\Delta H = 83.14\text{ kJ/mol}$) to evaluate actual thermal stress on pharmaceutical stability.
- **Thermal Physics Simulation**: Dry ice sublimation decay rates and diesel generator (genset) fuel consumption modeling.
- **GDP Inspection & Release Certificates**: Formal Responsible Person (RP / QP) disposition reports conforming to EU GDP Directives and WHO TRS 961.

### 9. 🌿 Carbon Border Adjustment Mechanism (CBAM) & Scope 3
- **Regulation (EU) 2023/956 & 2023/1773**: Complete coverage across all 6 regulated sectors (Iron & Steel, Aluminum, Cement, Fertilizers, Hydrogen, Electricity).
- **Embedded Emissions Calculation**: Direct (Scope 1) and indirect electricity (Scope 2) emissions, complex precursor calculations, and verified vs default factor comparisons.
- **EU ETS Financial Settlement**: CBAM certificate valuation based on weekly EU ETS carbon auctions with automatic origin carbon price deductions (e.g. UK ETS).
- **Official Exports**: DG TAXUD compliant XML generator for the EU CBAM Transitional Registry and formal PDF Declarations of Embedded Emissions.

### 10. 🚆 Intermodal Rail Freight & Trans-European Networks (CIM / TEN-T)
- **COTIF / CIM Uniform Rules (UIC 992)**: International rail freight dossier management and official CIM Consignment Note generation.
- **Block Train Physics & Operational Safety**: Maximum train length verification ($\le 750\text{ m}$ TEN-T standard), brake percentage computation ($\ge 65\%$), and Train Composition & Brake Sheets.
- **UIC Axle Load Auditing (EN 15528)**: Track category limits (A to D 22.5 t/axle) and P400 intermodal pocket wagon compatibility checks.
- **ERA TAF-TSI Telematics**: XML message generation for European rail infrastructure managers (Adif, SNCF Réseau, DB Netze).

### 11. 🏛️ Customs Warehouses, Free Zones & Special Procedures (UCC)
- **Special Customs Procedures (UCC Arts. 210–242)**: Customs Warehousing (Type 7100), Non-Customs Warehousing (Type 7600), Temporary Storage Facilities (ADT 90-day limit), and Free Zones (ZF).
- **AEAT Financial Guarantee Management**: Real-time available bank guarantee monitoring ($\text{Available Credit} = \text{Limit} - \sum (\text{Suspended Duty} + \text{Suspended VAT})$).
- **Stock Ledger & Usual Forms of Handling**: Immutable chronologically sequenced stock records and Annex 71-03 handling compliance checks.

### 12. 🚢 FuelEU Maritime, Maritime EU ETS & Decarbonization
- **Regulation (EU) 2023/1805 (FuelEU Maritime)**: Well-to-Wake (WtW) greenhouse gas intensity modeling ($g\text{CO}_2\text{eq/MJ}$), mandatory reduction curves ($-2\%$ in 2025 up to $-80\%$ in 2050), and Compliance Balance (CB) penalties ($2,400\text{ €/t VLSFO-equiv}$).
- **Onshore Power Supply (OPS)**: Port shore power connection logging with non-compliance penalty calculations ($1.50\text{ €/kWh}$).
- **Flexibility Mechanisms**: Fleet Pooling (Art. 21), Banking, and Borrowing multipliers.
- **Directive (EU) 2023/959 (Maritime EU ETS)**: 100% intra-EU and 50% extra-EU scope allocations for $\text{CO}_2$, $\text{CH}_4$, and $\text{N}_2\text{O}$ emissions, plus TEU Green BAF surcharge engines.
- **Official Exports**: THETIS-MRV / FuelEU XML generator and official DNV / Bureau Veritas audit-ready PDF certificates.

### 13. 🏦 Trade Finance & Documentary Credits (UCP 600 / SWIFT MT700)
- **ICC Uniform Rules**: Commercial Letters of Credit (UCP 600 / eUCP v2.1), Demand Guarantees & Standby L/Cs (URDG 758 / ISP98), and Documentary Collections (URC 522).
- **UCP 600 / ISBP 745 Discrepancy Auditing Engine**: Strict verification of the 21-day presentation rule, $+/-5\%$ tolerances, exact invoice descriptions, clean bills of lading, and 110% CIF/CIP insurance policies.
- **SWIFT Messaging**: Structured generation of **SWIFT MT700** (Issue of a Documentary Credit) and **SWIFT MT734** (Advice of Refusal) payloads.

### 14. 🛡️ Authorized Economic Operator (AEO/C-TPAT / ISO 28000)
- **AEO Self-Assessment (UCC Arts. 38–39)**: Deterministic scoring across all 6 statutory criteria for AEOF, AEOC, and AEOS authorizations.
- **C-TPAT 7-Point Container Inspection**: Mandatory 7-point physical inspection protocol for trailers and ocean containers with pest detection checks.
- **ISO 17712 High-Security Seals (Class 'H')**: Immutable seal log, chain of custody tracking, and tamper incident reporting.

### 15. ⚓ Charterparties & Laytime Calculation (BIMCO Gencon / NYPE)
- **Voyage & Time Charter Policies**: BIMCO Gencon 2022, NYPE 2015, and ASBATANKVO support with FIOST clauses, MOLOO margins, and bunker off-hire adjustments.
- **Notice of Readiness (NOR) & Turn Time**: Working day validations, 12-hour turn time lapses, and maritime conditions (**WIPON**, **WIBON**, **WIFPON**, **WCCON**).
- **Statement of Facts (SOF) & Demurrage/Despatch**: Weather Working Days (**WWD**), Sundays/Holidays Excluded (**SHEX**), and All Time Saved (**ATS**) vs Working Time Saved (**WTS**) calculations.

### 16. 🚨 General Average & Maritime Salvage (York-Antwerp Rules 2016)
- **York-Antwerp Rules (YAR 2016)**: Calculation of sacrifices and extraordinary expenditures with statutory 2.5% commission (Rule XX) and CMI annual interest (Rule XXI).
- **Lloyd's Open Form (LOF 2024 / SCOPIC)**: Salvage management with special environmental compensation clauses.
- **General Average Adjustment**: Contributory value appraisals for ship, freight at risk, and commercial CIF cargo, accompanied by Lloyd's Average Bond (Form LAB 77) generation.

### 17. ☣️ Dangerous Goods Multimodal Management (IMDG / ICAO / ADR 2025)
- **Multimodal Regulatory Matrix**: IMO IMDG Code Amdt 41-22, ICAO/IATA DGR 66th, UNECE ADR 2025, and RID 2025.
- **Chemical Segregation Table 7.2.4**: Automated pairwise $\binom{n}{2}$ segregation check for container compatibility.
- **Lithium Battery Rules**: Strict State of Charge limits ($\text{SoC} \le 30\%$) and Section IA/IB/II packaging rules for UN 3480 / UN 3481.
- **Official Documentation**: Multimodal Dangerous Goods Declarations (IMO DGD / MDGF) and IATA Shipper's Declarations.

### 18. 🛡️ Cargo Transit Insurance & Open Cover (ICC A/B/C 2009)
- **Institute Cargo Clauses**: ICC (A) All Risks, ICC (B) Major Perils, ICC (C) Basic Perils, and ICC Air.
- **Actuarial Rating & Sums Insured**: Strict 110% CIF/CIP valuation ($\text{Sum Insured} = \text{CIF Base} \times 1.10$) and war/strike risk rating.
- **Open Cover Management**: Monthly bordereau generation and average claim adjustments.

### 19. ⚓ Bulk Logistics & Port Terminal Operations (IMSBC / BLU / ASTM 54)
- **Draft Survey Hydrostatics**: 6-point draft displacement calculation with quarter-mean deflection and density adjustments.
- **IMSBC Solid Bulk Code**: Transportable Moisture Limit (TML) calculation ($\text{TML} = \text{FMP} \times 0.90$) with mandatory automated loading rejection if moisture exceeds TML.
- **Grain Stability (IMO Grain Code)**: Volumetric heeling moment calculations and residual angle of heel verification ($\theta \le 12^\circ$).
- **Liquid Bulk Ullage Survey (ASTM Tables 54A/54B)**: Free water deduction, volume correction factors (VCF), and metric ton conversions.

### 20. 🏭 Warehouse Management & 3D Digital Twin
- **Interactive 3D / 2.5D Warehouse Visualizer**: Real-time mapping of dock doors, storage racks, fulfillment tasks, and pallet inventory.

### 21. 📚 Logistics Encyclopedia & In-App Wiki (`/wiki`)
- **Operational Handbooks & Fuzzy Search (`Ctrl+K`)**: Comprehensive documentation of customs boxes, Incoterms rules, and multimodal regulations searchable instantaneously.

---

## 🏗️ Monorepo Workspaces Layout

```text
Atlas-Logistics/
├── packages/
│   ├── frontend/           # Primary PWA client host (React 19 + Vite + TailwindCSS)
│   ├── dashboard/          # Operations dashboard & telemetry visualizations
│   ├── rate-comparer/      # Freight rate parsing, rating, and carrier comparison
│   ├── bpmn-modeler/       # Visual BPMN 2.0 workflow modeling and execution engine
│   ├── warehouse-ops/      # Warehouse operations & 3D dock management
│   ├── ui/                 # Shared glassmorphism design system & atomic UI components
│   └── shared/             # TypeScript contracts, Zod schemas, WebCrypto, UN/LOCODE cache
├── src/                    # Backend API server (Fastify 5, Drizzle ORM, WebSockets)
│   ├── routes/             # REST API routes (auth, customs, air, ocean, claims, edi)
│   ├── services/           # Deterministic calculation engines & domain services
│   ├── db/                 # Drizzle schemas, migrations, and deterministic seeders
│   └── bpm/workers/        # BullMQ asynchronous queue workers
├── drizzle/                # Snapshot migration folders generated by Drizzle Kit
├── docs/                   # Diátaxis technical documentation hub (Tutorials, How-To, Ref, Arch)
└── tests/                  # Unit, integration, and Playwright end-to-end test suites
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v22.x` (LTS recommended) or `v24.x`
- **pnpm**: `v10.x` or higher (enable via `corepack enable pnpm`)
- **Git**: Installed with GPG or SSH commit signing configured

### Step-by-Step Setup

1. **Clone the Repository:**
```bash
git clone https://github.com/xpallares1987-ai/Atlas-Logistics.git
cd Atlas-Logistics
```

2. **Install Workspace Dependencies:**
```bash
pnpm install
```

3. **Initialize Environment Variables:**
```bash
cp .env.example .env.local
```

4. **Migrate and Seed the Database:**
```bash
# Execute Drizzle migrations on data/dev.db
pnpm run db:migrate

# Seed deterministic domain entities (including canonical shipment sh_demo_01)
pnpm run db:seed
```

5. **Start the Development Servers:**
```bash
pnpm run dev
```
*The Vite frontend host listens on `http://localhost:3000` (or configured port) and the Fastify backend API listens on `http://localhost:3001`.*

---

## 🛠️ Common Operations & Quality Scripts

| Command | Utility | When to Run |
| :--- | :--- | :--- |
| `pnpm run build` | Compiles root backend and all workspace packages | Prior to release |
| `pnpm test` | Runs the full Vitest unit and integration test suite | Before every commit |
| `pnpm vitest run tests/scm-*` | Executes SCM domain engine integration tests | SCM development |
| `pnpm run audit:ddl-drift` | Verifies Drizzle migration consistency & schema parity | Database changes |
| `pnpm run audit:legacy-docs` | Verifies zero legacy database/infrastructure terms | Documentation updates |
| `pnpm run audit:links` | Verifies all markdown relative links across the repository | Documentation updates |
| `pnpm run test:backup-restore` | Tests SQLite WAL backup, VACUUM INTO, and DR restore | Database & DR drills |
| `pnpm run check:file-sizes` | Enforces the <1,000 line modularity limit on page files | Frontend development |
| `pnpm run lint` | Runs ESLint across root and monorepo packages | Prior to commits |
| `pnpm run audit:leaks:staged`| Scans staged files for confidential tokens or leaks | Pre-commit hook & CI |
| `npx playwright test` | Runs automated end-to-end browser test suites | Pre-deployment |

---

## 🗄️ Database Environment Isolation

Atlas Logistics utilizes strict database file isolation per environment:

| Environment | Database Target | Configuration File | Management Commands |
| :--- | :--- | :--- | :--- |
| **Development** (`development`) | `file:data/dev.db` | `.env.local` | `pnpm run db:migrate`<br>`pnpm run db:seed`<br>`pnpm run dev` |
| **Production** (`production`) | `file:/app/data/prod.db` *(or distributed `libsql://`)* | `.env.production` | `pnpm run db:migrate`<br>`pnpm run db:seed`<br>`pnpm run start:prod` |

---

## 📄 License

This project is licensed under the terms of the **MIT License**.

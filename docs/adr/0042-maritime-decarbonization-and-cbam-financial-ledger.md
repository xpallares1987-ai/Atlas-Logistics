# 0042. Maritime Decarbonization, CBAM Financial Ledger & ISO 20022 Settlement

- **Status**: Accepted
- **Date**: 2026-11-23
- **Context**: EU CBAM Definitive Regime (Regulation (EU) 2023/956), FuelEU Maritime (Regulation (EU) 2023/1805), EU ETS Maritime Expansion (Directive (EU) 2023/959), EEX Carbon Auction Indexing, ISO 20022 Financial Settlement (`pain.001`/`camt.053`)
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **See Also**: [ADR 0004](0004-zero-cost-local-architecture.md), [ADR 0017](0017-fueleu-maritime-ets-carbon-insetting.md), [ADR 0020](0020-frontend-modular-decomposition-and-file-size-guardrails.md), [ADR 0028](0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md), [ADR 0037](0037-sqlite-wal-concurrency-and-monorepo-invariants.md), [ADR 0040](0040-financial-settlement-automated-clearing-and-outbox-event-bus.md), [ADR 0041](0041-intelligent-document-processing-and-ruggedized-wms.md)

---

## 1. Context & Problem Statement

The European Union's "Fit for 55" regulatory framework imposes strict decarbonization obligations and direct financial liabilities across international logistics, maritime shipping lines, and cross-border freight forwarders:

1. **Transition from CBAM Transitional to Definitive Financial Regime (2026+)**:
   Under Regulation (EU) 2023/956, the transitional phase (October 1, 2023 to December 31, 2025) mandated quarterly reporting of direct and indirect greenhouse gas (GHG) embedded emissions without financial adjustment. Beginning January 1, 2026, authorized CBAM declarants must financially settle carbon liabilities by purchasing and surrendering electronic CBAM certificates corresponding to embedded emissions ($tCO_2e$) in imported carbon-intensive goods (iron & steel, aluminum, cement, fertilizers, hydrogen, electricity).
   Certificates are priced weekly based on the volume-weighted average auction price of European Union Allowance (EUA) units on the European Energy Exchange (EEX). Declarants are entitled under Article 9 to deduct verified carbon prices already paid in third countries of origin (e.g., UK ETS, Canadian Federal Carbon Pricing).

2. **FuelEU Maritime Compliance Balance & Decarbonization Mandate (2025+)**:
   Regulation (EU) 2023/1805 sets legally binding greenhouse gas intensity reduction limits for energy used on board by commercial vessels (>5,000 GT) arriving at, berthed in, or departing from EU ports:
   - 2% reduction starting January 1, 2025 (baseline: $91.16\text{ gCO}_2\text{e/MJ}$, target: $89.34\text{ gCO}_2\text{e/MJ}$).
   - 6% reduction in 2030, scaling to 80% reduction by 2050.
   - Mandatory Onshore Power Supply (OPS) connection at berth for container and passenger ships from 2030.
   Vessels with a deficit (actual GHG intensity exceeding target) face severe financial compliance penalties (€2,400 per metric ton of VLSFO energy equivalent). The regulation authorizes compliance balance mechanisms:
   - **Banking**: Surplus compliance balance can be saved for subsequent verification periods.
   - **Borrowing**: Deficits can be borrowed from the next period with a 10% penalty factor.
   - **Pooling**: Shipping lines and alliances can pool compliance balances across multiple vessels to eliminate deficits across a collective fleet.

3. **Institutional Financial Settlement via ISO 20022**:
   High-value statutory transactions—including purchasing CBAM certificates from National Competent Authorities (NCAs), settling FuelEU compliance pool balances, and billing Green BAF bunker adjustments—cannot rely on informal payment notices or proprietary credit card gateways. Enterprise financial treasury demands automated, cryptographically secure banking settlement via modern ISO 20022 XML messaging (`pain.001.001.09` for initiating SEPA/SWIFT credit transfers and `camt.053.001.08` for end-of-day bank statement reconciliation).

4. **Zero-Cost Embedded Architecture Constraint**:
   Per the foundational architectural mandate ([ADR 0004](0004-zero-cost-local-architecture.md), [ADR 0037](0037-sqlite-wal-concurrency-and-monorepo-invariants.md)), the enterprise decarbonization and financial settlement stack must operate with **$0.00 infrastructure costs**, relying on SQLite WAL, deterministic local mathematics, and zero third-party carbon accounting SaaS or paid API aggregators.

---

## 2. Decision Drivers

- **Regulatory Compliance Precision**: Full mathematical compliance with Regulation (EU) 2023/956 (CBAM definitive rules), Commission Implementing Regulation (EU) 2023/1773, and Regulation (EU) 2023/1805 (FuelEU Maritime).
- **Multi-Jurisdictional Tax Deductions**: Exact accounting for foreign carbon taxes paid in countries of origin pursuant to CBAM Article 9, preventing double taxation.
- **Financial Scaled-Integer Precision**: Invariant adherence to penny/cent monetary precision ([ADR 0040](0040-financial-settlement-automated-clearing-and-outbox-event-bus.md)) preventing IEEE-754 floating point rounding drift.
- **Banking Interoperability**: Direct generation and ingestion of ISO 20022 schemas (`pain.001` credit transfer initiation and `camt.053` electronic account statement).
- **Auditability & Traceability**: Cryptographic hash chaining on quarterly declaration line items and certificate surrender records.
- **Frontend Modularity & Safety**: Compliance with [ADR 0020](0020-frontend-modular-decomposition-and-file-size-guardrails.md) (<1,000 lines, target <700 lines) and strict Zero-innerHTML DOM boundaries.

---

## 3. Considered Options

1. **Option A: External ESG & Carbon Accounting SaaS (e.g., Watershed, Persefoni, CarbonCloud)**:
   - *Pros*: Pre-packaged emission factors and dashboards.
   - *Cons*: Violates the $0.00 zero-cost infrastructure mandate; exposes proprietary customs declaration volumes and commercial pricing to third-party multi-tenant SaaS; recurring subscription fees ($20k–$80k/year).
2. **Option B: Manual Spreadsheet & PDF Clearinghouse**:
   - *Pros*: Zero external software acquisition cost.
   - *Cons*: High human error rate in volume-weighted EEX auction indexing; non-standard banking reconciliation; delayed certificate surrenders risking EU customs import suspensions and €100/tonne penalties.
3. **Option C: Native Embedded SQLite WAL Fiscal Ledger & ISO 20022 Engine (Selected)**:
   - *Pros*: Completely sovereign, offline-resilient local execution; exact regulatory formulas embedded in pure domain engines; automated generation of official EU registry XML and ISO 20022 payment packages; zero SaaS costs.

---

## 4. Architectural Design & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LOGISTICS OPERATIONAL ENGINE                    │
│   (Customs DUAs / MRN / Bill of Lading / Vessel AIS & Bunker Records)  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│        CBAM DEFINITIVE ENGINE        │ │     FUELEU MARITIME ENGINE    │
│  - Annex I CN Commodity Classifiers  │ │  - Well-to-Wake GHG Intensity │
│  - Specific Embedded Emissions (SEE) │ │  - Baseline: 91.16 gCO2e/MJ   │
│  - EEX Weekly EUA Auction Indexer    │ │  - Fleet Pooling & Banking    │
│  - Article 9 Foreign Tax Deductions  │ │  - Compliance Balance (CB)    │
└───────────────────┬──────────────────┘ └───────────────┬───────────────┘
                    │                                    │
                    └─────────────────┬──────────────────┘
                                      │ Net Liabilities & Pool Balances
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   SOVEREIGN FINANCIAL LEDGER (SQLite WAL)              │
│   - Certificate Inventory & Holding Accounts (Active, Surrendered)     │
│   - Micro-cent Monetary Balances & Multi-Currency Valuation            │
│   - Transactional Outbox Event Bus (`financial.cbam.settlement`)       │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │ Settlement Order
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 ISO 20022 FINANCIAL SETTLEMENT GATEWAY                 │
│   - `pain.001.001.09`: Institutional Wire Transfer (SEPA / SWIFT)      │
│   - `camt.053.001.08`: Bank Statement Reconciliation & Matcher         │
│   - Official EU CBAM Registry XML Export (Art. 35 Schema)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Mathematical Formulations & Regulatory Invariants

### 5.1. CBAM Embedded Emissions & Net Carbon Liability

For imported goods under Annex I of Regulation (EU) 2023/956:

$$\text{SEE}_{\text{total}} = \text{SEE}_{\text{direct}} + \text{SEE}_{\text{indirect}} + \text{SEE}_{\text{precursors}} \quad [\text{tCO}_2\text{e / tonne}]$$

$$\text{Gross Liability} = \text{Net Weight} \times \text{SEE}_{\text{total}} \times P_{\text{EEX}} \quad [\text{EUR}]$$

Where $P_{\text{EEX}}$ is the volume-weighted average price of EU ETS allowances auctioned on the common auction platform during the preceding calendar week.

Under **Article 9 (Carbon price paid in a country of origin)**:

$$\text{Net Liability} = \max\left(0, \; \text{Gross Liability} - \sum (\text{Line Net Mass} \times P_{\text{foreign\_paid}})\right)$$

The number of CBAM certificates to surrender by May 31 for year $t-1$ is:

$$N_{\text{certs}} = \left\lceil \sum \text{Embedded Emissions} - \text{Deduction}_{\text{foreign}} \right\rceil$$

### 5.2. FuelEU Maritime Compliance Balance ($CB$)

Under Regulation (EU) 2023/1805, Annex IV:

$$\text{CB} = \left( \text{GHG}_{\text{target}} - \text{GHG}_{\text{actual}} \right) \times \sum_{i} \left( M_i \times \text{LCV}_i \right) \quad [\text{gCO}_2\text{e}]$$

- If $\text{CB} \ge 0$: The vessel has a **Compliance Surplus** and may bank the balance or contribute to a fleet pool.
- If $\text{CB} < 0$: The vessel has a **Compliance Deficit**. If not covered by pooling or borrowing, a remedial penalty is imposed:

$$\text{Penalty} = \frac{|\text{CB}|}{\text{GHG}_{\text{actual}} \times 41.0 \times 10^6} \times 2400 \quad [\text{EUR}]$$

Where $41.0 \text{ MJ/kg}$ is the standard lower calorific value (LCV) for VLSFO, and €2,400 is the statutory penalty per metric ton of fuel equivalent.

---

## 6. ISO 20022 Financial Settlement Integration

Settlement of statutory carbon liabilities and pooling compensations is codified through normalized ISO 20022 XML schemas:

1. **`pain.001.001.09` (Customer Credit Transfer Initiation)**:
   - Generated when the finance team authorizes purchase of CBAM certificates from the national treasury or pays fuel compliance fees.
   - Contains `GrpHdr` (Message Identification, Creation Date/Time, Number of Transactions, Control Sum).
   - Contains `PmtInf` with debtor IBAN/BIC, creditor IBAN (National Competent Authority or Pooling Counterpart), structured Remittance Information (`RmtInf`) specifying declaration and certificate batches.

2. **`camt.053.001.08` (Bank-to-Customer Statement)**:
   - Ingested to reconcile treasury bank account statements against outstanding certificate purchase orders.
   - Automatically marks pending certificate ledger records as `SETTLED` when credit transfer matching passes hash and amount validation.

---

## 7. Database Entity Architecture

The financial and regulatory state machine connects directly to the SQLite schema:

```
┌─────────────────────────────────┐       ┌───────────────────────────────────┐
│        cbam_declarations        │       │       cbam_declaration_lines      │
├─────────────────────────────────┤       ├───────────────────────────────────┤
│ id (PK, TEXT)                   │1     *│ id (PK, TEXT)                     │
│ declaration_number (UNIQUE)     ├───────┤ declaration_id (FK)               │
│ reporting_period (e.g. 2026-Q1) │       │ dua_number, hs_code               │
│ gross_carbon_liability_eur      │       │ net_weight_tonnes                 │
│ carbon_price_paid_foreign_eur   │       │ direct/indirect_emissions_tco2e   │
│ net_carbon_liability_eur        │       │ line_gross/net_liability_eur      │
│ status (DRAFT/VALIDATED/SETTLED)│       │ installation_id (FK)              │
└────────────────┬────────────────┘       └───────────────────────────────────┘
                 │
                 │ 1
                 ▼ *
┌─────────────────────────────────┐       ┌───────────────────────────────────┐
│     cbam_certificate_ledger     │       │    fueleu_compliance_balances     │
├─────────────────────────────────┤       ├───────────────────────────────────┤
│ id (PK, TEXT)                   │       │ id (PK, TEXT)                     │
│ account_id (FK to companies)    │       │ vessel_imo (TEXT)                 │
│ certificate_batch_ref (TEXT)    │       │ reporting_year (INTEGER)          │
│ units_acquired (INTEGER)        │       │ energy_consumption_mj (REAL)      │
│ unit_price_eur (REAL)           │       │ ghg_actual_gco2e_mj (REAL)        │
│ units_surrendered (INTEGER)     │       │ compliance_balance_gco2e (REAL)   │
│ iso20022_payment_id (FK)        │       │ pool_group_id (TEXT)              │
│ expiration_date (TIMESTAMP)     │       │ status (SURPLUS/DEFICIT/POOLED)   │
└─────────────────────────────────┘       └───────────────────────────────────┘
```

---

## 8. Frontend Interface (`CbamLedgerModule.tsx`) Standards

In accordance with [ADR 0020](0020-frontend-modular-decomposition-and-file-size-guardrails.md):
- **Page File Size Limit**: Must remain strictly under 700 lines.
- **Zero-innerHTML DOM Construction**: Never use `dangerouslySetInnerHTML` or string interpolation into raw DOM elements.
- **High-Contrast Regulatory Banners**: Clear visual indicators for certificate holding levels, EEX benchmark pricing, and FuelEU pooling status.
- **Interactive Simulator**: Instant evaluation of certificate procurement requirements and net liability after foreign carbon tax deductions.
- **Native ISO 20022 Export**: Instant generation and download of valid `pain.001.001.09` XML files for corporate banking portals.

---

## 9. Consequences & Invariants

### Positive Consequences
- **Complete Decarbonization Governance**: Seamless execution of EU CBAM 2026 definitive rules and FuelEU Maritime compliance.
- **Zero Additional SaaS Costs**: Eliminates third-party carbon accounting subscriptions ($0.00 infrastructure mandate).
- **Audit-Ready Financials**: Every certificate acquisition and surrender is paired with an immutable ISO 20022 transaction reference.

### Non-Negotiable Invariants
- **Article 9 Proof Requirement**: Foreign carbon tax deductions cannot exceed effective paid amounts and must reference verified third-country tax receipts.
- **Scaled-Integer Micro-Cent Arithmetic**: Certificate valuations and liability calculations must avoid floating-point drift.
- **Certificate Expiration Governance**: CBAM certificates have a statutory validity of 2 years; certificates nearing expiration must be prioritized for annual surrender.

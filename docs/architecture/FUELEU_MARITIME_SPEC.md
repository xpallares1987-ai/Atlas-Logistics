# FuelEU Maritime & Maritime EU ETS — Technical & Architectural Specification

**Status**: Accepted & Implemented (P1-A / ADR 0017 & ADR 0042)  
**Authors**: Maritime Decarbonization & ESG Engineering  
**Regulatory Basis**: Regulation (EU) 2023/1805 (FuelEU Maritime) & Directive (EU) 2023/959 (Maritime EU ETS)  
**Domain Bounded Context**: `src/modules/fueleu/` & `src/modules/carbon-insetting/`

---

## 1. Executive Summary & Legal Framework

The maritime transport sector accounts for 3–4% of the EU's total $\text{CO}_2$ emissions. To meet the European Green Deal and "Fit for 55" statutory objectives, the European Union established a dual regulatory mechanism:
1. **Regulation (EU) 2023/1805 (FuelEU Maritime)**: Mandatory Well-to-Wake (WtW) greenhouse gas intensity reductions for energy used onboard commercial ships over 5,000 gross tonnage (GT).
2. **Directive (EU) 2023/959 (Maritime EU ETS)**: Cap-and-trade carbon surrender system covering 100% of emissions between EU ports and 50% of emissions for voyages between EU and non-EU ports.

Atlas Logistics integrates a zero-cloud maritime decarbonization engine that models Well-to-Wake fuel intensity, computes statutory Compliance Balances, calculates 2,400 €/t financial penalties, orchestrates Article 21 Fleet Pooling, and tracks Onshore Power Supply (OPS) shore power connections.

---

## 2. Regulatory Targets & Trajectory

FuelEU Maritime sets binding annual limits on the Well-to-Wake GHG intensity of onboard energy consumption, relative to the 2020 reference baseline ($91.16\text{ gCO}_2\text{eq/MJ}$):

| Calendar Year | Mandatory Intensity Reduction | Statutory GHG Intensity Limit ($g\text{CO}_2\text{eq/MJ}$) |
| :--- | :--- | :--- |
| **2025** | **-2.0%** | **89.34** |
| **2030** | **-6.0%** | **85.69** |
| **2035** | **-14.5%** | **77.94** |
| **2040** | **-31.0%** | **62.90** |
| **2045** | **-62.0%** | **34.64** |
| **2050** | **-80.0%** | **18.23** |

---

## 3. Mathematical & Algorithmic Formulation

### 3.1 Well-to-Wake (WtW) Intensity Equation
The GHG intensity of the energy consumed on board incorporates carbon dioxide ($\text{CO}_2$), methane ($\text{CH}_4$), and nitrous oxide ($\text{N}_2\text{O}$):

$$\text{GHGIE}_{\text{actual}} = \frac{\sum_{i=1}^{c} M_i \times \text{CO}_{2\text{eq, WtW}, i}}{\sum_{i=1}^{c} M_i \times \text{LCV}_i + \sum_{k=1}^{e} E_k}$$

Where:
- $M_i$: Mass of fuel $i$ consumed (in metric tons).
- $\text{CO}_{2\text{eq, WtW}, i}$: Well-to-Wake emission factor ($\text{gCO}_2\text{eq/g fuel}$), accounting for Well-to-Tank (extraction, refining, transport) and Tank-to-Wake (combustion and engine slip).
- $\text{LCV}_i$: Lower Calorific Value of fuel $i$ ($\text{MJ/g}$).
- $E_k$: Electricity supplied through Onshore Power Supply (OPS) or non-fuel renewable energy.

### 3.2 Compliance Balance (CB) Formulation
The engine calculates whether the vessel generates a surplus or deficit:

$$\text{CB} = (\text{GHGIE}_{\text{target}} - \text{GHGIE}_{\text{actual}}) \times \left( \sum_{i} M_i \times \text{LCV}_i + \sum_{k} E_k \right)$$

- **Positive Balance ($\text{CB} > 0$)**: The vessel has achieved excess compliance. The surplus may be banked for future reporting periods or allocated to an Article 21 Fleet Pool.
- **Negative Balance ($\text{CB} < 0$)**: The vessel is non-compliant and incurs a statutory monetary penalty.

### 3.3 Statutory Penalty Calculation
Under Article 23(2), if a deficit remains after applying flexibility mechanisms, the financial penalty is levied at **2,400 EUR per metric ton of VLSFO-equivalent**:

$$\text{Penalty}_{\text{EUR}} = \frac{|\text{CB}|}{\text{LCV}_{\text{VLSFO}} \times \text{Factor}} \times 2,400\text{ EUR}$$

Where $\text{LCV}_{\text{VLSFO}} = 41.0\text{ MJ/kg}$.

---

## 4. Flexibility Mechanisms & Pooling Architecture

```mermaid
flowchart TD
    V1["Vessel Alpha (M/T)\nGreen Methanol (-45 g/MJ)\nSurplus: +12,400 GJ"] --> Pool["Article 21 Fleet Pool\nConsortium Clearing"]
    V2["Vessel Beta (Container)\nBio-LNG (-15 g/MJ)\nSurplus: +5,200 GJ"] --> Pool
    V3["Vessel Gamma (Bulk)\nVLSFO (+3.2 g/MJ)\nDeficit: -8,900 GJ"] <-- Compensated By -- Pool
    V4["Vessel Delta (Tanker)\nMGO (+2.8 g/MJ)\nDeficit: -6,100 GJ"] <-- Compensated By -- Pool
    Pool --> NetResult["Net Pool Balance: +2,600 GJ\nTotal Statutory Penalty: 0.00 EUR"]
```

### 4.1 Fleet Pooling (Article 21)
Atlas Logistics enables multi-vessel and multi-owner pooling:
- Verified emissions and compliance balances from two or more vessels are aggregated into a single compliance pool.
- The engine solves an optimization problem to eliminate non-compliance penalties across the consortium.
- Generates legally binding Pool Verification Agreements compliant with DNV and Bureau Veritas requirements.

### 4.2 Banking and Borrowing (Articles 20 & 21)
- **Banking**: Surplus compliance balance can be rolled over to the next compliance period ($t+1$) without penalty.
- **Borrowing**: A deficit may be advanced from period $t+1$ subject to a **1.10 multiplier penalty** ($\text{Borrowing} \times 1.10$), provided the borrowed amount does not exceed 2% of the vessel's annual energy consumption limit.

### 4.3 Onshore Power Supply (OPS / Cold Ironing)
Under Article 6, container and passenger ships must connect to OPS in EU ports from January 1, 2030 (with mandatory logging in principal TEN-T ports starting 2025):
- Ports with OPS availability log connection duration, kWh transferred, and berth timestamps.
- Unauthorized disconnection incurs an automatic penalty of **1.50 EUR per kWh** demanded by the ship.

---

## 5. REST API Endpoints Specification (`fueleu.routes.ts`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/fueleu/voyages` | Ingest vessel voyage leg with fuel consumption by fuel type |
| `GET` | `/api/fueleu/compliance-balance` | Calculate instantaneous vessel Compliance Balance ($g\text{CO}_2\text{eq/MJ}$ and EUR) |
| `POST` | `/api/fueleu/pools` | Create and register an Article 21 Fleet Pool consortium |
| `POST` | `/api/fueleu/pools/:id/allocate` | Execute optimal surplus-to-deficit allocation across pool vessels |
| `POST` | `/api/fueleu/ops/sessions` | Record port shore power connection telemetry |
| `GET` | `/api/fueleu/thetis-mrv/export` | Generate official THETIS-MRV / FuelEU XML declaration package |

---

## 6. Verification & Quality Gates
- **Unit & Integration Tests**: Verified in [`tests/wave3-zero-any-and-domain-openapi.test.ts`](../../tests/wave3-zero-any-and-domain-openapi.test.ts) (18 endpoints, 18 schemas).
- **Physical Isolation**: Data stored in SQLite WAL (`data/dev.db` / `data/prod.db`).
- **Audit Reports**: Native PDF export conforming to DNV and Bureau Veritas FuelEU Monitoring Plan formats.

# 0017. EU Maritime Regulatory Compliance Engine, EU ETS Settlement, and Cryptographic Insetting Ledger (Book-and-Claim)

- **Status**: Accepted
- **Date**: 2026-11-11
- **Context**: Atlas Logistics Monorepo (`@atlas/frontend`, `@atlas/ui`, `@atlas/shared`, Fastify Backend, Drizzle ORM / SQLite WAL, Sustainability Engine)
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **Authors**: Atlas Logistics Architecture Team & Sustainability Compliance Officers

---

## 1. Context & Problem Statement

The international container shipping and freight forwarding industry faces mandatory European Union decarbonization frameworks imposing immediate financial and reporting obligations:

1. **Regulation (EU) 2023/1805 (FuelEU Maritime)**: Mandates reductions in the greenhouse gas (GHG) intensity of onboard energy, requiring a -2% reduction for the 2025/2026 compliance cycle (target intensity of 89.3368 gCO2eq/MJ versus the fossil comparator of 91.16 gCO2eq/MJ). Energy compliance deficits incur statutory penalties of **€2,400 per metric ton of VLSFO equivalent** (41,000 MJ/t).
2. **Directive (EU) 2023/959 (Maritime Inclusion in the EU ETS)**: Mandates the surrender of European Union Allowances (EUAs) according to a statutory phase-in schedule:
   - **2024**: 40% of reported emissions.
   - **2025**: 70% of reported emissions.
   - **2026 onwards**: 100% of reported emissions.
   - **Geographic Scope**: 100% of emissions between EU ports of call (*Intra-EU*) and at-berth stays; 50% of emissions on voyages between EU and non-EU ports (*Extra-EU*).
3. **Scope 3 Decarbonization & Cryptographic Insetting**: To mitigate Green BAF surcharges and fulfill SBTi targets without risk of greenwashing, shippers and forwarders require a certified *Book-and-Claim* mass-balance model conforming to **ISO 14083** and **GLEC Framework v3.0**. This requires immutable traceability linking physical Bunker Delivery Notes (BDNs) and ISCC-EU sustainability proofs directly to beneficiary shipments, preventing double-counting.

---

## 2. Architectural Decisions

### 2.1. Relational Persistence & Drizzle Migration 0027 (SQLite WAL)
Implemented three canonical database entities in SQLite WAL mode with strict foreign key constraints (`PRAGMA foreign_keys = ON;`):
- `carbon_insetting_tokens`: Stores certified batches of physical biofuels (B100, HVO100) and RFNBO (e-Methanol), recording bunkered volume, available energy (MJ), certified WTW carbon intensity, and SHA-256 genesis stamp.
- `carbon_insetting_allocations`: Records the irrevocable retirement and allocation of low-carbon energy to operational shipments (`sh_demo_01`), cryptographically linking every block to the preceding transaction hash (`previous_block_hash`).
- `fuel_eu_penalties_ledger`: Ledger for calculating energy deficit compliance penalties under Article 23 of Regulation (EU) 2023/1805.

### 2.2. Cryptographic Block Chaining (Zero Mocks / Mass-Balance)
The `CarbonInsettingLedgerService` implements a deterministic hash chain using WebCrypto / Node.js `crypto` with SHA-256:
- **Genesis Block**: Anchored at `64 zeroes`.
- **Audit Immutability**: Each allocation calculates the block digest by concatenating issuance reference, physical token ID, beneficiary shipment ID, allocated energy, avoided tCO2eq, and previous block hash.
- **Dynamic Verification**: The `/api/carbon-insetting/allocations/verify` endpoint verifies the mathematical integrity of the entire chain, preventing tampering and double allocation.

### 2.3. EU ETS Settlement Engine & Dynamic Green BAF
The `EtsGreenBafSettlementService` provides:
- Exact evaluation of statutory phase-in coefficients (70% in 2025, 100% in 2026).
- Geographic weighting factors (1.0 intra-EU / 0.5 extra-EU) and multi-pollutant global warming potential accounting (GWP: CO2 = 1.0, CH4 = 28.0, N2O = 265.0).
- Granular Green BAF surcharges per TEU and FEU (40ft container).
- Operational endpoint `/api/fueleu/ets/settle` to settle surcharges directly at shipment level (`sh_demo_01`).

### 2.4. Official THETIS-MRV XML Generation (EMSA Standard)
The `ThetisMrvXmlService` produces structured XML reports complying with European Maritime Safety Agency (EMSA) specifications for combined EU MRV and FuelEU Maritime declarations.

### 2.5. Zero Mocks Frontend Standard
Refactored `CarbonInsettingModule.tsx` and `FuelEuMaritimeModule.tsx`:
- Removed mock states (`useState(SEED_INSETTING_TOKENS)`).
- Bound live data via `useApiQuery` and `useApiMutation` (`/api/carbon-insetting/tokens`, `/api/carbon-insetting/allocations`, `/api/fueleu/voyages`, `/api/fueleu/penalties`).
- Added dynamic shipment selection with fallback to the canonical shipment `sh_demo_01` (`BK-2026-67116`).
- Live e-BDN certificate generation with verification QR codes and cryptographic hash receipts.

---

## 3. Consequences

### Positive
- **Regulatory Readiness (2025/2026)**: Atlas Logistics supports both FuelEU Maritime and the 70% 2025 ETS phase-in, enabling shippers to forecast surcharges or execute verified insetting.
- **Uncompromised Cryptographic Auditability**: Scope 3 carbon reduction claims are verifiable by external third-party auditors (DNV, Bureau Veritas).
- **Diátaxis and Zero Mocks Alignment**: 100% adherence to repository guidelines in `AGENTS.md`.

---

## 4. Verification State
- **Database Migration**: `drizzle/0027_fueleu_insetting_ledger.sql` executed.
- **Automated Tests**: 100% pass rate in Vitest (`tests/carbon-insetting-ledger.test.ts`, `tests/ets-green-baf.test.ts`, `src/modules/fueleu/fueleu.routes.test.ts`).
- **Type Checking**: `pnpm run type-check` (0 errors).
- **Leak Audit**: `pnpm run audit:leaks` (0 leaks detected).

# [1.1.0](https://github.com/xpallares1987-ai/Atlas-Logistics/compare/v1.0.0...v1.1.0) (2026-09-06)


### Bug Fixes

* **auth,ratelimit:** harmonize route auth hooks and allowlist localhost to prevent 429 in E2E tests ([095bcd0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/095bcd0155b6e049476aea9a37d694918ad371ba))
* **db:** add idempotent migration 0021 for carbon and telemetry schemas and harmonize CI with db:migrate ([f6c00ec](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f6c00ec586d6ab85d25dabb58aa005d5c6fb82a2))
* **devcontainer:** repair invalid YAML in docker-compose DATABASE_URL, unblocking Codespaces prebuild ([f8b4def](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f8b4def21f8874cddd4d1fe60afe547d4ca76b34))
* **e2e:** scope ADR & tachograph modal assertions to avoid strict mode ambiguity in road freight test ([4d5a7c0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4d5a7c003732d1014841862897b2a5a0c57d8a0f))
* **pdf:** import and export CustomsData as type to fix ESM SyntaxError on backend bootstrap ([af9f233](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/af9f2335ba669fc3845c80416e34903403cceaa7))
* replace failing postgresql devcontainer feature with docker-compose service ([#66](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/66)) ([5ec66f1](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5ec66f17c592ad4ea268861c4ea1d007a58825f4))
* resolve adminRoutes import error and finally add dev script ([89b6e93](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/89b6e936f0b93941197ace55c836b2528ad737e8))
* resolve date-fns missing module and add dev script for e2e tests ([ffc2e27](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ffc2e27d794480488d4534d6a2a0be4b6861ae14))
* resolve E2E timeouts and CI db migration failures ([78e117f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/78e117f1e0fd38d8e288a6e6ad19ddb4d84cb02e))
* **security:** resolve CodeQL alerts [#196](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/196) (insecure randomness) and [#207](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/207) (path traversal in backup test) ([e68d212](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e68d21207a0e04149fe51c454c82cf5a225b25a2))
* **security:** resolve CodeQL SAST alerts [#188](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/188)-[#195](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/195) (path-injection & regex-injection) ([96d5bc0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/96d5bc0a41c65cb1a3baf88297595769f88cb8ec))
* **security:** sanitize isWithinDirectory with resolved startsWith and replace test stat with readdir ([172c854](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/172c8546003534336f65e1c372317645fefb0524))
* **seeds:** modularize and include carbon and telemetry domain seeds in master seeder runner, unblocking CI ([4927a6b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4927a6b0ae4a0af348a3c8d959ab8dbb89c02062))
* **test:** correct Playwright baseURL port to 3000 to match Vite dev server ([e969d3e](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e969d3e70d9ccedf1daaf35c56750c3ea3c2698d))
* **ui:** integrate favicon.png across frontend html, public assets, and backend server ([b01882f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/b01882f6a86f5d4d38ebeb9c1aa0bd82b0fcea1e))


### Features

* **aeo-security:** implement Authorized Economic Operator (AEO / OEA) & Supply Chain Security Engine (UCC Art. 38-39 / C-TPAT / ISO 28000 / ISO 17712) ([cd1aaf2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/cd1aaf29792fa2f1c671c587045aff15fd041f97))
* **air-cargo:** implement IATA e-Freight and Air Cargo (e-AWB) engine with Modulo-7, DGR screening, and Cargo-XML/IMP ([4534d58](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4534d5870989810130231056ae85aadd32a4e32c))
* **architecture:** implement multi-tier cache, logical multi-tenancy scoping, and dual-track choreography ([55ab398](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/55ab3981a49eff7b68f496d45404cdde2960fa17))
* **bulk-operations:** implement Bulk Cargo & Port Terminal Operations Engine (IMSBC Code / BLU Code / IMO Grain Code / Draft Survey / Ullage Survey ASTM) ([beae543](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/beae543437f173184096cedfc99febdeeb70889d))
* **cargo-insurance:** implement Cargo Insurance & Open Cover Engine (Institute Cargo Clauses ICC A/B/C 2009 / LMA / UCP 600) ([fccb484](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/fccb48490b2ef352a4916e7d9e335394306576cf))
* **cbam:** implement Carbon Border Adjustment Mechanism & Scope 3 Decarbonization Engine (EU Reg. 2023/956) ([c1bdbb5](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/c1bdbb5ddab578d5378fe38aff3f45272c490bc9))
* **chartering:** implement Maritime Chartering & Laytime / Demurrage Engine (BIMCO Gencon 2022 / NYPE 2015 / ASBATANKVO) ([9d4107e](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9d4107e82ca0f47af16446c153e0e857f884aceb))
* **claims:** implement automated cargo claims and insurance subrogation engine with international SDR conventions, notice deadlines, and legal PDF exports ([f0660f0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f0660f08ffd0e8afe3464c24a7d7438d18268268))
* **cold-chain:** implement Cold Chain & Temperature-Controlled Pharma/Reefer Monitoring Engine (EU GDP & EN 12830) ([adc910d](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/adc910d48ba75b4f7c606709abbd07846309d29f))
* **config:** add dynamic production database environment support, migrations, seed and start scripts ([ac5cc58](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ac5cc581d0795de5608aaffa2de9fe30434bcf22))
* **customs-warehouse:** implement Customs Warehouse, Free Zone & Special Regimes Engine (CAU & AEAT) ([b6d0fe4](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/b6d0fe4caeec173b8421ae9e27d9451335990a8c))
* **customs:** implement automated customs clearance and deterministic tariff engine ([e90a086](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e90a08645858ba782502c5d4bb2e397b3d2103f7))
* **dangerous-goods:** implement Multimodal Dangerous Goods Engine (IMO IMDG 41-22 / IATA DGR 66th / UNECE ADR 2025 / RID 2025) ([7880cf8](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/7880cf84f9761197d07ec26034c0a2cf5b535377))
* enterprise evolution ([#65](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/65)) ([577199b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/577199bfcaebfb5b7d37185fa92936ea21f78d5d))
* **fueleu:** implement FuelEU Maritime & EU ETS Fleet Decarbonization Engine (Reg. UE 2023/1805 & Dir. 2023/959) ([7ccf909](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/7ccf9096b9a519729cd5c08ef9475a3dea2a4a75))
* **general-average:** implement Maritime General Average & Salvage Engine (York-Antwerp Rules 2016 / LOF 2024 / SCOPIC) ([d491fa2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/d491fa25cab3a59ad4c9efd83ffc9ef4603b2ff6))
* implement Multi-Currency Treasury, FX Risk & IATA CASS / Carrier 3-Way Match engine ([4c7f178](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4c7f178fe98b1dc6c32ec0eb84fb5681ae83a73d))
* **incoterms:** implement Incoterms 2020 matrix and commercial contracting engine with customs valuation normalizer and bilingual PDF export ([39b6239](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/39b6239d9e21c1176b8ad4201d17df7d3d44af3d))
* **modules:** register finance, telemetry, and warehouse vertical slice modules ([ee9c7ac](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ee9c7ace08ab7549da0945c1343b61560b9bcd98))
* **modules:** register quotes, shipments, documents, and bpmn vertical slices ([3ad3fac](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/3ad3facdbb739adbdea1764fa893213df17fc868))
* **rail:** implement Rail Intermodal Freight & Corridors Engine (COTIF / CIM & TEN-T 750m) ([bc2db9b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/bc2db9b79181c2aca4698035521f911ece124174))
* **road-freight:** implement automated road freight and e-CMR dispatch engine with ADR 1.1.3.6 points calculation, trailer capacity, and tachograph scheduling ([1a6e727](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1a6e7278ca1908e31f345e36e2db1caa03997b49))
* **trade-finance:** implement International Trade Finance & Documentary Credit Engine (UCP 600 / URDG 758 / URC 522 / SWIFT MT700) ([9693f2f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9693f2fb3dd4521ab5a0c4bdade2af5dd753238e))
* **warehouse:** finalize enterprise evolution, warehouse MFE, health metrics and backup cron ([618d87d](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/618d87d35909655d87510289985e6b9e49e11394))


### Performance Improvements

* optimize dashboard queries, bundle splitting, and database indexes ([dd555b2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/dd555b2577e808ce0c86a9a5f4489c302860c1b5))

# [1.1.0](https://github.com/xpallares1987-ai/Atlas-Logistics/compare/v1.0.0...v1.1.0) (2026-09-06)


### Bug Fixes

* **auth,ratelimit:** harmonize route auth hooks and allowlist localhost to prevent 429 in E2E tests ([095bcd0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/095bcd0155b6e049476aea9a37d694918ad371ba))
* **db:** add idempotent migration 0021 for carbon and telemetry schemas and harmonize CI with db:migrate ([f6c00ec](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f6c00ec586d6ab85d25dabb58aa005d5c6fb82a2))
* **devcontainer:** repair invalid YAML in docker-compose DATABASE_URL, unblocking Codespaces prebuild ([f8b4def](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f8b4def21f8874cddd4d1fe60afe547d4ca76b34))
* **e2e:** scope ADR & tachograph modal assertions to avoid strict mode ambiguity in road freight test ([4d5a7c0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4d5a7c003732d1014841862897b2a5a0c57d8a0f))
* **pdf:** import and export CustomsData as type to fix ESM SyntaxError on backend bootstrap ([af9f233](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/af9f2335ba669fc3845c80416e34903403cceaa7))
* replace failing postgresql devcontainer feature with docker-compose service ([#66](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/66)) ([5ec66f1](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5ec66f17c592ad4ea268861c4ea1d007a58825f4))
* resolve adminRoutes import error and finally add dev script ([89b6e93](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/89b6e936f0b93941197ace55c836b2528ad737e8))
* resolve date-fns missing module and add dev script for e2e tests ([ffc2e27](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ffc2e27d794480488d4534d6a2a0be4b6861ae14))
* resolve E2E timeouts and CI db migration failures ([78e117f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/78e117f1e0fd38d8e288a6e6ad19ddb4d84cb02e))
* **security:** resolve CodeQL alerts [#196](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/196) (insecure randomness) and [#207](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/207) (path traversal in backup test) ([e68d212](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e68d21207a0e04149fe51c454c82cf5a225b25a2))
* **security:** resolve CodeQL SAST alerts [#188](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/188)-[#195](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/195) (path-injection & regex-injection) ([96d5bc0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/96d5bc0a41c65cb1a3baf88297595769f88cb8ec))
* **security:** sanitize isWithinDirectory with resolved startsWith and replace test stat with readdir ([172c854](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/172c8546003534336f65e1c372317645fefb0524))
* **seeds:** modularize and include carbon and telemetry domain seeds in master seeder runner, unblocking CI ([4927a6b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4927a6b0ae4a0af348a3c8d959ab8dbb89c02062))
* **test:** correct Playwright baseURL port to 3000 to match Vite dev server ([e969d3e](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e969d3e70d9ccedf1daaf35c56750c3ea3c2698d))
* **ui:** integrate favicon.png across frontend html, public assets, and backend server ([b01882f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/b01882f6a86f5d4d38ebeb9c1aa0bd82b0fcea1e))


### Features

* **aeo-security:** implement Authorized Economic Operator (AEO / OEA) & Supply Chain Security Engine (UCC Art. 38-39 / C-TPAT / ISO 28000 / ISO 17712) ([cd1aaf2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/cd1aaf29792fa2f1c671c587045aff15fd041f97))
* **air-cargo:** implement IATA e-Freight and Air Cargo (e-AWB) engine with Modulo-7, DGR screening, and Cargo-XML/IMP ([4534d58](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4534d5870989810130231056ae85aadd32a4e32c))
* **bulk-operations:** implement Bulk Cargo & Port Terminal Operations Engine (IMSBC Code / BLU Code / IMO Grain Code / Draft Survey / Ullage Survey ASTM) ([beae543](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/beae543437f173184096cedfc99febdeeb70889d))
* **cargo-insurance:** implement Cargo Insurance & Open Cover Engine (Institute Cargo Clauses ICC A/B/C 2009 / LMA / UCP 600) ([fccb484](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/fccb48490b2ef352a4916e7d9e335394306576cf))
* **cbam:** implement Carbon Border Adjustment Mechanism & Scope 3 Decarbonization Engine (EU Reg. 2023/956) ([c1bdbb5](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/c1bdbb5ddab578d5378fe38aff3f45272c490bc9))
* **chartering:** implement Maritime Chartering & Laytime / Demurrage Engine (BIMCO Gencon 2022 / NYPE 2015 / ASBATANKVO) ([9d4107e](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9d4107e82ca0f47af16446c153e0e857f884aceb))
* **claims:** implement automated cargo claims and insurance subrogation engine with international SDR conventions, notice deadlines, and legal PDF exports ([f0660f0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f0660f08ffd0e8afe3464c24a7d7438d18268268))
* **cold-chain:** implement Cold Chain & Temperature-Controlled Pharma/Reefer Monitoring Engine (EU GDP & EN 12830) ([adc910d](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/adc910d48ba75b4f7c606709abbd07846309d29f))
* **config:** add dynamic production database environment support, migrations, seed and start scripts ([ac5cc58](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ac5cc581d0795de5608aaffa2de9fe30434bcf22))
* **customs-warehouse:** implement Customs Warehouse, Free Zone & Special Regimes Engine (CAU & AEAT) ([b6d0fe4](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/b6d0fe4caeec173b8421ae9e27d9451335990a8c))
* **customs:** implement automated customs clearance and deterministic tariff engine ([e90a086](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e90a08645858ba782502c5d4bb2e397b3d2103f7))
* **dangerous-goods:** implement Multimodal Dangerous Goods Engine (IMO IMDG 41-22 / IATA DGR 66th / UNECE ADR 2025 / RID 2025) ([7880cf8](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/7880cf84f9761197d07ec26034c0a2cf5b535377))
* enterprise evolution ([#65](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/65)) ([577199b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/577199bfcaebfb5b7d37185fa92936ea21f78d5d))
* **fueleu:** implement FuelEU Maritime & EU ETS Fleet Decarbonization Engine (Reg. UE 2023/1805 & Dir. 2023/959) ([7ccf909](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/7ccf9096b9a519729cd5c08ef9475a3dea2a4a75))
* **general-average:** implement Maritime General Average & Salvage Engine (York-Antwerp Rules 2016 / LOF 2024 / SCOPIC) ([d491fa2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/d491fa25cab3a59ad4c9efd83ffc9ef4603b2ff6))
* implement Multi-Currency Treasury, FX Risk & IATA CASS / Carrier 3-Way Match engine ([4c7f178](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4c7f178fe98b1dc6c32ec0eb84fb5681ae83a73d))
* **incoterms:** implement Incoterms 2020 matrix and commercial contracting engine with customs valuation normalizer and bilingual PDF export ([39b6239](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/39b6239d9e21c1176b8ad4201d17df7d3d44af3d))
* **modules:** register finance, telemetry, and warehouse vertical slice modules ([ee9c7ac](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ee9c7ace08ab7549da0945c1343b61560b9bcd98))
* **modules:** register quotes, shipments, documents, and bpmn vertical slices ([3ad3fac](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/3ad3facdbb739adbdea1764fa893213df17fc868))
* **rail:** implement Rail Intermodal Freight & Corridors Engine (COTIF / CIM & TEN-T 750m) ([bc2db9b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/bc2db9b79181c2aca4698035521f911ece124174))
* **road-freight:** implement automated road freight and e-CMR dispatch engine with ADR 1.1.3.6 points calculation, trailer capacity, and tachograph scheduling ([1a6e727](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1a6e7278ca1908e31f345e36e2db1caa03997b49))
* **trade-finance:** implement International Trade Finance & Documentary Credit Engine (UCP 600 / URDG 758 / URC 522 / SWIFT MT700) ([9693f2f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9693f2fb3dd4521ab5a0c4bdade2af5dd753238e))
* **warehouse:** finalize enterprise evolution, warehouse MFE, health metrics and backup cron ([618d87d](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/618d87d35909655d87510289985e6b9e49e11394))


### Performance Improvements

* optimize dashboard queries, bundle splitting, and database indexes ([dd555b2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/dd555b2577e808ce0c86a9a5f4489c302860c1b5))

# Changelog

All notable changes to the Atlas Logistics monorepo are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.15.0] - 2026-09-02

### 🌟 Added

- **Bulk Cargo & Port Terminal Operations Engine (IMSBC Code / BLU Code / IMO Grain Code / ASTM-IP 54 Draft & Ullage Surveys)**:
  - **Relational Data Model (`src/db/schema/bulk_operations.ts`)**:
    - 5 specialized tables bringing database total to **121 tables**: `bulkVesselOperations`, `bulkDraftSurveys`, `bulkImsbcDeclarations`, `bulkGrainStabilityPlans`, `bulkUllageSurveys`.
    - Migration `0019_flowery_salo.sql` applied cleanly to both dev and production SQLite databases.
  - **Hydrostatic Draft Survey Engine (`DraftSurveyCalculatorService`)**:
    - 6-point drafts to mean drafts ($F_m, A_m, M_m$), apparent trim, deflection (_hogging/sagging_), and Quarter Mean Draft ($DQM$).
    - 1st and 2nd trim corrections ($C_1, C_2$), water density factor ($\rho / 1.025$), deductible accounting (ballast, fuel, diesel, fresh water, sludge), and net cargo tonnage certified.
  - **IMSBC Code Liquefaction & Safety Evaluator (`ImsbcLiquefactionEvaluatorService`)**:
    - Transportable Moisture Limit calculation ($\text{TML} = \text{FMP} \times 0.90$) and mandatory loading rejection rule if moisture $> \text{TML}$ under IMSBC Section 7.
    - Solid bulk categorization (Group A liquefiable, Group B chemical hazard MHB, Group C non-hazardous) and angle of repose trimming checks.
  - **IMO Grain Code Stability Evaluator (`GrainStabilityCalculatorService`)**:
    - Volumetric heeling moments, displacement-corrected heeling moment ($HM$), residual static heel angle ($\theta \le 12.0^\circ$), initial metacentric height ($GM_0 \ge 0.30\text{ m}$), and dynamical stability area under $GZ$ curve ($\ge 0.075\text{ m}\cdot\text{rad}$).
  - **ASTM-IP Petroleum Ullage / Tank Survey Engine (`AstmUllageTankSurveyService`)**:
    - Free water deduction ($GOV = TOV - FW$), Volume Correction Factor ($VCF$) via ASTM Table 54A/54B temperature curve, Gross/Net Standard Volume at 15°C ($GSV / NSV$), and commercial billing mass in air ($NSV \times (\text{Density}_{15} - 0.0011)$).
  - **Official Regulatory Documentation in PDF (`PDFService`)**:
    - Official **Hydrostatic Draft Survey Report & Displacement Certificate PDF**.
    - Official **IMSBC Code Bulk Cargo Declaration & TML Certificate PDF**.
    - Official **IMO Grain Code Stability & Loading Certificate PDF**.
    - Official **Tanker Ullage & Liquid Quantity Survey Report PDF (ASTM Table 54)**.
  - **Fastify REST API & Integration Tests**:
    - `/api/bulk-operations/*` endpoints passing all 11 integration tests.
  - **Interactive Workbench (`/bulk-operations`)**:
    - 3-tabbed interface with 4 top KPI cards, 6-Point Draft Survey & Hydrostatic Calculator, IMSBC TML / Grain Code Stability Evaluator, and Tanker Ullage ASTM Liquid Manager.
  - **Playwright E2E Testing**:
    - End-to-end test suite in `tests/e2e/bulk-operations.spec.ts`.

## [1.14.0] - 2026-09-01

### 🌟 Added

- **Cargo Insurance & Marine Open Cover Policy Engine (Institute Cargo Clauses ICC A/B/C 2009 / LMA/IUA / UCP 600 Art. 28 / Incoterms® CIF & CIP)**:
  - **Relational Data Model (`src/db/schema/cargo_insurance.ts`)**:
    - 5 specialized tables bringing database total to **116 tables**: `insuranceOpenPolicies`, `insuranceCertificates`, `insuranceBordereaux`, `insuranceBordereauLines`, `insuranceClaimsSettlements`.
    - Migration `0018_little_polaris.sql` applied cleanly to both dev and production SQLite databases.
  - **Insured Value Calculator Service (`InsuredValueCalculatorService`)**:
    - Calculates statutory 110% CIF / CIP insured sum under UCP 600 Art. 28 ($\text{Suma Asegurada} = \text{CIF Base} \times 1.10$).
    - Validates currency match, minimum statutory markup rules, and conveyance limits.
  - **Actuarial Premium Rating Service (`ActuarialPremiumRatingService`)**:
    - Rule-based rating for Institute Cargo Clauses (A) All Risks (0.25%), ICC (B) (0.18%), ICC (C) (0.12%), ICC Air (0.20%).
    - Multipliers for commodity risk (General Cargo, Machinery, DGR Chemicals, Electronics, Pharma/Reefer) and transport modes (Maritime FCL/LCL, Air, Road).
    - War & Strikes surcharge (+0.04%), minimum premium ($50.00), statutory IPS tax (6.0%) and Consorcio de Compensación de Seguros CCS (0.005%).
  - **Claim Adjustment & Settlement Service (`ClaimAdjustmentSettlementService`)**:
    - Particular average assessment ($(\text{Sound Value} - \text{Salvage}) / \text{Sound Value} \times 100$), actual vs constructive total loss evaluation, and deductible deduction.
  - **Official Regulatory Documentation in PDF (`PDFService`)**:
    - Official **Certificate of Cargo Insurance PDF (UCP 600 Art. 28)** with international banking validity.
    - Official **Marine Open Cover Policy Schedule PDF**.
    - Official **Monthly Insurance Declaration Bordereau PDF**.
    - Official **Cargo Insurance Claim Adjustment Statement PDF**.
  - **Fastify REST API & Integration Tests**:
    - `/api/cargo-insurance/*` endpoints passing all 10 integration tests.
  - **Interactive Workbench (`/cargo-insurance`)**:
    - 3-tabbed interface with 4 top KPI cards, Actuarial & 110% CIF Quote Calculator, Open Cover Policy & Bordereau manager, and Certificate & Claim Settlement simulator.
  - **Playwright E2E Testing**:
    - End-to-end test suite in `tests/e2e/cargo-insurance.spec.ts`.

## [1.13.0] - 2026-09-01

### 🌟 Added

- **Multimodal Dangerous Goods & Hazardous Materials Engine (IMO IMDG Code Amdt 41-22 / ICAO-IATA DGR 66th Ed. / UNECE ADR 2025 / RID 2025)**:
  - **Relational Data Model (`src/db/schema/dangerous_goods.ts`)**:
    - 5 specialized tables bringing database total to **111 tables**: `dgShipments`, `dgConsignmentItems`, `dgSegregationAudits`, `dgEmergencyCards`, `dgPackingCertificates`.
    - Migration `0017_robust_vapor.sql` applied cleanly to both dev and production SQLite databases.
  - **Master UN Catalog & IMDG 7.2.4 Segregation Engine (`DgCatalogSegregationService`)**:
    - Master chemical catalog with UN numbers (UN 1203, UN 1789, UN 1993, UN 3480, UN 1072, UN 0004, UN 2794, UN 3082).
    - Table 7.2.4 segregation matrix evaluating codes `0` (None), `1` ("Away from"), `2` ("Separated from"), `3` ("Separated by compartment"), `4` ("Separated longitudinally"), and `X` ("Prohibited co-load").
    - Multi-item container/vehicle co-loading audit evaluating all $\binom{n}{2}$ pairs.
  - **Packaging Exemption & Lithium Battery Classifier (`DgPackagingExemptionService`)**:
    - Limited Quantities (LQ Cap 3.4) and Excepted Quantities (EQ E0..E5 Cap 3.5) compliance check.
    - UNECE ADR 1.1.3.6 1,000-points calculation engine with transport category multipliers (Cat 0: $\infty$, Cat 1: $\times 50/\times 20$, Cat 2: $\times 3$, Cat 3: $\times 1$, Cat 4: $\times 0$).
    - IATA DGR Lithium Battery classifier (UN 3480 / UN 3481 / UN 3090 / UN 3091) evaluating Sections IA, IB, II, CAO requirement, and State of Charge (SoC $\le 30\%$).
  - **Emergency Response & EmS Guide Engine (`DgEmergencyResponseService`)**:
    - EmS Fire (F-A..F-J) and Spillage (S-A..S-Z) schedules, Kemler hazard IDs, and ADR tunnel categories (B to E).
  - **Transport Document Formatting Service (`DgTransportDocumentService`)**:
    - Legal UN transport sequence string formatter under IMDG 5.4 / ADR 5.4.1.
  - **Official Regulatory Documentation in PDF (`PDFService`)**:
    - Official **Multimodal Dangerous Goods Form PDF (IMO DGD / MDGF)** under IMDG 5.4 & ADR 5.4.
    - Official **IATA Shipper's Declaration for Dangerous Goods PDF** with CAO red candy stripe header.
    - Official **Dangerous Goods Emergency Response Card & EmS Sheet PDF**.
    - Official **Container / Vehicle Packing Certificate PDF (IMDG 5.4.2 / ADR 5.4.2)**.
  - **Fastify REST API & Integration Tests**:
    - `/api/dangerous-goods/*` endpoints passing all 9 integration tests.
  - **Interactive Workbench (`/dangerous-goods`)**:
    - 3-tabbed interface with 4 top KPI cards, Catalog & Segregation Simulator, Exemptions / 1,000 Points / Lithium Battery Calculator, and Multimodal DGD / PDF manager.
  - **Playwright E2E Testing**:
    - End-to-end test suite in `tests/e2e/dangerous-goods.spec.ts`.

## [1.12.0] - 2026-08-31

### 🌟 Added

- **Maritime General Average & Salvage Engine (York-Antwerp Rules 2016 / Lloyd's Open Form LOF 2024 / SCOPIC 2020 / Lloyd's Average Bond LAB 77 & Underwriter Guarantees)**:
  - **Relational Data Model (`src/db/schema/general_average.ts`)**:
    - 5 specialized tables bringing database total to **106 tables**: `gaCases`, `gaAllowances`, `gaContributoryInterests`, `gaSecurities`, `gaAdjustments`.
    - Migration `0016_blushing_the_executioner.sql` applied to dev and production databases.
  - **Deterministic Allowance & Statutory Costs Service (`GeneralAverageAllowanceService`)**:
    - Admissible sacrifices and expenses per York-Antwerp Rules 2016 (Rules I to XI).
    - Rule XX: 2.5% statutory commission on port of refuge disbursements and cargo lightening.
    - Rule XXI: CMI annual interest rate computed from casualty date to adjustment date.
  - **Contributory Value Assessment Service (`ContributoryValueService`)**:
    - Net sound values at destination for Vessel, Freight at Risk, Cargo CIF parcels, and Containers ($CV = \text{Sound} - \text{Damage} + \text{Made Good}$).
  - **Adjustment & Apportionment Engine (`GeneralAverageAdjustmentService`)**:
    - Global rate of contribution $\text{Rate } \% = (GA_{\text{Total}} / CV_{\text{Total}}) \times 100$.
    - Apportionment per interest, debtor/creditor balance sheet reconciliation with zero discrepancy.
    - Recommended cash deposit calculation with safety margin ($CV \times (\text{Rate} + 10\%)$).
  - **Official Regulatory Documentation in PDF (`PDFService`)**:
    - Official **Master's Declaration of General Average & Sea Protest PDF** (YAR 2016).
    - Official **Lloyd's Average Bond Form (LAB 77 PDF)**.
    - Official **Underwriter's Average Guarantee PDF**.
    - Official **General Average Adjustment Statement & Apportionment Matrix PDF**.
  - **Fastify REST API & Integration Tests**:
    - `/api/general-average/*` endpoints passing all 9 integration tests.
  - **Interactive Workbench (`/general-average`)**:
    - 3-tabbed interface with 4 top KPI cards, Case & Protest viewer, live deterministic York-Antwerp Rules adjustment simulator, and LAB 77 security manager.
  - **Playwright E2E Testing**:
    - End-to-end test suite in `tests/e2e/general-average.spec.ts`.

## [1.11.0] - 2026-08-31

### 🌟 Added

- **Maritime Chartering & Laytime / Demurrage Engine (BIMCO Gencon 2022 / NYPE 2015 / ASBATANKVO)**:
  - **Charter Party & Fixture Management (Voyage & Time Charter)**:
    - Support for standard forms: **BIMCO Gencon 2022**, **NYPE 2015**, and **ASBATANKVO**.
    - Full parameters: FIOST terms, cargo quantity with MOLOO/MOLCO margins, loading/discharging ports, laycan windows, daily hire and freight rates.
  - **Notice of Readiness (NOR) & Turn Time Calculation Service (`NorTurnTimeService`)**:
    - Business hours checking and weekend rollover (Saturday afternoon / Sunday to Monday 08:00 UTC).
    - Turn-time expiry calculation (e.g., 12 hours) and early commencement if operations start before expiry.
    - Contractual clauses verification: **WIPON** (_Whether In Port Or Not_), **WIBON** (_Whether In Berth Or Not_), **WIFPON** (_Whether In Free Pratique Or Not_), and **WCCON** (_Whether Customs Cleared Or Not_).
  - **Deterministic Laytime, Demurrage & Despatch Calculator (`LaytimeCalculationService`)**:
    - Allowed laytime computation ($MT / \text{Rate}$).
    - Chronological SOF event evaluation with automatic deductions for weather/rain (**WWD**), Sundays/holidays (**SHEX** EIU / UU, **FHEX**), and ship-side breakdowns.
    - Enforcement of universal maritime rule: _"Once on demurrage, always on demurrage"_.
    - Demurrage vs Despatch financial settlement under **ATS** (_All Time Saved_) and **WTS** (_Working Time Saved_).
  - **Time Charter Hire & Off-Hire Audit Service (`TimeCharterHireService`)**:
    - Period gross hire, off-hire days deductions, bunker compensation (VLSFO / MGO), address commission, and brokerage commissions.
  - **Official Maritime Documentation in PDF (`PDFService`)**:
    - Official **Charter Party / Fixture Recap PDF** (Gencon 2022 / NYPE 2015).
    - Official **Statement of Facts (SOF PDF)** with port stay milestones and event chronology.
    - Official **Laytime Calculation Sheet & Statement of Account PDF**.
    - Official **Time Charter Hire & Off-Hire Statement PDF**.
  - **Interactive Workbench (`/chartering-laytime`)**: 3-tabbed interface with top KPIs, Fixtures manager, interactive Laytime & Rain simulator, and Time Charter audit tool.

## [1.10.0] - 2026-08-29

### 🌟 Added

- **Authorized Economic Operator (AEO / OEA) & Supply Chain Security Engine (UCC Arts. 38-39 / C-TPAT / ISO 28000 / ISO 17712)**:
  - **EU UCC AEO & Self-Assessment Questionnaire (CAE AEAT / DG TAXUD)**:
    - Modality coverage: **OEAF** (Full Combined Customs & Security), **OEAC** (Customs Simplifications), and **OEAS** (Security & Safety).
    - Weighted evaluation and readiness scoring of all 6 official CAE blocks under UCC Article 39 (General info, Customs & tax compliance, Commercial & logistics records, Financial solvency, Practical competence, and Security & safety standards).
    - Disqualifying deficiency checks on critical customs infringements (Art. 39.a).
  - **C-TPAT / OEAS 7-Point Container & Vehicle Physical Security Protocol**:
    - Mandatory 7-point structural inspection verification: Front wall, Left side, Right side, Floor, Roof/ceiling, Doors/locks, and Undercarriage.
    - Contraband, false compartment, and agricultural contamination (_WDO check_) detection.
  - **ISO 17712 High-Security Mechanical Seals Ledger (Class 'H')**:
    - Immutable tracking of bolt and cable seals, manufacturer test certifications, equipment linkage, affixation timestamps, port of entry verification, and tamper incident logging.
  - **Supply Chain Business Partner Security Risk & Screening (ISO 28000)**:
    - Multi-criteria risk scoring of hauliers, customs brokers, warehouse keepers, and packers based on AEO/C-TPAT credentials and security questionnaire audits (_Low, Medium, High Risk_).
  - **Official Regulatory Documentation in PDF**:
    - Official **AEO Self-Assessment Audit Report (CAE DG TAXUD / AEAT) in PDF**.
    - Official **7-Point Container/Vehicle Security Inspection Certificate (C-TPAT / OEAS) in PDF**.
    - Official **ISO 17712 High-Security Seal & Chain of Custody Certificate in PDF**.
    - Official **Business Partner Security Risk Matrix (ISO 28000) in PDF**.
  - **Interactive Workbench (`/aeo-security`)**: 3-tabbed dashboard with top KPIs, CAE audit inspector, 7-point simulator, seal ledger, and partner screening calculator.

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
    - **Transport Documents (Arts. 19–27)**: Mandatory _Clean on Board_ verification and rejection of claused bills of lading.
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
  - **Official Train Composition & Brake Sheet PDF**: Bilingual _Boletín Oficial de Composición de Tren y Frenado_ with driver sign-off.
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
    - **Carrier Freight Dispute / Debit Note PDF (_Nota de Cargo y Carta de Discrepancia_)** itemizing unauthorized surcharges with formal 14-day credit note requisition.
    - **Official Carrier Settlement Statement PDF (_Estado de Liquidación y Orden de Pago_)** detailing approved net payable amounts, IATA CASS withholdings/commissions, and official treasury sign-off.
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

# 📚 Atlas Logistics — Technical Documentation Hub

The central hub for software architecture, domain specifications, operational runbooks, and engineering guides for **Atlas Logistics**.

Structured strictly according to the 4 quadrants of the **Diátaxis Documentation Framework** (*Tutorials, How-To Guides, Technical Reference, and Architecture & Explanation*).

---

## 🗂️ Documentation Hub Directory Layout

```text
docs/
├── README.md                  # Master documentation index and navigation hub
├── architecture/              # [Explanation] SCM domain aggregates, outbox runtime, event blueprints
├── adr/                       # [Decisions] Architectural Decision Records (0001 through 0022)
├── setup-guides/              # [How-To Guides] Development, container verification, DDL migrations, security
├── deployment/                # [How-To Guides] Production deployment, Docker Compose, runner matrices
│   └── docker/                # Multi-profile container configurations
├── api/                       # [Reference] API reference and Fastify endpoint contracts
├── reference/                 # [Reference] Schema inventories, DDL exports, project structure, audit closures
├── superpowers/               # [Traceability] Domain design specifications and execution plans
│   ├── specs/                 # Architectural design specifications
│   └── plans/                 # Step-by-step phased execution plans
└── reports/                   # [Historical] Audit scorecards, technical packages, and archived reviews
    └── archive/               # Legacy checklists, audit logs, and diagnostic reports
```

---

## 🧭 Navigation by Diátaxis Quadrants

### 1. 🎓 Tutorials (*Learning-Oriented*)
- [**Local Development & Quick-Start Guide**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/development-guide.md) — Walkthrough for environment initialization with `pnpm`, `.env.local` configuration, Fastify backend and Vite frontend startup, and test execution.
- [**Database Migration & Seeding Tutorial**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/database-migration-workflow.md) — Guide to generating, inspecting, and executing SQLite migrations with Drizzle ORM and verifying referential integrity.

---

### 2. 🛠️ How-To Guides & Runbooks (*Task- & Problem-Oriented*)
- [**Container Provenance Verification (SLSA v1.0)**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/container-provenance-verification.md) — Cryptographic verification of published GHCR container images (`atlas-frontend`, `atlas-backend`, `atlas-worker`) using `gh attestation verify` with `--repo` and `--signer-workflow`.
- [**Docker & Multi-Container Infrastructure**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/docker-setup.md) — Execution profiles (default, observability, worker), CI caching strategies, and Compose orchestration.
- [**Station Context & Navigation Cockpit Guide**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/station-context-cockpit-guide.md) — Managing multi-station operational switches, role-based station filtering, and live SQLite persistence.
- [**Comprehensive Observability & Monitoring**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/observability-monitoring.md) — Prometheus metrics (`/metrics`), Grafana dashboards, structured Pino logs, and telemetry benchmarking.
- [**Troubleshooting & Preventative Maintenance**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/troubleshooting-maintenance.md) — Port freeing on Windows, SQLite WAL lock resolution, and background daemon hygiene.
- [**Security, Backup & Leak Prevention Policy**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/security-backup-policy.md) — Pre-commit leak scanning, secrets rotation, and SQLite online backup routines.
- [**Production Deployment Handbook**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/deployment/DEPLOYMENT_HANDBOOK.md) — Production Compose rollout, load testing, and operational verification.

---

### 3. 📖 Technical Reference (*Information-Oriented*)
- [**SCM Architecture Blueprint v1**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/architecture/SCM_ARCHITECTURE_BLUEPRINT_V1.md) — Complete inventory of 25 Bounded Contexts, Outbox event contracts, and reactive projection engines.
- [**SCM Logical Model SQLite Design**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/architecture/SCM_LOGICAL_MODEL_V1_SQLITE_DESIGN.md) — Relational table schemas, foreign key cascade policies, and index layout.
- [**Database Schema Inventory & Relational Map**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/reference/database-schema-full-inventory-and-relational-map.md) — Full relational map of all domain tables across SQLite schema modules.
- [**Authoritative Dev DDL Export**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/reference/dev-database-schema-ddl-export.sql) — Clean DDL export snapshot of the active development database schema.
- [**Project Structure & Module Layout**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/reference/PROJECT_STRUCTURE.md) — Monorepo workspace hierarchy, package contracts, and directory conventions.
- [**Technical Audit Executive Closure**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/reference/technical-audit-executive-closure-2026-11-14.md) — Authoritative audit scorecard, risk closure verification, and platform maturity summary.
- **Regulatory & Domain Standards**:
  - *FMC 46 CFR Part 541*: Mandatory demurrage/detention billing rules and legal dispute parameters.
  - *DCSA 2026 Standards*: Cut-off milestone events, Shipping Instructions (SI), and Verified Gross Mass (VGM).
  - *SAT CFDI 4.0 / Carta Porte 3.1*: Mexican digital tax receipt stamping and IdCCP cargo transport attributes.
  - *UNCITRAL MLETR*: Decentralized cryptographic endorsements for electronic Bills of Lading.

---

### 4. 🏛️ Architecture & Architectural Decision Records (*Understanding-Oriented*)
- [**SCM Platform Architecture**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/architecture/SCM_PLATFORM_ARCHITECTURE.md) — Domain aggregates, Transactional Outbox pattern, DAG cycle validation, and CQRS BFF projections.
- [**Enterprise Evolution Plan**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/architecture/enterprise_evolution_plan.md) — Strategic roadmap for scaling freight forwarding domains and external integrations.
- [**Comprehensive System Architecture**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/architecture/ARCHITECTURE.md) — Monorepo micro-frontends, Fastify backend architecture, and data isolation.

#### 📋 Complete Architectural Decision Records (ADR 0001 – ADR 0022)
- [**ADR-0001**: Standardization on pnpm](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0001-standardization-on-pnpm.md)
- [**ADR-0002**: Independent Hybrid Architecture](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0002-independent-hybrid-architecture.md)
- [**ADR-0003**: Transition to Internal Monorepo Workspace](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0003-transition-to-internal-monorepo-workspace.md)
- [**ADR-0004**: Zero-Cost Local Architecture](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0004-zero-cost-local-architecture.md)
- [**ADR-0005**: Fastify WebSockets for Realtime Telemetry](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0005-fastify-websockets-for-realtime.md)
- [**ADR-0006**: BullMQ for Background Job Orchestration](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0006-bullmq-for-background-jobs.md)
- [**ADR-0007**: Micro-Frontends for Scale](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0007-micro-frontends-for-scale.md)
- [**ADR-0008**: SCM Embedded SQLite, Outbox Eventing & CQRS BFF](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0008-scm-sqlite-cqrs-workflow-engine.md)
- [**ADR-0009**: SQLite WAL Mode and Enforced Foreign Key Constraints](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0009-sqlite-wal-mandatory-foreign-keys.md)
- [**ADR-0010**: Zero-Mock Live Enterprise Data Standard](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0010-zero-mock-live-persistence-standard.md)
- [**ADR-0011**: WebCrypto SAT e-Firma Hub and MLETR Decentralized Ledger](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0011-webcrypto-sat-efirma-and-mletr-blockchain.md)
- [**ADR-0012**: DCSA Ocean Booking Lifecycle and FMC Part 541 Demurrage Resolution](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0012-dcsa-booking-and-fmc-demurrage-resolution.md)
- [**ADR-0013**: Gemini Free-Tier On-Demand Gateway and Environment Unification](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0013-gemini-free-tier-on-demand-gateway-and-env-unification.md)
- [**ADR-0014**: Rate Comparer Port Drayage Booking Dispatch](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0014-rate-comparer-port-drayage-booking-dispatch.md)
- [**ADR-0015**: Production Release v1.0.0 CI/CD Governance](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0015-production-release-v1.0.0-ci-cd-governance.md)
- [**ADR-0016**: B2B EDI, DCSA eBL & IATA ONE Record Interoperability](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0016-b2b-edi-dcsa-ebl-iata-one-record.md)
- [**ADR-0017**: FuelEU Maritime, EU ETS Carbon Insetting & Decarbonization](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0017-fueleu-maritime-ets-carbon-insetting.md)
- [**ADR-0018**: Repository Hygiene, Architectural Simplification & Modular Refactoring](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0018-repository-hygiene-architectural-simplification-modular-refactoring.md)
- [**ADR-0019**: Booking Management Modular Decomposition](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0019-booking-management-modular-decomposition.md)
- [**ADR-0020**: Frontend Modular Decomposition & File Size Guardrails](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md)
- [**ADR-0021**: External Data Governance and Licensing](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0021-external-data-governance-and-licensing.md)
- [**ADR-0022**: Enterprise Freight Forwarding Organization Schema & Governance](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md)

---

### 5. ⚡ Phased Design Specifications & Plans (`docs/superpowers/`)
- [**Phase 2 Design: USMCA Cross-Border, SAT e-Firma, Smart Contracts & ERP**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/superpowers/specs/2026-11-05-real-data-phase-2-design.md)
- [**Phase 2 Implementation Plan**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/superpowers/plans/2026-11-05-real-data-phase-2-cross-border-blockchain-erp.md)
- [**Phase 3 Design: FMC Demurrage, DCSA Ocean Bookings & 3D Stowage**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/superpowers/specs/2026-11-05-real-data-phase-3-design.md)
- [**Phase 3 Implementation Plan**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/superpowers/plans/2026-11-05-real-data-phase-3-ports-disputes-stowage.md)
- [**Frontend Monoliths Modular Decomposition Plan**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/superpowers/plans/2026-11-12-frontend-monoliths-modular-decomposition.md)
- [**External Data Governance Specification**](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/superpowers/specs/external-data-governance-spec.md)

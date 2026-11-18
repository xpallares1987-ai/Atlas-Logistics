# 📚 Atlas Logistics — Technical Documentation Hub

The central hub for software architecture, domain specifications, operational runbooks, and engineering guides for **Atlas Logistics**.

Structured strictly according to the 4 quadrants of the **Diátaxis Documentation Framework** (*Tutorials, How-To Guides, Technical Reference, and Architecture & Explanation*).

> [!NOTE]
> **Root Directory Hygiene**: The repository root contains only six canonical documentation files (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`); operational and tool configuration files remain at the root where required.

---

## 🗂️ Documentation Hub Directory Layout

```text
docs/
├── README.md                  # Master documentation index and navigation hub
├── architecture/              # [Explanation] SCM domain aggregates, outbox runtime, event blueprints
├── adr/                       # [Decisions] Architectural Decision Records (0001 through 0022)
├── setup-guides/              # [How-To Guides] Development, container verification, DDL migrations, security
├── runbooks/                  # [Runbooks] Operational procedures, branch governance, incident response
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
- [**Local Development & Quick-Start Guide**](setup-guides/development-guide.md) — Walkthrough for environment initialization with `pnpm`, `.env.local` configuration, Fastify backend and Vite frontend startup, and test execution.
- [**Database Migration & Seeding Tutorial**](setup-guides/database-migration-workflow.md) — Guide to generating, inspecting, and executing SQLite migrations with Drizzle ORM and verifying referential integrity.

---

### 2. 🛠️ How-To Guides & Runbooks (*Task- & Problem-Oriented*)
- [**Container Provenance Verification (SLSA v1.0)**](setup-guides/container-provenance-verification.md) — Cryptographic verification of published GHCR container images (`atlas-frontend`, `atlas-backend`, `atlas-worker`) using `gh attestation verify` with `--repo` and `--signer-workflow`.
- [**Docker & Multi-Container Infrastructure**](setup-guides/docker-setup.md) — Execution profiles (default, observability, worker), CI caching strategies, and Compose orchestration.
- [**Station Context & Navigation Cockpit Guide**](setup-guides/station-context-cockpit-guide.md) — Managing multi-station operational switches, role-based station filtering, and live SQLite persistence.
- [**GitHub Branch Protection & Ruleset Governance**](runbooks/github-branch-governance.md) — Branch rulesets, mandatory CI status checks, and administrative bypass procedures.
- [**Comprehensive Observability & Monitoring**](setup-guides/observability-monitoring.md) — Prometheus metrics (`/metrics`), Grafana dashboards, structured Pino logs, and telemetry benchmarking.
- [**Troubleshooting & Preventative Maintenance**](setup-guides/troubleshooting-maintenance.md) — Port freeing on Windows, SQLite WAL lock resolution, and background daemon hygiene.
- [**Security, Backup & Leak Prevention Policy**](setup-guides/security-backup-policy.md) — Pre-commit leak scanning, secrets rotation, and SQLite online backup routines.
- [**Production Deployment Handbook**](deployment/DEPLOYMENT_HANDBOOK.md) — Production Compose rollout, load testing, and operational verification.
- [**GitHub Pages SPA Continuous Deployment Guide**](deployment/pages-spa-deployment.md) — Gated production deployment, ephemeral PR preview environments, and SPA client routing 404 fallback.
- [**SQLite WAL Disaster Recovery & Rollback Runbook**](runbooks/DISASTER_RECOVERY.md) — Online `VACUUM INTO` snapshot recovery, corruption remediation, and emergency rollback procedures.
- [**GitHub Secrets & CI/CD Pipeline Setup Guide**](setup-guides/GITHUB_SETUP.md) — Encrypted repository secrets, container registries, and workflow configuration.

---

### 3. 📖 Technical Reference (*Information-Oriented*)
- [**SCM Architecture Blueprint v1**](architecture/SCM_ARCHITECTURE_BLUEPRINT_V1.md) — Complete inventory of 25 Bounded Contexts, Outbox event contracts, and reactive projection engines.
- [**SCM Logical Model SQLite Design**](architecture/SCM_LOGICAL_MODEL_V1_SQLITE_DESIGN.md) — Relational table schemas, foreign key cascade policies, and index layout.
- [**Database Schema Inventory & Relational Map**](reference/database-schema-full-inventory-and-relational-map.md) — Full relational map of all domain tables across SQLite schema modules.
- [**Authoritative Dev DDL Export**](reference/dev-database-schema-ddl-export.sql) — Clean DDL export snapshot of the active development database schema.
- [**Project Structure & Module Layout**](reference/PROJECT_STRUCTURE.md) — Monorepo workspace hierarchy, package contracts, and directory conventions.
- [**Docker & Monorepo Build Optimization Reference**](reference/BUILD_OPTIMIZATION.md) — Multi-stage BuildKit caching, layer ordering, and bundle optimization benchmarks.
- [**Improvement Plan Traceability Matrix & Dependency Graph (P0–P2)**](reference/improvement-plan-traceability-matrix.md) — Complete P0.1–P2.5 verification matrix, monorepo package dependency graph, bounded context maturity table, and performance budgets.
- [**Technical Audit Executive Closure**](reference/technical-audit-executive-closure-2026-11-14.md) — Authoritative audit scorecard, risk closure verification, and platform maturity summary.
- **Regulatory & Domain Standards**:
  - *FMC 46 CFR Part 541*: Mandatory demurrage/detention billing rules and legal dispute parameters.
  - *DCSA 2026 Standards*: Cut-off milestone events, Shipping Instructions (SI), and Verified Gross Mass (VGM).
  - *SAT CFDI 4.0 / Carta Porte 3.1*: Mexican digital tax receipt stamping and IdCCP cargo transport attributes.
  - *UNCITRAL MLETR*: Decentralized cryptographic endorsements for electronic Bills of Lading.

---

### 4. 🏛️ Architecture & Architectural Decision Records (*Understanding-Oriented*)
- [**SCM Platform Architecture**](architecture/SCM_PLATFORM_ARCHITECTURE.md) — Domain aggregates, Transactional Outbox pattern, DAG cycle validation, and CQRS BFF projections.
- [**Enterprise Evolution Plan**](architecture/enterprise_evolution_plan.md) — Strategic roadmap for scaling freight forwarding domains and external integrations.
- [**Comprehensive System Architecture**](architecture/ARCHITECTURE.md) — Monorepo micro-frontends, Fastify backend architecture, and data isolation.

#### 📋 Consolidated Architectural Decision Records Catalog (ADR 0001 – ADR 0024)

| ADR | Title | Status | Date | Domain / Bounded Context | Notes / Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [**0001**](adr/0001-standardization-on-pnpm.md) | Standardization on pnpm | `Accepted` | 2026-10-15 | Monorepo / Tooling | Workspace dependency management & strict symlink isolation |
| [**0002**](adr/0002-independent-hybrid-architecture.md) | Independent Hybrid Architecture | `Accepted` | 2026-10-18 | System Architecture | Decoupled hybrid micro-frontend & modular backend |
| [**0003**](adr/0003-transition-to-internal-monorepo-workspace.md) | Transition to Internal Monorepo Workspace | `Accepted` | 2026-10-20 | Workspace Management | Consolidated multi-package Turborepo workspace |
| [**0004**](adr/0004-zero-cost-local-architecture.md) | Zero-Cost Local Architecture | `Accepted` | 2026-10-22 | Infrastructure / Persistence | Standardized on embedded SQLite & local zero-cloud runtime |
| [**0005**](adr/0005-fastify-websockets-for-realtime.md) | Fastify WebSockets for Realtime Telemetry | `Accepted` | 2026-10-24 | Communications / IoT | High-throughput native WebSocket streaming for cargo telemetry |
| [**0006**](adr/0006-bullmq-for-background-jobs.md) | BullMQ for Background Job Orchestration | `Accepted` | 2026-10-26 | Async Processing | Redis-backed queues with transparent in-memory fallback |
| [**0007**](adr/0007-micro-frontends-for-scale.md) | Micro-Frontends for Scale | `Accepted` | 2026-10-28 | Frontend Architecture | Dynamic Module Federation across specialized domain apps |
| [**0008**](adr/0008-scm-sqlite-cqrs-workflow-engine.md) | SCM Embedded SQLite, Outbox & CQRS BFF | `Accepted` | 2026-10-30 | SCM Core / Kernel | Domain Outbox pattern, DAG cycle checks & CQRS read models |
| [**0009**](adr/0009-sqlite-wal-mandatory-foreign-keys.md) | SQLite WAL Mode & Mandatory Foreign Keys | `Accepted` | 2026-11-01 | Database Governance | Strict `PRAGMA foreign_keys = ON;` and WAL concurrency |
| [**0010**](adr/0010-zero-mock-live-persistence-standard.md) | Zero-Mock Live Enterprise Data Standard | `Accepted` | 2026-11-03 | Frontend / Integration | Elimination of mock buttons; 100% live Fastify/Drizzle queries |
| [**0011**](adr/0011-webcrypto-sat-efirma-and-mletr-blockchain.md) | WebCrypto SAT e-Firma & MLETR Ledger | `Accepted` | 2026-11-05 | Customs / Trade Finance | Native client-side PKI e-Firma signing & MLETR e-BL registry |
| [**0012**](adr/0012-dcsa-booking-and-fmc-demurrage-resolution.md) | DCSA Ocean Booking & FMC Part 541 Resolution | `Accepted` | 2026-11-07 | Maritime / Billing | DCSA milestone state machines & FMC demurrage audit rules |
| [**0013**](adr/0013-gemini-free-tier-on-demand-gateway-and-env-unification.md) | Gemini Free-Tier On-Demand Gateway | `Accepted` | 2026-11-08 | AI / Platform Integration | Zero-cost local Gemini free-tier gateway & unified `.env` |
| [**0014**](adr/0014-rate-comparer-port-drayage-booking-dispatch.md) | Rate Comparer Port Drayage Dispatch | `Accepted` | 2026-11-09 | Freight Rating / Dispatch | Drayage rate engine integration & instant dispatch command |
| [**0015**](adr/0015-production-release-v1.0.0-ci-cd-governance.md) | Production Release v1.0.0 CI/CD Governance | `Accepted` | 2026-11-10 | CI/CD & Security | Release automation, signed commits & multi-stage Docker builds |
| [**0016**](adr/0016-b2b-edi-dcsa-ebl-iata-one-record.md) | B2B EDI, DCSA eBL & IATA ONE Record | `Accepted` | 2026-11-11 | Interoperability / EDI | Multi-standard EDI parser (EDIFACT/X12) & ONE Record JSON-LD |
| [**0017**](adr/0017-fueleu-maritime-ets-carbon-insetting.md) | FuelEU Maritime, EU ETS & Carbon Insetting | `Accepted` | 2026-11-11 | Decarbonization / ESG | FuelEU WtW greenhouse compliance balance & Green BAF pricing |
| [**0018**](adr/0018-repository-hygiene-architectural-simplification-modular-refactoring.md) | Repository Hygiene & Modular Refactoring | `Accepted` | 2026-11-11 | Code Quality / Hygiene | Root file hygiene, Diátaxis quadrant enforcement & cleanup |
| [**0019**](adr/0019-booking-management-modular-decomposition.md) | Booking Management Modular Decomposition | `Accepted` | 2026-11-12 | Frontend Refactoring | Atomic separation of booking wizard tabs, drawers, and state |
| [**0020**](adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md) | Frontend Modularity & File Size Limits | `Accepted` | 2026-11-12 | Frontend Quality | Mandatory <1,000 line limit per page module (`check:file-sizes`) |
| [**0021**](adr/0021-external-data-governance-and-licensing.md) | External Data Governance & Licensing | `Accepted` | 2026-11-13 | Data Governance / UNLOCODE| Lean 3-table model, memory Trie cache & document GC |
| [**0022**](adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md) | Forwarding Organization Schema & Governance | `Accepted` | 2026-11-13 | Master Data / Organization| Forwarding station hierarchy, station RBAC & active context |
| [**0023**](adr/0023-native-web-crypto-session-migration.md) | Native Web Crypto Session & Scrypt Auth | `Accepted` | 2026-11-15 | Security / Authentication | Native Web Crypto session engine replacing deprecated Lucia/Oslo |
| [**0024**](adr/0024-github-pages-spa-continuous-deployment.md) | GitHub Pages SPA Continuous Deployment & PR Previews | `Accepted` | 2026-11-15 | CI/CD & Deployment | Gated deployment, ephemeral PR previews & SPA 404 fallback |
| [**0025**](adr/0025-commercial-pricing-tariff-engine-and-gl-sync.md) | Commercial Pricing, Tariff Engine & GL Sync | `Accepted` | 2026-11-18 | Commercial / Finance | Dynamic formula surcharges, penny-perfect CW prorating & SAP/NetSuite GL outbox sync |

---

### 5. ⚡ Phased Design Specifications & Plans (`superpowers/`)
- [**Phase 2 Design: USMCA Cross-Border, SAT e-Firma, Smart Contracts & ERP**](superpowers/specs/2026-11-05-real-data-phase-2-design.md)
- [**Phase 2 Implementation Plan**](superpowers/plans/2026-11-05-real-data-phase-2-cross-border-blockchain-erp.md)
- [**Phase 3 Design: FMC Demurrage, DCSA Ocean Bookings & 3D Stowage**](superpowers/specs/2026-11-05-real-data-phase-3-design.md)
- [**Phase 3 Implementation Plan**](superpowers/plans/2026-11-05-real-data-phase-3-ports-disputes-stowage.md)
- [**Frontend Monoliths Modular Decomposition Plan**](superpowers/plans/2026-11-12-frontend-monoliths-modular-decomposition.md)
- [**External Data Governance Specification**](superpowers/specs/external-data-governance-spec.md)
- [**Issue #9 Phase 1: Strict TypeScript ESLint Restoration (SCM Domain)**](superpowers/plans/2026-11-14-issue-9-strict-eslint-restoration-scm.md)
- [**Issue #9 Phase 2: Strict TypeScript ESLint Restoration (Security & Identity Layer)**](superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-security-identity.md)
- [**Issue #9 Phase 3: Strict TypeScript ESLint Restoration (Operational Controllers & Routes)**](superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md)

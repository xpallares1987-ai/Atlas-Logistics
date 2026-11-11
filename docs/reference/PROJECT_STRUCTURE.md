# Atlas Logistics Project Structure Guide

**Purpose:** Complete guide to the monorepo organization, module layout, and code conventions.

**Last Updated:** 2024-01-15

---

## 📁 Root Level Structure

```
Atlas-Logistics/
├── packages/                    # Monorepo workspaces (pnpm)
├── src/                         # Backend API (Fastify)
├── tests/                       # Test suites
├── docs/                        # Documentation hub
├── drizzle/                     # Database migrations
├── docker/                      # Docker configurations
├── scripts/                     # Utility scripts
├── .github/                     # CI/CD workflows
├── hooks/                       # Git hooks
├── templates/                   # Code generation templates
├── Dockerfile                   # Backend container
├── Dockerfile.backend           # Alternative backend build
├── Dockerfile.worker            # Background worker container
├── docker-compose.yml           # Dev environment
├── docker-compose.prod.yml      # Production environment
├── package.json                 # Root workspace manifest
├── pnpm-workspace.yaml          # pnpm workspaces config
├── tsconfig.json                # Root TypeScript config
└── drizzle.config.ts            # Drizzle ORM config
```

---

## 🗂️ Frontend Packages (`packages/`)

### Structure
```
packages/
├── frontend/                    # Main PWA host (React 19 + Vite)
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Route pages
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API client services
│   │   ├── store/               # State management
│   │   ├── styles/              # TailwindCSS + global styles
│   │   ├── utils/               # Utility functions
│   │   ├── App.tsx              # Root component
│   │   └── main.tsx             # Entry point
│   ├── public/                  # Static assets
│   ├── vite.config.ts           # Vite configuration
│   └── package.json
│
├── dashboard/                   # Operations dashboard (Module Federation)
│   ├── src/
│   │   ├── components/          # Dashboard-specific components
│   │   ├── pages/               # Dashboard pages
│   │   ├── services/            # Telemetry and metrics clients
│   │   └── App.tsx
│   └── package.json
│
├── rate-comparer/               # Freight rate comparison module
│   ├── src/
│   │   ├── components/
│   │   │   ├── RateComparator/  # Main comparator UI
│   │   │   ├── QuoteCard/       # Individual quote display
│   │   │   └── FilterPanel/     # Search filters
│   │   ├── services/
│   │   │   ├── rateApi.ts       # Quote fetch and calculation
│   │   │   ├── compareLogic.ts  # Comparison algorithms
│   │   │   └── parsingService.ts # Tariff parsing
│   │   └── types/
│   │       └── quote.ts         # Quote data types
│   └── package.json
│
├── bpmn-modeler/                # BPMN 2.0 workflow designer
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/          # Modeler canvas
│   │   │   ├── Palette/         # BPMN shapes palette
│   │   │   └── Properties/      # Element properties panel
│   │   ├── services/
│   │   │   ├── bpmnService.ts   # BPMN validation and export
│   │   │   └── xmlExporter.ts   # BPMN-XML generation
│   │   └── App.tsx
│   └── package.json
│
├── warehouse-ops/               # Warehouse operations micro-frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── TaskBoard/       # Kanban-style task management
│   │   │   ├── WarehouseMap/    # 3D/2.5D warehouse visualization
│   │   │   └── ReceiptScan/     # Barcode scanning UI
│   │   ├── services/
│   │   │   └── warehouseApi.ts
│   │   └── App.tsx
│   └── package.json
│
├── ui/                          # Design system & components library
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── ...              # 30+ reusable components
│   │   ├── hooks/
│   │   │   ├── useTheme.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   └── useFetch.ts
│   │   ├── styles/
│   │   │   ├── globals.css      # Global TailwindCSS
│   │   │   ├── glassmorphism.css # Dark glassmorphism design
│   │   │   └── animations.css
│   │   ├── index.ts             # Main export
│   │   └── stories/             # Storybook stories
│   ├── tailwind.config.js       # TailwindCSS configuration
│   └── package.json
│
└── shared/                      # Shared TypeScript utilities & crypto
    ├── src/
    │   ├── types/
    │   │   ├── common.ts        # Base types (User, Shipment, etc.)
    │   │   ├── customs.ts       # Customs domain types
    │   │   ├── air-cargo.ts     # IATA types (AWB, etc.)
    │   │   ├── ocean.ts         # Ocean shipping types (B/L, etc.)
    │   │   ├── financial.ts     # Payment and FX types
    │   │   └── index.ts         # Export all types
    │   ├── schemas/
    │   │   ├── auth.schema.ts   # Zod schemas for auth
    │   │   ├── shipment.schema.ts
    │   │   ├── customs.schema.ts
    │   │   └── index.ts
    │   ├── crypto/
    │   │   ├── envelope.ts      # E2EE payload envelope
    │   │   ├── keypairs.ts      # WebCrypto key management
    │   │   ├── hashing.ts       # SHA-256, PBKDF2
    │   │   └── index.ts
    │   ├── utils/
    │   │   ├── validation.ts    # Common validation utilities
    │   │   ├── formatting.ts    # Date, number, currency formatting
    │   │   ├── conversions.ts   # Unit conversions (kg↔lbs, m³↔ft³)
    │   │   └── index.ts
    │   ├── constants/
    │   │   ├── incoterms.ts
    │   │   ├── hs-codes.ts
    │   │   ├── countries.ts
    │   │   └── index.ts
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

### Workspace Publishing

Each package is published to npm:
- `@atlas/frontend` - Main PWA
- `@atlas/dashboard` - Dashboard module
- `@atlas/rate-comparer` - Rate comparison logic
- `@atlas/bpmn-modeler` - BPMN designer
- `@atlas/warehouse-ops` - Warehouse operations
- `@atlas/ui` - Design system
- `@atlas/shared` - Shared utilities & types

---

## 🚀 Backend Structure (`src/`)

### Entry Points
```
src/
├── server.ts                    # Server bootstrap (port 3001)
├── app.ts                       # Fastify app factory & middleware setup
├── worker-node.ts               # BullMQ worker process
└── admin/
    └── cli.ts                   # Admin CLI utilities
```

### API Routes (`src/routes/`)
Organized by domain module:

```
src/routes/
├── index.ts                     # Route registration hub
│
├── auth.routes.ts               # POST /api/auth/login, /register, /me
├── health.routes.ts             # GET /api/health
│
├── air-cargo.routes.ts          # AWB, tariffing (IATA)
├── bookings.routes.ts           # Ocean booking operations
├── ocean-*.routes.ts            # Sailing schedules, B/L (DCSA)
├── road-freight.routes.ts       # CMR, LTL/FTL (UNECE ADR)
├── rail.routes.ts               # Intermodal, CIM (UIC)
├── chartering-laytime.routes.ts # Marine charter, demurrage
│
├── customs.routes.ts            # DUA/SAD declarations (CAU)
├── incoterms.routes.ts          # Incoterm calculations (ICC)
├── dangerous-goods.routes.ts    # DGR validation (IMDG/IATA/ADR)
├── cold-chain.routes.ts         # Reefer, pharma GDP (EN 12830)
├── cargo-insurance.routes.ts    # Insurance policies (ICC clauses)
│
├── financial.routes.ts          # 3-way match, reconciliation
├── treasury.routes.ts           # FX, cash flow, settlements
├── trade-finance.routes.ts      # L/C, D/P, standby credits (UCP/URDG)
│
├── warehouse.routes.ts          # Tasks, inventory, 3D planner
├── shipments.routes.ts          # Shipment lifecycle CRUD
├── tracking.routes.ts           # Real-time tracking & events
├── dashboard.routes.ts          # Operations cockpit & analytics
│
├── cbam.routes.ts               # Carbon border adjustment (EU 2023/956)
├── fueleu.routes.ts             # Ship fuel intensity (EU 2023/1805)
├── carbon.routes.ts             # Scope 1/2/3 calculations
│
├── bpmn.routes.ts               # Workflow modeling and execution
├── control-tower.routes.ts      # Real-time monitoring alerts
├── aeo-security.routes.ts       # OEA compliance, AEO scoring
├── general-average.routes.ts    # Marine GA, YAR adjustments
├── claims.routes.ts             # Cargo claims & recovery
│
└── admin.routes.ts              # Admin functions (BullMQ UI, etc.)
```

### Core Services (`src/services/`)

```
src/services/
├── audit.service.ts             # Audit logging (GDPR/PCI/SOC2)
├── auth.service.ts              # JWT generation, bcrypt validation
├── crypto.service.ts            # E2EE encryption/decryption
├── pubsub.service.ts            # Event publishing & subscriptions
├── mail.service.ts              # Email notifications
├── pdf.service.ts               # PDF document generation
├── xml.service.ts               # XML/EDI processing
├── tariff.service.ts            # TARIC calculations
├── incoterm.service.ts          # Incoterm matrix & risk allocation
├── dg-checker.service.ts        # Dangerous goods validation
├── 3way-match.service.ts        # Invoice reconciliation
├── treasury.service.ts          # FX & cash flow
├── workflow.service.ts          # BPMN engine execution
├── warehouse.service.ts         # Warehouse operations
├── tracking.service.ts          # Real-time shipment tracking
└── ...
```

### Database Layer (`src/db/`)

```
src/db/
├── index.ts                     # Database connection factory
├── migrate.ts                   # Migration runner (Drizzle Kit)
├── seed.ts                      # Initial data seeding
├── seed-phases.ts               # Phased seed execution
│
├── schema/                      # Drizzle ORM table definitions
│   ├── index.ts
│   ├── auth.schema.ts           # users, sessions, roles
│   ├── shipments.schema.ts      # shipments, containers, bills of lading
│   ├── customs.schema.ts        # dua, tariff_codes, declarations
│   ├── air-cargo.schema.ts      # awbs, hawbs, dangerous_goods
│   ├── ocean.schema.ts          # bookings, sailing_schedules, fcl_lcl
│   ├── road-freight.schema.ts   # cmr, drivers, vehicles
│   ├── financial.schema.ts      # invoices, payments, fx_rates
│   ├── warehouse.schema.ts      # tasks, inventory, locations
│   ├── audit.schema.ts          # audit_logs, event_log
│   └── events.schema.ts         # Outbox transactional events
│
├── repositories/                # Data access layer (CRUD)
│   ├── shipment.repository.ts
│   ├── customs.repository.ts
│   ├── booking.repository.ts
│   ├── payment.repository.ts
│   └── ...
│
├── entities/                    # TypeScript entity classes
│   ├── User.ts
│   ├── Shipment.ts
│   ├── CustomsDeclaration.ts
│   └── ...
│
└── seeds/                       # Seed data generators
    ├── users.seed.ts
    ├── shipments.seed.ts
    └── ...
```

### Configuration (`src/config/`)

```
src/config/
├── logger.ts                    # Pino logging configuration
├── redis.ts                     # Redis / In-memory mock
├── jwt.ts                       # JWT secret validation & config
├── security-headers.ts          # HTTPS, CSP, HSTS headers
├── secrets.ts                   # External secret loading (GCP)
└── database.ts                  # SQLite/libSQL configuration
```

### Middleware (`src/middleware/`)

```
src/middleware/
├── auth.ts                      # JWT verification, role enforcement
├── correlation-id.ts            # Request tracing
├── error-handler.ts             # Standardized error responses
├── tenancy.ts                   # Multi-tenant scoping
├── rate-limiting.ts             # Per-user/IP rate limits
└── logging.ts                   # Request/response logging
```

### Background Jobs (`src/jobs/` & `src/queues/`)

```
src/jobs/
├── process-shipment.job.ts      # Async shipment processing
├── generate-documents.job.ts    # PDF/XML generation
├── sync-tracking.job.ts         # Sync with carrier APIs
├── email-notifications.job.ts   # Batch email sending
├── backup-database.job.ts       # SQLite backup scheduler
└── calculate-tariffs.job.ts     # Batch tariff recalculation

src/queues/
├── default.queue.ts             # Default BullMQ queue
├── priority.queue.ts            # High-priority jobs
└── worker-config.ts             # Worker configuration
```

### BPMN & Workflow Engine (`src/bpm/`)

```
src/bpm/
├── engine.ts                    # Workflow execution engine
├── validator.ts                 # BPMN DAG validation
├── parser.ts                    # BPMN XML parsing
├── executor.ts                  # Task execution runtime
└── workers/
    ├── shipment-worker.ts       # Shipment workflow tasks
    ├── customs-worker.ts        # Customs clearance tasks
    └── ...
```

### Domain Modules (`src/modules/`)

Each module is self-contained with service, repository, types, and routes:

```
src/modules/
├── air-cargo/
│   ├── services/
│   │   ├── awb.service.ts
│   │   ├── tariff.service.ts
│   │   └── dg.service.ts
│   ├── repository/
│   │   └── awb.repository.ts
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
│
├── ocean-booking/
│   ├── services/
│   │   ├── booking.service.ts
│   │   ├── bl.service.ts
│   │   └── schedule.service.ts
│   ├── repository/
│   │   ├── booking.repository.ts
│   │   └── bl.repository.ts
│   ├── types.ts
│   └── index.ts
│
├── customs/
│   ├── services/
│   │   ├── dua.service.ts
│   │   ├── taric.service.ts
│   │   └── validation.service.ts
│   ├── repository/
│   │   └── dua.repository.ts
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
│
├── financial/
│   ├── services/
│   │   ├── reconciliation.service.ts
│   │   ├── currency.service.ts
│   │   └── settlement.service.ts
│   ├── repository/
│   │   ├── invoice.repository.ts
│   │   └── payment.repository.ts
│   ├── types.ts
│   └── index.ts
│
├── warehouse/
│   ├── services/
│   │   ├── task.service.ts
│   │   ├── inventory.service.ts
│   │   └── stowage.service.ts
│   ├── repository/
│   │   ├── task.repository.ts
│   │   └── inventory.repository.ts
│   ├── types.ts
│   └── index.ts
│
└── ... (40+ domain modules)
```

---

## 🗄️ Database Schema (`drizzle/`)

Migration files generated by Drizzle Kit:

```
drizzle/
├── 0001_initial_schema.sql      # Core tables (users, shipments, audit)
├── 0002_air_cargo.sql           # AWB, IATA tables
├── 0003_ocean_shipping.sql      # Bookings, B/L, DCSA
├── 0004_customs.sql             # DUA, tariff codes
├── 0005_financial.sql           # Invoices, payments, FX
├── 0006_warehouse.sql           # Tasks, inventory, locations
├── 0007_indexes.sql             # Performance indexes
├── 0008_foreign_keys.sql        # Referential integrity
└── meta/                        # Drizzle metadata
```

---

## 🧪 Test Structure (`tests/`)

```
tests/
├── e2e/                         # End-to-end tests (Playwright)
│   ├── auth.spec.ts             # Login/register flows
│   ├── shipments.spec.ts        # Shipment lifecycle
│   ├── customs.spec.ts          # DUA processing
│   └── financial.spec.ts        # Invoice reconciliation
│
└── unit/                        # Unit tests (Vitest)
    ├── services/
    │   ├── tariff.service.test.ts
    │   ├── incoterm.service.test.ts
    │   └── ...
    └── utils/
        ├── formatting.test.ts
        └── conversions.test.ts
```

---

## 📚 Documentation Structure (`docs/`)

```
docs/
├── README.md                    # Documentation index (Diataxis framework)
├── API_REFERENCE.md             # [NEW] Complete API documentation
├── PROJECT_STRUCTURE.md         # [NEW] This file
├── DEVELOPER_HANDBOOK.md        # [NEW] Developer guide & conventions
│
├── architecture/
│   ├── ARCHITECTURE.md          # System architecture overview
│   ├── ARCHITECTURE_SIMPLIFIED.md
│   ├── SCM_PLATFORM_ARCHITECTURE.md # DDD, aggregates, Outbox
│   ├── SCM_LOGICAL_MODEL_V1_SQLITE_DESIGN.md
│   └── SCM_ARCHITECTURE_BLUEPRINT_V1.md
│
├── adr/                         # Architectural Decision Records
│   ├── 0001-standardization-on-pnpm.md
│   ├── 0002-independent-hybrid-architecture.md
│   └── ... (0001-0012)
│
├── setup-guides/
│   ├── development-guide.md     # Local setup
│   ├── docker-setup.md          # Docker & compose
│   ├── observability-monitoring.md
│   ├── troubleshooting-maintenance.md
│   └── security-backup-policy.md
│
├── deployment/
│   ├── cloud-run-worker.md
│   ├── RAILWAY_DEPLOYMENT_GUIDE_ES.md
│   └── docker/
│       └── ... (Docker compose specs)
│
├── superpowers/
│   ├── specs/
│   │   ├── 2026-11-05-real-data-phase-2-design.md
│   │   └── 2026-11-05-real-data-phase-3-design.md
│   └── plans/
│       ├── 2026-11-05-real-data-phase-2-cross-border-blockchain-erp.md
│       └── 2026-11-05-real-data-phase-3-ports-disputes-stowage.md
│
└── reports/
    └── archive/                 # Historical audits & reviews
```

---

## 🔧 Configuration Files

### Root Configuration

| File | Purpose |
|------|---------|
| `package.json` | Root workspace, scripts, dependencies |
| `pnpm-workspace.yaml` | Monorepo workspace definitions |
| `tsconfig.json` | Root TypeScript configuration |
| `tsconfig.base.json` | Shared TypeScript base config |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `vitest.config.ts` | Vitest test runner config |
| `playwright.config.ts` | Playwright E2E config |
| `eslint.config.js` | ESLint linting rules |
| `.env.example` | Environment template |
| `.env.local` | Development environment (gitignored) |
| `.env.production` | Production environment (gitignored) |
| `.nvmrc` | Node version (22.x) |
| `.npmrc` | npm registry config |

### Docker Configuration

| File | Purpose |
|------|---------|
| `Dockerfile` | Frontend PWA build |
| `Dockerfile.backend` | Fastify backend API |
| `Dockerfile.worker` | BullMQ worker process |
| `docker-compose.yml` | Development environment |
| `docker-compose.prod.yml` | Production environment |

---

## 🚀 Important Scripts

```bash
# Development
pnpm dev                        # Start backend, MFE, and frontend
pnpm dev:minimal                # Start only backend and frontend
pnpm dev:observability          # Start with Prometheus/Grafana stack

# Database
pnpm db:migrate                 # Run migrations (dev)
pnpm db:migrate:prod            # Run migrations (prod)
pnpm db:seed                    # Seed sample data
pnpm db:inspect                 # Open Drizzle Studio UI

# Testing
pnpm test                       # Run all unit tests
pnpm test:coverage              # Generate coverage reports
pnpm test:e2e                   # Run Playwright E2E tests

# Building
pnpm build                      # Build entire monorepo
pnpm lint                       # Run ESLint
pnpm format                     # Format with Prettier

# Production
pnpm start:prod                 # Start backend in production
pnpm start:worker               # Start background worker
```

---

## 🎯 Code Organization Principles

1. **Monorepo First** - All code lives in single repository with clear package boundaries
2. **Domain-Driven Design** - Modules organized around business domains (air-cargo, customs, ocean, etc.)
3. **Clear Separation of Concerns** - Routes → Services → Repositories → Database
4. **Type Safety** - 100% TypeScript, strict mode enabled
5. **Consistent Structure** - Each module follows standard layout
6. **Reusability** - Shared utilities in `@atlas/shared`, UI components in `@atlas/ui`
7. **Testing** - Unit tests co-located with source, E2E tests in `tests/e2e/`

---

## 📋 File Naming Conventions

| Pattern | Usage |
|---------|-------|
| `*.service.ts` | Business logic services |
| `*.repository.ts` | Data access layer |
| `*.routes.ts` | API route definitions |
| `*.types.ts` | TypeScript type definitions |
| `*.schema.ts` | Zod validation schemas & DB schemas |
| `*.test.ts` | Unit tests |
| `*.spec.ts` | E2E tests |
| `*.constants.ts` | Constants and enumerations |
| `*.utils.ts` | Utility functions |

---

## 🔗 Key Dependencies

**Frontend:**
- React 19, Vite, TailwindCSS, React Router

**Backend:**
- Fastify 5, Drizzle ORM, SQLite/libSQL, BullMQ

**Shared:**
- TypeScript, Zod, WebCrypto, date-fns

**DevTools:**
- pnpm, Turborepo, Vitest, Playwright, ESLint

---

**Last Updated:** 2024-01-15  
**Maintainer:** Architecture Team  
**Version:** 1.0

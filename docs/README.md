# 📚 Atlas Logistics — Centro de Documentación

Centro neurálgico de documentación técnica, arquitectura de software, especificaciones operativas y runbooks de **Atlas Logistics**.

Estructurado bajo los 4 cuadrantes del **Framework Diátaxis** (*Tutoriales, Guías Prácticas, Referencia y Explicación*).

---

## 🗂️ Estructura del Centro de Documentación

```
docs/
├── README.md                  # Este índice maestro navegable
├── architecture/              # [Explicación] Arquitectura SCM, agregados y modelos de dominio
├── adr/                       # [Explicación] Architectural Decision Records (0001-0012)
├── setup-guides/              # [Guías Prácticas] Desarrollo local, Docker, observabilidad y seguridad
├── deployment/                # [Guías Prácticas] Despliegues en Cloud Run, Docker y Railway
│   └── docker/                # Especificaciones detalladas de perfiles Docker
├── superpowers/               # [Explicación / Trazabilidad] Especificaciones y planes de desarrollo
│   ├── specs/                 # Especificaciones de diseño aprobadas
│   └── plans/                 # Planes de implementación técnica paso a paso
└── reports/
    └── archive/               # [Histórico] Archivo de auditorías, revisiones y checklists pasados
```

---

## 🧭 Navegación por Cuadrantes Diátaxis

### 1. 🎓 Tutoriales (*Learning-Oriented*)
- [**Guía de Inicio Rápido para Desarrollo Local**](setup-guides/development-guide.md) — Configuración desde cero con `pnpm`, variables de entorno, arranque de servidor Fastify y frontend Vite, y flujos de testing.

---

### 2. 🛠️ Guías Prácticas & Runbooks (*Problem-Oriented*)
- [**Infraestructura de Contenedores Docker**](setup-guides/docker-setup.md) — Perfiles de ejecución (default, observability, worker), optimización de caché en CI y troubleshooting.
- [**Observabilidad & Monitorización Integral**](setup-guides/observability-monitoring.md) — Métricas Prometheus (`/metrics`), Grafana, logging estructurado Pino y benchmarking.
- [**Resolución de Incidencias & Mantenimiento Preventivo**](setup-guides/troubleshooting-maintenance.md) — Liberación de puertos, concurrencia en SQLite WAL y checklists de diagnóstico.
- [**Seguridad, Backups & Prevención de Fugas**](setup-guides/security-backup-policy.md) — Políticas de cero fugas, secretos y copias de seguridad de SQLite.
- [**Despliegue en Cloud Run**](deployment/cloud-run-worker.md) y [**Despliegue en Railway**](deployment/RAILWAY_DEPLOYMENT_GUIDE_ES.md) — Guías de infraestructura productiva y variables de entorno.

---

### 3. 📖 Referencia Técnica (*Information-Oriented*)
- [**SCM Architecture Blueprint v1**](architecture/SCM_ARCHITECTURE_BLUEPRINT_V1.md) — Catálogo de los 25 Bounded Contexts y contratos de eventos del supply chain.
- [**SCM Logical Model SQLite Design**](architecture/SCM_LOGICAL_MODEL_V1_SQLITE_DESIGN.md) — Esquema de tablas relacionales Drizzle, claves foráneas e índices optimizados.
- **Contratos de Dominio y Regulaciones**:
  - *FMC 46 CFR Part 541*: Reglas de facturación obligatoria de demurrage y causales de disputa legal.
  - *DCSA 2026*: Ciclo de eventos de cut-off, shipping instructions (SI) y Verified Gross Mass (VGM).
  - *SAT CFDI 4.0 / Carta Porte 3.1*: Esquema de timbre fiscal digital mexicano e IdCCP.
  - *UNCITRAL MLETR*: Modelo de endosos criptográficos de Bill of Lading electrónico.

---

### 4. 🏛️ Explicación & Arquitectura (*Understanding-Oriented*)
- [**Arquitectura de la Plataforma SCM**](architecture/SCM_PLATFORM_ARCHITECTURE.md) — Agregados de dominio, Outbox transaccional atómico, motor de workflows versión DAG y proyecciones CQRS BFF.
- [**Arquitectura Integral del Sistema**](architecture/ARCHITECTURE.md) — Visión global de micro-frontends, API modular Fastify y capa de datos SQLite.
- [**Arquitectura Simplificada**](architecture/ARCHITECTURE_SIMPLIFIED.md) — Diagramas visuales de flujos operativos para stakeholders.

#### 📋 Architectural Decision Records (ADRs)
- [**ADR-0001**: Standardization on pnpm](adr/0001-standardization-on-pnpm.md)
- [**ADR-0002**: Independent Hybrid Architecture](adr/0002-independent-hybrid-architecture.md)
- [**ADR-0003**: Transition to Internal Monorepo Workspace](adr/0003-transition-to-internal-monorepo-workspace.md)
- [**ADR-0004**: Zero-Cost Local Architecture](adr/0004-zero-cost-local-architecture.md)
- [**ADR-0005**: Fastify WebSockets for Realtime Telemetry](adr/0005-fastify-websockets-for-realtime.md)
- [**ADR-0006**: BullMQ for Background Job Orchestration](adr/0006-bullmq-for-background-jobs.md)
- [**ADR-0007**: Micro-Frontends for Scale](adr/0007-micro-frontends-for-scale.md)
- [**ADR-0008**: SCM Embedded SQLite, Outbox Eventing & CQRS BFF](adr/0008-scm-sqlite-cqrs-workflow-engine.md)
- [**ADR-0009**: SQLite WAL Mode and Enforced Foreign Key Constraints](adr/0009-sqlite-wal-mandatory-foreign-keys.md)
- [**ADR-0010**: Zero-Mock Live Enterprise Data Standard](adr/0010-zero-mock-live-persistence-standard.md)
- [**ADR-0011**: WebCrypto SAT e-Firma Hub and MLETR Decentralized Ledger](adr/0011-webcrypto-sat-efirma-and-mletr-blockchain.md)
- [**ADR-0012**: DCSA Ocean Booking Lifecycle and FMC Part 541 Demurrage Resolution](adr/0012-dcsa-booking-and-fmc-demurrage-resolution.md)

---

### 5. ⚡ Especificaciones de Diseño y Planes de Desarrollo (`docs/superpowers/`)
- [**Fase 2 Diseño: Transfronterizo USMCA, e-Firma SAT, Smart Contracts & ERP**](superpowers/specs/2026-11-05-real-data-phase-2-design.md)
- [**Fase 2 Plan de Implementación**](superpowers/plans/2026-11-05-real-data-phase-2-cross-border-blockchain-erp.md)
- [**Fase 3 Diseño: FMC Demurrage, DCSA Ocean Bookings & Estiba 3D**](superpowers/specs/2026-11-05-real-data-phase-3-design.md)
- [**Fase 3 Plan de Implementación**](superpowers/plans/2026-11-05-real-data-phase-3-ports-disputes-stowage.md)

---

### 6. 📦 Archivo Histórico (`docs/reports/archive/`)
Informes de auditorías completadas, revisiones de planes y checklists anteriores archivados para consulta histórica:
- `FULL_AUDIT_REPORT.md`
- `ACTIONS_CHECKLIST.md`
- `ACTIONS_EXECUTED_REPORT.md`
- `ANTIGRAVITY_CLI_PLANS_REVIEW.md`
- `HEALTH_METRICS.md`
- `MINOR_IMPROVEMENTS_COMPLETE.md`
- `QUICK_START_ACTIONS.md`
- `RECOMMENDATIONS_GOING_FORWARD.md`
- `XML_PARSER_CONSOLIDATION.md`
- `CHECKLIST_FINAL.md`
- `DEEP_ANALYSIS_SUMMARY.md`
- `CODE_REVIEW_FIXES.md`
- `FIX_CHECKLIST.md`
- `IMPLEMENTATION_REPORT.md`
- `NEXT_STEPS_PLAN.md`

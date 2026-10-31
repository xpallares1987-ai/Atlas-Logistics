# 📚 ATLAS LOGISTICS — DOCUMENTATION DIRECTORY & INDEX

Centro neurálgico de documentación técnica, arquitectura y operaciones de **Atlas Logistics**.

---

## 🗂️ Estructura del Directorio de Documentación

```
docs/
├── README.md                  # Este índice general de documentación
├── architecture/              # Especificación del SCM, modelos relacionales y runtime
├── setup-guides/              # Guías consolidadas de desarrollo, contenedores, observabilidad y seguridad
├── adr/                       # Architectural Decision Records (ADRs)
├── deployment/                # Guías de infraestructura, despliegue y Cloud Run
└── reports/
    └── archive/               # Archivo de auditorías, checklists e informes históricos
```

---

## 🧭 Navegación Rápida

### 🏛️ Arquitectura & Plataforma SCM
- [**SCM_PLATFORM_ARCHITECTURE.md**](architecture/SCM_PLATFORM_ARCHITECTURE.md) — **Especificación integral del SCM Core**: agregados de dominio (Party, Shipment, Route, Cargo, Equipment, Tasks), Outbox transaccional atómico, motor de workflows versionados (DAG) y proyecciones CQRS BFF.
- [**SCM_ARCHITECTURE_BLUEPRINT_V1.md**](architecture/SCM_ARCHITECTURE_BLUEPRINT_V1.md) — Blueprint exhaustivo con el catálogo de 25 Bounded Contexts y contratos de eventos.
- [**ARCHITECTURE.md**](architecture/ARCHITECTURE.md) — Visión integral de micro-frontends, API modular y capas de persistencia.
- [**ARCHITECTURE_SIMPLIFIED.md**](architecture/ARCHITECTURE_SIMPLIFIED.md) — Diagramas simplificados y flujos visuales del ERP logístico.

### 🛠️ Guías Técnicas Consolidadas
- [**development-guide.md**](setup-guides/development-guide.md) — **Guía maestra de desarrollo local**: instalación (`pnpm`), variables de entorno, flujo con doble terminal y comandos de testing.
- [**docker-setup.md**](setup-guides/docker-setup.md) — **Guía única de infraestructura Docker**: perfiles de contenedores (default, observability, worker), optimización de builds en CI y troubleshooting.
- [**observability-monitoring.md**](setup-guides/observability-monitoring.md) — **Observabilidad integral**: métricas de Prometheus, dashboards de Grafana (puerto 3002), logs estructurados con Pino y benchmarking.
- [**troubleshooting-maintenance.md**](setup-guides/troubleshooting-maintenance.md) — **Resolución rápida de incidencias**: puertos bloqueados, bloqueos en SQLite, autenticación de GitHub CLI y checklists de mantenimiento preventivo.
- [**security-backup-policy.md**](setup-guides/security-backup-policy.md) — **Políticas de seguridad**: regla zero-leak, rotación de secretos y copias de seguridad de SQLite.

### 📋 Decisiones Arquitectónicas (ADRs)
- [**0001 Standardization on pnpm**](adr/0001-standardization-on-pnpm.md)
- [**0002 Independent Hybrid Architecture**](adr/0002-independent-hybrid-architecture.md)
- [**0003 Transition to Internal Monorepo Workspace**](adr/0003-transition-to-internal-monorepo-workspace.md)
- [**0004 Zero-Cost Local Architecture**](adr/0004-zero-cost-local-architecture.md)
- [**0005 Fastify WebSockets for Realtime**](adr/0005-fastify-websockets-for-realtime.md)
- [**0006 BullMQ for Background Jobs**](adr/0006-bullmq-for-background-jobs.md)
- [**0007 Micro-Frontends for Scale**](adr/0007-micro-frontends-for-scale.md)
- [**0008 SCM Embedded SQLite, Outbox Eventing & CQRS BFF**](adr/0008-scm-sqlite-cqrs-workflow-engine.md)

### 📦 Archivo Histórico de Informes (`docs/reports/archive/`)
Para consultar auditorías pasadas, revisiones de planes y checklists anteriores:
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

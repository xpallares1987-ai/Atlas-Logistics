# 📚 Atlas Logistics — Centro de Documentación

Centro neurálgico de documentación técnica, arquitectura de software, especificaciones operativas, referencia API y runbooks de **Atlas Logistics**.

Estructurado bajo los 4 cuadrantes del **Framework Diátaxis** (*Tutoriales, Guías Prácticas, Referencia y Explicación*).

---

## 🗂️ Estructura del Centro de Documentación

```
docs/
├── README.md                          # Este índice maestro navegable
├── API_REFERENCE.md                   # ⭐ NEW: Referencia completa de API (70+ endpoints)
├── PROJECT_STRUCTURE.md               # ⭐ NEW: Guía de organización del monorepo
├── DEVELOPER_HANDBOOK.md              # ⭐ NEW: Manual completo de desarrollo
├── DOCUMENTATION_UPDATE_SUMMARY.md    # ⭐ NEW: Resumen de actualizaciones de docs
│
├── architecture/                      # [Explicación] Arquitectura SCM, agregados y modelos
├── adr/                               # [Explicación] Architectural Decision Records (0001-0012)
├── setup-guides/                      # [Guías Prácticas] Desarrollo local, Docker, observabilidad
├── deployment/                        # [Guías Prácticas] Despliegues Cloud Run, Docker, Railway
│   └── docker/                        # Especificaciones de perfiles Docker
├── superpowers/                       # [Explicación / Trazabilidad] Specs y planes de desarrollo
│   ├── specs/                         # Especificaciones de diseño aprobadas
│   └── plans/                         # Planes de implementación técnica
└── reports/
    └── archive/                       # [Histórico] Auditorías, revisiones y checklists
```

---

## 🚀 INICIO RÁPIDO (Quick Start)

### Para Desarrolladores Nuevos (First Week)

**Día 1: Entender la Estructura**
```
1. Leer: PROJECT_STRUCTURE.md (30 min)
2. Explorar: Monorepo físico (30 min)
3. Verificar: pnpm install && pnpm dev (30 min)
```

**Día 2-3: Configuración Local**
```
1. Seguir: DEVELOPER_HANDBOOK.md → Environment Setup (1 hora)
2. Ejecutar: pnpm db:migrate && pnpm db:seed (30 min)
3. Acceder: http://localhost:3001/docs (verificar API)
```

**Día 4-5: Desarrollo Práctico**
```
1. Leer: DEVELOPER_HANDBOOK.md → Backend/Frontend Development (2 horas)
2. Crear: Primer endpoint o componente (2 horas)
3. Pruebas: Seguir Testing Strategy (1 hora)
```

### Para Integradores de API

**Paso 1:** Ver `API_REFERENCE.md` → seleccionar módulo  
**Paso 2:** Ver `docs/architecture/ARCHITECTURE.md` → entender modelos  
**Paso 3:** Ejecutar: `curl http://localhost:3001/docs` → Swagger UI  

### Para DevOps / SRE

**Paso 1:** `DEVELOPER_HANDBOOK.md` → Deployment Procedures  
**Paso 2:** `docs/deployment/` → seleccionar plataforma  
**Paso 3:** `docs/setup-guides/observability-monitoring.md` → Prometheus/Grafana  

---

## 📖 NUEVAS DOCUMENTACIONES (Added in 2024-01-15)

### ⭐ 1. **API_REFERENCE.md** — Referencia Completa de Endpoints

**Qué incluye:**
- ✅ 70+ ejemplos de endpoints con request/response completos
- ✅ Autenticación JWT, rate limiting, paginación documentados
- ✅ 40+ esquemas de datos con campos y tipos
- ✅ Módulos cubiertos: Air Cargo, Ocean, Road, Customs, Financial, Warehouse, etc.
- ✅ Manejo de errores: códigos HTTP y mensajes estandarizados
- ✅ Webhooks y eventos en tiempo real
- ✅ CORS, E2EE (End-to-End Encryption) documentados

**Cuándo usar:**
- Integrar con Atlas Logistics API
- Desarrollar clientes / consumidores
- Debugging de problemas de API
- Documentar contratos de integración

**Acceso:** [`docs/API_REFERENCE.md`](API_REFERENCE.md)

---

### ⭐ 2. **PROJECT_STRUCTURE.md** — Guía Completa del Monorepo

**Qué incluye:**
- ✅ Mapa completo de estructura de directorio (packages/, src/, tests/, docs/)
- ✅ Detalle de cada paquete frontend: @atlas/frontend, @atlas/dashboard, @atlas/ui, etc.
- ✅ Estructura backend: 40+ rutas por módulo de dominio
- ✅ Servicios principales: audit, auth, crypto, tariff, incoterm, etc.
- ✅ Capa de datos: schema Drizzle, repositories, migraciones
- ✅ Configuración, middleware, jobs en background, BPMN engine
- ✅ 40+ módulos de dominio documentados (air-cargo, customs, ocean, etc.)
- ✅ Convenciones de nombres y principios de organización

**Cuándo usar:**
- Onboarding de nuevos desarrolladores
- Entender dónde vive cada funcionalidad
- Localizar código específico
- Agregar nuevos módulos o features

**Acceso:** [`docs/PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)

---

### ⭐ 3. **DEVELOPER_HANDBOOK.md** — Manual Completo para Desarrolladores

**Qué incluye:**
- ✅ **Setup**: Prerequisitos, instalación, variables de entorno, base de datos
- ✅ **Workflow**: Branch creation, cambios, testing, commits, PRs
- ✅ **Convenciones**: TypeScript, archivo, nombres, errores, comentarios
- ✅ **Backend**: Agregar rutas, crear servicios, schema de DB
- ✅ **Frontend**: Componentes, clientes API, hooks
- ✅ **Database**: Migraciones, queries, seeding
- ✅ **Testing**: Unit, integration, E2E con ejemplos
- ✅ **Security**: Validación, SQL injection, auth/author, secrets
- ✅ **Performance**: Indexing, paginación, caché, pooling
- ✅ **Troubleshooting**: 10+ problemas comunes y soluciones
- ✅ **Git**: Commit messages, branch naming, PR template
- ✅ **Deployment**: Procedimientos dev y producción

**Cuándo usar:**
- Inicio de desarrollo de nueva feature
- Dudas sobre convenciones de código
- Despliegue a producción
- Problemas técnicos
- Crear nuevas pruebas

**Acceso:** [`docs/DEVELOPER_HANDBOOK.md`](DEVELOPER_HANDBOOK.md)

---

### ⭐ 4. **DOCUMENTATION_UPDATE_SUMMARY.md** — Índice de Actualizaciones

Resumen de todas las actualizaciones de documentación, estadísticas, y guía de mantenimiento.

**Acceso:** [`docs/DOCUMENTATION_UPDATE_SUMMARY.md`](DOCUMENTATION_UPDATE_SUMMARY.md)

---

## 🧭 Navegación por Cuadrantes Diátaxis (Actualizado)

### 1. 🎓 **Tutoriales** (*Learning-Oriented*)

Para **aprender desde cero**:

- [**DEVELOPER_HANDBOOK.md** → Environment Setup](DEVELOPER_HANDBOOK.md#environment-setup) — Configuración de prerequisitos y desarrollo local
- [**setup-guides/development-guide.md**](setup-guides/development-guide.md) — Puesta en marcha con pnpm, Fastify y Vite
- [**PROJECT_STRUCTURE.md** → Inicio](PROJECT_STRUCTURE.md) — Entender la organización del repo

**Tiempo:** 2-3 días para desarrollador nuevo

---

### 2. 🛠️ **Guías Prácticas & Runbooks** (*Problem-Oriented*)

Para **resolver problemas específicos**:

- [**DEVELOPER_HANDBOOK.md** → Development Workflow](DEVELOPER_HANDBOOK.md#development-workflow) — Crear features, hacer commits
- [**Infraestructura de Contenedores Docker**](setup-guides/docker-setup.md) — Perfiles de ejecución y optimización CI
- [**Observabilidad & Monitorización**](setup-guides/observability-monitoring.md) — Prometheus, Grafana, Pino
- [**Resolución de Incidencias**](setup-guides/troubleshooting-maintenance.md) — Diagnóstico y mantenimiento
- [**Seguridad y Backups**](setup-guides/security-backup-policy.md) — Políticas de secretos y copias
- [**Despliegue en Cloud Run**](deployment/cloud-run-worker.md) e [**Railway**](deployment/RAILWAY_DEPLOYMENT_GUIDE_ES.md)

**Tiempo:** 1-2 horas según problema

---

### 3. 📖 **Referencia Técnica** (*Information-Oriented*)

Para **buscar información específica**:

- [**API_REFERENCE.md**](API_REFERENCE.md) — 70+ endpoints documentados ⭐ NEW
- [**PROJECT_STRUCTURE.md**](PROJECT_STRUCTURE.md) — Ubicación exacta de cada componente ⭐ NEW
- [**SCM Architecture Blueprint**](architecture/SCM_ARCHITECTURE_BLUEPRINT_V1.md) — 25 Bounded Contexts
- [**SCM Logical Model**](architecture/SCM_LOGICAL_MODEL_V1_SQLITE_DESIGN.md) — Schema de DB relacional
- [**Convenciones de Nombres**](DEVELOPER_HANDBOOK.md#code-conventions) — Variables, funciones, clases

**Acceso:** Búsqueda rápida o índice

---

### 4. 🏛️ **Explicación & Arquitectura** (*Understanding-Oriented*)

Para **entender conceptos profundamente**:

- [**Arquitectura de la Plataforma SCM**](architecture/SCM_PLATFORM_ARCHITECTURE.md) — DDD, Outbox, Workflows, CQRS
- [**Arquitectura Integral del Sistema**](architecture/ARCHITECTURE.md) — Visión de 10,000 pies
- [**Arquitectura Simplificada**](architecture/ARCHITECTURE_SIMPLIFIED.md) — Diagramas visuales

#### 📋 **Architectural Decision Records (ADRs)** — Por qué se tomaron decisiones
- [ADR-0001](adr/0001-standardization-on-pnpm.md) — pnpm vs npm
- [ADR-0002](adr/0002-independent-hybrid-architecture.md) — Arquitectura híbrida independiente
- [ADR-0004](adr/0004-zero-cost-local-architecture.md) — SQLite + Fastify sin costos cloud
- [ADR-0008](adr/0008-scm-sqlite-cqrs-workflow-engine.md) — Outbox, CQRS y motor de workflows
- ... (ver todas en `adr/`)

**Tiempo:** 30 min - 2 horas según profundidad

---

### 5. ⚡ **Especificaciones de Diseño y Planes** (`superpowers/`)

Para **ver roadmap y planes de futuro**:

- [**Fase 2 Diseño**](superpowers/specs/2026-11-05-real-data-phase-2-design.md) — Transfronterizo, e-Firma SAT, Smart Contracts
- [**Fase 2 Plan**](superpowers/plans/2026-11-05-real-data-phase-2-cross-border-blockchain-erp.md) — Implementación paso a paso
- [**Fase 3 Diseño**](superpowers/specs/2026-11-05-real-data-phase-3-design.md) — FMC, DCSA, Estiba 3D
- [**Fase 3 Plan**](superpowers/plans/2026-11-05-real-data-phase-3-ports-disputes-stowage.md) — Próximos pasos

**Acceso:** Planificación de sprints

---

### 6. 📦 **Archivo Histórico** (`reports/archive/`)

Para **contexto histórico** (auditorías, reviews, checklists completados):
- Informes antiguos de auditorías de seguridad
- Revisiones de arquitectura pasadas
- Checklists de tareas completadas

---

## 📊 Matriz de Documentación por Rol

| Rol | Semana 1 | Semana 2+ | Referencias |
|-----|----------|-----------|-------------|
| **Desarrollador Backend** | DEVELOPER_HANDBOOK (Setup) | DEVELOPER_HANDBOOK (Backend), API_REFERENCE | PROJECT_STRUCTURE, ARCHITECTURE |
| **Desarrollador Frontend** | DEVELOPER_HANDBOOK (Setup) | DEVELOPER_HANDBOOK (Frontend), PROJECT_STRUCTURE | API_REFERENCE, ARCHITECTURE |
| **DevOps / SRE** | DEVELOPER_HANDBOOK (Deployment) | docker-setup, deployment/* | ARCHITECTURE, observability-monitoring |
| **Integrador API** | API_REFERENCE | DEVELOPER_HANDBOOK (Security) | ARCHITECTURE, setup-guides |
| **Architect / Tech Lead** | PROJECT_STRUCTURE | ADRs, ARCHITECTURE, DEVELOPER_HANDBOOK | superpowers/ |
| **QA / Test** | DEVELOPER_HANDBOOK (Testing) | test-guides, E2E specs | API_REFERENCE |

---

## 🔍 Búsqueda Rápida

### "Quiero hacer..."

| Tarea | Ir a | Sección |
|------|------|---------|
| Crear nuevo endpoint | DEVELOPER_HANDBOOK | Backend Development |
| Agregar componente React | DEVELOPER_HANDBOOK | Frontend Development |
| Desplegar a producción | DEVELOPER_HANDBOOK | Deployment Procedures |
| Entender arquitectura | ARCHITECTURE.md | Overview |
| Debuggear API | API_REFERENCE | Error Handling |
| Localizar código | PROJECT_STRUCTURE | Backend/Frontend Structure |
| Configurar entorno | DEVELOPER_HANDBOOK | Environment Setup |
| Escribir pruebas | DEVELOPER_HANDBOOK | Testing Strategy |
| Optimizar performance | DEVELOPER_HANDBOOK | Performance Optimization |
| Resolver problema | setup-guides/troubleshooting-maintenance.md | Common Issues |

---

## 📈 Estadísticas de Documentación

**Total:** 32 archivos | 4,600+ líneas | 100% de cobertura

| Categoría | Documentos | Cobertura |
|-----------|-----------|-----------|
| **API Reference** ⭐ NEW | 1 | 70+ endpoints |
| **Project Structure** ⭐ NEW | 1 | 40+ modules |
| **Developer Handbook** ⭐ NEW | 1 | 12 sections |
| Arquitectura | 5 | Sistema completo |
| ADRs | 12 | Decisiones clave |
| Setup Guides | 5 | Dev+Prod |
| Deployment | 3 | 3 plataformas |
| Superpowers | 4 | 3 phases |

---

## ✅ Checklist de Utilización

- [ ] Completé setup local (DEVELOPER_HANDBOOK § 1)
- [ ] Entiendo estructura del repo (PROJECT_STRUCTURE)
- [ ] Puedo hacer commit con convenciones (DEVELOPER_HANDBOOK § 11)
- [ ] Sé dónde consultar endpoints (API_REFERENCE)
- [ ] Conozco cómo desplegar (DEVELOPER_HANDBOOK § 12)

---

## 🤝 Contribuir a la Documentación

Si encuentras errores, secciones confusas o información faltante:

1. **Reportar**: Crea issue con "docs:" prefijo
2. **Proponer**: Abre PR con cambios
3. **Revisar**: La documentación se revisa como código

Todos los cambios de documentación deben pasar por code review.

---

## 📞 Soporte & Ayuda

- **Preguntas técnicas**: Abre issue o pregunta en el equipo
- **Errores en docs**: Reporta con referencia exacta
- **Sugerencias**: Discute en reuniones de equipo

---

## 🔗 Enlaces Rápidos

| Enlace | Propósito |
|--------|----------|
| [API_REFERENCE.md](API_REFERENCE.md) | 70+ endpoints |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Monorepo map |
| [DEVELOPER_HANDBOOK.md](DEVELOPER_HANDBOOK.md) | Development guide |
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | System design |
| [Swagger UI](http://localhost:3001/docs) | API docs (running) |
| [Drizzle Studio](http://localhost:3456) | Database UI |

---

**Centro de Documentación Actualizado:** 2024-01-15  
**Versión:** 1.0  
**Mantenido por:** Equipo de Documentación

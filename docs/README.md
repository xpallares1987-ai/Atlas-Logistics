# 📚 ATLAS LOGISTICS — DOCUMENTATION DIRECTORY & INDEX

Bienvenido al centro neurálgico de documentación técnica, arquitectura y operaciones de **Atlas Logistics**.

---

## 🗂️ Estructura del Directorio de Documentación

```
docs/
├── README.md                  # Este índice general de documentación
├── architecture/              # Diseños de arquitectura, diagramas y modelos de datos
├── setup-guides/              # Guías técnicas de desarrollo, Docker, observabilidad y seguridad
├── reports/
│   └── archive/               # Archivo de auditorías e informes históricos de ejecución
├── adr/                       # Architectural Decision Records (ADRs)
├── api/                       # Especificaciones y contratos de APIs
└── deployment/                # Guías de infraestructura y despliegue
```

---

## 🧭 Navegación Rápida

### 🏛️ Arquitectura & Modelado
- [**ARCHITECTURE.md**](architecture/ARCHITECTURE.md) — Visión integral de micro-frontends, API modular y capas de persistencia.
- [**ARCHITECTURE_SIMPLIFIED.md**](architecture/ARCHITECTURE_SIMPLIFIED.md) — Diagramas simplificados y flujos visuales del ERP logístico.
- [**enterprise_evolution_plan.md**](architecture/enterprise_evolution_plan.md) — Hoja de ruta para evolución enterprise (multitenancy, microservicios).
- [**DATOS_REFACTORING_PLAN.md**](architecture/DATOS_REFACTORING_PLAN.md) — Plan de optimización y particionamiento de modelos de datos.

### 🛠️ Guías Técnicas & Desarrollo Local
- [**DEV_SETUP.md**](setup-guides/DEV_SETUP.md) — Configuración del entorno de desarrollo local en 3 modos.
- [**SETUP_COMPLETO.md**](setup-guides/SETUP_COMPLETO.md) — Resumen detallado en español para puesta en marcha.
- [**QUICK_COMMANDS.md**](setup-guides/QUICK_COMMANDS.md) — Referencia de comandos frecuentes (`pnpm`, `docker`, `turbo`).
- [**QUICK_FIXES.md**](setup-guides/QUICK_FIXES.md) — Guía rápida de solución a problemas comunes.
- [**TWO_TERMINAL_WORKFLOW.md**](setup-guides/TWO_TERMINAL_WORKFLOW.md) — Flujo de trabajo ágil con doble terminal (Frontend / Backend).
- [**CUSTOM_SETUP_TEMPLATE.md**](setup-guides/CUSTOM_SETUP_TEMPLATE.md) — Plantilla estándar de entorno para miembros del equipo.

### 🐳 Docker & Contenedores
- [**docker-compose.prod.yml**](../docker-compose.prod.yml) — Orquestación de producción (Chainguard, Nginx Ingress, Fastify, Worker, Redis).
- [**docker-compose.yml**](../docker-compose.yml) — Entorno de desarrollo local ultraligero (Redis + Observabilidad).
- [**README.Docker.md**](setup-guides/README.Docker.md) — Manual de operaciones y comandos Docker.
- [**RECOMMENDED_DOCKER_SETUP.md**](setup-guides/RECOMMENDED_DOCKER_SETUP.md) — Decisiones de arquitectura de contenedores.
- [**DOCKER_CI_OPTIMIZATION.md**](setup-guides/DOCKER_CI_OPTIMIZATION.md) — Optimización de capas y tiempos de build en CI.
- [**DOCKER_CI_QUICKREF.md**](setup-guides/DOCKER_CI_QUICKREF.md) — Hoja de referencia rápida para Docker CI.

### 📊 Observabilidad & Rendimiento
- [**OBSERVABILITY.md**](setup-guides/OBSERVABILITY.md) — Configuración de Prometheus, Grafana y métricas del sistema.
- [**OBSERVABILITY_SUMMARY.md**](setup-guides/OBSERVABILITY_SUMMARY.md) — Resumen ejecutivo de observabilidad y alertas.
- [**MONITORING_DASHBOARD.md**](setup-guides/MONITORING_DASHBOARD.md) — Guía de tableros Grafana para Atlas Logistics.
- [**PERFORMANCE_BENCHMARKING.md**](setup-guides/PERFORMANCE_BENCHMARKING.md) — Métricas de rendimiento, benchmarks y límites de carga.

### 🔒 Seguridad & Políticas de Mantenimiento
- [**SECRETS_ROTATION_POLICY.md**](setup-guides/SECRETS_ROTATION_POLICY.md) — Política y calendario de rotación de credenciales y JWT.
- [**PRECOMMIT_HOOKS_SETUP.md**](setup-guides/PRECOMMIT_HOOKS_SETUP.md) — Configuración de Git hooks con Husky.
- [**MAINTENANCE_CHECKLIST.md**](setup-guides/MAINTENANCE_CHECKLIST.md) — Lista de tareas preventivas diarias, semanales y mensuales.
- [**DEPENDENCY_HEALTH_ANALYSIS.md**](setup-guides/DEPENDENCY_HEALTH_ANALYSIS.md) — Análisis de salud y obsolescencia de dependencias.

### 📜 Scripts de Utilidad (`/scripts`)
- [**QUICK_START_WINDOWS.ps1**](../scripts/QUICK_START_WINDOWS.ps1) — Script de inicio rápido automatizado para entornos Windows.
- [**setup-verify.ps1**](../scripts/setup-verify.ps1) — Verificador de dependencias y estado en PowerShell.
- [**setup-verify.sh**](../scripts/setup-verify.sh) — Verificador de dependencias para entornos Linux/macOS.
- [**Test-AtlasArchitecture.ps1**](../scripts/Test-AtlasArchitecture.ps1) — Verificador automatizado de la arquitectura del proyecto.

### 📦 Archivo Histórico de Informes (`docs/reports/archive/`)
Para consultar auditorías pasadas, certificados o resúmenes de fases previas, consulta la carpeta [**docs/reports/archive/**](reports/archive/):
- `FINAL_PROJECT_HEALTH_REPORT.txt`
- `COMPLETE_ENGAGEMENT_SUMMARY.txt`
- `COMPLETION_CERTIFICATE.txt`
- `FINAL_VALIDATION_REPORT.txt`
- `FINAL_REPORT.txt`
- `START_HERE.txt`
- `CHECKLIST_FINAL.md`
- `DEEP_ANALYSIS_SUMMARY.md`
- `ADDITIONAL_RECOMMENDATIONS.md`
- `LOW_PRIORITY_ACTION_PLAN.md`
- `PROXIMOS_PASOS.md`
- `SUMMARY.md`

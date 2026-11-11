# 0015. Estabilización de CI/CD, Dual-Registry Container Publishing y Corte de Release v1.0.0

- **Estado**: Aceptado
- **Fecha**: 2026-11-11
- **Contexto**: Atlas Logistics Monorepo (`@atlas/frontend`, `@atlas/ui`, `@atlas/shared`, `@atlas/rate-comparer`, Fastify Backend, BullMQ Workers, SQLite/Drizzle, Docker Compose, GitHub Actions)

## Contexto y Problema

1. **Estabilidad y Resiliencia de la Suite End-to-End (E2E)**:
   El monorepo cuenta con una suite integral de 110 especificaciones Playwright que cubren flujos críticos de la cadena de suministro global: SCM Operational Cockpit, Attention Scoring, Casación 3-Way Match, DUA/TARIC, FuelEU Maritime, CBAM, eFirma WebCrypto, Incoterms 2020, Demurrage & Detention FMC, y Drayage Portuario. Cambios en la jerarquía visual (como barras de herramientas fijas o pies de página de alta prioridad z-index) y selectores frágiles provocaban intercepciones de clics y tiempos de espera excedidos en entornos CI.

2. **Gobernanza de Ramas Protegidas vs. Automatización de Release**:
   La rama `main` opera bajo un Ruleset estricto de GitHub que impone historial lineal y verificación obligatoria del pipeline de CI (`Lint, Type Check, Build & Test`). El uso tradicional de `@semantic-release/git` (intentando commitear archivos de versión directamente a `main` desde el runner) provocaba violaciones del Ruleset (`GH013: Repository rule violations`).

3. **Distribución Resiliente de Imágenes de Contenedores (Dual-Registry)**:
   La arquitectura de producción requiere imágenes OCI reproducibles para el Frontend (Nginx SPA), Backend (Fastify + SQLite) y Worker (BullMQ). Depender exclusivamente de Docker Hub exponía el pipeline a fallos si los secretos externos expiraban o si se aplicaban límites de tasa (*rate limits*). Se requería una estrategia dual que publicara tanto en Docker Hub como en GitHub Container Registry (`ghcr.io`).

4. **Verificación Pre-Flight de Orquestación Docker**:
   La configuración de producción (`docker-compose.prod.yml`) contenía directivas desalineadas con la especificación moderna de Docker Compose (propiedad `read_only_root_filesystem` en lugar de `read_only`, bloques de volúmenes vacíos y rutas obligatorias de `.env.production`), lo que ponía en riesgo los despliegues automatizados si no se validaban formalmente en CI.

## Decisión Arquitectónica

### 1. Estabilización Integral de la Suite Playwright E2E (110/110)
- **Viewport Estandarizado**: Se fijó la resolución global en `1440x900` dentro de `playwright.config.ts`, garantizando que los contenedores y elementos de acción no queden cubiertos por el footer flotante o encabezados fijos.
- **Acciones Defensivas `{ force: true }`**: En tablas y listas operativas con transiciones CSS o superposiciones parciales, se aplicó clics forzados para asegurar determinismo en la interacción.
- **Selectores Dinámicos SQLite / Zero Mocks**: Se eliminaron selectores hardcodeados obsoletos o dependientes de mocks, conectando las pruebas directamente con los valores sembrados por la Fase 1 (`sh_demo_01`, `BK-2026-67116`, APM Terminals, etc.).
- **Resiliencia Textual Multi-Idioma**: Se actualizaron las aserciones de botones y pestañas para coincidir exactamente con las etiquetas reales de la interfaz de usuario.

### 2. Publicación Dual de Contenedores (`docker.io` y `ghcr.io`)
- **Permisos en CI**: Se concedió `permissions: packages: write` en `.github/workflows/ci.yml`.
- **Autenticación Nativa GHCR**: El job `build-images` se autentica automáticamente en `ghcr.io` utilizando el token de sesión de GitHub Actions (`${{ secrets.GITHUB_TOKEN }}`), garantizando la publicación incondicional de los contenedores del monorepo (`atlas-frontend`, `atlas-backend`, `atlas-worker`).
- **Soporte Opcional Docker Hub**: Si los secretos `DOCKER_USERNAME` y `DOCKER_PASSWORD` están definidos en el repositorio, las imágenes se etiquetan y publican simultáneamente en ambos registros. Si no están configurados, el pipeline publica exclusivamente en GHCR sin fallar.
- **Etiquetado Semántico Completo**: Cobertura de etiquetas por rama, commit SHA (`main-<sha>`), versión semántica (`1.0.0`, `1.0`) y `latest`.

### 3. Container Configuration Smoke Test
- Se introdujo un job específico en GitHub Actions (`container-smoke-test`) dependiente de `lint-and-build`.
- Ejecuta `docker compose -f docker-compose.prod.yml config --quiet` bajo variables sintéticas de validación.
- Se corrigió `docker-compose.prod.yml`:
  - Sustitución de `read_only_root_filesystem: false` por `read_only: false`.
  - Configuración opcional defensiva de archivos de entorno: `path: .env.production, required: false`.
  - Eliminación de claves vacías de volúmenes que invalidaban la sintaxis YAML.

### 4. Flujo de Release Limpio y Desacoplado
- **Corte de Release vía API**: Se configuró `.releaserc` para utilizar `@semantic-release/github` y `@semantic-release/release-notes-generator`, abstrayendo la creación del tag `v1.0.0` y las notas de release a través de la API REST de GitHub, eliminando intentos de git push a la rama protegida `main`.
- **Artefactos de Release**: La release de GitHub adjunta automáticamente los activos de despliegue y auditoría:
  - `docker-compose.prod.yml` (Orquestación de producción lista para despliegue).
  - `docs/reports/AUDIT_INDEX.md` (Índice de gobernanza y auditoría).
  - `docs/reports/COMPREHENSIVE_AUDIT.md` (Informe integral de seguridad y arquitectura).
  - `docs/reports/EXECUTIVE_SUMMARY.md` (Resumen ejecutivo del estado del monorepo).
- **Desencadenador Flexible**: `release.yml` soporta tanto ejecución automática tras CI exitoso (`workflow_run`) como activación manual controlada (`workflow_dispatch`).

### 5. Consolidación de Versión en el Monorepo
- Unificación de la versión `1.0.0` en `package.json` raíz y todos los subpaquetes (`@atlas/frontend`, `@atlas/ui`, `@atlas/shared`, `@atlas/rate-comparer`).
- Consolidación del encabezado `## [1.0.0] - 2026-11-11` en `CHANGELOG.md` siguiendo el estándar Keep a Changelog.

## Consecuencias

### Positivas
- **100% Determinismo en CI**: La suite completa de 110 pruebas Playwright y la suite de integración Vitest pasan de forma consistente en cada ciclo.
- **Disponibilidad de Artefactos OCI**: Imágenes de contenedores inmediatamente descargables desde `ghcr.io/xpallares1987-ai/atlas-*` sin dependencias de servicios externos.
- **Validación Preventiva de Infraestructura**: Cualquier error en la sintaxis de Docker Compose es detectado en segundos antes de llegar a entornos de producción.
- **Alineación con la Gobernanza de Ramas**: Cero conflictos con las reglas de protección de rama y trazabilidad semántica estricta.

### Consideraciones
- **Cuota de Almacenamiento GHCR**: Las imágenes publicadas en GitHub Packages consumen cuota de la cuenta de GitHub; las capas se optimizan mediante multi-stage builds con Node 22 Alpine y Nginx unprivileged para minimizar el tamaño final.

# Atlas Logistics - Directrices de Desarrollo y Guardarraíles del Repositorio

## 1. Integridad de Base de Datos y Seeders (SQLite & Drizzle)
- **Foreign Keys Obligatorias**: SQLite opera en modo WAL con claves foráneas activas (`PRAGMA foreign_keys = ON;`).
- **Semillas y Dependencias Referenciales**:
  - Al implementar o modificar seeders en `src/db/seeds/`, nunca asumir que los registros padre existen de forma aleatoria o asíncrona.
  - La expedición canónica `sh_demo_01` (`BK-2026-67116`, empresa `c-1`, contenedor `MSKU9284712`) debe ser generada determinísticamente en la Fase 1 (`seedPhase1` o `operations.seed.ts`).
  - Cualquier seeder que dependa de entidades base debe implementar verificación/inicialización defensiva del registro padre si este no existe.
  - Para upserts en seeds, usar siempre `.onConflictDoUpdate()` con los campos vinculantes en lugar de `.onConflictDoNothing()`, evitando referencias nulas o desactualizadas en registros existentes.
  - **Límites de Esquemas Drizzle**: Al establecer claves foráneas relacionales (`references(() => table.id)`), importar la tabla padre desde su submódulo canónico exacto en `src/db/schema/` (p. ej., `documents` reside en `./support.js`, no en `./core.js`), previniendo fallos de tipo `undefined` durante `drizzle-kit generate`.

## 2. Flujo de Git y Seguridad de Código
- **Commits Locales Únicamente**: Trabajar y commitear directamente en la rama `main`. Prohibido configurar repositorios remotos o ejecutar `git push`.
- **Prevención de Fugas de Información**:
  - Prohibido commitear identificadores reservados de clientes/socios del mundo real.
  - Antes de cada commit, verificar que `pnpm run audit:leaks:staged` o el script de guardarraíles finalice en código 0 sin alertas.
- **Aislamiento de C:\PowerShell**: Prohibido crear repositorios o interactuar con `C:\PowerShell`.

## 3. Arquitectura y Verificación
- **Fastify & API Contracts**: Todos los endpoints que sirvan datos a la UI deben priorizar entidades relacionales reales de SQLite sobre mocks en memoria.
- **TDD y Verificación**: Ejecutar siempre pruebas unitarias (`pnpm vitest run ...`) antes de dar una tarea por finalizada.
- **Mocks de Autenticación en Pruebas de Fastify**: En suites de pruebas de controladores (`app.inject()`), mockear explícitamente `../../middleware/auth.js` (`authMiddleware: vi.fn()`, `requireRole: vi.fn()`) y `oslo/password` para prevenir fallos `401 Unauthorized` en rutas protegidas.

## 4. UI/Frontend: Enlace de Datos en Vivo y Cero Mocks (Zero Mocks)
- **Consumo Exclusivo de SQLite/Fastify**: Toda acción, mutación o visualización en la UI debe consultar y enviar datos a los endpoints reales de Fastify respaldados por Drizzle y SQLite.
- **Eliminación de Botoneras de Simulación**: Prohibido añadir o mantener botones de datos artificiales/mock cuando el endpoint operativo ya existe.
- **Selectores Dinámicos de Entidades**: Las vistas que requieran una expedición o entidad operativa deben proveer selectores dinámicos poblados desde la base de datos (con fallback predeterminado a la expedición canónica `sh_demo_01`), en lugar de IDs hardcodeados o estados estáticos.

## 5. Gobernanza Documental Diátaxis y Archivos Raíz
- **Higiene del Directorio Raíz**: La raíz del repositorio debe contener exclusivamente los 6 archivos estándar canónicos: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md` y `CODE_OF_CONDUCT.md`. Prohibido acumular especificaciones, reportes o guías sueltas en la raíz.
- **Estructura Diátaxis Cuatripolar**: Todo documento técnico debe ubicarse en su cuadrante correspondiente dentro de `docs/`:
  - **Tutoriales**: `docs/tutorials/` (aprendizaje orientado a la experiencia del desarrollador).
  - **Guías Paso a Paso**: `docs/setup-guides/`, `docs/runbooks/` y `docs/deployment/` (orientadas a tareas concretas).
  - **Referencia**: `docs/reference/`, `docs/api/` y `docs/superpowers/specs/` (información técnica y contratos).
  - **Explicación y Decisiones**: `docs/architecture/` y `docs/adr/` (análisis conceptual y ADRs numerados `0001-...`).
- **Registro de Decisiones Arquitectónicas (ADR)**: Cualquier cambio de arquitectura o estándar técnico debe quedar documentado mediante un nuevo ADR en `docs/adr/`.

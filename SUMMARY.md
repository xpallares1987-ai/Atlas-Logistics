### Resumen ejecutivo

**Atlas Logistics** es un monorepo tipo Super-App para la gestión de la cadena de suministro que unifica frontend, backend, orquestación de procesos y una capa de datos tipada y segura. El proyecto prioriza un enfoque **frontend-first** con Vite y React, orquestación nativa con AtlasEngine (BullMQ + Drizzle), persistencia mediante **SQLite local (libSQL)** y una capa de IA para capacidades predictivas y analíticas. El repositorio usa **pnpm** y **Turborepo** para builds rápidos y compartición de código.

### Arquitectura y stack técnico

**Estructura general**

- **Monorepo** gestionado con Turborepo y pnpm workspaces.
- **Frontend**: Vite, React 19, TailwindCSS (Glassmorphism); paquetes principales @atlas/frontend, @atlas/ui, @atlas/dashboard, @atlas/warehouse-ops (MFE).
- **Backend**: Node.js con Fastify (Auth JWT + WebSockets); AtlasEngine Workers basados en BullMQ.
- **Orquestación**: AtlasEngine con trabajos programados en BullMQ y UI embeddada.
- **Capa de datos**: SQLite local como fachada tipada sobre Drizzle ORM para un coste $0 garantizado.
- **IA**: Integración para Text-to-SQL, predictETA, OCR y optimizadores.

**Herramientas y prácticas**

- **Gestión de paquetes**: pnpm v10+ con overrides y enlaces locales.
- **Calidad y CI**: ESLint, Prettier, Husky, lint-staged, CodeQL, njsscan, GitHub Actions, Playwright E2E.
- **Contenedores**: Docker Compose para entorno local con Nginx, Node backend, y Redis.
- **Observabilidad**: métricas y trazas en workers; logs estructurados para tareas en background.

### Desarrollo local y despliegue

**Requisitos**

- **Node.js** 22 o superior.
- **pnpm** 10 o superior.
- **Docker Desktop** (opcional) para entorno local con contenedores.

**Comandos esenciales**
`ash
pnpm install
pnpm run dev
pnpm run db:push
pnpm run db:seed
pnpm run db:reset-and-seed
docker compose up --build -d
docker compose down
docker compose down -v
pnpm run lint
pnpm run test:e2e
`

**Flujo rápido**

- Clonar el repositorio y ejecutar pnpm install.
- Crear .env.local a partir de .env.example y añadir variables locales.
- Sincronizar esquema con pnpm run db:push y poblar datos con pnpm run db:seed.
- Levantar entorno con pnpm run dev o docker compose up --build -d.
- Ejecutar linters y tests antes de abrir PRs.

**Workers y orquestación**

- Crear AtlasWorker en src/bpm/workers/.
- Registrar worker en src/bpm/workers/index.ts para arranque automático.

### Seguridad y gobernanza

**Autenticación y autorización**

- **Mock Auth** de desarrollo para pruebas locales, reduciendo costes y facilitando testeo rápido.
- Componentes frontend **RoleGate** y **ProtectedRoute** para control de UI simulando roles.

**Gestión de credenciales y despliegue**

- Evitar claves estáticas en el repositorio.
- Variables sensibles gestionadas por secretos en CI/CD local (.env.local).

**Auditoría y respuesta**

- Escaneos automáticos en CI con CodeQL y njsscan.
- Proceso de reporte de vulnerabilidades con respuesta en 24 a 48 horas.

**Políticas de contribución**

- Flujo Git Flow y Conventional Commits.
- PRs bloqueados hasta pasar linters, tests y escaneos.
- Código de conducta y normas de revisión obligatorias.

### Cambios recientes y archivos clave

**Migraciones y cambios destacados**

- Consolidación del frontend bajo packages/frontend y limpieza de repositorios antiguos (eliminación de carpetas legacy).
- Migración de la capa de datos en la nube (GCP) hacia arquitectura $0 con **SQLite local**.
- Implementación de modelo de roles mockeado para validación en frontend.
- Automatización de simulación de ERP con BullMQ (AtlasEngine).
- Integración fullstack del **Customer Portal** (con tracking de eventos y backend HBL generation) y **Document Vault** (carga real de archivos `FormData` y vistas de UI interactivas).

**Archivos y rutas importantes**

- **README.md**: visión general y comandos de inicio.
- **ARCHITECTURE.md**: diseño de alto nivel y patrones operativos.
- **atlas_logistics_local_guide.md**: guía práctica para desarrollo local y Atlas Workers.
- **CHANGELOG.md**: historial de cambios y migraciones.
- **SECURITY.md** y **CODE_OF_CONDUCT.md**: políticas de seguridad y conducta.
- **CONTRIBUTING.md**: normas de contribución y flujo de trabajo.

### Checklist de arranque rápido

1. Clonar el repositorio y ejecutar **pnpm install**.
2. Crear **.env.local** a partir de **.env.example** con variables requeridas.
3. Ejecutar **pnpm run db:push** y **pnpm run db:seed**.
4. Levantar entorno con **pnpm run dev** o **docker compose up --build -d**.
5. Ejecutar linters y tests: **pnpm run lint**, **pnpm run test:e2e**.

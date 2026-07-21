### Resumen ejecutivo

**Atlas Logistics** es un monorepo tipo Super‑App para la gestión de la cadena de suministro que unifica frontend, backend, orquestación de procesos y una capa de datos tipada y segura. El proyecto prioriza un enfoque **frontend‑first** con Vite y React, orquestación con Camunda 8 y Zeebe Workers, persistencia mediante **Firebase Data Connect** sobre PostgreSQL y una capa de IA para capacidades predictivas y analíticas. El repositorio usa **pnpm** y **Turborepo** para builds rápidos y compartición de código.

### Arquitectura y stack técnico

**Estructura general**
- **Monorepo** gestionado con Turborepo y pnpm workspaces.  
- **Frontend**: Vite, React 18, TailwindCSS; paquetes principales `@atlas/frontend`, `@atlas/ui`, `@atlas/dashboard`.  
- **Backend**: Node.js con Express; Zeebe Workers usando SDK de Camunda 8; funciones serverless en `functions/src`.  
- **Orquestación**: Camunda 8 con modelos BPMN y DMN en `camunda-config`.  
- **Capa de datos**: Firebase Data Connect como fachada tipada sobre PostgreSQL en Cloud SQL; esquemas y reglas declarativas en `dataconnect`.  
- **IA**: Integración para Text‑to‑SQL, `predictETA`, OCR y optimizadores.

**Herramientas y prácticas**
- **Gestión de paquetes**: pnpm v10+ con overrides y enlaces locales a `@dataconnect/generated`.  
- **Calidad y CI**: ESLint, Prettier, Husky, lint‑staged, CodeQL, njsscan, GitHub Actions, Playwright E2E.  
- **Contenedores**: Docker Compose para entorno local con Nginx, Node backend, Postgres y Redis.  
- **Observabilidad**: métricas y trazas en workers; logs estructurados para procesos BPMN.

### Desarrollo local y despliegue

**Requisitos**
- **Node.js** 20 o superior.  
- **pnpm** 10 o superior.  
- **Docker Desktop** para entorno local con contenedores.

**Comandos esenciales**
```bash
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
```

**Flujo rápido**
- Clonar el repositorio y ejecutar `pnpm install`.  
- Crear `.env.local` a partir de `.env.example` y añadir variables de Camunda y DB.  
- Sincronizar esquema con `pnpm run db:push` y poblar datos con `pnpm run db:seed`.  
- Levantar entorno con `pnpm run dev` o `docker compose up --build -d`.  
- Ejecutar linters y tests antes de abrir PRs.

**Workers y orquestación**
- Crear Zeebe Worker en `src/bpm/workers/`.  
- Registrar worker en `src/bpm/workers/index.ts` para arranque automático.  
- Versionar modelos BPMN y DMN en `camunda-config`.

### Seguridad y gobernanza

**Autenticación y autorización**
- **Firebase Auth** con Custom Claims para roles.  
- Reglas `@auth` en Data Connect para validación en la capa de datos.  
- Componentes frontend **RoleGate** y **ProtectedRoute** para control de UI.

**Gestión de credenciales y despliegue**
- Uso de Workload Identity Federation para Google Cloud.  
- Evitar claves estáticas en el repositorio.  
- Variables sensibles gestionadas por secretos en CI/CD.

**Auditoría y respuesta**
- Escaneos automáticos en CI con CodeQL y njsscan.  
- Proceso de reporte de vulnerabilidades con respuesta en 24 a 48 horas.

**Políticas de contribución**
- Flujo Git Flow y Conventional Commits.  
- PRs bloqueados hasta pasar linters, tests y escaneos.  
- Código de conducta y normas de revisión obligatorias.

### Cambios recientes y archivos clave

**Migraciones y cambios destacados**
- Consolidación del frontend bajo `apps/atlas-scm`.  
- Migración de la capa de datos a **Firebase Data Connect** con SDK tipado.  
- Implementación de modelo de roles con validación en frontend y Data Connect.  
- Automatización de data seeding y simulación de ERP con Google Cloud Tasks.  
- Integración de capacidades IA para Text‑to‑SQL, `predictETA` y OCR.

**Archivos y rutas importantes**
- **README.md**: visión general y comandos de inicio.  
- **ARCHITECTURE.md**: diseño de alto nivel y patrones operativos.  
- **atlas_logistics_local_guide.md**: guía práctica para desarrollo local y Zeebe Workers.  
- **CHANGELOG.md**: historial de cambios y migraciones.  
- **SECURITY.md** y **CODE_OF_CONDUCT.md**: políticas de seguridad y conducta.  
- **CONTRIBUTING.md**: normas de contribución y flujo de trabajo.  
- **dataconnect/**: esquemas GraphQL y reglas `@auth`.  
- **camunda-config/**: modelos BPMN y DMN.

### Checklist de arranque rápido

1. Clonar el repositorio y ejecutar **`pnpm install`**.  
2. Crear **`.env.local`** a partir de **`.env.example`** con variables de Camunda y DB.  
3. Ejecutar **`pnpm run db:push`** y **`pnpm run db:seed`**.  
4. Levantar entorno con **`pnpm run dev`** o **`docker compose up --build -d`**.  
5. Ejecutar linters y tests: **`pnpm run lint`**, **`pnpm run test:e2e`**.  
6. No editar archivos generados; regenerar SDKs con `npx firebase dataconnect:sdk:generate` tras cambios de esquema.
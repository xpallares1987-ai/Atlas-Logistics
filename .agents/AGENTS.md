# Atlas Logistics Workspace Rules

<RULE[atlas_logistics_knowledge]>
# Atlas Logistics Project Guidelines & Knowledge

## Architecture & Tech Stack
- **Monorepo (Turborepo)** using `pnpm`.
- **Frontend App**: Located in `packages/frontend/`. This is the main host app built with Vite, React, React Router, and TailwindCSS.
- **Routing**: `packages/frontend/src/App.tsx` handles all the routing and the main layout (sidebar, top navbar). Modules are imported using `React.lazy()`.
- **Styling**: TailwindCSS with a focus on modern, premium aesthetics (slate/indigo/emerald/amber/rose color palettes, glassmorphism, rounded corners).
- **Icons**: Always use `lucide-react`.

## Expansion Modules (ERP Suite)
The platform is a comprehensive ERP for Freight Forwarders, containing the following modules:
- **Core Operations**: Dashboard, Rate Comparer, Dynamic Pricing, Globe Tracker, Sailing Schedules (`/schedules`), Booking & B/L (`/bookings`).
- **Finance & Compliance**: Invoicing & Settlement (`/invoices`), Customs Clearance (`/customs`). Note: Agent Settlements logic is fully implemented.
- **Analytics**: Profitability, Carbon Tracker, Demurrage Alerts.
- **Operations Support**: Container Planner, LCL Engine, Warehouse 3D, Tasklist, Document Vault, AI Assistant. Note: Document Vault supports fully functional drag-and-drop file persistence.
- **External Views**: Customer Portal (`/portal`). Includes file uploads and dynamic HBL PDF downloads via the Fastify backend.

## Known Issues & Gotchas
- **React Versions**: Ensure the monorepo has unified React versions (currently `18.3.1`) across all packages to avoid `useState` null errors due to duplicate React instances.
- **GitHub Actions Cache**: The cache can grow very large (up to 10GB limit); periodically clear obsolete caches via GitHub UI or CLI if builds fail or get stuck.
- **Build Validation**: Always run `pnpm run build` from the monorepo root to test production builds. The frontend is built into `packages/frontend/dist`.
- **Package Manager**: Always use `pnpm` (v10+) for managing dependencies. When updating dependencies or adding new packages, run `pnpm install` from the root to ensure workspace hoisting.
- **GitHub CLI**: Because Antigravity runs in a sandbox with a dummy `$GITHUB_TOKEN`, always prefix `gh` commands with `$env:GITHUB_TOKEN=""; gh ...` to use the host machine's authentications.

</RULE[atlas_logistics_knowledge]>

<RULE[atlas_logistics_database_and_standards]>
# Atlas-Logistics — Workspace Agent Rules

## 🔴 REGLA CRÍTICA: Base de Datos Principal (Coste $0)

**Se ha abandonado el uso de Firebase Data Connect, Firestore y Google Cloud SQL para evitar costes.**
La única fuente de la verdad para datos relacionales es una base de datos local SQLite administrada a través de **Drizzle ORM**.

### Drizzle & libSQL
- **Driver Estricto:** Se prohíbe usar `better-sqlite3` debido a problemas de compilación C++ (node-gyp) en Windows bajo Node 24. El driver oficial obligatorio es `@libsql/client` (libSQL).
- **Esquema:** Los esquemas de Drizzle se definen en TypeScript puro.
- **Despliegue local:** Usar `pnpm run db:push` para sincronizar los esquemas sin migraciones complejas.
- **Cero Dependencias de Cloud:** Ningún componente debe importar SDKs de Firebase Admin, Google Auth o Data Connect.

## APIs Abiertas (Ingeniería de Datos)

Para complementar la Súper-App con datos del mundo real sin incurrir en registros ni exponer tokens:
- **Clima:** `Open-Meteo` (Usa caché local en memoria `Map` para evitar rate-limiting en los renderizados).
- **Divisas:** `Frankfurter API` (Fluctuaciones reales de EUR/USD).
- **Geocodificación:** `Nominatim` (Búsqueda de coordenadas de puertos).

*Nota: No se admiten dependencias a APIs como Project44, FourKites o Freightos debido a sus requisitos de autenticación.*

## Estándares del Repositorio (Monorepo Turborepo)

- **Comandos Globales:** Utilizar siempre `pnpm run build`, `pnpm run dev`, o `pnpm run lint` desde la raíz para aprovechar la caché paralela de Turbo.
- **Tipado Estricto:** Está prohibido el uso implícito de `any`. Todo nuevo código frontend debe compilar de manera limpia bajo `tsc --noEmit`.
- **CI/CD (`.github/workflows/ci.yml`):**
  - Obligatorio configurar `permissions: contents: read`.
  - Configuración de dependencias: El archivo `package.json` raíz utiliza `pnpm.auditConfig.ignoreCves` para evadir vulnerabilidades conocidas menores de construcción (como `elliptic` en `vite-plugin-node-polyfills`) y asegurar que los flujos automatizados pasen de manera verde.
</RULE[atlas_logistics_database_and_standards]>

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
- **Finance & Compliance**: Invoicing & Settlement (`/invoices`), Customs Clearance (`/customs`).
- **Analytics**: Profitability, Carbon Tracker, Demurrage Alerts.
- **Operations Support**: Container Planner, LCL Engine, Warehouse 3D, Tasklist, Document Vault, AI Assistant.
- **External Views**: Customer Portal (`/portal`).

## Known Issues & Gotchas
- **React Versions**: Ensure the monorepo has unified React versions (currently `18.3.1`) across all packages to avoid `useState` null errors due to duplicate React instances.
- **GitHub Actions Cache**: The cache can grow very large (up to 10GB limit); periodically clear obsolete caches via GitHub UI or CLI if builds fail or get stuck.
- **Build Validation**: Always run `pnpm run build` from the monorepo root to test production builds. The frontend is built into `packages/frontend/dist`.
- **Package Manager**: Always use `pnpm` (v10+) for managing dependencies. When updating dependencies or adding new packages, run `pnpm install` from the root to ensure workspace hoisting.
- **GitHub CLI**: Because Antigravity runs in a sandbox with a dummy `$GITHUB_TOKEN`, always prefix `gh` commands with `$env:GITHUB_TOKEN=""; gh ...` to use the host machine's authentications.

</RULE[atlas_logistics_knowledge]>

<RULE[atlas_logistics_database_and_standards]>
# Atlas-Logistics — Workspace Agent Rules

## 🔴 REGLA CRÍTICA: Base de Datos Principal

**Se ha abandonado el uso de Drizzle local y Firestore como fuentes primarias de datos estructurados.**
La única fuente de la verdad para datos relacionales es **Google Cloud SQL (PostgreSQL)** administrado a través de **Firebase Data Connect**.

### Firebase Data Connect
- **Esquema:** Las definiciones GraphQL se encuentran en `dataconnect/schema/schema.gql`.
- **SDK Autogenerado:** El código tipado se genera en `src/dataconnect-generated` y se vincula localmente.
- **Pre-requisito de Despliegue:** Para desplegar cambios en la base de datos de manera segura, siempre usar `firebase dataconnect:sdk:generate`.
- **Scripts de Sembrado (`scripts/seed_postgres.ts`):** 
  - Solo debe ejecutarse en entornos de desarrollo local. 
  - Tiene un bloqueador estricto (`process.env.NODE_ENV === 'production'`) para prevenir la eliminación accidental de datos productivos.

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

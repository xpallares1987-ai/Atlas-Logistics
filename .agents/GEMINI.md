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

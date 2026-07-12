# Arquitectura de Atlas Logistics

Este documento detalla la estructura y diseño arquitectónico actual de **Atlas Logistics**.

## 1. Visión General: Frontend-First y Súper-App

El proyecto ha abandonado las arquitecturas tradicionales de API backend pesadas (servidores Node.js independientes, Fastify, Drizzle, Zeebe backend) en favor de un modelo **Frontend-First** unificado. 
Toda la aplicación se ejecuta y renderiza directamente en el navegador como una Súper-App impulsada por **Vite** y **React Router**.

## 2. Turborepo y Gestión de Paquetes

El ecosistema está construido sobre un Monorepo gestionado por `Turborepo` y `pnpm` (versión 10+). Las dependencias se enlazan mediante *symlinks* locales (`workspace:*`) garantizando la máxima reutilización de código y tiempos de compilación paralelos.

### Estructura Principal

- **`apps/atlas-scm` (Host App)**: Es el corazón de la aplicación. Actúa como el orquestador principal que consolida el enrutamiento (React Router), el layout general, y contiene todos los submódulos de la aplicación bajo `src/modules/`. Es el único frontend que se ejecuta para iniciar todo el ecosistema.
- **Módulos Integrados (en `src/modules/`)**:
  - **`bpmn-modeler`**: Modelador BPMN 2.0 que corre de manera nativa en el navegador.
  - **`dashboard`**: Panel principal de embarques, telemetría logística y visibilidad de contenedores.
  - **`freight-comparer`**: Módulo dedicado a la ingesta (Excel), comparación y analítica de tarifas de fletes.
- **`packages/shared` y `packages/ui`**: (Si aplican) Contienen utilidades compartidas y componentes de UI consumidos por la aplicación principal.

## 3. Capa de Datos (Firebase Data Connect)

Todo el estado persistente y las consultas a base de datos de la Súper-App se realizan mediante **Firebase Data Connect**.

1. **PostgreSQL en Cloud SQL**: La fuente única de verdad.
2. **Esquema Declarativo**: Definido en el directorio `/dataconnect` a través de GraphQL.
3. **SDKs Tipados de Extremo a Extremo**: Al ejecutar `firebase dataconnect:sdk:generate`, Firebase genera funciones de TypeScript (`src/dataconnect-generated`) que exponen de forma estrictamente tipada las *Queries* y *Mutations* de Postgres directamente hacia nuestros componentes de React. No existe intermediario Node.js.

## 4. Pipeline de CI/CD

El repositorio está configurado para integración continua ultra eficiente:
- El comando de construcción oficial es `pnpm run build` en la raíz, que utiliza Turbo para empaquetar paralelamente usando cachés remotas/locales.
- El linting (`pnpm run lint`) consolida tanto la verificación de TypeScript (`tsc --noEmit`) como el análisis estricto de ESLint a lo largo de todos los paquetes del monorepo.
- Mínimos privilegios en GitHub Actions, exigiendo el uso de tokens con permisos estrictos de lectura.

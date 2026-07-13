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

## 5. Seguridad y Control de Acceso (RBAC)

La autenticación primaria se gestiona con **Firebase Authentication**. Los roles y jerarquías (e.g. `ADMIN`, `MANAGER`, `USER`) se manejan mediante **Custom Claims**:
- Una Cloud Function (`assignUserRole`) actualiza los claims del usuario en Firebase Auth de forma segura.
- El frontend consume el token JWT actualizado para mostrar u ocultar rutas e interfaces (usando componentes como `<RoleGate>`).
- Todas las consultas críticas de base de datos en **Data Connect** implementan directivas directas de GraphQL como `@auth(level: USER)` para rechazar de facto solicitudes públicas no autenticadas.

## 6. Integración Asíncrona con Cloud Tasks (ERP)

Los flujos de trabajo pesados o las integraciones con sistemas de terceros heredados (como el ERP corporativo) están desacoplados del hilo principal del frontend mediante **Google Cloud Tasks**:
- El cliente invoca funciones `onCall` (e.g., `startErpSimulation`) de forma síncrona, proporcionando validación inmediata.
- Estas funciones encolan tareas asíncronas con retrasos programables (`scheduleDelaySeconds`).
- Funciones `onTaskDispatched` (e.g., `simulateErpCallback`) reaccionan a las colas garantizando reintentos y tolerancia a fallos.

## 7. Inteligencia Artificial (AI Layer)

Atlas Logistics está fuertemente impulsado por Modelos Fundacionales (*Gemini 2.5 y 3.1 Pro*) ejecutados nativamente en Google Cloud Functions. 
El ecosistema de IA provee funcionalidades como:
- **Data Analyst Chat (`chatWithData`)**: Interfaz Text-to-SQL que consulta directamente el esquema estandarizado (Data Connect) y devuelve insights basados en la tabla `Shipments` y catálogos globales (`DictionaryTerm`).
- **Logistics OCR (`documentOCR`)**: Extracción automatizada de JSON desde documentos físicos (Bill of Lading).
- **Predictive ETA (`predictETA`)**: Evaluación de riesgo de retrasos usando búsquedas web en vivo para obtener condiciones reales del mundo físico.
- **Bin Packing (`optimizeLCL`)**: Empleo de `code_execution` para resolver algoritmos NP-Hard en 3D sobre Python bajo demanda.

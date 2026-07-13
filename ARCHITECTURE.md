# Arquitectura de Atlas Logistics

Este documento detalla la estructura y diseño arquitectónico actual de **Atlas Logistics**.

## 1. Visión General: Frontend-First y Súper-App

El proyecto ha abandonado las arquitecturas tradicionales de API backend pesadas (servidores Node.js independientes, Fastify, Drizzle, Zeebe backend) en favor de un modelo **Frontend-First** unificado. 
Toda la aplicación se ejecuta y renderiza directamente en el navegador como una Súper-App impulsada por **Vite** y **React Router**.

## 2. Turborepo y Gestión de Paquetes

El ecosistema está construido sobre un Monorepo gestionado por `Turborepo` y `pnpm` (versión 10+). Las dependencias se enlazan mediante *symlinks* locales (`workspace:*`) garantizando la máxima reutilización de código y tiempos de compilación paralelos.

### Estructura Principal

- **`packages/frontend` (Host App)**: Es el corazón de la aplicación. Actúa como el orquestador principal que consolida el enrutamiento (React Router), el layout general. Es el único frontend que se ejecuta para iniciar todo el ecosistema.
- **Módulos Integrados (en `packages/`)**:
  - **`packages/bpmn-modeler`**: Modelador BPMN 2.0 que corre de manera nativa en el navegador.
  - **`packages/dashboard`**: Panel principal de embarques, telemetría logística y visibilidad de contenedores.
  - **`packages/rate-comparer`**: Módulo dedicado a la ingesta (usando `exceljs` de forma segura para evitar vulnerabilidades de las librerías antiguas), comparación y analítica de tarifas de fletes.
- **`packages/shared` y `packages/ui`**: Contienen utilidades compartidas y componentes de UI consumidos por la aplicación principal.

## 3. Capa de Datos (Firebase Data Connect)

Todo el estado persistente y las consultas a base de datos de la Súper-App se realizan mediante **Firebase Data Connect**.

1. **PostgreSQL en Cloud SQL**: La fuente única de verdad.
2. **Esquema Declarativo**: Definido en el directorio `/dataconnect` a través de GraphQL.
3. **SDKs Tipados de Extremo a Extremo**: Al ejecutar `firebase dataconnect:sdk:generate`, Firebase genera funciones de TypeScript que exponen de forma estrictamente tipada las *Queries* y *Mutations* de Postgres directamente hacia nuestros componentes de React. No existe intermediario Node.js.

## 4. Pipeline de CI/CD e Integración Continua

El repositorio está configurado para integración continua ultra eficiente automatizada con **GitHub Actions**:
- **Despliegues Multi-entorno**: El frontend se compila y se despliega concurrentemente hacia **Firebase Hosting** (producción/preview) y **GitHub Pages**.
- **Autenticación Zero-Trust (WIF)**: Se utiliza **Google Cloud Workload Identity Federation** (pool `github-pool`, provider `github-provider`) para autenticar los workflows contra Firebase de forma segura sin intercambiar Service Account Keys estáticas.
- **Construcción y Testing**: El comando de construcción oficial es `pnpm run build` en la raíz, que utiliza Turbo para empaquetar paralelamente usando cachés remotas/locales. Adicionalmente, se ejecuta un suite de pruebas automatizadas **End-to-End (E2E)** con Playwright.
- **Code Scanning y Seguridad**: Análisis constante del código en CI con CodeQL y `njsscan` para evitar regresiones de vulnerabilidades (ej. timing attacks, modulo biases).

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

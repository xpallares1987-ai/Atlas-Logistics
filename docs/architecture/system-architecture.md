# Arquitectura de Sistema y Convenciones Oficiales: Atlas Logistics

Este documento establece las **convenciones de arquitectura oficial** para el desarrollo, mantenimiento y escalabilidad de **Atlas Logistics**.

---

## 🏗️ 1. Estructura de Monorepo (pnpm + Turborepo)

El proyecto utiliza un diseño de monorepo con `pnpm` workspaces y Turborepo para la orquestación:

- `packages/frontend`: Aplicación principal (Host PWA) desarrollada en React + Vite + Tailwind.
- `packages/dashboard`: Módulo de cuadro de mando logístico e interfaces operativas.
- `packages/rate-comparer`: Motor visual y comparador dinámico de tarifas marítimas/aéreas.
- `packages/ui`: Biblioteca compartida de componentes UI, hooks y temas.
- `packages/shared`: Tipos TypeScript, esquemas de validación Zod y DTOs de dominio.

---

## ⚙️ 2. Convenciones de AtlasEngine (BullMQ)

Los recursos de tareas se organizan **estrictamente por dominio de negocio** en sus respectivos workers:

```text
src/bpm/workers/
├── core/         # Manejo de reservas, embarques
├── customs/      # Liberación aduanera
├── docs/         # Aprobación y generación de documentos
└── finance/      # Facturación
```

---

## ⚡ 3. Arquitectura de Workers

El sistema separa con claridad los ejecutores de tareas en segundo plano:

1. **Job Workers de AtlasEngine (BullMQ)** (`src/bpm/workers/`):
   - Asociados a los nombres de las colas y trabajos en BullMQ.
   - Implementan la clase base `AtlasWorker`.
   - Se registran centralizadamente en `src/bpm/workflow-engine.service.ts`.

2. **Event Workers de PubSub y Tareas en Cola** (`src/pubsub-workers/`):
   - Escuchadores de eventos asíncronos de GCP PubSub (milestones de embarque, actualizaciones de AIS/Vessel, OCR de documentos).

---

## 🛡️ 4. Reglas de Calidad y Convenciones

- **Sintaxis de Importación**: Usar alias configurados (`@/*`) apuntando a `./src/*`.
- **Validación en Runtime**: Toda entrada/salida crítica entre cliente y servidor debe validarse con esquemas **Zod** (`@atlas/shared`).
- **Commits**: Usar Conventional Commits (`fix:`, `feat:`, `chore:`, `docs:`).

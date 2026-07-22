# Arquitectura de Sistema y Convenciones Oficiales: Atlas Logistics

Este documento establece las **convenciones de arquitectura oficial** para el desarrollo, mantenimiento y escalabilidad de **Atlas Logistics**.

---

## 🏗️ 1. Estructura de Monorepo (pnpm + Turborepo)

El proyecto utiliza un diseño de monorepo con `pnpm` workspaces y Turborepo para la orquestación:

- `packages/frontend`: Aplicación principal (Host PWA) desarrollada en React + Vite + Tailwind.
- `packages/dashboard`: Módulo de cuadro de mando logístico e interfaces operativas.
- `packages/rate-comparer`: Motor visual y comparador dinámico de tarifas marítimas/aéreas.
- `packages/bpmn-modeler`: Editor visual integrado de flujos BPMN 2.0 (Camunda).
- `packages/ui`: Biblioteca compartida de componentes UI, hooks y temas.
- `packages/shared`: Tipos TypeScript, esquemas de validación Zod y DTOs de dominio.

---

## ⚙️ 2. Convenciones de Camunda 8 (BPMN / DMN / Forms)

Los recursos de Camunda se organizan **estrictamente por dominio de negocio** dentro de `camunda-config/`:

```text
camunda-config/
├── bpmn/
│   ├── core/         # air-import.bpmn, ocean-export.bpmn, vendor-onboarding.bpmn
│   ├── customs/      # customs-clearance.bpmn
│   ├── claims/       # cargo-claim-handling.bpmn
│   ├── docs/         # document-approval.bpmn, document-generation.bpmn
│   ├── finance/      # invoice-handling.bpmn
│   ├── quoting/      # quote-lifecycle.bpmn, rate-comparison.bpmn
│   ├── tracking/     # track-and-trace.bpmn
│   └── warehouse/    # lcl-consolidation.bpmn, warehouse-receiving.bpmn
├── dmn/
│   └── quoting/      # carrier-selection.dmn
└── forms/
    └── core/         # booking-approval.form
```

---

## ⚡ 3. Arquitectura de Workers

El sistema separa con claridad los ejecutores de tareas en segundo plano:

1. **Job Workers de Zeebe/Camunda** (`src/bpm/workers/`):
   - Asociados a los `taskDefinition type` de los BPMN.
   - Implementan la clase base `AtlasWorker` y devuelven respuestas estructuradas o lanzan `BPMError`.
   - Se registran centralizadamente en `src/bpm/workers/index.ts`.

2. **Event Workers de PubSub y Tareas en Cola** (`src/pubsub-workers/`):
   - Escuchadores de eventos asíncronos de GCP PubSub (milestones de embarque, actualizaciones de AIS/Vessel, OCR de documentos).

---

## 🛡️ 4. Reglas de Calidad y Convenciones

- **Sintaxis de Importación**: Usar alias configurados (`@/*`) apuntando a `./src/*`.
- **Validación en Runtime**: Toda entrada/salida crítica entre cliente y servidor debe validarse con esquemas **Zod** (`@atlas/shared`).
- **Commits**: Usar Conventional Commits (`fix:`, `feat:`, `chore:`, `docs:`).

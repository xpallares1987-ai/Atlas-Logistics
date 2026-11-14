# Descomposición Modular Frontend - Fase 2: Orquestadores Operativos Principales (ADR 0020)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Descomponer los tres orquestadores frontend operativos más extensos (`ShipmentWorkspace360Module.tsx`, `ControlTowerModule.tsx` y `OperationsCockpitModule.tsx`) por debajo del umbral estricto de 1,000 líneas establecido en ADR 0020, preservando el estándar Zero Mocks y la reactividad con SQLite/Fastify.

**Architecture:** Extracción atómica de pestañas de dominio, paneles de inspección y modales hacia componentes especializados dentro de `packages/frontend/src/components/{workspace360,control-tower,cockpit}/` respaldados por interfaces TypeScript estrictas en `packages/frontend/src/types/`. Los orquestadores conservan exclusivamente la coordinación de URL/parámetros de consulta, consultas reactivas a endpoints Fastify y gestión de estados de selección.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Fastify Backend, SQLite + Drizzle ORM, Vitest.

**Spec:** [`docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md`](../../adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md)

## Global Constraints

- Umbral estricto: Todo módulo orquestador en `packages/frontend/src/pages/` debe quedar estrictamente por debajo de **1,000 líneas**.
- Zero Mocks: Prohibido introducir datos simulados estáticos; todas las acciones, mutaciones y lecturas deben conectarse a los endpoints reales de Fastify/SQLite (`/api/shipments/*`, `/api/control-tower/*`, `/api/cockpit/*`, etc.).
- Higiene Raíz: Prohibido crear archivos en la raíz del repositorio excepto los 6 canónicos autorizados.
- Guardarraíles de Git: Commits atómicos por módulo, firmados criptográficamente con SSH ed25519 (`-S`), ejecutados y sincronizados únicamente en `main`.
- Token Override: Cualquier invocación de `gh` debe ir prefijada por `$env:GITHUB_TOKEN="";`.
- Verificación Previa: `pnpm run audit:leaks:staged`, `pnpm run check:file-sizes` y `pnpm run type-check` deben finalizar con código 0 sin errores.

## Review Focus

1. **Parámetros de URL y Deep-Linking**: Asegurar que los parámetros `id`, `tab`, `highlight` y `action` en `ShipmentWorkspace360Module` sigan activando las pestañas y modales correspondientes sin pérdida de sincronización.
2. **Prop Drilling y Manejo de Estados Mutables**: Asegurar que las callbacks (`onSelectShipment`, `onExecuteAction`, `onRaiseException`, `onRefresh`) pasadas a los submódulos mantengan la reactividad sin ciclos infinitos de renderizado.
3. **Cero Mocks en Submódulos**: Verificar que ningún componente hijo reemplace llamadas Fastify con estructuras en memoria no autorizadas.
4. **Validación de Tipos Estrictos en TypeScript**: Prevenir el uso de `any` o `@ts-ignore` en las interfaces de propiedades (`Props`) de las pestañas y modales.
5. **Regresiones Visuales y Transiciones de Framer Motion**: Garantizar que las variantes de animación (`Variants`) tengan tipado estricto `as const` o anotación de tipo para evitar fallos de compilación TS.

---

### Task 1: Descomposición de `ShipmentWorkspace360Module.tsx` (2,125 lns -> <800 lns)

**Files:**
- Modify: `packages/frontend/src/types/shipment-workspace360.types.ts`
- Modify: `packages/frontend/src/pages/ShipmentWorkspace360Module.tsx`
- Create: `packages/frontend/src/components/workspace360/ShipmentAttentionTab.tsx`
- Create: `packages/frontend/src/components/workspace360/ShipmentJourneyTab.tsx`
- Create: `packages/frontend/src/components/workspace360/ShipmentTasksTab.tsx`
- Create: `packages/frontend/src/components/workspace360/ShipmentExceptionsTab.tsx`
- Create: `packages/frontend/src/components/workspace360/ShipmentCargoRouteTab.tsx`
- Create: `packages/frontend/src/components/workspace360/ShipmentAuditTab.tsx`
- Create: `packages/frontend/src/components/workspace360/modals/ExecuteActionModal.tsx`
- Create: `packages/frontend/src/components/workspace360/modals/RaiseExceptionModal.tsx`

**Interfaces:**
- Consumes: `ShipmentWorkspaceDetail`, `TabKey`, `OperationalTimelineEvent`, `OutboxAuditEvent`, `MletrRecordSummary`
- Produces: Contratos de propiedades dedicados para cada pestaña y modal (`ShipmentAttentionTabProps`, `ShipmentJourneyTabProps`, `ShipmentTasksTabProps`, `ShipmentExceptionsTabProps`, `ShipmentCargoRouteTabProps`, `ShipmentAuditTabProps`, `ExecuteActionModalProps`, `RaiseExceptionModalProps`).

- [x] **Step 1: Formalizar contratos de tipos en `shipment-workspace360.types.ts`**
  Agregar las interfaces de propiedades para todas las pestañas pendientes y modales.

- [x] **Step 2: Extraer modales interactivos**
  - Implementar `modals/ExecuteActionModal.tsx` (formulario dinámico de ejecución con campos parametrizados).
  - Implementar `modals/RaiseExceptionModal.tsx` (registro de excepción operativa).

- [x] **Step 3: Extraer pestañas operativas**
  - Implementar `ShipmentAttentionTab.tsx` (alertas de atención inmediata y KPIs de riesgo).
  - Implementar `ShipmentJourneyTab.tsx` (línea temporal de hitos, DCSA y eventos satelitales).
  - Implementar `ShipmentTasksTab.tsx` (triage de tareas operativas y verificaciones).
  - Implementar `ShipmentExceptionsTab.tsx` (lista de excepciones activas y disparadores de resolución).
  - Implementar `ShipmentCargoRouteTab.tsx` (tramos multimodales mar/tierra/ferrocarril).
  - Implementar `ShipmentAuditTab.tsx` (registro de auditoría de outbox y sumarios MLETR).

- [x] **Step 4: Refactorizar `ShipmentWorkspace360Module.tsx` como orquestador limpio**
  Importar y reemplazar las secciones inline por los componentes especializados.

- [x] **Step 5: Verificación y Commit Atómico 1**
  - Ejecutar `pnpm run check:file-sizes` para verificar que `ShipmentWorkspace360Module.tsx` tiene <1,000 líneas.
  - Ejecutar `pnpm run type-check` y `pnpm --filter @atlas/frontend build`.
  - Ejecutar `pnpm run audit:leaks:staged`.
  - Crear commit firmado:
    ```bash
    git add packages/frontend/src/types/shipment-workspace360.types.ts packages/frontend/src/pages/ShipmentWorkspace360Module.tsx packages/frontend/src/components/workspace360/
    git commit -S -m "refactor(frontend): decompose ShipmentWorkspace360 into atomic tabs and modals (ADR 0020)"
    ```

---

### Task 2: Descomposición de `ControlTowerModule.tsx` (1,716 lns -> <700 lns)

**Files:**
- Create: `packages/frontend/src/types/control-tower.types.ts`
- Modify: `packages/frontend/src/pages/ControlTowerModule.tsx`
- Create: `packages/frontend/src/components/control-tower/ControlTowerRadarTab.tsx`
- Create: `packages/frontend/src/components/control-tower/ControlTowerKanbanTab.tsx`
- Create: `packages/frontend/src/components/control-tower/ControlTowerCustomsTab.tsx`
- Create: `packages/frontend/src/components/control-tower/ControlTowerSpotTab.tsx`
- Create: `packages/frontend/src/components/control-tower/ControlTowerAuditTab.tsx`

**Interfaces:**
- Consumes: Entidades de telemetría de radar, shipments kanban, customs clearance records, spot market indices, audit logs de Fastify SQLite.
- Produces: Contratos tipados `ControlTowerRadarTabProps`, `ControlTowerKanbanTabProps`, `ControlTowerCustomsTabProps`, `ControlTowerSpotTabProps`, `ControlTowerAuditTabProps`.

- [ ] **Step 1: Crear archivo de contratos `control-tower.types.ts`**
  Definir tipos de datos y props interfaces para el módulo Control Tower.

- [ ] **Step 2: Extraer submódulos de pestañas operativas en `components/control-tower/`**
  - Implementar `ControlTowerRadarTab.tsx` (telemetría satelital, mapa en vivo de buques y alertas de tráfico).
  - Implementar `ControlTowerKanbanTab.tsx` (tablero Kanban de estados logísticos con conteos dinámicos).
  - Implementar `ControlTowerCustomsTab.tsx` (inspecciones aduanales, pedimentos y control regulatorio).
  - Implementar `ControlTowerSpotTab.tsx` (monitor de tarifas spot, comparativas de mercado e índices).
  - Implementar `ControlTowerAuditTab.tsx` (registro de auditoría de eventos de plataforma).

- [ ] **Step 3: Refactorizar `ControlTowerModule.tsx`**
  Simplificar el componente orquestador para gestionar el estado de pestañas activas, filtros globales y consulta de datos.

- [ ] **Step 4: Verificación y Commit Atómico 2**
  - Ejecutar `pnpm run check:file-sizes` confirmando <1,000 líneas en `ControlTowerModule.tsx`.
  - Ejecutar `pnpm run type-check` y `pnpm --filter @atlas/frontend build`.
  - Ejecutar `pnpm run audit:leaks:staged`.
  - Crear commit firmado:
    ```bash
    git add packages/frontend/src/types/control-tower.types.ts packages/frontend/src/pages/ControlTowerModule.tsx packages/frontend/src/components/control-tower/
    git commit -S -m "refactor(frontend): decompose ControlTower into atomic operational tabs (ADR 0020)"
    ```

---

### Task 3: Descomposición de `OperationsCockpitModule.tsx` (1,424 lns -> <600 lns)

**Files:**
- Create: `packages/frontend/src/types/operations-cockpit.types.ts`
- Modify: `packages/frontend/src/pages/OperationsCockpitModule.tsx`
- Create: `packages/frontend/src/components/cockpit/CockpitMetricsBar.tsx`
- Create: `packages/frontend/src/components/cockpit/CockpitWorkItemList.tsx`
- Create: `packages/frontend/src/components/cockpit/CockpitItemDetailPanel.tsx`
- Create: `packages/frontend/src/components/cockpit/modals/CockpitActionExecutionModal.tsx`
- Create: `packages/frontend/src/components/cockpit/modals/CockpitEmittedDocumentModal.tsx`

**Interfaces:**
- Consumes: `CockpitWorkItem`, `CockpitSummaryMetrics`, `ScoreFactor`, endpoints `/api/cockpit/*`.
- Produces: Contratos tipados `CockpitMetricsBarProps`, `CockpitWorkItemListProps`, `CockpitItemDetailPanelProps`, `CockpitActionExecutionModalProps`, `CockpitEmittedDocumentModalProps`.

- [ ] **Step 1: Crear archivo de contratos `operations-cockpit.types.ts`**
  Migrar y centralizar las interfaces de datos y props del cockpit.

- [ ] **Step 2: Extraer modales de acción y documentos emitidos**
  - Implementar `modals/CockpitActionExecutionModal.tsx`.
  - Implementar `modals/CockpitEmittedDocumentModal.tsx`.

- [ ] **Step 3: Extraer componentes de la interfaz de triaje**
  - Implementar `CockpitMetricsBar.tsx` (indicadores clave y resumen de alertas).
  - Implementar `CockpitWorkItemList.tsx` (tabla de cola operativa, filtros por severidad/tipo y ordenamiento).
  - Implementar `CockpitItemDetailPanel.tsx` (panel inspector lateral con sugerencias de IA y formulario de acción).

- [ ] **Step 4: Refactorizar `OperationsCockpitModule.tsx`**
  Alinear el orquestador principal con los subcomponentes atómicos.

- [ ] **Step 5: Verificación y Commit Atómico 3**
  - Ejecutar `pnpm run check:file-sizes` confirmando <1,000 líneas en `OperationsCockpitModule.tsx`.
  - Ejecutar `pnpm run type-check` y `pnpm vitest run`.
  - Ejecutar `pnpm run audit:leaks:staged`.
  - Crear commit firmado:
    ```bash
    git add packages/frontend/src/types/operations-cockpit.types.ts packages/frontend/src/pages/OperationsCockpitModule.tsx packages/frontend/src/components/cockpit/
    git commit -S -m "refactor(frontend): decompose OperationsCockpit into atomic triage and modal subcomponents (ADR 0020)"
    ```

---

### Task 4: Gobernanza Diátaxis, Actualización de Changelog y Sincronización Remota

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Actualizar `CHANGELOG.md`**
  Documentar en `[Unreleased]` la finalización de la Fase 2 de descomposición modular bajo ADR 0020, detallando las métricas de líneas de código reducidas y los 18 submódulos creados.

- [ ] **Step 2: Verificación completa de suite**
  - Ejecutar `pnpm run check:file-sizes` para verificar el estado de los 3 orquestadores y el reporte general.
  - Ejecutar `pnpm run type-check`.
  - Ejecutar `pnpm --filter @atlas/frontend build`.
  - Ejecutar `pnpm vitest run tests/check-file-sizes.test.ts`.

- [ ] **Step 3: Commit final y Push a GitHub**
  - Crear commit firmado de changelog si aplica.
  - Sincronizar mediante `git push origin main`.
  - Verificar que GitHub Actions CI/CD y CodeQL se ejecuten exitosamente con `$env:GITHUB_TOKEN=""; gh run list --limit 3`.

# Documento de Diseño: Fase 3 de Datos Reales en Atlas-Logistics
## Eliminación de Presets Estáticos en Demurrage & Detention Dispute, Ocean Booking DCSA y Estiba 3D (Stowage Planner)

- **Fecha**: 2026-11-05
- **Estado**: Aprobado tras sesión de alineación (/grill-me)
- **Ámbito**: Backend Fastify (`src/modules/*`, `src/db/*`), Frontend React (`packages/frontend/src/pages/*`), Esquemas Drizzle ORM y Semillas Relacionales (Fase 5).

---

## 1. Intent and the Why (Propósito y Motivación)

Atlas-Logistics ha consolidado con éxito la eliminación de mocks en la **Fase 1** (B2B EDI, Vault OCR, Demurrage Control Tower) y la **Fase 2** (Aduanas USMCA / Carta Porte 3.1, e-Firma Hub WebCrypto, Smart Contracts e-BL MLETR y ERP SAP/NetSuite).

Actualmente, tres módulos operativos de alta criticidad en transporte marítimo aún dependen de presets estáticos en memoria:
1. **Demurrage & Detention Dispute Resolution (`DemurrageAlertsModule.tsx`)**: Utiliza `DEMURRAGE_DISPUTE_PRESETS` en `packages/shared/src/demurrage-dispute.ts` con facturas y suspensiones simuladas en memoria local.
2. **Ocean Booking & B/L Lifecycle (`BookingManagementModule.tsx`)**: Utiliza `OCEAN_BOOKING_PRESETS` en `packages/shared/src/ocean-booking.ts` con 3 reservas fijas desconectadas de las expediciones y direcciones de la base de datos.
3. **Container 3D Stowage Planner (`ContainerPlannerModule.tsx`)**: Utiliza `STOWAGE_DEMO_PRESETS` en `packages/shared/src/stowage-3d.ts` con cargamentos estáticos en lugar de consultar `shipment_containers` y `cargo_items` reales de SQLite.

**Objetivo**: Reemplazar estos presets por esquemas relacionales tipados en Drizzle ORM, persistencia en SQLite, una nueva **Fase 5 de Semillas Relacionales** vinculada a `sh_demo_01`, y controles de Acción Operativa Directa en la UI.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Diseñar y crear esquemas Drizzle formales:
  - `demurrage_invoices`, `demurrage_disputes`, `demurrage_suspensions` (conforme a la normativa FMC 46 CFR Part 541 y DCSA).
  - Formalizar la extensión de `ocean_bookings` y `booking_containers` para dar soporte a eventos de corte (cut-offs), instrucciones de embarque (SI) y borradores B/L vinculados al Addresses Hub.
  - `container_stowage_plans` con cálculo de Centro de Gravedad (CoG), distribución de carga por eje y certificación de estabilidad, enlazado a `cargo_items`.
- Implementar la migración de base de datos para SQLite en modo WAL con claves foráneas activas (`PRAGMA foreign_keys = ON;`).
- Desarrollar la **Fase 5 de Semillas Relacionales** (`seedPhase5()` en `src/db/seeds/`) con endpoint `POST /api/admin/seed/5` e integración en `seed/all` y `SystemPanelModule.tsx`.
- Refactorizar los controladores backend en `src/modules/` para responder con datos relacionales y ejecutar mutaciones operativas directas.
- Refactorizar las 3 pantallas de frontend para retirar los presets y conectar selectores reactivos respaldados por SQLite con acciones directas:
  - Demurrage: *"Presentar Disputa Legal FMC"* y *"Aplicar Suspensión de Reloj (Clock Stop)"*.
  - Ocean Booking: *"Emitir Instrucciones de Embarque (DCSA SI)"* y *"Generar Borrador B/L Oficial"*.
  - Estiba 3D: *"Calcular CoG y Certificar Plan de Carga 3D"*.

### Non-Goals
- No se reescribirá el motor de renderizado 3D Three.js de `ContainerPlannerModule.tsx`; se conectará su geometría a las coordenadas `x, y, z, width, height, depth, weight` reales de `cargo_items` en SQLite.
- No se conectarán APIs externas en vivo de navieras (los oráculos operan mediante contratos canónicos DCSA 2026 y FMC regulados).

### Anti-Goals (Guardarraíles)
- **CERO fugas de datos confidenciales**: Prohibido introducir identificadores reales o palabras clave reservadas (`CANTUNIS`, `TLSA`, `BERRIO`, `Can Tunis`). Ejecutar `pnpm run audit:leaks:staged` antes de cada commit.
- **PROHIBIDO git push o manipulación remota**: Trabajo exclusivo en local sobre la rama `main`.
- **PROHIBIDO tocar `C:\PowerShell`**.
- Cero botones de simulación artificial o estados volátiles en memoria RAM que se pierdan al reiniciar el servidor Fastify.

---

## 3. Arquitectura y Esquemas Relacionales Drizzle (`src/db/schema/`)

### 3.1. Demurrage & Detention Dispute (`src/db/schema/demurrage_dispute.ts`)
- **`demurrage_invoices`**:
  - `id` (PK, e.g. `dinv_sh_demo_01`)
  - `shipmentId` -> `references(() => shipments.id)`
  - `containerNumber` (e.g. `MSKU9284712`)
  - `carrierScac`, `carrierName`, `billOfLading`
  - `pod`, `terminalName`
  - `vesselDischargeDate`, `gateInDate`, `gateOutDate`
  - `freeDaysGranted`, `dailyRateUsd`, `totalInvoicedUsd`
  - `status` (`ISSUED`, `PAID`, `DISPUTED`, `SETTLED`, `WAIVED`)
  - `fmcCompliant` (boolean): Validación de FMC 46 CFR Part 541 (incluye datos obligatorios del transportista, fechas de disponibilidad y desglose de tarifas).
- **`demurrage_suspensions`**:
  - `id` (PK, e.g. `dsusp_01`)
  - `invoiceId` -> `references(() => demurrageInvoices.id)`
  - `startDate`, `endDate`, `daysSuspended`
  - `reason` (`CUSTOMS_PHYSICAL_INSPECTION`, `TERMINAL_CONGESTION_STRIKE`, `WEATHER_FORCE_MAJEURE`, `GATE_SYSTEM_OUTAGE`)
  - `justificationText`, `evidenceDocumentId` -> `references(() => documents.id)`
  - `approved` (boolean)
- **`demurrage_disputes`**:
  - `id` (PK, e.g. `ddisp_01`)
  - `invoiceId` -> `references(() => demurrageInvoices.id)`
  - `disputedAmountUsd`, `revisedPayableUsd`
  - `fmcRuleClause` (e.g. `46 CFR § 541.6(a) - Inaccurate Free Time Start`)
  - `status` (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`)
  - `formalLetterPayload` (JSON con carta formal de disputa generada)
  - `submittedAt`, `resolvedAt`

### 3.2. DCSA Ocean Booking Lifecycle (`src/db/schema/ocean_bookings.ts`)
- **`ocean_booking_details`**:
  - `id` (PK, e.g. `bkg_sh_demo_01`)
  - `bookingId` -> `references(() => bookings.id)`
  - `shipmentId` -> `references(() => shipments.id)`
  - `carrierScac`, `serviceContractNumber`
  - `cargoCutOff`, `vcsCutOff`, `docCutOff`, `siCutOff`
  - `siStatus` (`DRAFT`, `SUBMITTED`, `AMENDED`, `CONFIRMED`)
  - `draftBlStatus` (`PENDING`, `ISSUED`, `APPROVED`)
  - `hazardousDeclaration` (JSON con clases IMDG y números UN si aplica)
  - `specialInstructions` (texto)

### 3.3. Container 3D Stowage & Stability (`src/db/schema/stowage_plans.ts`)
- **`container_stowage_plans`**:
  - `id` (PK, e.g. `stow_cnt_msku_9284712`)
  - `containerId` -> `references(() => shipmentContainers.id)`
  - `shipmentId` -> `references(() => shipments.id)`
  - `totalCargoWeightKg`, `maxPayloadKg`, `tareWeightKg`
  - `volumeUtilizationPercent`, `weightUtilizationPercent`
  - `centerOfGravityJson`: `{ x: number, y: number, z: number, deviationMm: number }`
  - `axleLoadDistributionJson`: `{ frontAxleKg: number, rearAxleKg: number, isCompliant: boolean }`
  - `stabilityCertified`: boolean
  - `certifiedBy`: text
  - `certifiedAt`: integer (timestamp)
  - `stowageSequenceJson`: Array ordenado de IDs de `cargo_items` con rotaciones y posiciones (x, y, z).

---

## 4. Pipeline de Semillas (Fase 5)
- Archivos de siembra:
  - `src/db/seeds/demurrage-dispute.seed.ts`
  - `src/db/seeds/ocean-booking.seed.ts`
  - `src/db/seeds/stowage.seed.ts`
- Función maestra: `seedPhase5()` en `src/db/seeds/index.ts`.
- Endpoints en Fastify:
  - `POST /api/admin/seed/5`: Siembra de Fase 5.
  - `POST /api/admin/seed/all`: Integración de las 5 Fases secuenciales.
  - `GET /api/admin/seed/status`: Telemetría que incluye `phase5: { demurrageInvoices, demurrageDisputes, oceanBookings, stowagePlans }`.

---

## 5. Endpoints Backend y Controladores

1. **Demurrage & Detention**:
   - `GET /api/demurrage/invoices?shipmentId=...`
   - `POST /api/demurrage/suspension`: Registra o actualiza una suspensión (clock stop).
   - `POST /api/demurrage/dispute`: Presenta formalmente una disputa legal FMC.
2. **Ocean Booking**:
   - `GET /api/bookings/ocean?shipmentId=...`
   - `POST /api/bookings/:id/shipping-instructions`: Envía o actualiza las DCSA SI.
   - `POST /api/bookings/:id/generate-draft-bl`: Genera y aprueba el borrador oficial de B/L.
3. **Container 3D Stowage**:
   - `GET /api/stowage/plan?containerId=...`
   - `POST /api/stowage/calculate-stability`: Ejecuta el algoritmo de estabilidad de carga (CoG, peso por eje) y persiste la certificación.

---

## 6. Verificación Técnica y Criterios de Aceptación
1. **Tests Unitarios**:
   - `src/modules/demurrage/demurrage.routes.test.ts`
   - `src/modules/bookings/bookings-ocean.routes.test.ts`
   - `src/modules/stowage/stowage.routes.test.ts`
   - `src/routes/__tests__/admin-seed-phase5.routes.test.ts`
2. **Navegador**: Validación con `chrome-devtools-mcp` en `/demurrage`, `/bookings` y `/planner`, verificando cero errores en consola e interactividad fluida.
3. **Auditoría de Fugas**: `pnpm run audit:leaks:staged` con 0 coincidencias en cada commit.
4. **Compilación Limpia**: `npx tsc --noEmit` y `pnpm --filter @atlas/frontend build` con salida exitosa (código 0).

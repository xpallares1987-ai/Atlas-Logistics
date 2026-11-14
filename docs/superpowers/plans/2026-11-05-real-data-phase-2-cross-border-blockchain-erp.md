# Fase 2 de Datos Reales: Aduanas USMCA, e-Firma Hub, Smart Contracts y ERP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar los módulos de Aduanas USMCA, e-Firma Hub, Smart Contracts (e-BL MLETR) y ERP (SAP S/4HANA y Oracle NetSuite) a datos operativos reales persistidos en SQLite, eliminando todas las botoneras de simulación estática y garantizando integridad referencial con `sh_demo_01`.

**Architecture:** Se diseñan 4 esquemas Drizzle relacionales (`carta_porte_declarations`, `efirma_audit_stamps`, `smart_escrow_contracts` + `blockchain_blocks`, y `erp_purchase_orders` + `erp_sync_logs`), integrando una nueva Fase 4 de semillas (`POST /api/admin/seed/4`). Los controladores backend y las pantallas frontend se refactorizan para reemplazar presets artificiales por selectores de expediciones reales con Acción Operativa Directa.

**Tech Stack:** TypeScript, Node.js, Fastify, Drizzle ORM, SQLite 3 (modo WAL con foreign keys habilitadas), React 18, Vite, Tailwind CSS, `@atlas/ui`, WebCrypto API (SubtleCrypto) y Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-05-real-data-phase-2-design.md`](../specs/2026-11-05-real-data-phase-2-design.md)

---

## Global Constraints

- SQLite en modo WAL con `PRAGMA foreign_keys = ON;`: cualquier clave foránea debe existir previamente en la tabla padre (`shipments.id`, `documents.id`, `cartaPorteDeclarations.id`).
- Commits estrictamente locales en la rama `main`. Prohibido ejecutar `git push` o configurar remotos.
- Prohibición estricta de manipular, crear repositorios o interactuar con `C:\PowerShell`.
- Prevención total de fugas de datos sensibles: Prohibido incluir identificadores reales o nombres reservados (`CANTUNIS`, `TLSA`, `BERRIO`, `Can Tunis`). Ejecutar `pnpm run audit:leaks:staged` antes de cada commit.
- Tipado estricto sin errores en `npx tsc --noEmit` y compilación frontend limpia con `pnpm --filter @atlas/frontend build`.

---

## Review Focus

1. **Inexistencia de Expedición Referenciada**: Si se intenta crear una Carta Porte o desplegar un Smart Escrow pasando un `shipmentId` inválido, la base de datos debe rechazar la inserción con `SQLITE_CONSTRAINT_FOREIGNKEY` y el controlador debe retornar HTTP 404 o 400 descriptivo.
2. **Conflicto de IdCCP Duplicado en Carta Porte**: Si se intenta timbrar un CFDI Carta Porte con un `idCcp` que ya existe, SQLite debe rechazar por clave única (`UNIQUE constraint failed: carta_porte_declarations.id_ccp`) y el endpoint debe manejarlo de forma idempotente con `onConflictDoUpdate`.
3. **Corrupción en la Integridad de la Cadena de Bloques**: Si se altera manualmente o de forma concurrente el `previousHash` de un bloque en `blockchain_blocks`, el servicio de verificación de integridad debe reportar `isValid: false` y detectar el `corruptedBlockNumber`.
4. **Sincronización Offline en Cola Dexie**: Si se despachan mutaciones por lotes desde `ErpIntegrationsModule` a `/api/erp-integrations/queue/batch` con cargas útiles malformadas, el backend debe registrar el fallo individual en `erp_sync_logs` con estado `FAILED` sin abortar el resto del lote.
5. **Doble Referencia en Sellos e-Firma**: `efirma_audit_stamps` debe soportar el sellado de documentos estándar (`documentId`) y de cartas de porte (`cartaPorteId`) de forma mutuamente segura, permitiendo que ambos campos sean opcionales para evitar violaciones de clave foránea.

---

## Plan Tasks

### Task 1: Esquemas Drizzle Relacionales (`src/db/schema/`)

**Files:**
- Create: `src/db/schema/cross_border.ts`
- Create: `src/db/schema/efirma.ts`
- Create: `src/db/schema/smart_contracts.ts`
- Create: `src/db/schema/erp_integrations.ts`
- Modify: `src/db/schema/index.ts`
- Test: `src/db/schema/__tests__/phase2_schemas.test.ts`

**Interfaces:**
- Consumes: `shipments` de `src/db/schema/operations.ts`, `documents` de `src/db/schema/documents.ts` (o `operations.ts`).
- Produces: `cartaPorteDeclarations`, `efirmaAuditStamps`, `smartEscrowContracts`, `blockchainBlocks`, `erpPurchaseOrders`, `erpSyncLogs`.

- [ ] **Step 1: Escribir el test que valide la definición y exportación de las nuevas tablas Drizzle**
```typescript
// src/db/schema/__tests__/phase2_schemas.test.ts
import { describe, it, expect } from "vitest";
import {
  cartaPorteDeclarations,
  efirmaAuditStamps,
  smartEscrowContracts,
  blockchainBlocks,
  erpPurchaseOrders,
  erpSyncLogs,
} from "../index.js";

describe("Phase 2 Drizzle Schemas", () => {
  it("should export all phase 2 relational tables", () => {
    expect(cartaPorteDeclarations).toBeDefined();
    expect(efirmaAuditStamps).toBeDefined();
    expect(smartEscrowContracts).toBeDefined();
    expect(blockchainBlocks).toBeDefined();
    expect(erpPurchaseOrders).toBeDefined();
    expect(erpSyncLogs).toBeDefined();
  });
});
```

- [ ] **Step 2: Ejecutar test para comprobar que falla**
Run: `pnpm vitest run src/db/schema/__tests__/phase2_schemas.test.ts`
Expected: FAIL con "cannot find module or table undefined".

- [ ] **Step 3: Implementar los 4 esquemas Drizzle y exportarlos en `src/db/schema/index.ts`**
Crear `src/db/schema/cross_border.ts`, `efirma.ts`, `smart_contracts.ts`, y `erp_integrations.ts` con sus columnas y claves foráneas según la especificación, y re-exportarlos en `src/db/schema/index.ts`.

- [ ] **Step 4: Ejecutar test para verificar que pasa**
Run: `pnpm vitest run src/db/schema/__tests__/phase2_schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Ejecutar auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add src/db/schema/
git commit -m "feat(db): define Drizzle schemas for cross-border, efirma, smart contracts, and ERP"
```

---

### Task 2: Migración de Base de Datos y Creación de Tablas en SQLite

**Files:**
- Modify: `src/db/migrate.ts`
- Modify: `src/db/index.ts`
- Test: `src/db/__tests__/migration-phase2.test.ts`

**Interfaces:**
- Consumes: Las tablas de `src/db/schema/index.ts`.
- Produces: Tablas físicas creadas en la base de datos SQLite local (`atlas.db`).

- [ ] **Step 1: Escribir el test de migración que verifique la existencia física de las 6 tablas en SQLite**
```typescript
// src/db/__tests__/migration-phase2.test.ts
import { describe, it, expect } from "vitest";
import { getDatabase } from "../index.js";
import { sql } from "drizzle-orm";

describe("Phase 2 Physical Database Migration", () => {
  it("should have created all Phase 2 tables in sqlite_master", async () => {
    const db = getDatabase();
    const rows = await db.all(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('carta_porte_declarations', 'efirma_audit_stamps', 'smart_escrow_contracts', 'blockchain_blocks', 'erp_purchase_orders', 'erp_sync_logs')`
    );
    expect(rows.length).toBe(6);
  });
});
```

- [ ] **Step 2: Ejecutar test para comprobar que falla antes de la migración**
Run: `pnpm vitest run src/db/__tests__/migration-phase2.test.ts`
Expected: FAIL con `expected 0 to be 6` o tablas faltantes.

- [ ] **Step 3: Actualizar `src/db/migrate.ts` para ejecutar DDL de las nuevas tablas asegurando índices y claves foráneas**
Asegurar que `createTableIfNotExists` o sentencias SQL CREATE TABLE para las 6 tablas se ejecuten correctamente en `src/db/migrate.ts`.

- [ ] **Step 4: Ejecutar migración y volver a ejecutar el test**
Run: `npx tsx src/db/migrate.ts` y luego `pnpm vitest run src/db/__tests__/migration-phase2.test.ts`
Expected: PASS (6 tablas creadas).

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add src/db/migrate.ts src/db/index.ts src/db/__tests__/migration-phase2.test.ts
git commit -m "feat(db): execute database migration for phase 2 relational tables in sqlite"
```

---

### Task 3: Generador de Semillas de Fase 4 (`src/db/seeds/`) e Integración en Admin

**Files:**
- Create: `src/db/seeds/cross-border.seed.ts`
- Create: `src/db/seeds/efirma.seed.ts`
- Create: `src/db/seeds/smart-contracts.seed.ts`
- Create: `src/db/seeds/erp.seed.ts`
- Modify: `src/db/seed-phases.ts`
- Modify: `src/routes/admin-seed.routes.ts`
- Test: `src/routes/__tests__/admin-seed-phase4.routes.test.ts`

**Interfaces:**
- Consumes: `shipments` (`sh_demo_01`), `documents` (`doc_dua_0412`).
- Produces: Función `seedPhase4()` y endpoint `POST /api/admin/seed/4`.

- [ ] **Step 1: Escribir el test que valide la siembra de la Fase 4 y la consulta de registros sembrados**
```typescript
// src/routes/__tests__/admin-seed-phase4.routes.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../app.js";

describe("Admin Seed Phase 4 API", () => {
  let app: any;
  beforeAll(async () => {
    app = await buildApp();
  });

  it("POST /api/admin/seed/4 should successfully seed phase 4 records linked to sh_demo_01", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/seed/4",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.phase).toBe(4);
  });
});
```

- [ ] **Step 2: Ejecutar test para comprobar que falla**
Run: `pnpm vitest run src/routes/__tests__/admin-seed-phase4.routes.test.ts`
Expected: FAIL con 404 en `/api/admin/seed/4`.

- [ ] **Step 3: Implementar los seeders de Fase 4 y registrar `seedPhase4()` en `seed-phases.ts` y `admin-seed.routes.ts`**
  - `cross-border.seed.ts`: siembra Carta Porte para `sh_demo_01` y genera espejo en `documents`.
  - `efirma.seed.ts`: siembra sello de auditoría para el DUA y Carta Porte de `sh_demo_01`.
  - `smart-contracts.seed.ts`: siembra contrato inteligente y 4 bloques iniciales para `sh_demo_01`.
  - `erp.seed.ts`: siembra órdenes SAP y NetSuite vinculadas a `sh_demo_01` con logs en `erp_sync_logs`.
  - En `seed-phases.ts`: registrar `seedPhase4()` e incluirlo en `seedAllPhases()`.
  - En `admin-seed.routes.ts`: registrar ruta `POST /api/admin/seed/4`.

- [ ] **Step 4: Ejecutar test para verificar que pasa**
Run: `pnpm vitest run src/routes/__tests__/admin-seed-phase4.routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add src/db/seeds/ src/db/seed-phases.ts src/routes/admin-seed.routes.ts src/routes/__tests__/admin-seed-phase4.routes.test.ts
git commit -m "feat(seed): implement phase 4 seeds for cross-border, efirma, smart contracts, and ERP"
```

---

### Task 4: Backend Refactoring para Cross-Border USMCA & Carta Porte (`src/modules/cross-border/`)

**Files:**
- Modify: `src/modules/cross-border/cross-border.routes.ts`
- Modify: `src/modules/cross-border/cross-border.routes.test.ts`

**Interfaces:**
- Consumes: `cartaPorteDeclarations` de SQLite, `shipments`.
- Produces: `GET /api/cross-border/declarations?shipmentId=...`, `POST /api/cross-border/carta-porte/stamp`, `POST /api/cross-border/carta-porte/generate-for-shipment`.

- [ ] **Step 1: Escribir el test que verifique la persistencia de Carta Porte y consulta por `shipmentId`**
```typescript
// En src/modules/cross-border/cross-border.routes.test.ts
it("GET /api/cross-border/declarations?shipmentId=sh_demo_01 should return the authentic database record", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/cross-border/declarations?shipmentId=sh_demo_01",
  });
  expect(res.statusCode).toBe(200);
  const data = JSON.parse(res.payload);
  expect(data.declaration).toBeDefined();
  expect(data.declaration.shipmentId).toBe("sh_demo_01");
});
```

- [ ] **Step 2: Ejecutar test para comprobar que falla**
Run: `pnpm vitest run src/modules/cross-border/cross-border.routes.test.ts`
Expected: FAIL con endpoint no implementado.

- [ ] **Step 3: Implementar controladores con persistencia en `carta_porte_declarations` y creación de documento espejo en `documents`**
Refactorizar `cross-border.routes.ts` para que interactúe con SQLite usando Drizzle ORM.

- [ ] **Step 4: Ejecutar suite de pruebas de cross-border**
Run: `pnpm vitest run src/modules/cross-border/cross-border.routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add src/modules/cross-border/
git commit -m "feat(cross-border): connect Carta Porte 3.1 and USMCA calculations to SQLite persistence"
```

---

### Task 5: Backend Refactoring para e-Firma Hub (`src/modules/efirma/`)

**Files:**
- Modify: `src/modules/efirma/efirma.routes.ts`
- Modify: `src/modules/efirma/efirma.routes.test.ts`

**Interfaces:**
- Consumes: `efirmaAuditStamps`, `documents`, `cartaPorteDeclarations`.
- Produces: `GET /api/efirma/stamps?shipmentId=...`, `POST /api/efirma/stamp`.

- [ ] **Step 1: Escribir el test que verifique la persistencia y lectura de sellos e-Firma en SQLite**
```typescript
// En src/modules/efirma/efirma.routes.test.ts
it("GET /api/efirma/stamps?shipmentId=sh_demo_01 should retrieve persisted audit stamps from SQLite", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/efirma/stamps?shipmentId=sh_demo_01",
  });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.payload);
  expect(Array.isArray(body.stamps)).toBe(true);
});
```

- [ ] **Step 2: Ejecutar test para comprobar que falla**
Run: `pnpm vitest run src/modules/efirma/efirma.routes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Refactorizar `efirma.routes.ts` para eliminar el array en memoria y persistir en `efirma_audit_stamps`**
Reemplazar `auditStampLedger` por consultas y mutaciones Drizzle en SQLite.

- [ ] **Step 4: Ejecutar suite de pruebas de e-firma**
Run: `pnpm vitest run src/modules/efirma/efirma.routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add src/modules/efirma/
git commit -m "feat(efirma): persist SAT digital seals and audit stamps to SQLite"
```

---

### Task 6: Backend Refactoring para Smart Contracts & Ledger Criptográfico (`src/modules/smart-contracts/`)

**Files:**
- Modify: `src/modules/smart-contracts/smart-contracts.routes.ts`
- Modify: `src/modules/smart-contracts/smart-contracts.routes.test.ts`

**Interfaces:**
- Consumes: `smartEscrowContracts`, `blockchainBlocks`, `shipments`.
- Produces: `GET /api/smart-contracts/ledger?shipmentId=...`, `POST /api/smart-contracts/deploy-for-shipment`, `POST /api/smart-contracts/oracle-event`, `POST /api/smart-contracts/endorse-title`, `POST /api/smart-contracts/trigger-dispute`.

- [ ] **Step 1: Escribir el test que valide la carga del ledger y persistencia de nuevos bloques en SQLite por expedición**
```typescript
// En src/modules/smart-contracts/smart-contracts.routes.test.ts
it("GET /api/smart-contracts/ledger?shipmentId=sh_demo_01 should return persisted blockchain blocks and verify integrity", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/smart-contracts/ledger?shipmentId=sh_demo_01",
  });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.payload);
  expect(body.success).toBe(true);
  expect(body.chainVerification.isValid).toBe(true);
  expect(body.ledger.length).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Ejecutar test para comprobar que falla**
Run: `pnpm vitest run src/modules/smart-contracts/smart-contracts.routes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Refactorizar `smart-contracts.routes.ts` eliminando `activeState` en memoria y persistiendo bloques en SQLite**
Cargar el contrato y los bloques desde SQLite mediante Drizzle. Al procesar eventos de oráculo o endosos, calcular el hash SHA-256 eslabonado e insertar el nuevo bloque en `blockchain_blocks`.

- [ ] **Step 4: Ejecutar suite de pruebas de smart contracts**
Run: `pnpm vitest run src/modules/smart-contracts/smart-contracts.routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add src/modules/smart-contracts/
git commit -m "feat(smart-contracts): persist MLETR e-BL and blockchain blocks to SQLite"
```

---

### Task 7: Backend Refactoring para ERP Integrations (SAP S/4HANA & NetSuite) (`src/modules/erp-integrations/`)

**Files:**
- Modify: `src/modules/erp-integrations/erp-integrations.routes.ts`
- Modify: `src/modules/erp-integrations/erp-integrations.service.ts`
- Modify: `src/modules/erp-integrations/erp-integrations.test.ts`

**Interfaces:**
- Consumes: `erpPurchaseOrders`, `erpSyncLogs`.
- Produces: `GET /api/erp-integrations/orders?shipmentId=...`, `/sap/sync-po`, `/sap/post-delivery`, `/sap/post-freight-accrual`, `/netsuite/sync-order`, `/netsuite/post-receipt`, `/queue/batch`.

- [ ] **Step 1: Escribir el test que valide la persistencia de órdenes SAP y NetSuite y logs de sincronización**
```typescript
// En src/modules/erp-integrations/erp-integrations.test.ts
it("GET /api/erp-integrations/orders?shipmentId=sh_demo_01 should return both SAP and NetSuite purchase orders from SQLite", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/erp-integrations/orders?shipmentId=sh_demo_01",
  });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.payload);
  expect(body.orders.length).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Ejecutar test para comprobar que falla**
Run: `pnpm vitest run src/modules/erp-integrations/erp-integrations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Refactorizar servicio y rutas de ERP Integrations para leer y persistir en `erp_purchase_orders` y `erp_sync_logs`**
Implementar soporte bidireccional para SAP S/4HANA y Oracle NetSuite, y procesar la cola por lotes registrando latencias reales y payloads en SQLite.

- [ ] **Step 4: Ejecutar suite de pruebas de ERP Integrations**
Run: `pnpm vitest run src/modules/erp-integrations/erp-integrations.test.ts`
Expected: PASS.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add src/modules/erp-integrations/
git commit -m "feat(erp): persist SAP and NetSuite purchase orders and sync logs to SQLite"
```

---

### Task 8: Frontend Refactoring para `CrossBorderUsmcaModule.tsx`

**Files:**
- Modify: `packages/frontend/src/pages/CrossBorderUsmcaModule.tsx`

**Interfaces:**
- Consumes: `GET /api/bookings` o `GET /api/shipments`, `GET /api/cross-border/declarations?shipmentId=...`.
- Produces: Vista de Aduanas Transfronterizas reactiva sin botones de presets estáticos.

- [ ] **Step 1: Retirar la barra de botones `USMCA_DEMO_PRESETS` e incorporar selector de expedición**
Integrar el selector en la cabecera alimentado por `useApiQuery(["shipments"], "/shipments")`.

- [ ] **Step 2: Conectar la carga de datos de Carta Porte y cálculos USMCA al `shipmentId` seleccionado**
Al seleccionar una expedición, hidratar los formularios de Carta Porte, RVC e IMMEX con sus datos auténticos de SQLite.

- [ ] **Step 3: Agregar estado y botón de Acción Operativa Directa ("Generar Carta Porte 3.1") si la expedición carece de declaración**
Mostrar panel informativo con botón de generación que deriva la mercancía y contenedor de la expedición y persiste el CFDI en la BD.

- [ ] **Step 4: Verificar compilación del frontend**
Run: `pnpm --filter @atlas/frontend build`
Expected: Build exitoso sin errores de tipos.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/CrossBorderUsmcaModule.tsx
git commit -m "feat(frontend): remove demo presets and bind CrossBorderUsmcaModule to real SQLite shipments"
```

---

### Task 9: Frontend Refactoring para `EFirmaHubModule.tsx`

**Files:**
- Modify: `packages/frontend/src/pages/EFirmaHubModule.tsx`

**Interfaces:**
- Consumes: `GET /api/shipments`, `GET /api/documents?shipmentId=...`, `GET /api/efirma/stamps?shipmentId=...`.
- Produces: Vista e-Firma Hub con selector de expedición y sub-selector de documento a sellar.

- [ ] **Step 1: Retirar la botonera `EFIRMA_DEMO_PRESETS` y sustituirla por selector de expedición**
Permitir al usuario seleccionar cualquier expedición activa del sistema.

- [ ] **Step 2: Añadir sub-selector de documentos asociados a la expedición en `SIGNING_STUDIO`**
Consultar `GET /api/documents?shipmentId=...` para listar DUA, Carta Porte o Factura y generar la Cadena Original automáticamente desde el documento seleccionado.

- [ ] **Step 3: Conectar el botón de sellado con persistencia directa en `efirma_audit_stamps`**
Al firmar con la clave privada (o sandbox), enviar la solicitud a `POST /api/efirma/stamp` y actualizar el historial en pantalla reactivamente.

- [ ] **Step 4: Verificar compilación del frontend**
Run: `pnpm --filter @atlas/frontend build`
Expected: Build exitoso.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/EFirmaHubModule.tsx
git commit -m "feat(frontend): bind EFirmaHubModule to real shipment documents with SQLite seal persistence"
```

---

### Task 10: Frontend Refactoring para `SmartContractsModule.tsx`

**Files:**
- Modify: `packages/frontend/src/pages/SmartContractsModule.tsx`

**Interfaces:**
- Consumes: `GET /api/shipments`, `GET /api/smart-contracts/ledger?shipmentId=...`.
- Produces: Explorador de Smart Contracts y Blockchain reactivo por expedición.

- [ ] **Step 1: Retirar botones de selección de escenario hardcodeados (`select-preset`)**
Reemplazar la barra de presets por un selector de expedición real en la cabecera.

- [ ] **Step 2: Conectar la consulta del ledger y verificación criptográfica al `shipmentId` activo**
Cargar contrato, milestones, e-BL MLETR y bloques desde SQLite. Si la expedición aún no tiene contrato, mostrar botón destacado "Desplegar Smart Escrow MLETR".

- [ ] **Step 3: Vincular las acciones de oráculo, endoso de título y disputa con actualización inmediata de la cadena**
Asegurar que cada acción agregue el nuevo bloque en SQLite y refresque la vista con `useQueryClient().invalidateQueries`.

- [ ] **Step 4: Verificar compilación del frontend**
Run: `pnpm --filter @atlas/frontend build`
Expected: Build exitoso.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/SmartContractsModule.tsx
git commit -m "feat(frontend): connect SmartContractsModule to SQLite ledger per shipment"
```

---

### Task 11: Frontend Refactoring para `ErpIntegrationsModule.tsx`

**Files:**
- Modify: `packages/frontend/src/pages/ErpIntegrationsModule.tsx`

**Interfaces:**
- Consumes: `GET /api/shipments`, `GET /api/erp-integrations/orders?shipmentId=...`.
- Produces: Consola de integración ERP multiconector conectada a SQLite y Dexie.

- [ ] **Step 1: Retirar selector de presets fijos `ERP_DEMO_PRESETS`**
Incorporar selector de expedición real en la barra superior.

- [ ] **Step 2: Conectar el visor de órdenes SAP y NetSuite a las órdenes de la BD**
Mostrar los ítems, totales y estado de entrega reales de la expedición activa.

- [ ] **Step 3: Conectar el despacho de la cola Dexie a `/api/erp-integrations/queue/batch`**
Al pulsar "Despachar Cola Dexie", enviar las mutaciones acumuladas al backend y refrescar la tabla de logs de sincronización de SQLite.

- [ ] **Step 4: Verificar compilación del frontend**
Run: `pnpm --filter @atlas/frontend build`
Expected: Build exitoso.

- [ ] **Step 5: Auditoría de fugas y commit local**
```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/ErpIntegrationsModule.tsx
git commit -m "feat(frontend): bind ErpIntegrationsModule to real SQLite ERP orders and Dexie batch queue"
```

---

### Task 12: Integración en Panel de Control del Sistema y Verificación End-to-End

**Files:**
- Modify: `packages/frontend/src/pages/SystemPanelModule.tsx`
- Test: Verificación E2E con Chrome DevTools MCP y suites de tests unitarios

**Interfaces:**
- Consumes: `POST /api/admin/seed/4`, `POST /api/admin/seed/all`.
- Produces: Panel de control del sistema actualizado con control de siembra de Fase 4 y verificación completa de la plataforma.

- [ ] **Step 1: Añadir la tarjeta y botón de control de Fase 4 en `SystemPanelModule.tsx`**
Incluir métricas de Fase 4 y disparador de siembra manual con cabecera `Content-Type: application/json`.

- [ ] **Step 2: Ejecutar comprobación global de tipos y compilación**
Run: `npx tsc --noEmit` y `pnpm --filter @atlas/frontend build`.
Expected: 0 errores de TypeScript, build exitoso.

- [ ] **Step 3: Ejecutar suite completa de tests de los módulos actualizados**
Run: `pnpm vitest run src/modules/cross-border/ src/modules/efirma/ src/modules/smart-contracts/ src/modules/erp-integrations/ src/routes/__tests__/admin-seed.routes.test.ts`.
Expected: Todas las pruebas pasando.

- [ ] **Step 4: Ejecutar siembra integral y validar en navegador vía Chrome DevTools MCP**
  - Ejecutar `POST /api/admin/seed/all`.
  - Navegar a `/usmca-cross-border`: verificar selección de `BK-2026-67116` y timbrado de Carta Porte.
  - Navegar a `/efirma-hub`: verificar selección del DUA de `sh_demo_01` y sellado exitoso en SQLite.
  - Navegar a `/smart-contracts`: comprobar la cadena de bloques intacta con `isValid: true`.
  - Navegar a `/erp-integrations`: comprobar órdenes SAP/NetSuite y despacho de cola.

- [ ] **Step 5: Ejecutar auditoría de fugas y commit final en `main`**
```bash
pnpm run audit:leaks:staged
git add packages/frontend/src/pages/SystemPanelModule.tsx
git commit -m "feat(system): integrate phase 4 seed trigger in SystemPanelModule and complete end-to-end real data phase 2"
```

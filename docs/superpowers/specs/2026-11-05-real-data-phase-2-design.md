# Documento de Diseño: Fase 2 de Datos Reales en Atlas-Logistics
## Eliminación de Presets Estáticos en Aduanas (USMCA / Carta Porte), e-Firma Hub, Smart Contracts y ERP

- **Fecha**: 2026-11-05
- **Estado**: Aprobado tras Builder Check
- **Ámbito**: Backend Fastify (`src/modules/*`, `src/db/*`), Frontend React (`packages/frontend/src/pages/*`), Esquemas Drizzle ORM y Semillas Relacionales.

---

## 1. Intent and the Why (Propósito y Motivación)

Atlas-Logistics ha completado con éxito la Fase 1 de Reemplazo de Demos (módulos B2B EDI Hub, Document Vault OCR y Demurrage Control Tower) y la resolución de claves foráneas con la expedición canónica `sh_demo_01`.

Actualmente, cuatro módulos estratégicos aún dependen de estructuras estáticas o variables volátiles en memoria:
1. **Cross-Border USMCA (`CrossBorderUsmcaModule.tsx`)**: Utiliza `USMCA_DEMO_PRESETS` (Laredo Automotive, Manzanillo Inbound, Veracruz Reefer).
2. **e-Firma Hub (`EFirmaHubModule.tsx`)**: Utiliza `EFIRMA_DEMO_PRESETS` (Pedimento A1, Pedimento AF, Carta Porte 3.1, e-BL MLETR) y almacena auditorías en un array en memoria `auditStampLedger`.
3. **Smart Contracts & MLETR Blockchain (`SmartContractsModule.tsx`)**: Utiliza `SMART_CONTRACTS_PRESETS` y almacena la cadena de bloques en una variable global volátil `let activeState = ...` en Fastify.
4. **ERP Integrations Hub (`ErpIntegrationsModule.tsx`)**: Utiliza `ERP_DEMO_PRESETS` (SAP Automotive Tier 1, NetSuite Retail) simulando llamadas a POs y recepciones de mercancías desconectadas de las expediciones reales de SQLite.

**Objetivo**: Reemplazar todas las botoneras de simulación por selectores reactivos conectados a SQLite, respaldados por esquemas formales en Drizzle ORM, persistencia transaccional y una nueva **Fase 4 de Semillas Relacionales** con integridad referencial completa.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals (Objetivos)
- Diseñar y crear 4 nuevos esquemas Drizzle relacionales en `src/db/schema/` vinculados mediante claves foráneas (`references(() => shipments.id)`, `documents.id` y `cartaPorteDeclarations.id`).
- Implementar la migración de base de datos para SQLite en modo WAL asegurando compatibilidad con `foreign_keys = ON`.
- Crear el generador de semillas de la **Fase 4: Transfronterizo, Blockchain & ERP** (`src/db/seeds/`), con endpoint dedicado `POST /api/admin/seed/4` e integración en `seed/all` y `SystemPanelModule.tsx`.
- Refactorizar los controladores y servicios backend en `src/modules/` para consultar y persistir en SQLite en lugar de memoria RAM o diccionarios estáticos (incluyendo tanto SAP S/4HANA como Oracle NetSuite).
- Refactorizar las 4 vistas de frontend para reemplazar los botones de preset por un selector unificado de expedición (`combobox`/`select`) con **Acción Operativa Directa** ("Generar Carta Porte 3.1", "Firmar y Sellar Documento", "Desplegar Smart Escrow MLETR", "Vincular Orden SAP / NetSuite").
- Garantizar que la expedición canónica `sh_demo_01` (`BK-2026-67116`, contenedor `MSKU9284712`) cuente con datos completos y funcionales en los 4 módulos tras la siembra.

### Non-Goals (Fuera de Alcance)
- No se sustituirá el motor criptográfico en navegador (WebCrypto API / SubtleCrypto) de e.firma ni el algoritmo SHA-256 de la cadena de bloques; se mantendrán las implementaciones criptográficas válidas existentes en `@atlas/shared`.
- No se conectarán APIs externas vivas de SAP o SAT en tiempo de ejecución (los conectores operan en sandbox autenticado con payloads normativos válidos según los estándares CFDI 4.0, SAT e.firma y SAP S/4HANA OData v4).
- No se alterarán los flujos de autenticación ni los roles de usuario existentes.

### Anti-Goals (Lo que NO se debe hacer)
- **CERO fugas de datos sensibles**: Prohibido introducir identificadores reales o nombres reservados (`CANTUNIS`, `TLSA`, `BERRIO`, `Can Tunis`).
- **PROHIBIDO git push o manipulación de remotos**: Todos los cambios se consolidarán en commits locales limpios en `main`.
- **PROHIBIDO tocar `C:\PowerShell`**: Esta ruta es estrictamente un directorio local de scripts ajeno al proyecto.
- No dejar estados en memoria no sincronizados que se pierdan al reiniciar el backend de Fastify.

---

## 3. Constraints (Restricciones Técnicas)
- **Base de Datos**: SQLite 3 con Drizzle ORM, modo WAL y restricciones de clave foránea activas (`PRAGMA foreign_keys = ON;`).
- **Backend**: Fastify en TypeScript ejecutado con Node.js (`npx tsx`).
- **Frontend**: React 18 con Vite, Tailwind CSS, `@atlas/ui` y React Query (`useApiQuery`, `useApiMutation`).
- **Verificación**: Antes de cualquier commit, `pnpm run audit:leaks:staged` debe reportar 0 coincidencias y `npx tsc --noEmit` debe compilar sin errores.

---

## 4. Approaches Considered (Enfoques Evaluados)

### Opción 1: Arquitectura Relacional Unificada con Esquemas Drizzle y Fase 4 de Semillas (SELECCIONADA TRAS ALINEACIÓN)
- Se crean tablas dedicadas en Drizzle para cada dominio técnico.
- Se implementa la Fase 4 en el sembrador de la BD con soporte en el panel de administración.
- Se asegura compatibilidad bidireccional tanto para SAP S/4HANA como para Oracle NetSuite.
- **Razón de selección**: Garantiza tipado estricto, integridad referencial SQL, durabilidad ante reinicios del backend y trazabilidad contable y aduanera.

### Opción 2: Reutilización de la Tabla `documents` (`payload_data` JSON)
- Descartada: Aunque reduce el número de tablas, agrupar bloques de blockchain y líneas de órdenes ERP en blobs JSON dificulta las consultas relacionales, auditorías forenses y actualizaciones atómicas de estado.

### Opción 3: Estado Semi-Estructurado por Módulo (`operational_modules_state`)
- Descartada: Rompe la homogeneidad arquitectónica del proyecto Atlas-Logistics, eliminando el valor del modelo relacional tipado.

---

## 5. Detailed Architecture & Design (Diseño Técnico Detallado)

### 5.1. Nuevos Esquemas Drizzle (`src/db/schema/`)

#### A. `src/db/schema/cross_border.ts`
```typescript
export const cartaPorteDeclarations = sqliteTable("carta_porte_declarations", {
  id: text("id").primaryKey(), // cp_sh_demo_01
  shipmentId: text("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  idCcp: text("id_ccp").notNull().unique(), // UUID CFDI 3.1
  transporteTipo: text("transporte_tipo").notNull().default("AUTOTRANSPORTE_FEDERAL"),
  rfcEmisor: text("rfc_emisor").notNull(),
  rfcReceptor: text("rfc_receptor").notNull(),
  origenJson: text("origen_json").notNull(), // JSON: Ubicación origen, CP, fecha
  destinoJson: text("destino_json").notNull(), // JSON: Ubicación destino, CP, fecha
  vehiculoJson: text("vehiculo_json").notNull(), // JSON: Placas, modelo, SCT, seguro
  operadorJson: text("operador_json").notNull(), // JSON: Nombre, RFC, licencia
  mercanciasJson: text("mercancias_json").notNull(), // JSON: Lista de mercancías, pesos, fracciones
  xmlTimbrado: text("xml_timbrado"), // CFDI XML con complemento Carta Porte
  qrCodeData: text("qr_code_data"),
  rvcPercentage: real("rvc_percentage"), // Regional Value Content USMCA
  immexPedimentoTipo: text("immex_pedimento_tipo"), // AF / A1
  customsDwellHoursPredicted: real("customs_dwell_hours_predicted"),
  status: text("status", { enum: ["DRAFT", "STAMPED", "CANCELLED"] }).notNull().default("STAMPED"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
```

#### B. `src/db/schema/efirma.ts`
```typescript
export const efirmaAuditStamps = sqliteTable("efirma_audit_stamps", {
  id: text("id").primaryKey(), // aud_sat_sh_demo_01
  shipmentId: text("shipment_id").references(() => shipments.id, { onDelete: "set null" }),
  documentId: text("document_id").references(() => documents.id, { onDelete: "set null" }),
  cartaPorteId: text("carta_porte_id").references(() => cartaPorteDeclarations.id, { onDelete: "set null" }),
  documentType: text("document_type", {
    enum: ["PEDIMENTO_ADUANAL", "CARTA_PORTE", "BILL_OF_LADING", "POLIZA_SEGURO", "CUSTOMS_RELEASE"],
  }).notNull(),
  certificateSerial: text("certificate_serial").notNull(),
  rfcTitular: text("rfc_titular").notNull(),
  razonSocial: text("razon_social").notNull(),
  cadenaOriginal: text("cadena_original").notNull(),
  cadenaOriginalSha256: text("cadena_original_sha256").notNull(),
  selloDigitalBase64: text("sello_digital_base64").notNull(),
  rfc3161TimestampToken: text("rfc3161_timestamp_token").notNull(),
  tamperSealHash: text("tamper_seal_hash").notNull(),
  status: text("status", { enum: ["VALIDATED_AND_SEALED", "REVOKED", "INVALID_SIGNATURE"] }).notNull().default("VALIDATED_AND_SEALED"),
  verifiedAt: text("verified_at").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
```

#### C. `src/db/schema/smart_contracts.ts`
```typescript
export const smartEscrowContracts = sqliteTable("smart_escrow_contracts", {
  id: text("id").primaryKey(), // sc_sh_demo_01
  shipmentId: text("shipment_id").notNull().unique().references(() => shipments.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  carrierScac: text("carrier_scac").notNull(),
  shipperName: text("shipper_name").notNull(),
  consigneeName: text("consignee_name").notNull(),
  escrowAmountEur: real("escrow_amount_eur").notNull(),
  escrowStatus: text("escrow_status", { enum: ["FUNDED", "MILESTONE_IN_PROGRESS", "SETTLED", "DISPUTED"] }).notNull().default("FUNDED"),
  disputeReason: text("dispute_reason"),
  eblDataJson: text("ebl_data_json").notNull(), // DigitalBillOfLadingMLETR
  milestonesDataJson: text("milestones_data_json").notNull(), // SmartEscrowMilestones
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const blockchainBlocks = sqliteTable("blockchain_blocks", {
  id: text("id").primaryKey(), // blk_sh_demo_01_0
  contractId: text("contract_id").notNull().references(() => smartEscrowContracts.id, { onDelete: "cascade" }),
  blockNumber: integer("block_number").notNull(),
  timestamp: text("timestamp").notNull(),
  previousHash: text("previous_hash").notNull(),
  blockHash: text("block_hash").notNull(),
  eventType: text("event_type").notNull(),
  payloadDataJson: text("payload_data_json").notNull(),
  signer: text("signer").notNull(),
  createdAt: integer("created_at").notNull(),
});
```

#### D. `src/db/schema/erp_integrations.ts`
```typescript
export const erpPurchaseOrders = sqliteTable("erp_purchase_orders", {
  id: text("id").primaryKey(), // po_sap_sh_demo_01 / po_ns_sh_demo_01
  poNumber: text("po_number").notNull().unique(), // 4500891234 / SO-2026-9912
  erpSystem: text("erp_system", { enum: ["SAP_S4HANA", "ORACLE_NETSUITE"] }).notNull(),
  shipmentId: text("shipment_id").references(() => shipments.id, { onDelete: "set null" }),
  vendorName: text("vendor_name").notNull(),
  companyCode: text("company_code").notNull(),
  purchasingGroup: text("purchasing_group").notNull(),
  totalAmount: real("total_amount").notNull(),
  currency: text("currency").notNull().default("EUR"),
  status: text("status", { enum: ["RELEASED", "IN_TRANSIT", "GOODS_RECEIPT_POSTED", "INVOICE_VERIFIED"] }).notNull().default("RELEASED"),
  lineItemsJson: text("line_items_json").notNull(),
  grnNumber: text("grn_number"),
  freightAccrualDocNumber: text("freight_accrual_doc_number"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const erpSyncLogs = sqliteTable("erp_sync_logs", {
  id: text("id").primaryKey(),
  poId: text("po_id").references(() => erpPurchaseOrders.id, { onDelete: "cascade" }),
  erpSystem: text("erp_system").notNull(),
  operation: text("operation").notNull(),
  status: text("status", { enum: ["SUCCESS", "FAILED", "PENDING_RETRY"] }).notNull(),
  requestPayloadJson: text("request_payload_json"),
  responsePayloadJson: text("response_payload_json"),
  latencyMs: integer("latency_ms").notNull(),
  createdAt: integer("created_at").notNull(),
});
```

---

### 5.2. Migración y Registro de Semillas: Fase 4

1. **`src/db/seeds/cross-border.seed.ts`**:
   - Siembra declaraciones reales de Carta Porte para `sh_demo_01` (Laredo Automotive IMMEX) y genera el documento espejo en `documents` (`type: "CARTA_PORTE"`).
2. **`src/db/seeds/efirma.seed.ts`**:
   - Siembra sellos de auditoría digital vinculados al DUA `doc_dua_0412` y a la Carta Porte `cp_sh_demo_01` satisfaciendo las restricciones de clave foránea.
3. **`src/db/seeds/smart-contracts.seed.ts`**:
   - Siembra el contrato escrow de 145.000 EUR para `sh_demo_01` (Shanghai a Valencia, MSC) con 4 bloques génesis verificables.
4. **`src/db/seeds/erp.seed.ts`**:
   - Siembra la orden SAP `4500891234` y la orden NetSuite `SO-2026-9912` asociadas a `sh_demo_01`, junto con sus logs históricos en `erp_sync_logs`.
5. **Registro de Fase 4**:
   - `src/db/seed-phases.ts`: definición de `seedPhase4()`.
   - `src/routes/admin-seed.routes.ts`: endpoint `POST /api/admin/seed/4`.
   - `packages/frontend/src/pages/SystemPanelModule.tsx`: botón interactivo "Sembrar Fase 4: Transfronterizo, Blockchain & ERP".

---

### 5.3. Endpoints Backend y Controladores

- **Cross-Border (`src/modules/cross-border/cross-border.routes.ts`)**:
  - `GET /api/cross-border/declarations?shipmentId=...`: retorna la declaración Carta Porte activa o `null`.
  - `POST /api/cross-border/carta-porte/stamp`: timbra y persiste en `carta_porte_declarations`, creando el documento espejo en `documents`.
  - `POST /api/cross-border/carta-porte/generate-for-shipment`: acción operativa directa para derivar y persistir una Carta Porte desde una expedición existente.
- **e-Firma Hub (`src/modules/efirma/efirma.routes.ts`)**:
  - `GET /api/efirma/stamps?shipmentId=...`: consulta los sellos persistidos en SQLite para la expedición.
  - `POST /api/efirma/stamp`: persiste el sello verificado en `efirma_audit_stamps`.
- **Smart Contracts (`src/modules/smart-contracts/smart-contracts.routes.ts`)**:
  - `GET /api/smart-contracts/ledger?shipmentId=...`: consulta el contrato y su cadena de bloques desde SQLite para la expedición seleccionada.
  - `POST /api/smart-contracts/deploy-for-shipment`: acción operativa directa para inicializar el contrato inteligente con su bloque génesis en SQLite.
  - `POST /api/smart-contracts/oracle-event`: evalúa el hito, calcula el nuevo bloque eslabonado por SHA-256 y lo persiste en `blockchain_blocks`.
  - `POST /api/smart-contracts/endorse-title`: endosa el e-BL y genera el bloque correspondiente en SQLite.
  - `POST /api/smart-contracts/trigger-dispute`: bloquea el escrow y persiste el bloque de disputa en SQLite.
- **ERP Integrations (`src/modules/erp-integrations/erp-integrations.routes.ts`)**:
  - `GET /api/erp-integrations/orders?shipmentId=...`: retorna las órdenes de compra ERP vinculadas a la expedición (SAP y NetSuite).
  - `POST /api/erp-integrations/sap/sync-po`: consulta o crea la orden SAP en SQLite y registra el log.
  - `POST /api/erp-integrations/sap/post-delivery`: actualiza el GRN de la orden SAP en SQLite.
  - `POST /api/erp-integrations/sap/post-freight-accrual`: actualiza la provisión de flete SAP en SQLite.
  - `POST /api/erp-integrations/netsuite/sync-order`: consulta o crea la orden NetSuite en SQLite y registra el log.
  - `POST /api/erp-integrations/netsuite/post-receipt`: registra la recepción y costo landed en NetSuite en SQLite.
  - `POST /api/erp-integrations/queue/batch`: procesa la cola de Dexie y persiste los logs y cambios de estado en SQLite.

---

### 5.4. Refactorización de las Páginas Frontend

Cada uno de los 4 módulos contará con:
1. **Selector Unificado de Expedición**: Componente selectivo en cabecera cargado desde `GET /api/bookings` o `GET /api/shipments`.
2. **Acción Operativa Directa**:
   - En Cross-Border: "Generar Carta Porte 3.1".
   - En e-Firma Hub: Selector secundario de documento de la expedición + botón "Firmar y Sellar con e.Firma SAT".
   - En Smart Contracts: "Desplegar Smart Escrow MLETR".
   - En ERP Hub: "Vincular / Sincronizar Orden SAP u Oracle NetSuite".
3. **Eliminación Total de Botones Hardcodeados**: Se retiran `USMCA_DEMO_PRESETS`, `EFIRMA_DEMO_PRESETS`, `SMART_CONTRACTS_PRESETS` selectores y `ERP_DEMO_PRESETS`.

---

## 6. Resoluciones del Builder Check

- **Decisión 1 (Theirs - Aprobada por Usuario)**: Persistencia completa tanto para SAP S/4HANA como para Oracle NetSuite en SQLite, con endpoints dedicados y registro de eventos en `erp_sync_logs`.
- **Decisión 2 (Minor - Builder Call)**: `efirma_audit_stamps` cuenta con claves foráneas opcionales `documentId` y `cartaPorteId` para prevenir colisiones de claves foráneas con `PRAGMA foreign_keys = ON;`.
- **Decisión 3 (Minor - Builder Call)**: En e-Firma Hub, la interfaz presenta un selector secundario de documento de la expedición elegida para permitir sellar DUA, Carta Porte o Factura de forma granular e intuitiva.

---

## 7. Plan de Verificación

1. **Tipado Estricto**: `npx tsc --noEmit` en backend y `pnpm --filter @atlas/frontend build`.
2. **Semillas e Integridad**:
   - `POST /api/admin/seed/4` ejecutado con éxito.
   - `POST /api/admin/seed/all` ejecutado con éxito sin violaciones de claves foráneas.
3. **Pruebas Automatizadas**:
   - Actualizar y ejecutar los tests unitarios en `src/modules/cross-border/cross-border.routes.test.ts`, `src/modules/efirma/efirma.routes.test.ts`, `src/modules/smart-contracts/smart-contracts.routes.test.ts` y `src/modules/erp-integrations/erp-integrations.test.ts`.
4. **Verificación en Vivo con Navegador (Chrome DevTools MCP)**:
   - Navegar a `/usmca-cross-border`: verificar selección de `BK-2026-67116` y timbrado de Carta Porte.
   - Navegar a `/efirma-hub`: verificar sellado y auditoría sobre documento real.
   - Navegar a `/smart-contracts`: verificar carga de e-BL y bloques reales en SQLite con verificación de integridad de cadena válida (`isValid: true`).
   - Navegar a `/erp-integrations`: verificar sincronización de PO y procesamiento de cola Dexie.
5. **Auditoría de Seguridad y Fugas**:
   - `pnpm run audit:leaks:staged` con 0 coincidencias.

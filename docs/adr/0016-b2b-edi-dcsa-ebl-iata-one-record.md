# 0016. Expansión de Integraciones B2B: IATA ONE Record 3.0, DCSA e-BL v3.0 y Pasarela EDIFACT DESADV

- **Estado**: Aceptado
- **Fecha**: 2026-11-11
- **Contexto**: Atlas Logistics Monorepo (`@atlas/frontend`, `@atlas/ui`, `@atlas/shared`, Fastify Backend, Drizzle ORM / SQLite WAL, SCM Kernel Outbox, DCSA Hub, IATA Linked Data)

---

## Contexto y Problema

1. **Eliminación de Deuda Técnica y Mocks en Carga Aérea (IATA ONE Record 3.0)**:
   Los módulos de carga aérea (`IataOneRecordService` e `IataOneRecordModule.tsx`) utilizaban estructuras en memoria inicializadas mediante constantes estáticas (`SEED_ONE_RECORD_WAYBILLS`, `SEED_CARGO_IQ_TIMELINE`). Esto contravenía la directriz de arquitectura *Zero Mocks* (ADR 0010) y el mandato de persistencia estricta en SQLite WAL con claves foráneas activas (`PRAGMA foreign_keys = ON`). Se requería un esquema relacional para registrar grafos JSON-LD W3C de e-AWB y los hitos de tiempo de ciclo Cargo iQ (`RCS`, `DEP`, `ARR`, `RCF`, `NFD`, `DLV`), con evaluación de SLA en tiempo real.

2. **Gobernanza de Documentos Electrónicos Transferibles Marítimos (DCSA e-BL v3.0 & UNCITRAL MLETR)**:
   El comercio marítimo global requiere la digitalización del Conocimiento de Embarque (Bill of Lading) preservando la singularidad del título de propiedad y la cadena ininterrumpida de endosos (*chain of custody*) conforme a la Ley Modelo de la CNUDMI (UNCITRAL MLETR) y reglas UCP 600. Se requería una API unificada bajo el estándar DCSA 3.0 para orquestar el ciclo de vida completo: emisión (`issue`), transferencia (`transfer`), endoso financiero o pignoración bancaria (`endorse`) y rescate final en destino (`surrender`), enlazando el rescate con la autorización de levante de mercancía (`CARGO_RELEASE_AUTHORIZED`) en el Operations Cockpit.

3. **Interoperabilidad Logística Multimodal B2B (UN/EDIFACT DESADV & IFTSTA)**:
   La visibilidad de inventarios y despacho de expediciones entre proveedores, transitarios y almacenes requería soporte bidireccional para el mensaje estándar UN/EDIFACT D96A DESADV (*Despatch Advice*), con capacidad de parsing AST, generación de estructuras de embalaje y bultos (CPS, PAC, LIN, QTY), acuses técnicos automáticos `CONTRL` (UCI/UCM) y generación de reportes de estatus multimodal `IFTSTA`.

---

## Decisión Arquitectónica

### 1. IATA ONE Record 3.0 y Cargo iQ en SQLite Relacional
- **Esquema Drizzle (`src/db/schema/air_cargo.ts`)**:
  - Incorporación de columna `oneRecordJsonLd: text("one_record_json_ld", { mode: "json" })` en la tabla `airway_bills`.
  - Creación de tabla `cargo_iq_milestones` con claves foráneas a `airway_bills.awb_number` y `iata_airports.code`, índices compuestos en `(awb_number, milestone_code)` y `sla_status`.
- **Seeder Determinista (`src/db/seeds/air-cargo.seed.ts`)**:
  - Población canónica de e-AWB `075-82910482` (Iberia BCN-JFK) y `139-44109283` (Aeroméxico MAD-MEX) con grafos JSON-LD completos conformes a `https://onerecord.iata.org/ns/cargo#`.
  - Inicialización determinista de los 8 hitos Cargo iQ con marcas temporales planificadas, límites de SLA y estado operativo.
- **Servicio Backend (`src/modules/iata-one-record/iata-one-record.service.ts`)**:
  - Consultas asíncronas Drizzle (`getWaybills`, `getWaybill`, `getMilestones`).
  - Mutación `recordMilestoneEvent` con actualización atómica de marca de tiempo real, cálculo de SLA (`ON_TIME`, `WARNING`, `BREACHED`) y emisión de evento outbox `IATA_ONE_RECORD_SLA_BREACHED` ante demoras.
- **Frontend React (`packages/frontend/src/pages/IataOneRecordModule.tsx`)**:
  - Sustitución de estado local por `useApiQuery` y `useApiMutation`, sincronizando cambios directamente con el backend Fastify.

### 2. DCSA e-BL v3.0 Maritime Lifecycle & UNCITRAL MLETR
- **Servicio DCSA e-BL (`src/services/dcsa/dcsa-ebl.service.ts`)**:
  - Integración nativa con `MletrLedgerService` para registro inmutable en `mletr_transferable_records` y `mletr_endorsements_ledger`.
  - Operaciones del ciclo de vida e-BL:
    - `POST /api/dcsa/ebl/issue`: Generación de e-BL DCSA 3.0 con bloque Génesis criptográfico.
    - `GET /api/dcsa/ebl`: Listado filtrable de títulos electrónicos transferibles.
    - `GET /api/dcsa/ebl/:id`: Detalle completo con cadena de bloques de endosos y verificación.
    - `POST /api/dcsa/ebl/:id/transfer` y `POST /api/dcsa/ebl/:id/endorse`: Transferencia criptográfica de posesión legítima (`SHIPPER` -> `BANK` -> `CONSIGNEE`).
    - `POST /api/dcsa/ebl/:id/surrender`: Rescate final ante el transportista en destino; genera código de autorización de entrega (`REL-SH_DEMO_01-...`), marca el estado como `SURRENDERED`, bloquea posteriores transferencias y emite el evento outbox `CARGO_RELEASE_AUTHORIZED`.
    - `GET /api/dcsa/ebl/:id/verify`: Verificación de integridad de hashes concatenados (`previous_hash` == `tx_hash` anterior).

### 3. Pasarela B2B UN/EDIFACT DESADV, IFTSTA y CONTRL
- **Servicio DESADV (`src/services/edi/edifact-desadv.service.ts`)**:
  - Parser bidireccional entre texto crudo EDIFACT D96A y modelo tipado `DespatchAdvice` (extrayendo BGM, DTM, RFF, NAD, CPS, PAC, LIN, QTY, MEA).
  - Emisión de evento outbox `edi.desadv.Received.v1` al recibir despachos entrantes.
- **Servicio IFTSTA & CONTRL (`src/services/edi/edifact-iftsta.service.ts`)**:
  - Generador de reportes de estatus multimodal IFTSTA D96A.
  - Generador de acuses técnicos de sintaxis `CONTRL` con códigos de acción `7` (Aceptado) y `4` (Rechazado con detalle de error).
- **Rutas Fastify (`src/routes/edi.routes.ts`)**:
  - Endpoints `/api/edi/desadv/parse`, `/api/edi/desadv/generate`, `/api/edi/desadv/ingest`, `/api/edi/iftsta/generate`, `/api/edi/contrl/generate`.
  - Reconocimiento dinámico de mensajes DESADV en `/api/edi/parse` y `/api/edi/inbound`.

---

## Consecuencias y Beneficios

1. **Cero Mocks (Zero Mocks Standard)**:
   Tanto el módulo de carga aérea IATA ONE Record como el módulo marítimo DCSA operan al 100% contra registros reales en SQLite WAL mediante Drizzle ORM.
2. **Cumplimiento de Estándares Internacionales**:
   Alineación formal con IATA ONE Record Cargo XML/JSON-LD 3.0, DCSA e-BL v3.0, UNCITRAL MLETR (Ley Modelo de Documentos Transferibles Electrónicos) y UN/EDIFACT D96A.
3. **Desacoplamiento Orientado a Eventos (Outbox Pattern)**:
   Cualquier evento de negocio crítico (rescate de e-BL, breach de SLA aéreo o recepción de aviso de expedición) queda garantizado de forma transaccional en la tabla `platform_gov_outbox_messages` para su consumo asíncrono y auditoría forense.
4. **Verificación Automatizada Completa**:
   30 pruebas de integración automatizadas en Vitest (`iata-one-record.test.ts`, `dcsa-ebl.test.ts`, `edi-desadv.test.ts`, `b2b-dcsa-edi-hub.test.ts`) pasando con código 0 y 0 errores de compilación TypeScript.

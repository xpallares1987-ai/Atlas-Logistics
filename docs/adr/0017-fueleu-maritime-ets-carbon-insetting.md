# 0017. Motor de Cumplimiento Regulatorio Marítimo UE, Liquidación EU ETS y Libro Mayor Criptográfico de Insetting (Book-and-Claim)

* **Estado**: Aceptado
* **Fecha**: 2026-11-11
* **Cuadrante Diátaxis**: Explicación y Decisiones (`docs/adr/`)
* **Autores**: Atlas Logistics Architecture Team & Sustainability Compliance Officers

---

## 1. Contexto y Problemática

El sector del transporte marítimo y transitario internacional afronta la entrada en vigor de dos marcos regulatorios vinculantes de la Unión Europea que imponen obligaciones financieras y de reporte inmediatas:

1. **Reglamento (UE) 2023/1805 (FuelEU Maritime)**: Exige una reducción de la intensidad de gases de efecto invernadero (GEI) de los combustibles utilizados a bordo del -2% para el periodo 2025/2026 (intensidad objetivo de 89,3368 gCO2eq/MJ frente a la referencia fósil de 91,16 gCO2eq/MJ). Los déficits de cumplimiento conllevan sanciones legales estatutarias de **2.400 € por tonelada equivalente de VLSFO** (41.000 MJ/t).
2. **Directiva (UE) 2023/959 (Inclusión del Transporte Marítimo en el EU ETS)**: Establece la obligación de entrega de derechos de emisión (EUA) con un calendario escalonado de devengo (*phase-in schedule*):
   - **2024**: 40% de las emisiones sujetas a reporte.
   - **2025**: 70% de las emisiones sujetas a reporte.
   - **2026 en adelante**: 100% de las emisiones sujetas a reporte.
   - **Ámbitos Geográficos**: 100% de emisiones entre puertos de escala de la UE (*Intra-EU*) y estancias en muelle (*at berth*); 50% de emisiones para trayectos entrantes/salientes respecto a puertos de terceros países (*Extra-EU*).
3. **Descarbonización de Alcance 3 e Insetting Criptográfico**: Para mitigar el recargo por combustible (*Green BAF*) y cumplir los objetivos corporativos SBTi sin incurrir en *greenwashing*, los cargadores y transitarios requieren un modelo de asignación *Book-and-Claim* (Mass-Balance) certificado bajo **ISO 14083** y **GLEC Framework v3.0**. Este modelo exige trazabilidad inmutable desde las Notas de Entrega de Bunkering (BDN) e ISCC-EU hasta las expediciones asignadas, previniendo el doble cómputo (*non-double-counting*).

---

## 2. Decisiones Arquitectónicas

### 2.1. Persistencia Relacional y Migración Drizzle 0027 (SQLite WAL)
Se implementan y persisten tres nuevas entidades canónicas en SQLite en modo WAL con claves foráneas estrictas (`PRAGMA foreign_keys = ON;`):
- `carbon_insetting_tokens`: Almacena los lotes bunkereados de biocombustibles (B100, HVO100) y RFNBO (e-Metanol), con volumen, energía total disponible (MJ), factor WTW certificado y sello génesis SHA-256.
- `carbon_insetting_allocations`: Registra el consumo y retiro irrevocable de energía para expediciones operativas (`sh_demo_01`), encadenando criptográficamente cada bloque con el hash anterior (`previous_block_hash`).
- `fuel_eu_penalties_ledger`: Libro mayor de cálculo de penalizaciones por déficit energético según el Art. 23 del Reglamento FuelEU Maritime.

### 2.2. Encadenamiento Criptográfico de Bloques (Zero Mocks / Mass-Balance)
El servicio `CarbonInsettingLedgerService` implementa una cadena determinística de bloques mediante WebCrypto / Node.js `crypto` con funciones SHA-256:
- **Génesis**: Bloque inicial anclado en `64 ceros`.
- **Inmutabilidad y Auditoría**: Cada asignación calcula el digest del bloque concatenando referencia, token físico, expedición beneficiaria, energía asignada, tCO2eq evitadas y el hash del bloque previo.
- **Auditoría Dinámica**: El endpoint `/api/carbon-insetting/allocations/verify` evalúa la integridad completa de la cadena, detectando cualquier intento de manipulación o doble cómputo.

### 2.3. Motor de Liquidación EU ETS y Green BAF Dinámico
El servicio `EtsGreenBafSettlementService` implementa:
- Determinación exacta del coeficiente de phase-in estatutario (70% en 2025, 100% en 2026).
- Factores de ponderación geográfica (1,0 intra-UE / 0,5 extra-UE) y cálculo multipotencial (GWP CO2: 1.0, CH4: 28.0, N2O: 265.0).
- Cálculo granular del recargo Green BAF por contenedor TEU y FEU (40 pies).
- Endpoint operativo `/api/fueleu/ets/settle` para liquidar automáticamente el recargo a nivel de expedición marítima (`sh_demo_01`).

### 2.4. Telemetría Oficial THETIS-MRV XML (EMSA)
El servicio `ThetisMrvXmlService` emite mensajes estructurados según el estándar de la Agencia Europea de Seguridad Marítima (EMSA) para declaraciones combinadas de emisiones y FuelEU Maritime.

### 2.5. Frontend Cero Mocks (Zero Mocks Standard)
Se refactoriza `CarbonInsettingModule.tsx` y `FuelEuMaritimeModule.tsx`:
- Eliminación de estructuras en memoria `useState(SEED_INSETTING_TOKENS)`.
- Enlace en tiempo real mediante `useApiQuery` y `useApiMutation` (`/api/carbon-insetting/tokens`, `/api/carbon-insetting/allocations`, `/api/fueleu/voyages`, `/api/fueleu/penalties`).
- Selector dinámico de expedición con fallback predeterminado a la expedición canónica `sh_demo_01` (`BK-2026-67116`).
- Exportación en vivo de certificados e-BDN con código QR de verificación y firma hash.

---

## 3. Consecuencias

### Positivas
* **Cumplimiento Regulatorio 2025/2026**: Atlas Logistics queda preparado para la entrada en vigor de FuelEU Maritime y el año 2025 (70% ETS), permitiendo a los clientes anticipar recargos o compensar emisiones.
* **Trazabilidad Criptográfica Incontestable**: Las emisiones evitadas de Alcance 3 son verificables matemáticamente por cualquier entidad auditora (DNV, Bureau Veritas).
* **Integridad Arquitectónica Diátaxis y Zero Mocks**: Cumplimiento del 100% de las directrices de desarrollo de `AGENTS.md`.

---

## 4. Estado de Verificación
* **Migración**: `drizzle/0027_fueleu_insetting_ledger.sql` ejecutada con éxito.
* **Pruebas Automatizadas**: 100% de pruebas unitarias e integración en verde (`tests/carbon-insetting-ledger.test.ts`, `tests/ets-green-baf.test.ts`, `src/modules/fueleu/fueleu.routes.test.ts`).
* **Compilación**: `pnpm run type-check` (0 errores).
* **Auditoría de Fugas**: `pnpm run audit:leaks` (0 fugas confidenciales en 3.458 archivos).

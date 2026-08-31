# Resumen Ejecutivo del Proyecto — Atlas Logistics ERP

### Visión General
**Atlas Logistics** es una plataforma integral (Super-App ERP) para la gestión completa de la cadena de suministro internacional y transporte multimodal (marítimo, aéreo, terrestre y aduanero). El sistema combina un frontend modular de alto rendimiento (Vite, React 19, TailwindCSS Glassmorphism), un backend de baja latencia con **Fastify 5**, persistencia local de coste cero (**SQLite / libSQL** con Drizzle ORM), y motores deterministas para el cumplimiento de normativas aduaneras, aéreas, terrestres y mercantiles internacionales.

---

### Módulos Principales Implementados

| Módulo | Estándar / Normativa | Funcionalidades Clave |
|---|---|---|
| **Customs Clearance & TARIC** | DUA / SAD (54 Casillas), Nomenclatura TARIC, CAU | Cálculo de aranceles, IVA aduanero, antidumping, cribado de sanciones UE/ONU, exportación XML y DUA PDF oficial. |
| **IATA e-Freight & Air Cargo** | IATA Res. 600a, Modulo-7, DGR Lithium Batteries | Emisión e-AWB (MAWB/HAWB), rating volumétrico 1:6000 ($167\text{ kg/m}^3$), mensajería Cargo-XML/IMP y AWB PDF. |
| **Incoterms® 2020 & Contratos** | Reglas Oficiales ICC Incoterms® 2020, CAU Arts. 70–74 | Matriz 11 reglas × 10 etapas, normalizador de valor en aduana (DUA Box 46), cláusulas de entrega y contrato mercantil PDF bilingüe. |
| **Siniestros & Recobros** | La Haya-Visby, Montreal 1999, CMR, CIM/COTIF | Cálculo de límites estatutarios en DEG, plazos de prescripción, Cartas de Reserva Formal y Recibos de Subrogación PDF. |
| **Transporte Terrestre & e-CMR** | Protocolo e-CMR de Ginebra (24 Cajas), Ley 15/2009, RDL 3/2022 | Despacho FTL/LTL, calculadora ADR 1.1.3.6 (1.000 puntos), capacidad de trailer 33 pallets y tacógrafo CE 561/2006. |
| **Tesorería & CASS / Navieras** | Reconciliación 3-Way Match & Riesgo FX | Casación automática de facturas de porteadores (tolerancia ±1% / ±5€), monitor FX multidivisa, notas de cargo y estados de liquidación PDF. |
| **Cadena de Frío & Farma GDP** | Directiva UE 2013/C 343/01, EN 12830, WHO TRS 961 | Monitorización de dataloggers (-80°C a +25°C), cálculo MKT Arrhenius, autonomía de hielo seco UN 1845, consumo genset reefer y Certificados Oficiales de Liberación GDP en PDF. |
| **Ajuste en Frontera por Carbono (CBAM)** | Reglamento (UE) 2023/956, 2023/1773, EU ETS | Emisiones integradas directas/indirectas, precursores complejos, deducción de precios de carbono en origen (Art. 9), generación de XML para el Registro Transitorio UE y certificados PDF. |
| **Ferrocarril Intermodal & Corredores TEN-T** | Convenio COTIF / Reglas CIM (UIC 992), TAF-TSI, EN 15528 | Trenes bloque TEN-T (750m), cálculo de masa frenada (≥65%), cargas por eje UIC A-D (hasta 22.5t), gálibo P400, interoperabilidad ancho ibérico/UIC, XML TAF-TSI y Carta de Porte CIM PDF. |
| **Depósito Aduanero, Zona Franca & Regímenes** | CAU Arts. 210–242 (DA 7100, DDA 7600, ADT 90d, ZF) | Libro Oficial de Existencias AEAT, control de avales globales bancarios, cálculo de deuda suspendida (arancel + IVA), DVD PDF y Certificados de Stock PDF. |
| **FuelEU Maritime & EU ETS Marítimo** | Reg. (UE) 2023/1805 & Dir. (UE) 2023/959 | Intensidad GEI WtW (gCO2eq/MJ), balance de cumplimiento, penalizaciones (2.400€/t), pooling de flota (Art. 21), derechos EUA, XML THETIS-MRV y Certificados FuelEU PDF. |
| **Financiación & Créditos Documentarios** | UCP 600, eUCP v2.1, URDG 758, ISP98, URC 522 | Cartas de crédito comerciales, garantías a primera demanda, motor de discrepancias UCP 600 / ISBP 745, simulador de costes bancarios, SWIFT MT700/MT734 y Dossiers PDF. |
| **Operador Económico Autorizado (OEA / AEO)** | CAU Art. 38-39, C-TPAT, ISO 17712, ISO 28000 | Cuestionario CAE AEAT (6 bloques), protocolo de inspección en 7 puntos de contenedor/remolque, precintos Clase 'H', matriz de riesgo de socios y 4 certificados PDF. |
| **Fletamentos & Planchas (Laytime Engine)** | BIMCO Gencon 2022, NYPE 2015, ASBATANKVO | Validación NOR/Turn-Time (WIPON/WIBON), cronología SOF (WWD/SHEX), demoras/despatch (ATS/WTS), off-hire time charter y 4 documentos PDF oficiales. |
| **Avería Gruesa & Salvamento (General Average)** | York-Antwerp Rules 2016, LOF 2024, SCOPIC | Liquidación de masa activa (sacrificios + 2.5% comisión Regla XX + interés CMI Regla XXI), masa pasiva contributoria, prorrateo pericial, Lloyd's Average Bond LAB 77 y 4 PDFs oficiales. |
| **Container Planner 3D & LCL** | ISO 668 Contenedores Marítimos | Cubicaje 3D de contenedores, centro de gravedad, distribución de ejes y consolidación LCL multi-cliente. |
| **Warehouse Digital Twin** | Gestión de Almacén & Tráfico de Andenes | Visualización 3D y 2.5D de almacén, control de muelles, inventario y tareas de fulfillment. |
| **BPMN 2.0 Workflows & Pricing** | ISO/IEC 19510 (BPMN 2.0) | Modelador visual de procesos logísticos con versionado, motor de tarifas dinámicas con recargos BAF/CAF/PSS. |

---

### Stack Tecnológico

- **Frontend**: React 19, TypeScript 5.7+, Vite 8, TailwindCSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js 22+, Fastify 5, `@fastify/jwt`, `@fastify/websocket`, `pdfkit`.
- **Persistencia**: SQLite (libSQL client) + Drizzle ORM (106 tablas, triggers, vistas, secuencias).
- **Asincronía**: BullMQ + ioredis (con fallback en memoria para desarrollo autónomo).
- **Control de Calidad**: Vitest (68 suites, 323 tests unitarios e integrados, 100% aprobados), Playwright E2E.
- **Monorepo**: Turborepo + pnpm v10 workspaces (`@atlas/frontend`, `@atlas/dashboard`, `@atlas/rate-comparer`, `@atlas/bpmn-modeler`, `@atlas/warehouse-ops`, `@atlas/ui`, `@atlas/shared`).

---

### Comandos de Operación Rápida

```bash
# Instalación de dependencias
pnpm install

# Compilación de todo el monorepo
pnpm run build

# Entorno de Desarrollo (Base de datos local: file:atlas-erp-v2.db)
pnpm run db:migrate
pnpm run db:seed
pnpm run dev

# Entorno de Producción (Base de datos aislada: file:atlas-erp-prod.db o DATABASE_URL)
pnpm run db:migrate:prod
pnpm run db:seed:prod
pnpm run start:prod   # o: pnpm start

# Ejecución de pruebas
pnpm test
npx playwright test
```

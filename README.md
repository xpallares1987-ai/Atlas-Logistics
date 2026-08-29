# Atlas Logistics 🌍🚢✈️🚛

Atlas Logistics es una **Super-App integral de Gestión de Cadena de Suministro (SCM) y Transporte Multimodal**. Centraliza operaciones de transitarios (*freight forwarders*), agentes de aduanas, aerolíneas, navieras y transportistas terrestres, proporcionando un motor determinista de contratación comercial, despacho aduanero europeo, cálculo de estiba 3D, e-freight aéreo, despacho de transporte por carretera y liquidación estatutaria de siniestros.

![Atlas Logistics Status](https://img.shields.io/badge/Status-Active-success) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue) ![pnpm](https://img.shields.io/badge/pnpm-v10-orange) ![Fastify](https://img.shields.io/badge/Fastify-5.2+-emerald) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🚀 Arquitectura Local de Coste Cero ($0)

Atlas Logistics se ejecuta **100% en local sin coste operativo de nube**, utilizando tecnologías embebidas de máximo rendimiento:

- **Base de Datos:** Drizzle ORM + libSQL (`atlas.db`, SQLite de alto rendimiento) con migraciones estructuradas, triggers de auditoría inmutables, secuencias autoincrementales y vistas SQL nativas.
- **Backend API:** Fastify 5 con autenticación JWT (`@fastify/jwt`), control de acceso por roles (RBAC) y WebSockets nativos (`ws://`).
- **Background Jobs:** BullMQ + ioredis con fallback resiliente en memoria si Redis no está conectado.
- **Monorepo:** Turborepo + pnpm workspaces con empaquetado modular (`@atlas/frontend`, `@atlas/ui`, `@atlas/shared`, `@atlas/rate-comparer`, `@atlas/bpmn-modeler`, `@atlas/warehouse-ops`).

---

## 🌟 Módulos y Capacidades de la Plataforma

Atlas Logistics cubre todos los eslabones operativos, normativos y documentales del transporte internacional multimodal con interfaz premium **Dark Glassmorphism**:

### 1. 🚢 Transporte Marítimo & Contenedores
- **Sailing Schedules & Demurrage**: Buscador de itinerarios marítimos, control de *cut-off* y monitor de demoras (*Demurrage & Detention*).
- **Container Planner 3D**: Estiba y cubicaje tridimensional de contenedores marítimos con cálculo de centro de gravedad y distribución de cargas por eje.
- **LCL Consolidation Engine**: Motor de consolidación grupal de carga fraccionada para contenedores compartidos.
- **GlobeTracker**: Visualizador cartográfico de rutas marítimas y aéreas globales.

### 2. 🛃 Despacho Aduanero & TARIC (DUA/SAD 54 Casillas)
- **Declaración DUA / SAD 54 Casillas**: Formulario completo de importación/exportación con validación de sintaxis aduanera comunitaria.
- **Motor Arancelario TARIC**: Cálculo determinista de derechos arancelarios, IVA a la importación y medidas antidumping según código HS (Nomenclatura Combinada).
- **Control de Sanciones Internacionales**: Cribado de listas de sanciones comerciales UE/ONU por país de origen y operador.
- **Exportación Telemática**: Generación de documentos DUA oficiales en XML y PDF.

### 3. ✈️ Carga Aérea & IATA e-Freight (e-AWB)
- **Airway Bills (MAWB / HAWB)**: Emisión y gestión de cartas de porte aéreo con verificación de **dígito de control IATA Modulo-7**.
- **Tarificación Aérea 1:6000**: Conversión volumétrica automática según estándar IATA ($1\text{ m}^3 = 167\text{ kg}$).
- **Cribado de Mercancías Peligrosas (IATA DGR)**: Detección y validación de baterías de litio (UN 3480 / UN 3481) e instrucciones de embalaje ICAO/IATA.
- **Mensajería EDI e-Freight**: Generación de mensajes Cargo-XML y Cargo-IMP (FWB / FHL) y PDF oficial IATA AWB.

### 4. 📜 Incoterms® 2020 & Contratación Comercial
- **Matriz Oficial 11 Incoterms® 2020**: Asignación de costes y riesgos a lo largo de 10 etapas operativas (desde embalaje hasta descarga en destino).
- **Normalizador de Valor en Aduana (DUA Casilla 46)**: Cálculo matemático de adiciones (flete, seguro) y deducciones (aranceles, transporte interior) bajo el Código Aduanero de la Unión (CAU Arts. 70–74).
- **Reglas de Compatibilidad**: Detección de uso indebido de términos marítimos (`FOB`/`CIF`) en carga contenerizada y recomendación de términos multimodales (`FCA`/`CIP`).
- **Generador de Contratos PDF**: Contratos comerciales de compraventa y transporte multimodal bilingües (Inglés/Español) con firma digital.

### 5. ⚖️ Siniestros de Carga & Recobros Subrogatorios
- **Límites Estatutarios Internacionales (DEG / SDR)**:
  - **Marítimo (Reglas de La Haya-Visby)**: $\max(2,00\text{ DEG/kg}, \; 666,67\text{ DEG/bulto})$.
  - **Aéreo (Convenio de Montreal 1999)**: $22,00\text{ DEG/kg}$ de responsabilidad objetiva.
  - **Carretera (Convenio CMR)**: $8,33\text{ DEG/kg}$.
  - **Ferrocarril (Convenio CIM/COTIF)**: $17,00\text{ DEG/kg}$.
- **Cómputo de Plazos de Caducidad y Prescripción**: Alertas antes del vencimiento legal de protestas (3 a 14 días) y prescripción de acciones (1 a 2 años).
- **Documentación Legal PDF**: Emisión automática de **Cartas de Reserva Formal al Porteador** y **Recibos de Finiquito y Subrogación de Derechos** (Art. 43 LCS).

### 6. 🚛 Transporte por Carretera (FTL/LTL) & e-CMR
- **Doble Estándar Documental**:
  - **e-CMR de Ginebra (Protocolo IRU 24 Casillas)** para tráfico internacional.
  - **Carta de Porte Nacional (Ley 15/2009 & RDL 3/2022)** con cláusula obligatoria de prohibición de carga/descarga por conductor y paralizaciones (> 1h).
- **Calculadora ADR 2025 (Exención 1.1.3.6)**: Algoritmo de cómputo de los 1.000 puntos para determinar exención de placas naranja y carné ADR.
- **Optimizador de Ruta y Tacógrafo (CE 561/2006)**: Control de capacidad de semirremolque (33 Euro-pallets / 24.000 kg) y cronograma de pausas reglamentarias de 45 minutos.

### 7. 💰 Tesorería Multidivisa & Reconciliación de Porteadores (3-Way Match & CASS)
- **Motor de Casación 3-Way Match**: Reconciliación automática entre Facturas de Porteadores (Aerolíneas/CASS, Navieras, Carretera), Cotizaciones internas (*Bookings*) y Documentos de transporte (B/L, AWB, CMR) con tolerancia configurable ($\pm 1\%$ o $\pm 5\text{ EUR/USD}$).
- **Auditoría de Demoras y Sobrecargos**: Detección inmediata de recargos indebidos, paralizaciones no autorizadas y duplicidad de cargos BAF/THC.
- **Monitor de Riesgo Cambiario (FX) y Flujo de Caja**: Matriz de divisas oficiales (EUR base vs USD, GBP, CNY, JPY, CHF, AED), cálculo de ganancias/pérdidas latentes y proyección de liquidez a 30/60/90 días.
- **Documentación Legal PDF**:
  - **Nota de Cargo / Carta de Disputa al Porteador (*Carrier Debit Note PDF*)** con solicitud de factura rectificativa a 14 días.
  - **Estado Oficial de Liquidación y Orden de Pago (*Settlement Statement PDF*)** con retenciones CASS y firma digital de tesorería.

### 8. ❄️ Cadena de Frío, Monitorización Reefer & Farma GDP (EN 12830)
- **Perfiles Térmicos Regulados**: Cobertura integral de rangos Ultra-Cold ($-80^\circ\text{C}$ a $-60^\circ\text{C}$ Hielo Seco UN 1845), Congelado ($-25^\circ\text{C}$ a $-15^\circ\text{C}$), Refrigerado Farmacéutico ($+2^\circ\text{C}$ a $+8^\circ\text{C}$), Ambiente Controlado CRT ($+15^\circ\text{C}$ a $+25^\circ\text{C}$) y Perecederos Frescos ($+0^\circ\text{C}$ a $+4^\circ\text{C}$).
- **Cálculo Cinético MKT (Ecuación de Arrhenius)**: Determinación exacta de la Temperatura Cinética Media ($\Delta H = 83,14\text{ kJ/mol}$) para cuantificar el impacto térmico real sobre la estabilidad farmacéutica.
- **Física Térmica Determinista**:
  - **Sublimación y Autonomía de Hielo Seco**: Cálculo de tasa de sublimación horaria y reserva en kg a la llegada estimada.
  - **Genset Diésel Reefer**: Consumo de combustible ($\text{L/h}$) y autonomía del generador según diferencial térmico ($\Delta T$).
- **Garantía de Calidad GDP & Certificados Oficiales PDF**:
  - Dictamen formal de la Persona Responsable (RP / QP): `RELEASED_FOR_DISTRIBUTION`, `QUARANTINE_INVESTIGATION`, `REJECTED_DISPOSAL`.
  - Emisión del **Certificado Oficial de Inspección de Cadena de Frío y Liberación Farmacéutica en PDF** (Directiva UE 2013/C 343/01, WHO TRS 961 y EN 12830).

### 9. 🌿 Mecanismo de Ajuste en Frontera por Carbono (CBAM) & Alcance 3
- **Reglamento (UE) 2023/956 & 2023/1773**: Cobertura integral de los 6 sectores regulados (Hierro y Acero, Aluminio, Cemento, Fertilizantes, Hidrógeno, Electricidad).
- **Cálculo de Emisiones Integradas Directas e Indirectas**:
  - Emisiones Directas (Alcance 1 de proceso) e Indirectas (Alcance 2 por electricidad).
  - Cálculo de precursores complejos (*complex goods*, ej. palanquilla en perfiles de acero o alúmina en aluminio).
  - Comparativa de factores verificados de instalación vs. Valores por Defecto (*Default Values*) de la Comisión Europea (DG TAXUD).
- **Liquidación Financiera EU ETS & Deducciones en Origen (Art. 9)**:
  - Valoración de certificados CBAM según cotización semanal de derechos EU ETS (€/tCO2e).
  - Deducción automática de precios de carbono efectivamente satisfechos en el país de origen (ej. UK ETS, China National ETS).
- **Exportación Telemática Oficial**:
  - Generador de **XML Oficial para el Registro Transitorio CBAM** de la Comisión Europea (DG TAXUD).
  - Emisión del **Certificado Oficial de Declaración de Emisiones Integradas y Obligaciones CBAM en PDF**.

### 10. 🚆 Ferrocarril Intermodal & Corredores Transeuropeos (CIM / TEN-T)
- **Convenio COTIF / Reglas Uniformes CIM (Formulario UIC 992)**: Gestión de expedientes de transporte internacional ferroviario y emisión oficial de la **Carta de Porte CIM en PDF**.
- **Física de Trenes Bloque & Seguridad Operacional**:
  - Límite de longitud máxima de convoy ($\le 750\text{ metros}$ estándar TEN-T Corredores Mediterráneo RFC6 y Atlántico RFC4).
  - Cálculo determinista del **Porcentaje de Masa Frenada** ($\text{Brake } \% \ge 65\%$).
  - Emisión del **Boletín Oficial de Composición de Tren y Frenado en PDF** (*Train Composition & Brake Sheet*).
- **Auditoría de Cargas por Eje UIC (Norma EN 15528)**:
  - Verificación estricta de límites de infraestructura: Categoría A (16.0 t/eje), B (18.0 t/eje), C (20.0 t/eje), D (22.5 t/eje).
  - Compatibilidad de gálibo intermodal para **Autopistas Ferroviarias (semirremolques P400** sobre vagones canguro T3000e / Sdggmrss).
- **Interoperabilidad Telemática ERA TAF-TSI**:
  - Generador de mensajes **TAF-TSI XML** para el intercambio de datos de convoy y orden de expedición con Administradores de Infraestructura (Adif, SNCF Réseau, DB Netze).

### 11. 🏛️ Depósito Aduanero, Zona Franca & Regímenes Especiales (CAU & AEAT)
- **Regímenes Especiales del Código Aduanero de la Unión (CAU Arts. 210–242)**:
  - **Depósito Aduanero (DA - Régimen 7100)**: Suspensión total de aranceles e IVA a la importación por tiempo ilimitado.
  - **Depósito Distinto del Aduanero (DDA - Régimen 7600)**: Exención técnica de IVA conforme a la Ley 37/1992 para operaciones asimiladas a la importación.
  - **Almacén de Depósito Temporal (ADT - Art. 149 CAU)**: Control y alertas automáticas de permanencia con límite estricto de 90 días.
  - **Zona Franca (ZF)**: Exclusión perimetral aduanera y almacenamiento libre de tributos.
- **Gestión Financiera de Avales Globales ante la AEAT (Arts. 89–98 CAU)**:
  - Monitor en tiempo real de consumo y crédito disponible del aval bancario: $\text{Aval Disponible} = \text{Límite Aval} - \sum (\text{Arancel} + \text{IVA Suspendido})$.
  - Simulador de liquidación fiscal por desvinculación a Libre Práctica (Régimen 4071) vs exención por Reexportación a tercer país (Régimen 3171).
- **Libro Oficial de Registro Contable de Existencias & Manipulaciones Usuales (Art. 220 CAU)**:
  - Registro cronológico inmutable de asientos contables auditables para inspecciones de la AEAT.
  - Validador reglamentario de manipulaciones usuales (Anexo 71-03: etiquetado CE, reacondicionamiento, conservación, toma de muestras).
  - Emisión oficial del **Documento de Vinculación a Depósito (DVD PDF)** y **Certificado Oficial de Existencias Bajo Control Aduanero en PDF**.

### 12. 🚢 FuelEU Maritime, EU ETS Marítimo & Descarbonización de Flota (Reg. UE 2023/1805 & Dir. 2023/959)
- **Reglamento (UE) 2023/1805 (FuelEU Maritime)**:
  - Intensidad de Emisiones de Gases de Efecto Invernadero (GEI) de la energía utilizada a bordo ($g\text{CO}_2\text{eq/MJ}$) considerando ciclo de vida Well-to-Wake (WtW: Well-to-Tank + Tank-to-Wake).
  - Trayectoria de reducción obligatoria: $-2\%$ en 2025–2029 ($89.34\text{ }g/\text{MJ}$), $-6\%$ en 2030, hasta $-80\%$ en 2050.
  - Cálculo determinista del **Balance de Cumplimiento (Compliance Balance - CB)** y **Penalización FuelEU** ($2.400\text{ €/t VLSFO-equiv}$).
  - Control de **Conexión Eléctrica en Muelle (OPS - Onshore Power Supply)** con penalización por no conexión ($1.50\text{ €/kWh}$).
  - Mecanismos de flexibilidad: **Pooling de Flota (Art. 21)** para neutralizar multas compensando buques verdes (E-Metanol/Bio-LNG) con buques a VLSFO, **Banking** y **Borrowing** (1.10x).
- **Directiva (UE) 2023/959 (Régimen de Comercio de Derechos de Emisión EU ETS Marítimo)**:
  - Asignación de alcances: $100\%$ intra-UE y atraques; $50\%$ viajes extra-UE para $\text{CO}_2$, $\text{CH}_4$ (GWP 28) y $\text{N}_2\text{O}$ (GWP 265).
  - Motor de **Recargo Ecológico Marítimo (Green BAF / ETS Surcharge)** por TEU y contenedor de 40 pies.
- **Exportación Telemática & Documentos Oficiales en PDF**:
  - Generador de **XML Oficial para el Sistema THETIS-MRV / FuelEU de la EMSA**.
  - **Certificado Oficial de Cumplimiento FuelEU Maritime & Liquidación EU ETS en PDF** (formato de auditoría DNV / Bureau Veritas).
  - **Informe de Travesía & Declaración de Combustible (BDN Audit Sheet) en PDF**.

### 13. 🏦 Financiación Internacional & Créditos Documentarios (UCP 600 / URDG 758 / URC 522 / SWIFT MT700)
- **Reglas Uniformes de la Cámara de Comercio Internacional (CCI / ICC)**:
  - **Créditos Documentarios Comerciales (UCP 600 / eUCP v2.1)**: Emisión, confirmación bancaria y liquidación de cartas de crédito a la vista (*Sight*) o a plazo (*Deferred / Acceptance Usance*).
  - **Garantías Bancarias a Primera Demanda & Standby L/C (URDG 758 / ISP98)**: Avales internacionales de cumplimiento de contrato (*Performance Bond*), pago anticipado (*Advance Payment Guarantee*) y licitación (*Bid Bond*).
  - **Remesas Documentarias (URC 522)**: Cobranzas documentarias bajo Documentos contra Pago (D/P) o Documentos contra Aceptación (D/A).
- **Motor Exhaustivo de Auditoría de Discrepancias UCP 600 / ISBP 745**:
  - **Plazo de Presentación (Art. 14c & ISBP A19)**: Verificación del límite de 21 días naturales tras la fecha de embarque (*Shipped on Board*).
  - **Tolerancia en Importes y Cantidades (Art. 30)**: Control de margen estricto de $+/-5\%$ (o $+/-10\%$ para importes aproximados).
  - **Factura Comercial (Art. 18)**: Cotejo literal con el campo 45A del crédito y coincidencia estricta de divisa.
  - **Conocimiento de Embarque (Arts. 19–27)**: Detección y bloqueo de B/L con reservas (*Claused / Unclean B/L*) y verificación de mención expresa *Clean on Board*.
  - **Póliza / Certificado de Seguro (Art. 28)**: Cobertura mínima obligatoria del $110\%$ del valor CIF/CIP de factura y fecha de vigencia anterior o igual al embarque.
- **Simulador Determinista de Comisiones Bancarias**:
  - Cálculo de comisiones de apertura trimestral ($\ge 90\text{ días}$), diferencial de riesgo de confirmación por país/banco emisor, recargos por discrepancias y enmiendas MT707.
- **Mensajería Telemática SWIFT & Documentación Oficial PDF**:
  - Generador telemático de mensajes **SWIFT MT700** (Apertura de Crédito) y **SWIFT MT734** (Aviso de Rechazo y Discrepancias).
  - **Dossier de Presentación Bancaria en PDF** (Inventario de documentos y carta de remisión bajo UCP 600).
  - **Informe Oficial de Auditoría de Discrepancias UCP 600 / ISBP 745 en PDF**.
  - **Certificado de Garantía Bancaria a Primera Demanda URDG 758 en PDF**.

### 14. 🏭 Gestión de Almacén & Gemelo Digital 3D
- **Warehouse Digital Twin**: Visualización 3D y 2.5D de andenes de carga, zonas de almacenamiento (racks), tareas de fulfillment y control de tráfico de pallets.

---

## 🏗️ Estructura del Monorepo

```text
Atlas-Logistics/
├── packages/
│   ├── frontend/           # Host PWA principal (React 19 + Vite + TailwindCSS)
│   ├── dashboard/          # Vistas operacionales y analítica
│   ├── rate-comparer/      # Motor de cotizaciones y comparación de tarifas
│   ├── bpmn-modeler/       # Modelador visual de procesos BPMN 2.0
│   ├── warehouse-ops/      # Micro-Frontend de almacén y andenes
│   ├── ui/                 # Sistema de diseño y componentes Glassmorphism
│   └── shared/             # Tipos TypeScript, esquemas Zod y criptografía segura
├── src/                    # Backend API Fastify, WebSockets, Drizzle ORM
│   ├── routes/             # Endpoints REST (auth, customs, air-cargo, incoterms, claims, road-freight)
│   ├── services/           # Motores deterministas de cálculo y validación
│   ├── db/                 # Esquemas Drizzle, migraciones y seed masivo
│   └── bpm/workers/        # Workers de tareas en background (BullMQ)
├── drizzle/                # Migraciones SQL generadas por Drizzle Kit
└── tests/
    └── e2e/                # Suites de pruebas Playwright automatizadas
```

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js**: >= 20.0 (recomendado 22+)
- **pnpm**: >= 10.0

### Instalación y Puesta en Marcha

1. **Clonar e Instalar:**
```bash
git clone https://github.com/xpallares1987-ai/Atlas-Logistics.git
cd Atlas-Logistics
pnpm install
```

2. **Compilar el Monorepo:**
```bash
pnpm run build
```

3. **Migrar y Poblar la Base de Datos:**
```bash
pnpm run db:migrate
pnpm run db:seed
```

4. **Iniciar en Modo Desarrollo:**
```bash
pnpm run dev
```
*Frontend disponible en [http://localhost:3002](http://localhost:3002) y API Backend en [http://localhost:3001](http://localhost:3001).*

---

## 🗄️ Gestión de Entornos de Base de Datos (Dev vs. Prod)

Atlas Logistics cuenta con aislamiento nativo de bases de datos por entorno mediante resolución dinámica en Drizzle ORM:

| Entorno | Archivo / Destino por Defecto | Variables de Entorno | Comandos de Operación |
|---|---|---|---|
| **Desarrollo** (`development`) | `file:atlas-erp-v2.db` | `.env.local` / `.env` | `pnpm run db:migrate`<br>`pnpm run db:seed`<br>`pnpm run dev` |
| **Producción** (`production`) | `file:atlas-erp-prod.db` *(o `DATABASE_URL` personalizada)* | `.env.production` | `pnpm run db:migrate:prod`<br>`pnpm run db:seed:prod`<br>`pnpm run start:prod` |

### Puesta en Marcha en Producción:
```bash
# 1. Copiar y configurar el archivo de variables de producción
cp .env.production.example .env.production

# 2. Aplicar migraciones sobre la base de datos de producción
pnpm run db:migrate:prod

# 3. Poblar triggers y usuario administrador inicial
pnpm run db:seed:prod

# 4. Iniciar el servidor Backend en modo producción
pnpm run start:prod
# O:
pnpm start
```

> **Tip para Despliegues Remotos / Turso:** Puedes conectar Atlas Logistics a una base de datos distribuida en la nube especificando `DATABASE_URL=libsql://tu-cluster.turso.io` y `DATABASE_AUTH_TOKEN=tu-token` en `.env.production`.

---

## 🧪 Pruebas Automatizadas

```bash
# Suite completa Vitest (33 archivos, 151 tests unitarios e integrados)
pnpm test

# Pruebas End-to-End con Playwright
npx playwright test
```

---

## 📄 Licencia

Este proyecto está licenciado bajo los términos de la Licencia MIT.

/**
 * @file wiki.data.ts
 * @description Master repository of technical articles, operational guidelines, and international logistics glossary
 * for Atlas Logistics In-App Wiki & Knowledge Hub.
 */

import { WikiArticle, WikiCategoryMeta, GlossaryTerm } from "./wiki.types.js";

export const WIKI_CATEGORIES_META: WikiCategoryMeta[] = [
  {
    id: "GOVERNANCE_CORREDOR",
    name: "Corredor Oficial Customer01",
    shortDescription:
      "Normativa operativa de Book TEST01, terminales de muelle, estiba 40' HC y roles.",
    icon: "TrainTrack",
    badgeColor: "emerald",
  },
  {
    id: "CUSTOMS_DUA",
    name: "Despacho Aduanero & DUA 54",
    shortDescription:
      "Estructura oficial del DUA/SAD, motor TARIC, cálculo tributario y OEA.",
    icon: "ShieldCheck",
    badgeColor: "blue",
  },
  {
    id: "INCOTERMS_CONTRACTS",
    name: "Incoterms® 2020 & Valor Aduana",
    shortDescription:
      "Matriz de costes y riesgos de 11 términos, CAU Arts. 70-74 y contratos bilingües.",
    icon: "FileSignature",
    badgeColor: "purple",
  },
  {
    id: "MARITIME_DEMURRAGE",
    name: "Marítimo & Demurrage (D&D)",
    shortDescription:
      "Control de cut-off, escalones de demoras, La Haya-Visby y pesaje VGM SOLAS.",
    icon: "Ship",
    badgeColor: "cyan",
  },
  {
    id: "AIR_CARGO_IATA",
    name: "Carga Aérea & IATA e-Freight",
    shortDescription:
      "Dígito Modulo-7, ratio volumétrico 1:6000, DGR baterías y Montreal 1999.",
    icon: "Plane",
    badgeColor: "amber",
  },
  {
    id: "ROAD_CMR",
    name: "Carretera CMR & EN 12195",
    shortDescription:
      "Límites de indemnización CMR (8,33 DEG), fuerzas dinámicas y estiba en camión.",
    icon: "Truck",
    badgeColor: "orange",
  },
  {
    id: "GLOSSARY",
    name: "Glosario Internacional",
    shortDescription:
      "Acrónimos, convenios y estándares globales (IATA, IMO, FIATA, AEAT, CAU).",
    icon: "BookOpen",
    badgeColor: "indigo",
  },
  {
    id: "ARCHITECTURE_ERP",
    name: "Arquitectura Técnica Atlas",
    shortDescription:
      "Monorepo Turborepo, Fastify 5, Drizzle ORM, libSQL local, BullMQ y PWA.",
    icon: "Boxes",
    badgeColor: "pink",
  },
];

export const WIKI_ARTICLES: WikiArticle[] = [
  {
    id: "art-customer01-corredor-oficial",
    slug: "corredor-oficial-customer01-normativa",
    title:
      "Normativa Operativa del Corredor Oficial Book TEST01 (Barcelona DEPT-TEST01)",
    category: "GOVERNANCE_CORREDOR",
    tags: [
      "Customer01",
      "Book TEST01",
      "CANTUNIS",
      "TLSA",
      "BERRIO",
      "Ferrocarril",
      "CO2e",
      "EN 12195",
    ],
    readingTimeMinutes: 6,
    author: "Systems & Operational Governance Lead",
    lastUpdated: "2026-10-21",
    officialRef: "RD 2822/1998 · CTU Code 2014 · EN 12195",
    summary:
      "Directrices estrictas sobre flujo físico de bobinas, terminales de llenado, cálculo de CO2e y gobernanza de roles en el corredor de exportación.",
    contentMarkdown: `
# Normativa Operativa del Corredor Oficial Book TEST01 (DEPT-TEST01)

Este documento fija la regulación técnica, operativa y de gobernanza de obligado cumplimiento para todo el flujo de exportación de papel en el corredor oficial de **Customer01 Barcelona**.

---

## 1. Cadena Física de Transporte y Almacenes Externos de Llenado

Las fábricas de producción de **Customer01 Paper** en España expiden bobinas de papel hacia almacenes exteriores donde se realiza el llenado de contenedores marítimos:

1. **Expedición en Tren (Vagones Ferroviarios Completos):**
   - Destino exclusivo: **CANTUNIS** (Logistainer BCN, Can Tunis / Morrot, Barcelona).
   - Es el **ÚNICO almacén con infraestructura y espuela ferroviaria activa** capacitado para descargar trenes completos.
   - Aplica un **76,9% de ahorro certificado en CO2e** ($0,018\\text{ kg CO}_2\\text{e/t}\\cdot\\text{km}$ frente a $0,078\\text{ kg CO}_2\\text{e/t}\\cdot\\text{km}$ en camión Euro VI).
2. **Expedición en Camión-Lona (Carretera):**
   - Destinos autorizados: **TLSA** (El Prat de Llobregat, Barcelona), **BERRIO** (Massanassa, Valencia) o excepcionalmente CANTUNIS ante contingencias.
   - Identificador detectado por matrícula de carretera (4 dígitos + 3 letras, e.g. \`4821-LXZ\`, o prefijo de semirremolque \`R-\`).
3. **Llenado y Precintado de Contenedores 40' High Cube (HC):**
   - El llenado, trincaje y precintado oficial de los contenedores marítimos se realiza **SIEMPRE en los almacenes externos** (CANTUNIS, TLSA o BERRIO).
   - **NUNCA** se realiza el llenado en las fábricas de papel de origen.
4. **PROHIBICIÓN ESTRICTA:**
   - **NUNCA** modelar TMZa (Terminal Marítima de Zaragoza) como estación o acarreo intermedio de contenedores en este corredor marítimo.

---

## 2. Centro de Gravedad 2D y Carga Legal (CTU Code / EN 12195)

- **Baseline Oficial de Carga Legal Útil:**
  - El límite legal en transporte combinado por carretera en España (**RD 2822/1998**, conjunto de 5 ejes, 44 t PMA) es de exactamente **26.500 kg netos** de mercancía.
  - Excepción EE.UU. (*US DOT Federal Bridge Formula*): Carga máxima legal neta de **20.500 kg**.
- **Geometría del Contenedor 40' HC:**
  - Longitud interna: $12,032\\text{ m} \\implies X_{\\text{geom}} = 6,016\\text{ m}$.
  - Anchura interna: $2,352\\text{ m} \\implies Y_{\\text{geom}} = 1,176\\text{ m}$.
- **Tolerancias de Centro de Gravedad (CoG):**
  - Desviación longitudinal $|\\Delta x| \\le 0,60\\text{ m}$: Certificado **BALANCED**.
  - $0,60\\text{ m} < |\\Delta x| \\le 0,85\\text{ m}$: Estado **WARNING**.
  - $|\\Delta x| > 0,85\\text{ m}$: Estado **CRITICAL** (prohibida expedición por riesgo de vuelco o sobrecarga de eje tractor).
- **Rebalanceo Automático 2-Opt:**
  - Si una estiba propuesta genera $|\\Delta x| > 0,35\\text{ m}$, el algoritmo 2-opt de Atlas ejecuta la permutación óptima de columnas para reequilibrar la carga a estado \`BALANCED\`.
- **Falso Flete:**
  - Cuando la carga neta queda significativamente por debajo de los 26.500 kg, el sistema cuantifica la penalización económica en euros y sugiere bobinas de peso y anchura complementarias disponibles en el stock local.

---

## 3. Gobernanza y Jerarquía de Roles Oficiales

- **ADMIN (SuperAdmin / Systems Lead):**
  - Control integral de infraestructura, rotación de claves criptográficas (AES-256-GCM), backups GFS y gestión de accesos.
- **TEST01 (Operator Lead / Department Team Leader):**
  - Liderazgo operativo del equipo de Customer01 Barcelona.
  - Responsable exclusivo de la asignación operativa de contenedores, expedientes de muelle, resolución de incidencias y disputas D&D.
- **TEST02 (Operations Manager / Department Manager):**
  - Dirección y supervisión ejecutiva departamental.
  - **Queda expresamente excluida de recibir o autoasignarse tareas operativas tácticas** (expedientes, albaranes, bobinas o muelles) en el día a día.
- **Exclusión Adicional:**
  - Nunca incluir asignaciones para \`RESTRICTED_OPERATOR\` en ningún flujo de trabajo ni prueba.
`,
  },
  {
    id: "art-customs-dua-54-casillas",
    slug: "guia-casillas-dua-sad-54",
    title: "Guía Integral de Despacho Aduanero: Las 54 Casillas del DUA / SAD",
    category: "CUSTOMS_DUA",
    tags: [
      "DUA",
      "SAD",
      "Aduanas",
      "TARIC",
      "Casilla 46",
      "Casilla 47",
      "CAU",
      "AEAT",
    ],
    readingTimeMinutes: 8,
    author: "Customs & Trade Compliance Specialist",
    lastUpdated: "2026-10-18",
    officialRef: "Reglamento (UE) 952/2013 (CAU) · Resolución DUA AEAT",
    summary:
      "Manual exhaustivo de declaración aduanera comunitaria: campos obligatorios, cálculo de valor estadístico y liquidación tributaria.",
    contentMarkdown: `
# Guía Integral de Despacho Aduanero: Las 54 Casillas del DUA / SAD

El **Documento Único Administrativo (DUA)** o *Single Administrative Document (SAD)* es el soporte documental oficial para la declaración aduanera de importación, exportación y tránsito en la Unión Europea.

---

## 1. Estructura de las Casillas Críticas

| Casilla | Denominación Oficial | Función e Instrucción Operativa |
| :---: | :--- | :--- |
| **1** | Declaración | Tipo de régimen (COM, EX, IM) y estatuto de mercancía (T1, T2, T2L). |
| **8** | Destinatario / Importador | Identificación fiscal (EORI) del titular de la operación. |
| **14** | Declarante / Representante | Representante aduanero y modalidad (Directa vs Indirecta). |
| **20** | Condiciones de Entrega | Incoterm® 2020 pactado (3 letras) y lugar acordado. |
| **22** | Divisa e Importe Facturado | Moneda de transacción (ISO 4217) e importe total según factura comercial. |
| **31** | Bultos e Identificación | Marcas, numeración, número de contenedor (e.g. \`MSCU1234567\`) y descripción comercial. |
| **33** | Código de las Mercancías | Código arancelario TARIC de 10 dígitos (Capítulo, Partida, Subpartida, NC y TARIC). |
| **37** | Régimen Aduanero Solicitado | 4 dígitos: los dos primeros indican el régimen solicitado y los dos últimos el precedente (e.g. \`4000\` = Despacho a libre práctica y a consumo simultáneo). |
| **46** | Valor Estadístico | **Valor cifrado en EUR en frontera comunitaria.** Clave para base imponible aduanera. |
| **47** | Cálculo de Tributos | Base de liquidación, tipo aplicable e importe liquidado por gravamen (Arancel, IVA, Antidumping). |

---

## 2. Normalización Matemática del Valor Estadístico (Casilla 46)

Bajo el **Código Aduanero de la Unión (CAU, Arts. 70 a 74)**, el valor en aduana parte del precio realmente pagado o por pagar ajustado por:

$$\\text{Valor Estadístico (EUR)} = \\text{Factura Comercial} + \\sum \\text{Adiciones} - \\sum \\text{Deducciones}$$

- **Adiciones Obligatorias (hasta el punto de entrada en la UE):**
  - Flete marítimo / aéreo internacional hasta el primer puerto o aeropuerto de entrada comunitario.
  - Seguro internacional de transporte de mercancías.
  - Gastos de carga, manipulación y estiba en el puerto de embarque.
- **Deducciones Legales (devengadas tras la entrada en la UE):**
  - Transporte interior terrestre desde la frontera comunitaria hasta el punto de entrega interior.
  - Gastos de descarga en destino final si están incluidos en el flete internacional.
  - Derechos arancelarios e impuestos satisfechos dentro de la UE.

---

## 3. Liquidación Tributaria en Casilla 47

Para una importación estándar a libre práctica (\`4000\`):
1. **Derecho Arancelario (A00):** $\\text{Base} = \\text{Casilla 46} \\times \\% \\text{ Arancel TARIC}$.
2. **Derechos Antidumping (A30/A35):** Aplicables si la posición TARIC y país de origen están sujetos a medidas de salvaguardia.
3. **Base Imponible del IVA a la Importación (B00):**
   $$\\text{Base IVA} = \\text{Casilla 46} + \\text{Arancel Liquidado} + \\text{Gastos Accesorios hasta Destino (T3, manipulación)}$$
4. **Cuota de IVA:** $\\text{Base IVA} \\times 21\\%$ (o tipo reducido según la mercancía).
`,
  },
  {
    id: "art-incoterms-2020-matrix",
    slug: "matriz-incoterms-2020-reglas-oro",
    title: "Matriz Oficial Incoterms® 2020 y Buenas Prácticas de Contratación",
    category: "INCOTERMS_CONTRACTS",
    tags: [
      "Incoterms",
      "ICC 2020",
      "FCA",
      "FOB",
      "CIP",
      "CIF",
      "Transferencia Riesgo",
    ],
    readingTimeMinutes: 7,
    author: "International Trade & Legal Counsel",
    lastUpdated: "2026-10-15",
    officialRef: "Cámara de Comercio Internacional (ICC) Pub. Nº 723E",
    summary:
      "Comparativa de los 11 términos oficiales de la ICC, asignación de costes y la regla de oro para transporte contenerizado.",
    contentMarkdown: `
# Matriz Oficial Incoterms® 2020 y Buenas Prácticas de Contratación

Los **Incoterms® 2020** regulan de forma estandarizada los derechos y obligaciones de comprador y vendedor en tres ámbitos críticos:
1. **Entrega física:** Dónde y cuándo se produce la transferencia del riesgo de pérdida o daño.
2. **Costes:** Quién contrata y paga el transporte, embalaje, carga, descarga y trámites aduaneros.
3. **Documentación:** Quién está obligado a obtener licencias, permisos y despachos de exportación/importación.

---

## 1. Clasificación Oficial: Multimodales vs. Exclusivos Marítimos

### A. Reglas para Cualquier Modo de Transporte (Multimodales):
- **EXW (Ex Works / En fábrica):** Mínima obligación del vendedor. El comprador asume carga, transporte y aduana.
- **FCA (Free Carrier / Franco Porteador):** Entrega en las instalaciones del vendedor (cargado) o en terminal designada. **Término preferente para contenedores.**
- **CPT (Carriage Paid To / Transporte Pagado Hasta):** Vendedor paga transporte principal hasta destino. El riesgo se transfiere al entregar al primer transportista.
- **CIP (Carriage and Insurance Paid To):** Igual a CPT más seguro obligatorio de máxima cobertura (**Cláusula ICC (A)** de todo riesgo).
- **DAP (Delivered at Place / Entregado en Punto de Destino):** Mercancía puesta a disposición sobre el medio de transporte sin descargar.
- **DPU (Delivered at Place Unloaded / Entregado en Lugar Descargado):** Vendedor obligado a la descarga física en destino.
- **DDP (Delivered Duty Paid / Entregado Derechos Pagados):** Máxima obligación del vendedor (incluye aranceles e impuestos de importación).

### B. Reglas Exclusivas para Transporte Marítimo y Vías Navegables Interiores:
- **FAS (Free Alongside Ship):** Al costado del buque en el muelle de carga.
- **FOB (Free On Board):** A bordo del buque en el puerto de embarque convenido.
- **CFR (Cost and Freight):** Vendedor asume flete marítimo hasta puerto de destino.
- **CIF (Cost, Insurance and Freight):** Igual a CFR con cobertura de seguro mínima obligatoria (**Cláusula ICC (C)**).

---

## 2. La Regla de Oro: ¡No usar FOB / CIF en Contenedores!

> [!WARNING] Error Habitual en Contratación Marítima
> En la carga contenerizada moderna, las mercancías se entregan a la naviera en una terminal portuaria de contenedores (CY) días antes de que el contenedor sea izado a bordo del buque.
> Si se pacta **FOB** o **CIF**, el riesgo no se transfiere al comprador hasta que el contenedor pasa físicamente la borda del buque. Si el contenedor se cae de la carretilla pórtico o sufre daños dentro de la terminal portuaria mientras espera el embarque, **el siniestro corre legalmente por cuenta del vendedor**, aunque este ya no tenga control físico del contenedor.

### Solución Estándar Recomendada:
- Sustituir **FOB** por **FCA (Terminal)**.
- Sustituir **CFR** por **CPT**.
- Sustituir **CIF** por **CIP**.
`,
  },
  {
    id: "art-demurrage-detention-storage",
    slug: "demurrage-detention-storage-arbitraje",
    title:
      "Control de Demurrage, Detention y Storage: Tiempos Libres y Disputas",
    category: "MARITIME_DEMURRAGE",
    tags: [
      "Demurrage",
      "Detention",
      "Storage",
      "D&D",
      "Navieras",
      "Días Libres",
      "Costes",
    ],
    readingTimeMinutes: 6,
    author: "Maritime Operations & Claims Manager",
    lastUpdated: "2026-10-12",
    officialRef: "BIMCO D&D Standard Clauses · Convenio FMC",
    summary:
      "Distinción conceptual entre demoras, retenciones y ocupaciones portuarias, cálculo de escalones tarifarios y protocolos de disputa.",
    contentMarkdown: `
# Control de Demurrage, Detention y Storage: Tiempos Libres y Disputas

El control de costes de ocupación y equipo de contenedores marítimos es una de las mayores fuentes de pérdida de margen operativo en el transporte internacional.

---

## 1. Definiciones Operativas Inconfundibles

- **Demurrage (Demoras de Contenedor):**
  - Cargo que aplica la naviera por el uso de su equipo (contenedor) cuando este permanece lleno dentro de la terminal portuaria más allá de los días libres acordados (*free time*).
- **Detention (Retención del Equipo):**
  - Cargo aplicado por la naviera cuando el contenedor ha salido de la terminal portuaria para descarga en los almacenes del cliente y no es devuelto vacío en la fecha límite convenida.
- **Storage (Ocupación de Muelle / Suelo Portuario):**
  - Cargo facturado por la **terminal portuaria** (no por la naviera) por la ocupación del espacio físico en explanada mientras el contenedor espera salida o embarque.

---

## 2. Escalones Tarifarios Típicos por Naviera

Las tarifas de D&D crecen de forma exponencial tras agotar los días libres para incentivar la rotación rápida del equipo:

$$\\text{Coste Diario (€/día)} = f(\\text{Días Excedidos}, \\text{Tipo Contenedor: 20' / 40' HC / Reefer})$$

| Tramo de Días | Contenedor Dry 40' HC | Contenedor Reefer 40' |
| :---: | :---: | :---: |
| **Día 1 a 7** | *Free Time* (0 €) | *Free Time* (0 €) |
| **Día 8 a 14** | 75 € / día | 165 € / día |
| **Día 15 a 21** | 120 € / día | 240 € / día |
| **Día 22 en adelante** | 185 € / día | 350 € / día |

---

## 3. Protocolo de Disputa por Retrasos No Imputables

Bajo las directrices de la **FMC** (*Federal Maritime Commission*) y normativa de la UE, las navieras no pueden imputar penalizaciones de D&D cuando el retraso es atribuible a:
1. Fallos de sistemas telemáticos portuarios (EDI / Portic / AEAT caídos).
2. Congestión severa de muelle con denegación de cita previa (*gate-in window*).
3. Paro de transportistas o huelga de estiba portuaria.
`,
  },
  {
    id: "art-iata-modulo7-chargeable-weight",
    slug: "iata-modulo-7-peso-tasable-volumetrico",
    title: "Carga Aérea IATA: Algoritmo Modulo-7 y Ratio Volumétrico 1:6000",
    category: "AIR_CARGO_IATA",
    tags: [
      "IATA",
      "e-AWB",
      "Modulo-7",
      "Peso Tasable",
      "1:6000",
      "Baterías Litio",
      "DGR",
    ],
    readingTimeMinutes: 5,
    author: "IATA Cargo & Airfreight Operations Lead",
    lastUpdated: "2026-10-10",
    officialRef: "IATA Cargo Services Conference Resolution 600a",
    summary:
      "Verificación matemática de cartas de porte aéreo (AWB), cálculo de peso tarifario y normativas de seguridad para mercancías peligrosas.",
    contentMarkdown: `
# Carga Aérea IATA: Algoritmo Modulo-7 y Ratio Volumétrico 1:6000

El transporte aéreo se caracteriza por su alta velocidad y estricta limitación de espacio y carga en bodega de aeronaves.

---

## 1. Algoritmo Modulo-7 para Master Airway Bills (MAWB)

El número de una MAWB IATA consta de 11 dígitos con la estructura: \`PPP-NNNNNNNC\`
- \`PPP\`: Prefijo numérico de 3 dígitos de la aerolínea (e.g. \`075\` para Iberia, \`020\` para Lufthansa).
- \`NNNNNNN\`: Número de serie de 7 dígitos.
- \`C\`: Dígito de control calculado mediante aritmética modular base 7.

### Fórmula Matemática:
$$C = \\text{Número de Serie (7 dígitos)} \\pmod 7$$

*Ejemplo:* Para la serie \`1234567\`:
$$1234567 = 176366 \\times 7 + 5 \\implies C = 5$$
El número final emitido será: \`075-12345675\`. Si el resultado de la división es exacto, el dígito de control es \`0\`.

---

## 2. Peso Tasable Aéreo: Factor Volumétrico 1:6000

Las aerolíneas facturan según el **Peso Tasable** (*Chargeable Weight*), que es el mayor valor entre el peso bruto real de la báscula y el peso volumétrico:

$$\\text{Peso Volumétrico (kg)} = \\frac{\\text{Largo (cm)} \\times \\text{Ancho (cm)} \\times \\text{Alto (cm)}}{6000} = \\text{Volumen (m}^3\\text{)} \\times 167$$

$$\\text{Peso Tasable (kg)} = \\max(\\text{Peso Bruto Real}, \\; \\text{Peso Volumétrico})$$

---

## 3. Mercancías Peligrosas IATA DGR: Baterías de Litio

- **UN 3480:** Baterías de ion-litio enviadas a granel (Instrucción de Embalaje **PI 965**). Estado de carga obligatorio $\\le 30\\%$. Prohibidas en aviones de pasaje (*Cargo Aircraft Only*).
- **UN 3481:** Baterías de ion-litio embaladas con o contenidas en equipos (Instrucciones **PI 966** y **PI 967**).
`,
  },
  {
    id: "art-cmr-road-freight-indemnity",
    slug: "convenio-cmr-responsabilidad-carretera",
    title:
      "Transporte Terrestre: Convenio CMR y Límite Indemnizatorio de 8,33 DEG",
    category: "ROAD_CMR",
    tags: ["CMR", "Carretera", "DEG", "SDR", "Siniestros", "EN 12195"],
    readingTimeMinutes: 5,
    author: "Legal & Road Claims Counsel",
    lastUpdated: "2026-10-08",
    officialRef: "Convenio CMR de 1956 · Protocolo de Ginebra de 1978",
    summary:
      "Régimen de responsabilidad del porteador por carretera, límites estatutarios por pérdida o avería y cálculo en Derechos Especiales de Giro.",
    contentMarkdown: `
# Transporte Terrestre: Convenio CMR y Límite Indemnizatorio de 8,33 DEG

El **Convenio relativo al Contrato de Transporte Internacional de Mercancías por Carretera (CMR)** rige todo contrato de transporte por carretera de mercancías a título oneroso cuando el lugar de carga y el de entrega estén en dos países distintos.

---

## 1. Límite Legal de Responsabilidad (Artículo 23.3)

La indemnización debida por el transportista en caso de pérdida total o parcial o de avería de las mercancías está topada legalmente:

$$\\text{Indemnización Máxima CMR} = 8,33 \\text{ DEG por kg bruto}$$

- El **DEG (Derecho Especial de Giro)** o *SDR (Special Drawing Right)* es una unidad de cuenta creada por el Fondo Monetario Internacional (FMI), respaldada por una cesta de divisas (USD, EUR, CNY, JPY, GBP).
- Su cotización diaria oscila en torno a $1\\text{ DEG} \\approx 1,22\\text{ - }1,25\\text{ EUR}$.
- *Ejemplo Práctico:* Un daño en una bobina de papel de $2.000\\text{ kg}$ brutos tiene una indemnización máxima estatutaria de:
  $$2000\\text{ kg} \\times 8,33\\text{ DEG/kg} = 16.660\\text{ DEG} \\approx 20.325\\text{ EUR}$$

---

## 2. Inaplicabilidad del Límite por Dolo (Artículo 29)

El porteador no podrá prevalecerse de las disposiciones del CMR que excluyan o limiten su responsabilidad si el daño proviene de:
- **Dolo** o negligencia grave equivalente al dolo cometida por el transportista o sus dependientes (e.g. estiba temeraria consciente, exceso de velocidad flagrante o manipulación del tacógrafo).
`,
  },
  {
    id: "art-atlas-zero-cost-architecture",
    slug: "arquitectura-tecnica-zero-cost-local",
    title:
      "Arquitectura de Coste Cero ($0) y Resiliencia Local de Atlas Logistics",
    category: "ARCHITECTURE_ERP",
    tags: [
      "Arquitectura",
      "Fastify",
      "Drizzle ORM",
      "libSQL",
      "BullMQ",
      "PWA",
      "Turborepo",
    ],
    readingTimeMinutes: 6,
    author: "Principal Software Architect",
    lastUpdated: "2026-10-21",
    officialRef: "ADR-0004 Zero-Cost Local Architecture",
    summary:
      "Principios de diseño, componentes embebidos de máximo rendimiento y funcionamiento offline de la suite Atlas Logistics.",
    contentMarkdown: `
# Arquitectura de Coste Cero ($0) y Resiliencia Local de Atlas Logistics

Atlas Logistics fue concebido para operar con **coste operativo cero de nube**, garantizando máxima privacidad de datos, latencia de milisegundos y operatividad ininterrumpida.

---

## 1. Pila Tecnológica Embebida

\`\`\`mermaid
flowchart TD
    Client["PWA React 19 Host\n(packages/frontend :3100)"]
    API["Fastify 5 API Gateway\n(src/server.ts :3001)"]
    DB[("libSQL / SQLite local\natlas.db + Drizzle ORM")]
    Queue["BullMQ + Redis\n(Fallback en Memoria)"]
    MFE1["@atlas/rate-comparer"]
    MFE2["@atlas/bpmn-modeler"]
    MFE3["@atlas/dashboard"]

    Client <-->|REST & WebSockets| API
    Client -.-> MFE1
    Client -.-> MFE2
    Client -.-> MFE3
    API <--> DB
    API <--> Queue
\`\`\`

- **Base de Datos:** Drizzle ORM sobre libSQL embebido (\`atlas.db\`). Soporta transacciones ACID inmediatas sin necesidad de servidor de base de datos pesado.
- **Backend API:** Fastify 5 con esquemas de validación Zod, autenticación JWT y WebSockets nativos para monitorización de telemetría y muelle en tiempo real.
- **Background Jobs:** BullMQ con motor Redis local y fallback automático en memoria si el servicio Redis no se encuentra activo.
- **Monorepo:** Turborepo + pnpm workspaces con tipado estricto extremo en TypeScript 5.7+.
`,
  },
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: "DEG / SDR",
    acronym: "DEG",
    category: "Finanzas & Seguro",
    standardOrg: "FMI",
    definition:
      "Derecho Especial de Giro (Special Drawing Right). Activo de reserva internacional creado por el FMI usado como unidad de cuenta para fijar límites de responsabilidad en convenios de transporte (CMR: 8,33 DEG/kg; Montreal: 22 DEG/kg; La Haya-Visby: 2 DEG/kg o 666,67 DEG/bulto).",
  },
  {
    term: "TEU",
    acronym: "TEU",
    category: "Marítimo",
    standardOrg: "ISO",
    definition:
      "Twenty-foot Equivalent Unit. Unidad de medida estándar de capacidad de carga marítima basada en el volumen de un contenedor ISO de 20 pies de longitud (aprox. 38,5 m³).",
  },
  {
    term: "FEU",
    acronym: "FEU",
    category: "Marítimo",
    standardOrg: "ISO",
    definition:
      "Forty-foot Equivalent Unit. Contenedor estándar de 40 pies, equivalente exactamente a 2 TEUs.",
  },
  {
    term: "DUA / SAD",
    acronym: "DUA",
    category: "Aduanas",
    standardOrg: "AEAT / UE",
    definition:
      "Documento Único Administrativo (Single Administrative Document). Formulario aduanero oficial de 54 casillas exigido para declaraciones de importación, exportación y tránsito.",
  },
  {
    term: "TARIC",
    acronym: "TARIC",
    category: "Aduanas",
    standardOrg: "Comisión Europea",
    definition:
      "Tarif Intégré Communautaire. Arancel aduanero integrado de la UE de 10 dígitos que codifica derechos arancelarios, medidas antidumping, cuotas y preferencias comerciales.",
  },
  {
    term: "VGM",
    acronym: "VGM",
    category: "Marítimo",
    standardOrg: "IMO SOLAS",
    definition:
      "Verified Gross Mass (Masa Bruta Verificada). Certificado obligatorio de pesaje del contenedor cerrado previo al embarque bajo la Enmienda VI/2 del Convenio SOLAS.",
  },
  {
    term: "BAF",
    acronym: "BAF",
    category: "Fletes & Recargos",
    standardOrg: "Navieras",
    definition:
      "Bunker Adjustment Factor. Recargo fluctuante en fletes marítimos que compensa las variaciones en el precio del combustible de los buques.",
  },
  {
    term: "THC",
    acronym: "THC",
    category: "Terminal Portuaria",
    standardOrg: "Puertos",
    definition:
      "Terminal Handling Charges. Gastos de manipulación portuaria aplicados por la estiba, movimiento y posicionamiento del contenedor en muelle.",
  },
  {
    term: "T3",
    acronym: "T3",
    category: "Tasas Portuarias",
    standardOrg: "Puertos del Estado (España)",
    definition:
      "Tasa de la mercancía aplicable por la Autoridad Portuaria en los puertos españoles por la entrada, estancia o salida marítima de cargas.",
  },
  {
    term: "OEA / AEO",
    acronym: "OEA",
    category: "Aduanas & Seguridad",
    standardOrg: "OMD / WCO",
    definition:
      "Operador Económico Autorizado (Authorized Economic Operator). Estatuto de confianza otorgado por autoridades aduaneras que garantiza simplificaciones y canales verdes.",
  },
  {
    term: "AWB / MAWB / HAWB",
    acronym: "AWB",
    category: "Aéreo",
    standardOrg: "IATA",
    definition:
      "Air Waybill. Carta de porte aéreo intransferible. MAWB (Master AWB emitida por la aerolínea) y HAWB (House AWB emitida por el transitario consolidador).",
  },
  {
    term: "DGR",
    acronym: "DGR",
    category: "Seguridad",
    standardOrg: "IATA / OACI",
    definition:
      "Dangerous Goods Regulations. Reglamentación sobre mercancías peligrosas para el transporte aéreo internacional, incluyendo baterías de litio y químicos.",
  },
  {
    term: "CMR",
    acronym: "CMR",
    category: "Carretera",
    standardOrg: "UNECE",
    definition:
      "Convenio relativo al Contrato de Transporte Internacional de Mercancías por Carretera de 1956 y la carta de porte que lo formaliza.",
  },
  {
    term: "BL / B/L",
    acronym: "BL",
    category: "Marítimo",
    standardOrg: "FIATA / BIMCO",
    definition:
      "Bill of Lading (Conocimiento de Embarque). Documento de transporte marítimo que representa título de propiedad, contrato de transporte y acuse de recibo de la carga.",
  },
  {
    term: "Demurrage",
    acronym: "Demurrage",
    category: "Costes Operativos",
    standardOrg: "Navieras",
    definition:
      "Penalización facturada por la naviera por el exceso de tiempo de un contenedor lleno depositado en la terminal portuaria por encima de los días libres acordados.",
  },
  {
    term: "Detention",
    acronym: "Detention",
    category: "Costes Operativos",
    standardOrg: "Navieras",
    definition:
      "Penalización facturada por la naviera cuando el contenedor vacío no es devuelto al depósito dentro del plazo de días libres tras la salida de muelle.",
  },
  {
    term: "CBAM",
    acronym: "CBAM",
    category: "Medioambiente & Aduanas",
    standardOrg: "Unión Europea",
    definition:
      "Carbon Border Adjustment Mechanism (Mecanismo de Ajuste en Frontera por Carbono). Tasa sobre emisiones de CO2e implícitas en importaciones a la UE de cemento, acero, aluminio y fertilizantes.",
  },
  {
    term: "GLEC Framework",
    acronym: "GLEC",
    category: "Sostenibilidad",
    standardOrg: "Smart Freight Centre",
    definition:
      "Global Logistics Emissions Council. Metodología globalmente reconocida para cuantificar y auditar las emisiones de gases de efecto invernadero en la cadena de transporte multimodal.",
  },
];

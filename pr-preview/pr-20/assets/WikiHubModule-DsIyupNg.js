import{t as e}from"./federation-runtime-BmagwIN4.js";import{A as t,C as n,Dn as r,Gt as i,I as a,T as o,Un as s,Vn as c,W as l,an as u,bn as d,g as f,gn as p,it as m,jt as h,kn as g,p as _,qt as v,un as y,z as b,zn as x}from"./lucide-icons-BYvWbBka.js";import{t as S}from"./Button-CHPflobF.js";import{n as C}from"./jspdf-vendor-D3jLoeqC.js";import{t as w}from"./react-core-DIn2POCk.js";var T=[{id:`GOVERNANCE_CORREDOR`,name:`Corredor Ferroviario Intermodal Portuario`,shortDescription:`Normativa operativa de Book TEST01, terminales de muelle, estiba 40' HC y roles.`,icon:`TrainTrack`,badgeColor:`emerald`},{id:`CUSTOMS_DUA`,name:`Despacho Aduanero & DUA 54`,shortDescription:`Estructura oficial del DUA/SAD, motor TARIC, cálculo tributario y OEA.`,icon:`ShieldCheck`,badgeColor:`blue`},{id:`INCOTERMS_CONTRACTS`,name:`Incoterms® 2020 & Valor Aduana`,shortDescription:`Matriz de costes y riesgos de 11 términos, CAU Arts. 70-74 y contratos bilingües.`,icon:`FileSignature`,badgeColor:`purple`},{id:`MARITIME_DEMURRAGE`,name:`Marítimo & Demurrage (D&D)`,shortDescription:`Control de cut-off, escalones de demoras, La Haya-Visby y pesaje VGM SOLAS.`,icon:`Ship`,badgeColor:`cyan`},{id:`AIR_CARGO_IATA`,name:`Carga Aérea & IATA e-Freight`,shortDescription:`Dígito Modulo-7, ratio volumétrico 1:6000, DGR baterías y Montreal 1999.`,icon:`Plane`,badgeColor:`amber`},{id:`ROAD_CMR`,name:`Carretera CMR & EN 12195`,shortDescription:`Límites de indemnización CMR (8,33 DEG), fuerzas dinámicas y estiba en camión.`,icon:`Truck`,badgeColor:`orange`},{id:`GLOSSARY`,name:`Glosario Internacional`,shortDescription:`Acrónimos, convenios y estándares globales (IATA, IMO, FIATA, AEAT, CAU).`,icon:`BookOpen`,badgeColor:`indigo`},{id:`ARCHITECTURE_ERP`,name:`Arquitectura Técnica Atlas`,shortDescription:`Monorepo Turborepo, Fastify 5, Drizzle ORM, libSQL local, BullMQ y PWA.`,icon:`Boxes`,badgeColor:`pink`}],E=[{id:`art-corredor-ferroviario-can-tunis`,slug:`corredor-ferroviario-can-tunis-normativa`,title:`Normativa Operativa del Corredor Oficial Book TEST01 (Barcelona DEPT-TEST01)`,category:`GOVERNANCE_CORREDOR`,tags:[`Terminal Intermodal`,`Book TEST01`,`BCN_RAIL_HUB`,`BCN_ZAL_HUB`,`VLC_MASSANASSA_HUB`,`Ferrocarril`,`CO2e`,`EN 12195`],readingTimeMinutes:6,author:`Systems & Operational Governance Lead`,lastUpdated:`2026-10-21`,officialRef:`RD 2822/1998 · CTU Code 2014 · EN 12195`,summary:`Directrices estrictas sobre flujo físico de bobinas, terminales de llenado, cálculo de CO2e y gobernanza de roles en el corredor de exportación.`,contentMarkdown:`
# Normativa Operativa del Corredor Oficial Book TEST01 (DEPT-TEST01)

Este documento fija la regulación técnica, operativa y de gobernanza de obligado cumplimiento para todo el flujo de exportación de papel en el corredor oficial de **Barcelona Intermodal Portuario**.

---

## 1. Cadena Física de Transporte y Almacenes Externos de Llenado

Las fábricas de producción de **Atlas Industrial Freight** en España expiden bobinas de papel hacia almacenes exteriores donde se realiza el llenado de contenedores marítimos:

1. **Expedición en Tren (Vagones Ferroviarios Completos):**
   - Destino exclusivo: **BCN_RAIL_HUB** (Terminal Intermodal Ferroviaria Portuaria, Barcelona).
   - Es el **ÚNICO almacén con infraestructura y espuela ferroviaria activa** capacitado para descargar trenes completos.
   - Aplica un **76,9% de ahorro certificado en CO2e** ($0,018\\text{ kg CO}_2\\text{e/t}\\cdot\\text{km}$ frente a $0,078\\text{ kg CO}_2\\text{e/t}\\cdot\\text{km}$ en camión Euro VI).
2. **Expedición en Camión-Lona (Carretera):**
   - Destinos autorizados: **BCN_ZAL_HUB** (Hub Logístico ZAL Prat, Barcelona), **VLC_MASSANASSA_HUB** (Centro Intermodal Massanassa, Valencia) o excepcionalmente BCN_RAIL_HUB ante contingencias.
   - Identificador detectado por matrícula de carretera (4 dígitos + 3 letras, e.g. \`4821-LXZ\`, o prefijo de semirremolque \`R-\`).
3. **Llenado y Precintado de Contenedores 40' High Cube (HC):**
   - El llenado, trincaje y precintado oficial de los contenedores marítimos se realiza **SIEMPRE en los almacenes externos** (BCN_RAIL_HUB, BCN_ZAL_HUB o VLC_MASSANASSA_HUB).
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
  - Liderazgo operativo del equipo de Barcelona Intermodal.
  - Responsable exclusivo de la asignación operativa de contenedores, expedientes de muelle, resolución de incidencias y disputas D&D.
- **TEST02 (Operations Manager / Department Manager):**
  - Dirección y supervisión ejecutiva departamental.
  - **Queda expresamente excluida de recibir o autoasignarse tareas operativas tácticas** (expedientes, albaranes, bobinas o muelles) en el día a día.
- **Exclusión Adicional:**
  - Nunca incluir asignaciones para \`RESTRICTED_OPERATOR\` en ningún flujo de trabajo ni prueba.
`},{id:`art-customs-dua-54-casillas`,slug:`guia-casillas-dua-sad-54`,title:`Guía Integral de Despacho Aduanero: Las 54 Casillas del DUA / SAD`,category:`CUSTOMS_DUA`,tags:[`DUA`,`SAD`,`Aduanas`,`TARIC`,`Casilla 46`,`Casilla 47`,`CAU`,`AEAT`],readingTimeMinutes:8,author:`Customs & Trade Compliance Specialist`,lastUpdated:`2026-10-18`,officialRef:`Reglamento (UE) 952/2013 (CAU) · Resolución DUA AEAT`,summary:`Manual exhaustivo de declaración aduanera comunitaria: campos obligatorios, cálculo de valor estadístico y liquidación tributaria.`,contentMarkdown:`
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
`},{id:`art-incoterms-2020-matrix`,slug:`matriz-incoterms-2020-reglas-oro`,title:`Matriz Oficial Incoterms® 2020 y Buenas Prácticas de Contratación`,category:`INCOTERMS_CONTRACTS`,tags:[`Incoterms`,`ICC 2020`,`FCA`,`FOB`,`CIP`,`CIF`,`Transferencia Riesgo`],readingTimeMinutes:7,author:`International Trade & Legal Counsel`,lastUpdated:`2026-10-15`,officialRef:`Cámara de Comercio Internacional (ICC) Pub. Nº 723E`,summary:`Comparativa de los 11 términos oficiales de la ICC, asignación de costes y la regla de oro para transporte contenerizado.`,contentMarkdown:`
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
`},{id:`art-demurrage-detention-storage`,slug:`demurrage-detention-storage-arbitraje`,title:`Control de Demurrage, Detention y Storage: Tiempos Libres y Disputas`,category:`MARITIME_DEMURRAGE`,tags:[`Demurrage`,`Detention`,`Storage`,`D&D`,`Navieras`,`Días Libres`,`Costes`],readingTimeMinutes:6,author:`Maritime Operations & Claims Manager`,lastUpdated:`2026-10-12`,officialRef:`BIMCO D&D Standard Clauses · Convenio FMC`,summary:`Distinción conceptual entre demoras, retenciones y ocupaciones portuarias, cálculo de escalones tarifarios y protocolos de disputa.`,contentMarkdown:`
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
`},{id:`art-iata-modulo7-chargeable-weight`,slug:`iata-modulo-7-peso-tasable-volumetrico`,title:`Carga Aérea IATA: Algoritmo Modulo-7 y Ratio Volumétrico 1:6000`,category:`AIR_CARGO_IATA`,tags:[`IATA`,`e-AWB`,`Modulo-7`,`Peso Tasable`,`1:6000`,`Baterías Litio`,`DGR`],readingTimeMinutes:5,author:`IATA Cargo & Airfreight Operations Lead`,lastUpdated:`2026-10-10`,officialRef:`IATA Cargo Services Conference Resolution 600a`,summary:`Verificación matemática de cartas de porte aéreo (AWB), cálculo de peso tarifario y normativas de seguridad para mercancías peligrosas.`,contentMarkdown:`
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
`},{id:`art-cmr-road-freight-indemnity`,slug:`convenio-cmr-responsabilidad-carretera`,title:`Transporte Terrestre: Convenio CMR y Límite Indemnizatorio de 8,33 DEG`,category:`ROAD_CMR`,tags:[`CMR`,`Carretera`,`DEG`,`SDR`,`Siniestros`,`EN 12195`],readingTimeMinutes:5,author:`Legal & Road Claims Counsel`,lastUpdated:`2026-10-08`,officialRef:`Convenio CMR de 1956 · Protocolo de Ginebra de 1978`,summary:`Régimen de responsabilidad del porteador por carretera, límites estatutarios por pérdida o avería y cálculo en Derechos Especiales de Giro.`,contentMarkdown:`
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
`},{id:`art-atlas-zero-cost-architecture`,slug:`arquitectura-tecnica-zero-cost-local`,title:`Arquitectura de Coste Cero ($0) y Resiliencia Local de Atlas Logistics`,category:`ARCHITECTURE_ERP`,tags:[`Arquitectura`,`Fastify`,`Drizzle ORM`,`libSQL`,`BullMQ`,`PWA`,`Turborepo`],readingTimeMinutes:6,author:`Principal Software Architect`,lastUpdated:`2026-10-21`,officialRef:`ADR-0004 Zero-Cost Local Architecture`,summary:`Principios de diseño, componentes embebidos de máximo rendimiento y funcionamiento offline de la suite Atlas Logistics.`,contentMarkdown:`
# Arquitectura de Coste Cero ($0) y Resiliencia Local de Atlas Logistics

Atlas Logistics fue concebido para operar con **coste operativo cero de nube**, garantizando máxima privacidad de datos, latencia de milisegundos y operatividad ininterrumpida.

---

## 1. Pila Tecnológica Embebida

\`\`\`mermaid
flowchart TD
    Client["PWA React 19 Host
(packages/frontend :3100)"]
    API["Fastify 5 API Gateway
(src/server.ts :3001)"]
    DB[("libSQL / SQLite local
atlas.db + Drizzle ORM")]
    Queue["BullMQ + Redis
(Fallback en Memoria)"]
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
`}],D=[{term:`DEG / SDR`,acronym:`DEG`,category:`Finanzas & Seguro`,standardOrg:`FMI`,definition:`Derecho Especial de Giro (Special Drawing Right). Activo de reserva internacional creado por el FMI usado como unidad de cuenta para fijar límites de responsabilidad en convenios de transporte (CMR: 8,33 DEG/kg; Montreal: 22 DEG/kg; La Haya-Visby: 2 DEG/kg o 666,67 DEG/bulto).`},{term:`TEU`,acronym:`TEU`,category:`Marítimo`,standardOrg:`ISO`,definition:`Twenty-foot Equivalent Unit. Unidad de medida estándar de capacidad de carga marítima basada en el volumen de un contenedor ISO de 20 pies de longitud (aprox. 38,5 m³).`},{term:`FEU`,acronym:`FEU`,category:`Marítimo`,standardOrg:`ISO`,definition:`Forty-foot Equivalent Unit. Contenedor estándar de 40 pies, equivalente exactamente a 2 TEUs.`},{term:`DUA / SAD`,acronym:`DUA`,category:`Aduanas`,standardOrg:`AEAT / UE`,definition:`Documento Único Administrativo (Single Administrative Document). Formulario aduanero oficial de 54 casillas exigido para declaraciones de importación, exportación y tránsito.`},{term:`TARIC`,acronym:`TARIC`,category:`Aduanas`,standardOrg:`Comisión Europea`,definition:`Tarif Intégré Communautaire. Arancel aduanero integrado de la UE de 10 dígitos que codifica derechos arancelarios, medidas antidumping, cuotas y preferencias comerciales.`},{term:`VGM`,acronym:`VGM`,category:`Marítimo`,standardOrg:`IMO SOLAS`,definition:`Verified Gross Mass (Masa Bruta Verificada). Certificado obligatorio de pesaje del contenedor cerrado previo al embarque bajo la Enmienda VI/2 del Convenio SOLAS.`},{term:`BAF`,acronym:`BAF`,category:`Fletes & Recargos`,standardOrg:`Navieras`,definition:`Bunker Adjustment Factor. Recargo fluctuante en fletes marítimos que compensa las variaciones en el precio del combustible de los buques.`},{term:`THC`,acronym:`THC`,category:`Terminal Portuaria`,standardOrg:`Puertos`,definition:`Terminal Handling Charges. Gastos de manipulación portuaria aplicados por la estiba, movimiento y posicionamiento del contenedor en muelle.`},{term:`T3`,acronym:`T3`,category:`Tasas Portuarias`,standardOrg:`Puertos del Estado (España)`,definition:`Tasa de la mercancía aplicable por la Autoridad Portuaria en los puertos españoles por la entrada, estancia o salida marítima de cargas.`},{term:`OEA / AEO`,acronym:`OEA`,category:`Aduanas & Seguridad`,standardOrg:`OMD / WCO`,definition:`Operador Económico Autorizado (Authorized Economic Operator). Estatuto de confianza otorgado por autoridades aduaneras que garantiza simplificaciones y canales verdes.`},{term:`AWB / MAWB / HAWB`,acronym:`AWB`,category:`Aéreo`,standardOrg:`IATA`,definition:`Air Waybill. Carta de porte aéreo intransferible. MAWB (Master AWB emitida por la aerolínea) y HAWB (House AWB emitida por el transitario consolidador).`},{term:`DGR`,acronym:`DGR`,category:`Seguridad`,standardOrg:`IATA / OACI`,definition:`Dangerous Goods Regulations. Reglamentación sobre mercancías peligrosas para el transporte aéreo internacional, incluyendo baterías de litio y químicos.`},{term:`CMR`,acronym:`CMR`,category:`Carretera`,standardOrg:`UNECE`,definition:`Convenio relativo al Contrato de Transporte Internacional de Mercancías por Carretera de 1956 y la carta de porte que lo formaliza.`},{term:`BL / B/L`,acronym:`BL`,category:`Marítimo`,standardOrg:`FIATA / BIMCO`,definition:`Bill of Lading (Conocimiento de Embarque). Documento de transporte marítimo que representa título de propiedad, contrato de transporte y acuse de recibo de la carga.`},{term:`Demurrage`,acronym:`Demurrage`,category:`Costes Operativos`,standardOrg:`Navieras`,definition:`Penalización facturada por la naviera por el exceso de tiempo de un contenedor lleno depositado en la terminal portuaria por encima de los días libres acordados.`},{term:`Detention`,acronym:`Detention`,category:`Costes Operativos`,standardOrg:`Navieras`,definition:`Penalización facturada por la naviera cuando el contenedor vacío no es devuelto al depósito dentro del plazo de días libres tras la salida de muelle.`},{term:`CBAM`,acronym:`CBAM`,category:`Medioambiente & Aduanas`,standardOrg:`Unión Europea`,definition:`Carbon Border Adjustment Mechanism (Mecanismo de Ajuste en Frontera por Carbono). Tasa sobre emisiones de CO2e implícitas en importaciones a la UE de cemento, acero, aluminio y fertilizantes.`},{term:`GLEC Framework`,acronym:`GLEC`,category:`Sostenibilidad`,standardOrg:`Smart Freight Centre`,definition:`Global Logistics Emissions Council. Metodología globalmente reconocida para cuantificar y auditar las emisiones de gases de efecto invernadero en la cadena de transporte multimodal.`}],O=class{static getAllArticles(){return E}static getArticleBySlug(e){return E.find(t=>t.slug===e||t.id===e)}static getCategories(){return T.map(e=>({...e,articleCount:E.filter(t=>t.category===e.id).length}))}static search(e,t){let n=e.trim().toLowerCase(),r=E;if(t&&t!==`ALL`&&(r=r.filter(e=>e.category===t)),!n)return r.map(e=>({article:e,matchedField:`title`,snippet:e.summary,score:1}));let i=[];for(let e of r){let t=0,r=`summary`,a=e.summary,o=e.title.toLowerCase(),s=e.summary.toLowerCase(),c=e.tags.join(` `).toLowerCase(),l=e.contentMarkdown.toLowerCase();if(o.includes(n))t+=100,r=`title`,a=e.title;else if(c.includes(n))t+=60,r=`tags`,a=`Tags: ${e.tags.filter(e=>e.toLowerCase().includes(n)).join(`, `)}`;else if(s.includes(n))t+=40,r=`summary`,a=e.summary;else if(l.includes(n)){t+=20,r=`content`;let i=l.indexOf(n),o=Math.max(0,i-40),s=Math.min(l.length,i+n.length+60);a=`...${e.contentMarkdown.substring(o,s).replace(/\n/g,` `)}...`}t>0&&i.push({article:e,matchedField:r,snippet:a,score:t})}return i.sort((e,t)=>t.score-e.score)}static getRelatedArticles(e,t=3){let n=E.find(t=>t.id===e||t.slug===e);return n?E.filter(e=>e.id!==n.id).map(e=>{let t=0;e.category===n.category&&(t+=5);let r=e.tags.filter(e=>n.tags.includes(e)).length;return t+=r*2,{article:e,affinity:t}}).sort((e,t)=>t.affinity-e.affinity).slice(0,t).map(e=>e.article):[]}static getGlossary(e){if(!e||!e.trim())return D.sort((e,t)=>e.term.localeCompare(t.term));let t=e.trim().toLowerCase();return D.filter(e=>e.term.toLowerCase().includes(t)||e.acronym&&e.acronym.toLowerCase().includes(t)||e.definition.toLowerCase().includes(t)||e.category.toLowerCase().includes(t)).sort((e,t)=>e.term.localeCompare(t.term))}},k=w(),A=await e(`react`),{useState:j,useMemo:M,useEffect:N}=A,P={GOVERNANCE_CORREDOR:n,CUSTOMS_DUA:b,INCOTERMS_CONTRACTS:v,MARITIME_DEMURRAGE:a,AIR_CARGO_IATA:m,ROAD_CMR:f,GLOSSARY:s,ARCHITECTURE_ERP:x};function F(){let[e,n]=j(``),[a,f]=j(`ALL`),[m,v]=j(`corredor-ferroviario-can-tunis-normativa`),[b,x]=j(`ARTICLES`),[w,T]=j(!1);N(()=>{let e=e=>{if((e.ctrlKey||e.metaKey)&&e.key===`k`){e.preventDefault();let t=document.getElementById(`wiki-search-input`);t&&t.focus()}};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[]);let E=M(()=>O.getCategories(),[]),D=M(()=>O.search(e,a),[e,a]),F=M(()=>O.getArticleBySlug(m)||D[0]?.article||O.getAllArticles()[0],[m,D]),I=M(()=>F?O.getRelatedArticles(F.id,3):[],[F]),L=M(()=>O.getGlossary(e),[e]),R=e=>{let t=new C({orientation:`portrait`,unit:`mm`,format:`a4`});t.setFillColor(15,23,42),t.rect(0,0,210,35,`F`),t.setTextColor(255,255,255),t.setFontSize(18),t.setFont(`helvetica`,`bold`),t.text(`ATLAS LOGISTICS · KNOWLEDGE HUB`,14,15),t.setFontSize(10),t.setFont(`helvetica`,`normal`),t.setTextColor(148,163,184),t.text(`Categoría: ${e.category}  |  Actualizado: ${e.lastUpdated}  |  Tiempo lectura: ${e.readingTimeMinutes} min`,14,23),e.officialRef&&t.text(`Norma Oficial de Referencia: ${e.officialRef}`,14,29),t.setTextColor(15,23,42),t.setFontSize(15),t.setFont(`helvetica`,`bold`);let n=t.splitTextToSize(e.title,180);t.text(n,14,46),t.setFillColor(241,245,249),t.roundedRect(14,55,182,22,2,2,`F`),t.setFontSize(9),t.setFont(`helvetica`,`italic`),t.setTextColor(51,65,85);let r=t.splitTextToSize(`Resumen Ejecutivo: ${e.summary}`,174);t.text(r,18,62),t.setFont(`helvetica`,`normal`),t.setFontSize(9),t.setTextColor(30,41,59);let i=e.contentMarkdown.split(`
`).map(e=>e.replace(/^#+\s*/,``).replace(/\*\*/g,``).replace(/\$/g,``).trim()).filter(e=>e.length>0&&!e.startsWith("```")&&!e.startsWith(`---`)),a=85;for(let e of i){a>275&&(t.addPage(),a=20);let n=t.splitTextToSize(e,182);t.text(n,14,a),a+=n.length*4.5+2}let o=t.getNumberOfPages();for(let e=1;e<=o;e++)t.setPage(e),t.setFontSize(8),t.setTextColor(148,163,184),t.text(`Atlas Logistics PWA · Corredor Oficial Book TEST01 · Página ${e} de ${o}`,14,290);t.save(`Atlas-Wiki-${e.slug}.pdf`)},z=()=>{navigator.clipboard.writeText(window.location.origin+window.location.pathname+`#${F.slug}`),T(!0),setTimeout(()=>T(!1),2e3)},B=e=>{let t=e.split(`
`);return(0,k.jsx)(`div`,{className:`space-y-4 text-slate-300 leading-relaxed font-sans`,children:t.map((e,t)=>{let n=e.trim();if(n.startsWith(`# `))return(0,k.jsx)(`h1`,{className:`text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 mt-6 mb-3 border-b border-slate-800 pb-3`,children:n.replace(`# `,``)},t);if(n.startsWith(`## `))return(0,k.jsx)(`h2`,{className:`text-xl font-bold text-white mt-6 mb-2 flex items-center gap-2 border-l-4 border-indigo-500 pl-3`,children:n.replace(`## `,``)},t);if(n.startsWith(`### `))return(0,k.jsx)(`h3`,{className:`text-base font-semibold text-indigo-300 mt-4 mb-1`,children:n.replace(`### `,``)},t);if(n.startsWith(`> [!WARNING]`))return(0,k.jsx)(`div`,{className:`p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex gap-3 my-3`,children:(0,k.jsx)(`div`,{className:`shrink-0 font-bold uppercase tracking-wider text-xs bg-amber-500/20 px-2 py-1 rounded`,children:`Aviso Crítico`})},t);if(n===`---`)return(0,k.jsx)(`hr`,{className:`border-slate-800 my-4`},t);if(n.startsWith(`- `)){let e=n.replace(`- `,``);return(0,k.jsx)(`li`,{className:`ml-5 list-disc text-sm text-slate-300 marker:text-indigo-400`,children:(0,k.jsx)(`span`,{children:V(e)})},t)}if(/^\d+\.\s/.test(n)){let e=n.match(/^(\d+\.)\s*(.*)$/);if(e)return(0,k.jsxs)(`div`,{className:`flex gap-2 text-sm ml-2`,children:[(0,k.jsx)(`span`,{className:`font-bold text-indigo-400 shrink-0`,children:e[1]}),(0,k.jsx)(`span`,{children:V(e[2])})]},t)}return n.length>0?(0,k.jsx)(`p`,{className:`text-sm text-slate-300`,children:V(n)},t):null})})},V=e=>e.split(/(\*\*[^*]+\*\*|`[^`]+`|\$\$[^$]+\$\$|\$[^$]+\$)/g).map((e,t)=>e.startsWith(`**`)&&e.endsWith(`**`)&&e.length>4?(0,k.jsx)(`strong`,{className:`text-white font-semibold`,children:e.slice(2,-2)},t):e.startsWith("`")&&e.endsWith("`")&&e.length>2?(0,k.jsx)(`code`,{className:`px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs border border-slate-700`,children:e.slice(1,-1)},t):e.startsWith(`$$`)&&e.endsWith(`$$`)&&e.length>4?(0,k.jsx)(`span`,{className:`inline-block px-2 py-1 rounded bg-indigo-950/50 text-indigo-200 border border-indigo-800/60 font-mono text-xs my-1`,children:e.slice(2,-2)},t):e.startsWith(`$`)&&e.endsWith(`$`)&&e.length>2?(0,k.jsx)(`span`,{className:`px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-200 font-mono text-xs`,children:e.slice(1,-1)},t):(0,k.jsx)(A.Fragment,{children:e},t));return(0,k.jsxs)(`div`,{className:`p-4 md:p-8 max-w-[1700px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 space-y-6`,children:[(0,k.jsxs)(`div`,{className:`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl`,children:[(0,k.jsx)(`div`,{className:`absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none`}),(0,k.jsxs)(`div`,{className:`relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6`,children:[(0,k.jsxs)(`div`,{children:[(0,k.jsxs)(`div`,{className:`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3`,children:[(0,k.jsx)(t,{size:14,className:`text-indigo-400`}),`Atlas Logistics PWA · Knowledge Base & Wiki`]}),(0,k.jsx)(`h1`,{className:`text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight`,children:`Enciclopedia Logística & Normativa Operativa`}),(0,k.jsx)(`p`,{className:`text-sm md:text-base text-slate-400 max-w-2xl mt-1`,children:`Manuales de estiba 40' HC, cálculo DUA 54 Casillas, Incoterms® 2020, IATA e-Freight, Corredor Oficial Book TEST01 y glosario internacional.`})]}),(0,k.jsxs)(`div`,{className:`flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shrink-0 self-start md:self-auto`,children:[(0,k.jsxs)(`button`,{onClick:()=>x(`ARTICLES`),className:`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${b===`ARTICLES`?`bg-indigo-600 text-white shadow-lg shadow-indigo-600/30`:`text-slate-400 hover:text-white`}`,children:[(0,k.jsx)(i,{size:16}),`Manuales & Normativas (`,O.getAllArticles().length,`)`]}),(0,k.jsxs)(`button`,{onClick:()=>x(`GLOSSARY`),className:`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${b===`GLOSSARY`?`bg-indigo-600 text-white shadow-lg shadow-indigo-600/30`:`text-slate-400 hover:text-white`}`,children:[(0,k.jsx)(s,{size:16}),`Glosario A-Z (`,L.length,`)`]})]})]}),(0,k.jsx)(`div`,{className:`mt-6 relative max-w-3xl`,children:(0,k.jsxs)(`div`,{className:`relative flex items-center`,children:[(0,k.jsx)(l,{className:`absolute left-4 text-slate-400 pointer-events-none`,size:20}),(0,k.jsx)(`input`,{id:`wiki-search-input`,type:`text`,value:e,onChange:e=>n(e.target.value),placeholder:`Buscar por término, casilla DUA, peso legal, norma Incoterm, o código IATA... (Presiona Ctrl+K)`,className:`w-full pl-12 pr-28 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner`}),e&&(0,k.jsx)(`button`,{onClick:()=>n(``),className:`absolute right-14 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded`,children:`Limpiar`}),(0,k.jsx)(`kbd`,{className:`absolute right-3.5 hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded-md`,children:`Ctrl K`})]})})]}),b===`ARTICLES`?(0,k.jsxs)(`div`,{className:`grid grid-cols-1 lg:grid-cols-12 gap-6`,children:[(0,k.jsxs)(`div`,{className:`lg:col-span-4 space-y-6`,children:[(0,k.jsxs)(`div`,{className:`bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md`,children:[(0,k.jsxs)(`div`,{className:`flex items-center justify-between mb-3`,children:[(0,k.jsxs)(`span`,{className:`text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5`,children:[(0,k.jsx)(h,{size:14,className:`text-indigo-400`}),`Categorías de Conocimiento`]}),a!==`ALL`&&(0,k.jsx)(`button`,{onClick:()=>f(`ALL`),className:`text-xs text-indigo-400 hover:underline`,children:`Ver todas`})]}),(0,k.jsxs)(`div`,{className:`flex flex-wrap gap-1.5`,children:[(0,k.jsxs)(`button`,{onClick:()=>f(`ALL`),className:`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${a===`ALL`?`bg-indigo-600 text-white`:`bg-slate-800/80 text-slate-300 hover:bg-slate-800`}`,children:[`Todas (`,O.getAllArticles().length,`)`]}),E.map(e=>{let t=P[e.id]||s,n=a===e.id;return(0,k.jsxs)(`button`,{onClick:()=>f(e.id),className:`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${n?`bg-indigo-600 text-white shadow-md shadow-indigo-600/30`:`bg-slate-800/60 text-slate-300 hover:bg-slate-800`}`,children:[(0,k.jsx)(t,{size:13,className:n?`text-white`:`text-indigo-400`}),(0,k.jsx)(`span`,{children:e.name}),(0,k.jsx)(`span`,{className:`text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 text-slate-400 font-mono`,children:e.articleCount})]},e.id)})]})]}),(0,k.jsxs)(`div`,{className:`bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md space-y-3`,children:[(0,k.jsxs)(`div`,{className:`flex items-center justify-between text-xs text-slate-400 font-semibold px-1`,children:[(0,k.jsxs)(`span`,{children:[`Documentos Encontrados (`,D.length,`)`]}),e&&(0,k.jsxs)(`span`,{className:`text-indigo-400 font-mono`,children:[`"`,e,`"`]})]}),D.length===0?(0,k.jsxs)(`div`,{className:`p-8 text-center text-slate-500 text-sm`,children:[(0,k.jsx)(d,{size:32,className:`mx-auto mb-2 text-slate-600`}),`No se han encontrado artículos que coincidan con la búsqueda.`]}):(0,k.jsx)(`div`,{className:`space-y-2 max-h-[600px] overflow-y-auto pr-1`,children:D.map(({article:e,snippet:t})=>{let n=F?.id===e.id,r=P[e.category]||s;return(0,k.jsxs)(`div`,{onClick:()=>v(e.slug),className:`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${n?`bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10`:`bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700`}`,children:[(0,k.jsxs)(`div`,{className:`flex items-center justify-between gap-2 mb-1.5`,children:[(0,k.jsxs)(`span`,{className:`inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400`,children:[(0,k.jsx)(r,{size:12}),e.category.replace(/_/g,` `)]}),(0,k.jsxs)(`span`,{className:`text-[10px] text-slate-500 flex items-center gap-1 font-mono`,children:[(0,k.jsx)(p,{size:10}),e.readingTimeMinutes,` min`]})]}),(0,k.jsx)(`h4`,{className:`text-sm font-bold line-clamp-2 ${n?`text-white`:`text-slate-200`}`,children:e.title}),(0,k.jsx)(`p`,{className:`text-xs text-slate-400 line-clamp-2 mt-1`,children:t||e.summary})]},e.id)})})]})]}),(0,k.jsx)(`div`,{className:`lg:col-span-8`,children:F?(0,k.jsxs)(`div`,{className:`bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6`,children:[(0,k.jsxs)(`div`,{className:`flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800 pb-6`,children:[(0,k.jsxs)(`div`,{className:`space-y-2`,children:[(0,k.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,k.jsx)(`span`,{className:`px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold text-xs uppercase tracking-wider`,children:F.category.replace(/_/g,` `)}),F.officialRef&&(0,k.jsx)(`span`,{className:`px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs`,children:F.officialRef})]}),(0,k.jsx)(`h2`,{className:`text-2xl md:text-3xl font-black text-white leading-tight`,children:F.title}),(0,k.jsxs)(`div`,{className:`flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono`,children:[(0,k.jsxs)(`span`,{className:`flex items-center gap-1.5`,children:[(0,k.jsx)(_,{size:13,className:`text-slate-500`}),F.author]}),(0,k.jsxs)(`span`,{className:`flex items-center gap-1.5`,children:[(0,k.jsx)(p,{size:13,className:`text-slate-500`}),`Lectura: `,F.readingTimeMinutes,` minutos`]}),(0,k.jsxs)(`span`,{children:[`Actualizado: `,F.lastUpdated]})]})]}),(0,k.jsxs)(`div`,{className:`flex items-center gap-2 shrink-0`,children:[(0,k.jsxs)(S,{variant:`outline`,size:`sm`,onClick:()=>R(F),className:`border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5`,children:[(0,k.jsx)(u,{size:14}),`Exportar PDF`]}),(0,k.jsxs)(S,{variant:`outline`,size:`sm`,onClick:z,className:`border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5`,children:[w?(0,k.jsx)(g,{size:14,className:`text-emerald-400`}):(0,k.jsx)(y,{size:14}),w?`Copiado`:`Enlace`]})]})]}),(0,k.jsxs)(`div`,{className:`flex flex-wrap items-center gap-1.5`,children:[(0,k.jsx)(o,{size:13,className:`text-slate-500 mr-1`}),F.tags.map(e=>(0,k.jsxs)(`span`,{onClick:()=>n(e),className:`px-2 py-0.5 rounded bg-slate-800/70 border border-slate-700 text-slate-300 text-xs font-mono hover:border-indigo-500 cursor-pointer transition-colors`,children:[`#`,e]},e))]}),(0,k.jsxs)(`div`,{className:`p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-200 text-sm leading-relaxed`,children:[(0,k.jsx)(`strong`,{className:`text-white block mb-1`,children:`Resumen Ejecutivo:`}),F.summary]}),(0,k.jsx)(`div`,{className:`pt-2`,children:B(F.contentMarkdown)}),I.length>0&&(0,k.jsxs)(`div`,{className:`mt-12 pt-6 border-t border-slate-800`,children:[(0,k.jsxs)(`h3`,{className:`text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5`,children:[(0,k.jsx)(c,{size:16,className:`text-indigo-400`}),`Artículos y Normativas Relacionadas`]}),(0,k.jsx)(`div`,{className:`grid grid-cols-1 md:grid-cols-3 gap-3`,children:I.map(e=>(0,k.jsxs)(`div`,{onClick:()=>v(e.slug),className:`p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500 hover:bg-slate-800/40 cursor-pointer transition-all`,children:[(0,k.jsx)(`span`,{className:`text-[10px] font-semibold text-indigo-400 uppercase`,children:e.category.replace(/_/g,` `)}),(0,k.jsx)(`h5`,{className:`text-xs font-bold text-white line-clamp-2 mt-1`,children:e.title}),(0,k.jsxs)(`div`,{className:`flex items-center gap-1 text-[10px] text-slate-400 mt-2 font-mono`,children:[(0,k.jsx)(`span`,{children:`Leer artículo`}),(0,k.jsx)(r,{size:12})]})]},e.id))})]})]}):(0,k.jsx)(`div`,{className:`p-12 text-center text-slate-500`,children:`Selecciona un artículo del panel izquierdo para comenzar a leer.`})})]}):(0,k.jsxs)(`div`,{className:`space-y-4`,children:[(0,k.jsx)(`div`,{className:`flex items-center justify-between`,children:(0,k.jsxs)(`span`,{className:`text-xs font-bold uppercase tracking-wider text-slate-400`,children:[`Términos Oficiales & Acrónimos de Comercio Internacional (`,L.length,`)`]})}),(0,k.jsx)(`div`,{className:`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`,children:L.map(e=>(0,k.jsx)(`div`,{className:`p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all backdrop-blur-md flex flex-col justify-between`,children:(0,k.jsxs)(`div`,{children:[(0,k.jsxs)(`div`,{className:`flex items-center justify-between gap-2 mb-2`,children:[(0,k.jsx)(`span`,{className:`text-base font-black text-white tracking-wide`,children:e.term}),e.standardOrg&&(0,k.jsx)(`span`,{className:`px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-semibold`,children:e.standardOrg})]}),(0,k.jsx)(`span`,{className:`inline-block text-[11px] text-slate-400 font-medium mb-3`,children:e.category}),(0,k.jsx)(`p`,{className:`text-xs text-slate-300 leading-relaxed`,children:e.definition})]})},e.term))})]})]})}export{F as default};
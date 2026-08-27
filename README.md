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

### 7. 🏭 Gestión de Almacén & Gemelo Digital 3D
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
# Suite completa Vitest (30 archivos, 135 tests unitarios e integrados)
pnpm test

# Pruebas End-to-End con Playwright
npx playwright test
```

---

## 📄 Licencia

Este proyecto está licenciado bajo los términos de la Licencia MIT.

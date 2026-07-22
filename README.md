# Atlas Logistics 🌍🚢

Atlas Logistics es una **Super-App integral de Gestión de Cadena de Suministro (SCM)**. Proporciona herramientas avanzadas para transitarios, operadores logísticos y líneas navieras, centralizando cotizaciones de fletes, gestión de embarques marítimos/aéreos, automatización de procesos de negocio con Camunda 8 (Zeebe) e inteligencia predictiva.

![Atlas Logistics Status](https://img.shields.io/badge/Status-Active-success) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue) ![pnpm](https://img.shields.io/badge/pnpm-v10-orange) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🌟 Módulos y Funcionalidades (Suite SCM ERP)

Atlas Logistics cubre todo el ciclo de vida operativo de un embarque y la facturación de un freight forwarder:

### 📦 Operaciones Núcleo
- **Sailing Schedules**: Buscador de rutas marítimas y control de fechas de corte.
- **Booking & B/L**: Emisión de HBL/MBL y tablero Kanban de reservas.
- **Rate Comparer (`@atlas/rate-comparer`)**: Comparación dinámica de tarifas marítimas y aéreas.
- **BPMN Modeler (`@atlas/bpmn-modeler`)**: Diseñador visual integrado de procesos BPMN 2.0 (Camunda).

### ⚖️ Finanzas y Cumplimiento
- **Customs Clearance**: Seguimiento de DUA, semáforo aduanero y validaciones de código HS.
- **Facturación y Liquidación**: Reconciliación A/R, A/P y análisis de rentabilidad.

### 🌐 Vista Externa y Cliente
- **Customer Portal**: Portal marca blanca para que los clientes rastreen sus cargas y descarguen documentación en tiempo real.

---

## 🏗️ Estructura del Monorepo

```text
Atlas-Logistics/
├── camunda-config/         # Diagramas BPMN, DMN y Formularios agrupados por dominio
│   ├── apps/               # Paquetes zip desplegables por aplicación
│   └── (core, customs, claims, quoting, tracking, warehouse)
├── packages/               # Paquetes del monorepo (Workspaces pnpm)
│   ├── frontend/           # PWA Host principal (React 19 + Vite + Code Splitting)
│   ├── dashboard/          # Módulo operacional y vistas analíticas
│   ├── rate-comparer/      # Motor de comparación de tarifas marítimas y aéreas
│   ├── bpmn-modeler/       # Diseñador visual BPMN integrado
│   ├── ui/                 # Sistema de diseño, componentes UI y temas
│   └── shared/             # Tipos TypeScript, esquemas Zod y utilidades compartidas
├── scripts/                # Scripts de utilidad (deploy-bpmn, seed, etc.)
├── src/                    # API Server Express, Zeebe Workers y conectores DB
│   ├── bpm/workers/        # Job Workers Zeebe organizados por dominio
│   └── pubsub-workers/     # Procesadores asíncronos en segundo plano (PubSub)
└── e2e/                    # Pruebas End-to-End integradas con Playwright
```

---

## 🚀 Inicio Rápido (Desarrollo Local)

### Requisitos Previos
- **Node.js**: >= 20.0
- **pnpm**: v10+

### Instalación y Ejecución

1. Clonar el repositorio e instalar dependencias:
```bash
git clone https://github.com/xpallares1987-ai/Atlas-Logistics.git
cd Atlas-Logistics
pnpm install
```

2. Ejecutar la compilación del monorepo:
```bash
pnpm run build
```

3. Iniciar el servidor de desarrollo local:
```bash
pnpm run dev
```

4. Ejecutar la suite de pruebas unitarias y E2E:
```bash
# Pruebas unitarias en paquetes compartidos
pnpm --filter @atlas/shared test

# Pruebas End-to-End con Playwright
npx playwright test
```

---

## ⚙️ Despliegue de Procesos Camunda 8

Para desplegar recursivamente los diagramas BPMN, tablas DMN y formularios a Camunda SaaS:

```bash
npx tsx scripts/deploy-bpmn.ts
```

---

## 📖 Documentación Adicional
- [Arquitectura del Sistema (docs/architecture/system-architecture.md)](docs/architecture/system-architecture.md)
- [SCM Vision](SCM_VISION.md)
- [Guía de Contribución](CONTRIBUTING.md)
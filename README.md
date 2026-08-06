# Atlas Logistics 🌍🚢

Atlas Logistics es una **Super-App integral de Gestión de Cadena de Suministro (SCM)**. Proporciona herramientas avanzadas para transitarios, operadores logísticos y líneas navieras, centralizando cotizaciones de fletes, gestión de embarques marítimos/aéreos, automatización de procesos de negocio con AtlasEngine (BullMQ) e inteligencia predictiva.

![Atlas Logistics Status](https://img.shields.io/badge/Status-Active-success) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue) ![pnpm](https://img.shields.io/badge/pnpm-v10-orange) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🚀 El Nuevo Paradigma (Arquitectura $0)
Tras nuestra Fase 6 de refactorización, el proyecto se ejecuta **100% en local sin coste operativo** (Zero-Cost Architecture), eliminando dependencias externas cloud en desarrollo:
- **Base de Datos:** Drizzle ORM + libSQL (SQLite local de alto rendimiento). Funcionalidades avanzadas inyectadas vía Triggers, Vistas y Secuencias personalizadas.
- **Background Jobs:** BullMQ + ioredis (con fallback asíncrono si Redis se desconecta).
- **Tiempo Real:** Fastify WebSockets (sin necesidad de Firebase).
- **Monorepo:** Turborepo + pnpm con estructura separada `@atlas/frontend`, `@atlas/ui`, etc.

## 🌟 Módulos y Funcionalidades (Suite SCM ERP)

Atlas Logistics cubre todo el ciclo de vida operativo de un embarque y la facturación de un freight forwarder:

### 📦 Operaciones Núcleo
- **Sailing Schedules**: Buscador de rutas marítimas y control de fechas de corte.
- **Booking & B/L**: Emisión de HBL/MBL y tablero Kanban de reservas.
- **Rate Comparer (`@atlas/rate-comparer`)**: Comparación dinámica de tarifas marítimas y aéreas.

### ⚖️ Finanzas y Cumplimiento
- **Customs Clearance**: Seguimiento de DUA, semáforo aduanero y validaciones de código HS.
- **Facturación y Liquidación**: Reconciliación A/R, A/P y análisis de rentabilidad.

### 🌐 Vista Externa y Cliente
- **Customer Portal**: Portal marca blanca para que los clientes rastreen sus cargas (tracking de hitos) y descarguen documentación (HBL dinámico) en tiempo real.
- **Document Vault**: Sistema premium de gestión documental con persistencia real (uploads), filtrado inteligente (grid view), previsualización integrada de documentos y descarga dinámica.

---

## 🏗️ Estructura del Monorepo

```text
Atlas-Logistics/
├── packages/               # Paquetes del monorepo (Workspaces pnpm)
│   ├── frontend/           # PWA Host principal (React 19 + Vite + Code Splitting)
│   ├── dashboard/          # Módulo operacional y vistas analíticas
│   ├── rate-comparer/      # Motor de comparación de tarifas marítimas y aéreas
│   ├── ui/                 # Sistema de diseño, componentes UI y temas
│   └── shared/             # Tipos TypeScript, esquemas Zod y utilidades compartidas
├── scripts/                # Scripts de utilidad (seed, etc.)
├── src/                    # API Server Express, AtlasEngine Workers y conectores DB
│   ├── bpm/workers/        # Job Workers (BullMQ) organizados por dominio
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

3. Inicializar la Base de Datos Local (SQLite/libSQL):
```bash
# Generar y aplicar migraciones de Drizzle a la DB
pnpm run db:generate
pnpm run db:migrate

# O poblar con datos semilla para desarrollo rápido
pnpm run db:seed
# (Alternativamente: pnpm run db:reset-and-seed para resetear por completo)
```

4. Iniciar el servidor de desarrollo local:
```bash
pnpm run dev
```

5. Ejecutar la suite de pruebas unitarias y E2E:
```bash
# Pruebas unitarias en paquetes compartidos
pnpm --filter @atlas/shared test

# Pruebas End-to-End con Playwright
npx playwright test
```



## 📖 Documentación Adicional
- [Arquitectura del Sistema (docs/architecture/system-architecture.md)](docs/architecture/system-architecture.md)
- [Guía de Contribución](CONTRIBUTING.md)
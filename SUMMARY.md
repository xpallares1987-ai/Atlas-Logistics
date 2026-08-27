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
| **Container Planner 3D & LCL** | ISO 668 Contenedores Marítimos | Cubicaje 3D de contenedores, centro de gravedad, distribución de ejes y consolidación LCL multi-cliente. |
| **Warehouse Digital Twin** | Gestión de Almacén & Tráfico de Andenes | Visualización 3D y 2.5D de almacén, control de muelles, inventario y tareas de fulfillment. |
| **BPMN 2.0 Workflows & Pricing** | ISO/IEC 19510 (BPMN 2.0) | Modelador visual de procesos logísticos con versionado, motor de tarifas dinámicas con recargos BAF/CAF/PSS. |

---

### Stack Tecnológico

- **Frontend**: React 19, TypeScript 5.7+, Vite 8, TailwindCSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js 22+, Fastify 5, `@fastify/jwt`, `@fastify/websocket`, `pdfkit`.
- **Persistencia**: SQLite (libSQL client) + Drizzle ORM (59 tablas, triggers, vistas, secuencias).
- **Asincronía**: BullMQ + ioredis (con fallback en memoria para desarrollo autónomo).
- **Control de Calidad**: Vitest (30 suites, 135 tests unitarios e integrados, 100% aprobados), Playwright E2E.
- **Monorepo**: Turborepo + pnpm v10 workspaces (`@atlas/frontend`, `@atlas/dashboard`, `@atlas/rate-comparer`, `@atlas/bpmn-modeler`, `@atlas/warehouse-ops`, `@atlas/ui`, `@atlas/shared`).

---

### Comandos de Operación Rápida

```bash
# Instalación de dependencias
pnpm install

# Compilación de todo el monorepo
pnpm run build

# Base de datos: migraciones y seed masivo
pnpm run db:migrate
pnpm run db:seed

# Servidor de desarrollo unificado (Backend :3001 + Frontend :3002)
pnpm run dev

# Ejecución de pruebas
pnpm test
npx playwright test
```

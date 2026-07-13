# Atlas Logistics 🌍🚢

Atlas Logistics es una **Súper-App** integral para la gestión de la cadena de suministro (SCM). Ofrece herramientas avanzadas para transitarios, navieras y operadores logísticos, centralizando cotizaciones de fletes, gestión de embarques e inteligencia predictiva impulsada por IA.

![Atlas Logistics Dashboard](https://img.shields.io/badge/Status-Active-success) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## 🌟 Características y Módulos (Suite ERP SCM)
Atlas Logistics cuenta con módulos especializados para cubrir el ciclo de vida completo de un embarque marítimo y la operación de un transitario:

**📦 Operaciones Core**
- **Sailing Schedules**: Buscador de rutas marítimas y control de cut-offs.
- **Booking & B/L**: Emisión del HBL y panel Kanban de las reservas.
- **Rate Comparer**: Analítica y comparación de fletes en tiempo real.

**⚖️ Finanzas y Cumplimiento (Compliance)**
- **Customs Clearance**: Tracking del DUA, semáforo aduanero y cálculo de HS Code.
- **Invoicing & Settlement**: Conciliación de A/R, A/P y rentabilidad.

**🤝 Vista Externa (Cliente)**
- **Customer Portal**: Portal "marca blanca" para que los clientes finales puedan realizar tracking de sus cargas y descargar documentos en tiempo real.

## 🏗️ Arquitectura y Tecnologías

El proyecto opera como un **Monorepo (Turborepo)**, unificando múltiples submódulos bajo una misma súper-aplicación React (Vite).

### Core Stack
- **Frontend (Host App):** React, Vite, React Router, TailwindCSS (Dark Premium Glassmorphism).
- **Capa de Datos Backend:** Google Cloud SQL (PostgreSQL) integrado nativamente y tipado de extremo a extremo mediante **Firebase Data Connect**.
- **Inteligencia Predictiva:** Google Gen AI (Gemini 2.5 Flash) para cálculos de ETA predictivo y riesgos.
- **Gestión de Paquetes:** `pnpm` (v10+) y Turborepo para cachés ultrarrápidas e integración continua eficiente.

## 📦 Estructura del Monorepo

```text
Atlas-Logistics/
├── packages/
│   ├── frontend/          # Host App Vite (Súper-App Frontend que unifica todos los módulos)
│   ├── shared/            # Lógica de negocio compartida y tipos
│   ├── ui/                # Sistema de diseño y componentes UI reutilizables
│   ├── bpmn-modeler/      # Módulo modelador de flujos BPMN 2.0
│   ├── dashboard/         # Dashboard principal y control
│   └── rate-comparer/     # Analítica y comparación de fletes
├── dataconnect/           # Esquema declarativo de la base de datos (GraphQL -> Cloud SQL)
└── firebase.json          # Configuración de Firebase Hosting y Data Connect
```

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerrequisitos
- Node.js >= 20
- `pnpm` versión 10+
- Firebase CLI (`npm install -g firebase-tools`)

### Instalación

1. Clona el repositorio e instala las dependencias:
```bash
git clone https://github.com/xpallares1987-ai/Atlas-Logistics.git
cd Atlas-Logistics
pnpm install
```

2. (Opcional) Si hay cambios en la estructura de base de datos, sincroniza los SDKs tipados de Firebase Data Connect:
```bash
npx firebase dataconnect:sdk:generate
```

3. Levanta la aplicación localmente:
```bash
pnpm run dev
```

### Testing E2E
El ecosistema incluye tests End-to-End integrados con Playwright.
```bash
npx playwright install --with-deps
pnpm run test:e2e
```

## 🌐 Integración Continua y Despliegues (CI/CD)

Atlas Logistics cuenta con un pipeline completamente automatizado en **GitHub Actions**:
- **Autenticación Cloud Segura:** Todos los despliegues utilizan **Google Cloud Workload Identity Federation (WIF)**, autenticándose directamente contra Google Cloud (`github-provider` / `github-pool`) sin necesidad de exportar llaves de Service Accounts (Zero-Trust Security).
- **Entornos Multi-Target:** El código principal (`main`) se compila con Turborepo y se despliega simultáneamente hacia **Firebase Hosting** y **GitHub Pages**.

## 📖 Documentación Adicional
- [Visión del SCM (SCM_VISION.md)](SCM_VISION.md)
- [Guía de Contribución](CONTRIBUTING.md)
- [Políticas de Seguridad](SECURITY.md)

## 🤝 Soporte
Si tienes dudas o encuentras problemas con los conectores de Firebase, por favor, abre un Issue o revisa la documentación oficial de Firebase Data Connect.

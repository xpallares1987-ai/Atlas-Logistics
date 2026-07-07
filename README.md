# Atlas Logistics 🌍🚢

Atlas Logistics es una **Súper-App** integral para la gestión de la cadena de suministro (SCM). Ofrece herramientas avanzadas para transitarios, navieras y operadores logísticos, centralizando cotizaciones de fletes, gestión de embarques e inteligencia predictiva impulsada por IA.

![Atlas Logistics Dashboard](https://img.shields.io/badge/Status-Active-success) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## 🏗️ Arquitectura y Tecnologías

El proyecto ha sido refactorizado recientemente en un **Monorepo (Turborepo)**, unificando múltiples submódulos bajo una misma súper-aplicación React (Vite).

### Core Stack
- **Frontend:** React, Vite, React Router, TailwindCSS (Dark Premium Glassmorphism).
- **Backend / Database:** Google Cloud SQL (PostgreSQL) orquestado vía **Firebase DataConnect** (GraphQL).
- **Orquestación de Procesos (BPMN):** Camunda 8 (Zeebe) conectado mediante Firebase Functions.
- **Inteligencia Predictiva:** Google Gen AI (Gemini 2.5 Flash) para cálculos de ETA predictivo y riesgos.
- **Gestión de Paquetes:** `pnpm` y Turborepo para cachés ultrarrápidas.

## 📦 Estructura del Monorepo

```
Atlas-Logistics/
├── packages/
│   ├── frontend/          # Host App (Motor principal)
│   ├── dashboard/         # Panel inteligente SCM
│   ├── freight-comparer/  # Cotizador de Fletes (Tarifas y Excel)
│   ├── bpmn-modeler/      # Modelador de procesos BPMN 2.0 (Camunda)
│   ├── ui/                # Sistema de diseño (Componentes, i18n, Zustand)
│   └── shared/            # Tipos, esquemas y utilidades compartidas
├── dataconnect/           # Esquema de la base de datos (GraphQL -> Cloud SQL)
└── functions/             # Firebase Functions (Workers de Camunda y Gemini AI)
```

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerrequisitos
- Node.js >= 18
- `pnpm` versión 10+
- Firebase CLI (`npm install -g firebase-tools`)

### Instalación

1. Clona el repositorio e instala las dependencias globales:
```bash
git clone https://github.com/tu-usuario/atlas-logistics.git
cd atlas-logistics
pnpm install
```

2. Genera los SDKs de Firebase Data Connect (PostgreSQL):
```bash
npx firebase dataconnect:sdk:generate
```

3. Levanta la aplicación localmente (esto arrancará el `@atlas/frontend` y enlazará los demás paquetes):
```bash
pnpm run dev --filter @atlas/frontend
```

## 📖 Documentación Adicional
- [Guía de Contribución](CONTRIBUTING.md)
- [Arquitectura (ARCHITECTURE.md)](ARCHITECTURE.md)
- [Historial de Cambios](CHANGELOG.md)
- [Políticas de Seguridad](SECURITY.md)

## 🤝 Soporte
Si tienes dudas o encuentras problemas con la integración de Camunda o los conectores de Firebase, por favor, abre un Issue o revisa la documentación de Firebase DataConnect.

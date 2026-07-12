# Atlas Logistics 🌍🚢

Atlas Logistics es una **Súper-App** integral para la gestión de la cadena de suministro (SCM). Ofrece herramientas avanzadas para transitarios, navieras y operadores logísticos, centralizando cotizaciones de fletes, gestión de embarques e inteligencia predictiva impulsada por IA.

![Atlas Logistics Dashboard](https://img.shields.io/badge/Status-Active-success) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## 🏗️ Arquitectura y Tecnologías

El proyecto opera como un **Monorepo (Turborepo)**, unificando múltiples submódulos bajo una misma súper-aplicación React (Vite).

### Core Stack
- **Frontend (Host App):** React, Vite, React Router, TailwindCSS (Dark Premium Glassmorphism).
- **Capa de Datos Backend:** Google Cloud SQL (PostgreSQL) integrado nativamente y tipado de extremo a extremo mediante **Firebase Data Connect**.
- **Inteligencia Predictiva:** Google Gen AI (Gemini 2.5 Flash) para cálculos de ETA predictivo y riesgos.
- **Gestión de Paquetes:** `pnpm` (v10+) y Turborepo para cachés ultrarrápidas e integración continua eficiente.

## 📦 Estructura del Monorepo

```
Atlas-Logistics/
├── apps/
│   └── atlas-scm/         # Host App Vite (Súper-App Frontend que unifica todos los módulos)
├── dataconnect/           # Esquema declarativo de la base de datos (GraphQL -> Cloud SQL)
└── firebase.json          # Configuración de Firebase Hosting y Data Connect
```

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerrequisitos
- Node.js >= 18
- `pnpm` versión 10+
- Firebase CLI (`npm install -g firebase-tools`)

### Instalación

1. Clona el repositorio e instala las dependencias:
```bash
git clone https://github.com/tu-usuario/atlas-logistics.git
cd atlas-logistics
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

## 📖 Documentación Adicional
- [Visión del SCM (SCM_VISION.md)](SCM_VISION.md)
- [Guía de Contribución](CONTRIBUTING.md)
- [Políticas de Seguridad](SECURITY.md)

## 🤝 Soporte
Si tienes dudas o encuentras problemas con los conectores de Firebase, por favor, abre un Issue o revisa la documentación oficial de Firebase Data Connect.

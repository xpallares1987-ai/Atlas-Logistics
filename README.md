# Atlas Logistics (SCM Súper-App)

[![CI](https://github.com/xpallares1987-ai/Atlas-Logistics/actions/workflows/ci.yml/badge.svg)](https://github.com/xpallares1987-ai/Atlas-Logistics/actions/workflows/ci.yml)

Plataforma integral de gestión de cadena de suministro (SCM) y Freight Forwarding.
Esta Súper-App consolida todas nuestras herramientas logísticas bajo una **única arquitectura Monorepo gestionada por Turborepo**.

## 🏗 Arquitectura del Ecosistema

El proyecto ha abandonado su modelo de múltiples repositorios aislados y ahora se gestiona como un único monorepo compuesto por los siguientes paquetes principales (`packages/`):

- **`@atlas/frontend`**: La Súper-App Host (Vite + React Router) que orquesta la navegación global.
- **`@atlas/ui`**: Sistema de diseño y biblioteca compartida de componentes logísticos.
- **`@atlas/dashboard`**: Panel principal para analítica de embarques, KPIs y sostenibilidad (ESG).
- **`@atlas/freight-comparer`**: Motor de cotización, comparación y consolidación LCL.
- **`@atlas/bpmn-modeler`**: Modelador de procesos BPMN 2.0 interactivo.

## 🚀 Tecnologías Clave

- **Frontend Core:** Vite, React 19, React Router v7.
- **Estilos:** TailwindCSS v4, Lucide React.
- **Base de Datos & Backend:** **Firebase Data Connect** (Google Cloud SQL / PostgreSQL).
- **Orquestación de Monorepo:** pnpm v10 + Turborepo.
- **Despliegue Contenerizado:** Docker (Multi-stage build usando `nginx:alpine`).
- **Mapas y Telemetría:** Leaflet con integración AIS en tiempo real.
- **Workflows (Backend Opcional):** Zeebe / Camunda 8 (Requiere Docker local para orquestación compleja).

## 🛠 Guía de Inicio Local

### Requisitos Previos

- **Node.js:** v20 o superior.
- **pnpm:** v10 o superior (`npm install -g pnpm`).
- **Firebase CLI:** v12+ (`npm install -g firebase-tools`).

### 1. Instalación Global

Desde la raíz del repositorio, ejecuta la instalación. Turborepo enlazará inteligentemente todas las dependencias cruzadas:

```bash
pnpm install
```

### 2. Sincronización de Base de Datos (Data Connect)

Para generar el SDK tipado local y poder comunicarte con la base de datos Postgres de la nube:

```bash
firebase init dataconnect
firebase dataconnect:sdk:generate
```

_Nota: El SDK autogenerado se depositará en `src/dataconnect-generated`._

### 3. Ejecución de la Súper-App

Para lanzar el servidor de desarrollo y visualizar todo el ecosistema unificado en tu navegador (`http://localhost:5173`):

```bash
pnpm run dev --filter @atlas/frontend
```

### 4. Compilación con Docker (Producción)

La Súper-App utiliza un modelo **Multi-stage** para generar una imagen Docker ultra-ligera:

```bash
# Construye la app estática y la envuelve en un servidor Nginx
docker compose build
docker compose up -d
```

## 🌐 Flujo CI/CD

El proyecto utiliza GitHub Actions (`.github/workflows/ci.yml`) para verificar tipos, linting y build utilizando la caché remota de **Turborepo**. Al estar configurado con `firebase.json`, la Súper-App está lista para desplegarse de manera estática y unificada en **Firebase Hosting** o Google Cloud Run.

---

_Documentación actualizada tras la migración a Monorepo Súper-App (Julio 2026)._

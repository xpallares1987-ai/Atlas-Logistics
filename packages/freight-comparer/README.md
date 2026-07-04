# Freight Comparer

[![CI](https://github.com/xpallares1987-ai/Freight-Comparer/actions/workflows/ci.yml/badge.svg)](https://github.com/xpallares1987-ai/Freight-Comparer/actions/workflows/ci.yml)
[![Deploy](https://github.com/xpallares1987-ai/Freight-Comparer/actions/workflows/deploy.yml/badge.svg)](https://github.com/xpallares1987-ai/Freight-Comparer/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live-Demo-brightgreen)](https://xpallares1987-ai.github.io/Freight-Comparer/)

Herramienta avanzada de análisis y comparación de costos de fletes logísticos. Utiliza inteligencia artificial mediante **Gemini API** para proporcionar resúmenes ejecutivos y visualizaciones interactivas de alta fidelidad. Este repositorio es un proyecto independiente dentro de la suite **Control Tower**.

## Características Principales

- **Comparativa de Tarifas:** Análisis automatizado de costos entre múltiples transportistas y rutas utilizando el componente estandarizado `RateTable` de `Control-Tower-UI`.
- **IA Logística Avanzada:** Generación de insights estratégicos en tiempo real utilizando **Gemini 2.5 Flash** mediante el nuevo SDK `@google/genai`, con un sistema de optimización de tokens y almacenamiento en caché de resultados mediante IndexedDB.
- **Multidivisa y Tasas en Tiempo Real:** Conversión automática de fletes con tasas de cambio actualizadas dinámicamente desde un proveedor API externo y optimizado con almacenamiento local de caché.
- **Consolidación de Herramientas:** Absorbido por completo el funcionalidad del deprecado `Rate-Comparer`.
- **Visualización de BI:** Dashboards interactivos construidos con **Chart.js** y **D3.js** para el seguimiento de tendencias.
- **Procesamiento de Datos:** Importación y validación de archivos Excel corporativos de gran volumen.
- **Diseño Moderno:** Interfaz de usuario responsiva y profesional basada en **TailwindCSS**.

## Stack Tecnológico

- **Frontend:** React 19, TypeScript 5.8, TailwindCSS.
- **Backend/Middleware:** Express, Vite.
- **IA:** `@google/genai` (Gemini API).
- **Visualización:** Chart.js, D3.js.
- **Gestor de Paquetes:** pnpm v10.

## Guía de Inicio

### Requisitos

- **Node.js:** v20+ (Entorno estándar en CI/CD).
- **pnpm:** v10+.
- **API Key:** Se requiere una `GEMINI_API_KEY` válida configurada en un archivo `.env`.

### Instalación

```bash
pnpm install
```

### Configuración

Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example` si existe):

```env
VITE_GEMINI_API_KEY=tu_clave_aqui
```

### Desarrollo

```bash
pnpm run dev
```

### Construcción

Genera la exportación estática para GitHub Pages:

```bash
pnpm run build
```

## Seguridad

- **Protección de Datos:** Las claves de API nunca se suben al repositorio.
- **Auditoría:** Ejecución semanal de `./scripts/maintenance/security-audit.sh`.

## Contribución

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

## Visión 2027: IA Logística Avanzada
El plan de evolución incluye streaming de respuestas IA, análisis de huella de carbono y webhooks de tarifas en tiempo real. Consulta el [Roadmap Maestro](../ROADMAP.md) para más detalles.

## Licencia

MIT – Parte del ecosistema **Control Tower**.

# Shipment Intelligence Dashboard (Next.js Unified)

[![CI](https://github.com/xpallares1987-ai/Shipment-Dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/xpallares1987-ai/Shipment-Dashboard/actions/workflows/ci.yml)
[![Deploy](https://github.com/xpallares1987-ai/Shipment-Dashboard/actions/workflows/deploy.yml/badge.svg)](https://github.com/xpallares1987-ai/Shipment-Dashboard/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live-Demo-brightgreen)](https://xpallares1987-ai.github.io/Shipment-Dashboard/)

Panel de BI avanzado para la auditoría, análisis y seguimiento de ecosistemas logísticos, financieros y operativos. Esta plataforma unifica las capacidades de analítica de stock, recepciones y seguimiento geoespacial en una arquitectura robusta basada en **Next.js 16**.

## Características Principales

- **Auditoría Multidimensional:** Análisis exhaustivo de reportes corporativos (Stock, Receptions, Boardings).
- **Inteligencia Visual y Flujos en Vivo:** Gráficos dinámicos e interactivos con **Recharts** y un diagrama **Sankey** acoplado en tiempo real a las consultas de embarques de la base de datos para visualizar flujos logísticos y cuellos de botella de throughput.
- **AI Operational Intelligence:** Resúmenes contextuales automáticos basados en datos en tiempo real.
- **Seguimiento Geoespacial y Timeline:** Módulo `/tracker` integrado con **Leaflet** para el monitoreo de embarques y el uso de `MilestoneStepper` para líneas de tiempo de hitos logísticos.
- **Exportación Estática:** Optimizado para despliegue de alto rendimiento en GitHub Pages mediante `output: 'export'`.

## Stack Tecnológico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 6.0.
- **Estilos:** Vanilla CSS (CSS Modules) para máximo rendimiento y aislamiento.
- **Librerías Core:**
  - `@torre/shared`: Utilidades de parseo XML y lógica de negocio.
  - `@torre/ui`: Componentes de interfaz compartidos.
  - `recharts`: Visualización de datos analíticos.
  - `leaflet`: Motor de mapas.
  - `lucide-react`: Iconografía.
- **Gestor de Paquetes:** pnpm v10.

## Guía de Inicio

### Requisitos

- **Node.js:** v20+.
- **pnpm:** v10+.

### Instalación

```bash
pnpm install
```

### Desarrollo

```bash
pnpm run dev
```

### Construcción (Export Estática)

Para generar el directorio `out/` listo para despliegue:

```bash
pnpm run build
```

## Estructura de Rutas

- `/`: Dashboard principal con métricas de stock y embarques.
- `/tracker`: Centro de control geoespacial.

## Seguridad

Implementación de procesamiento local de datos y políticas de seguridad para evitar fugas de información. Todos los datos sensibles se mantienen en el entorno del cliente y son auditados semanalmente.

## Contribución

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para guías sobre Next.js 16 y estándares de código.

## Visión 2027: BI de Alta Fidelidad
Estamos evolucionando hacia un motor de mapas con capas marítimas, Sankey interactivo y procesamiento de XML masivo. Consulta el [Roadmap Maestro](../ROADMAP.md) para más detalles.

## Licencia

MIT – Parte del ecosistema **Control Tower**.

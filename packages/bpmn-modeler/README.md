# BPMN 2.0 Interactive Modeler

[![CI](https://github.com/xpallares1987-ai/BPMN-Modeler/actions/workflows/ci.yml/badge.svg)](https://github.com/xpallares1987-ai/BPMN-Modeler/actions/workflows/ci.yml)
[![Deploy](https://github.com/xpallares1987-ai/BPMN-Modeler/actions/workflows/deploy.yml/badge.svg)](https://github.com/xpallares1987-ai/BPMN-Modeler/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live-Demo-brightgreen)](https://xpallares1987-ai.github.io/BPMN-Modeler/)

Un modelador BPMN 2.0 avanzado diseñado para la creación, edición y gestión de procesos de negocio, optimizado para **Camunda 8 (Zeebe)**. Este repositorio forma parte de la suite **Control Tower**.

## Características Principales

- **Modelado Full BPMN 2.0:** Soporte completo para elementos de flujo, datos y eventos.
- **Integración Camunda 8:** Soporte nativo para extensiones de Zeebe y paneles de propiedades personalizados.
- **Template Manager:** Gestión centralizada de plantillas con metadatos personalizados (`status`, `costHR`, `formKey`).
- **Validación en Tiempo Real:** Análisis de errores y advertencias mediante Web Workers.
- **Generación de SOP en Segundo Plano:** El procesamiento y la compilación de diagramas BPMN a formato Markdown (SOP) se delegan en Web Workers para mantener el hilo principal de la UI completamente fluido.
- **Auditoría con IA Avanzada:** Utiliza **Gemini 2.5 Pro** para analizar procesos complejos y proporcionar recomendaciones técnicas inteligentes de negocio.
- **Persistencia Local:** Guardado automático en el navegador para evitar pérdida de datos.
- **E2E Testing:** Garantía de estabilidad mediante una suite completa de pruebas Playwright.

## Stack Tecnológico

- **Core:** TypeScript 6.0, HTML5, CSS3 (Vanilla).
- **Engine:** `bpmn-js`, `zeebe-bpmn-moddle`.
- **Bundler:** Vite.
- **Testing:** Vitest (Unit) & Playwright (E2E).
- **Gestor de Paquetes:** pnpm v10.

## Guía de Inicio

### Requisitos

- **Node.js:** v20+ (Entorno estándar en CI/CD).
- **pnpm:** v10+.

### Instalación

```bash
pnpm install
```

### Desarrollo

Inicia el servidor de desarrollo local:

```bash
pnpm run dev
```

### Construcción

Genera la exportación estática optimizada para GitHub Pages:

```bash
pnpm run build
```

## Pruebas y Calidad

- **Pruebas Unitarias:** `pnpm run test`
- **Pruebas E2E:** `pnpm run test:e2e`
- **Linting:** `pnpm run lint`
- **Pre-commit:** Los commits son validados automáticamente mediante Husky y `lint-staged`.

## Contribución

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para conocer las guías de estilo, flujos de trabajo y convenciones de commit.

## Visión 2027: Modelado Inteligente
Estamos integrando 20 mejoras clave, incluyendo Diff Visual, soporte PWA Offline y automatización de SOPs. Consulta el [Roadmap Maestro](../ROADMAP.md) para más detalles.

## Licencia

MIT – Parte del ecosistema **Control Tower**.

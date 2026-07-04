# BPMN 2.0 Interactive Modeler - Camunda 8

Este proyecto es un modelador BPMN basado en la web diseñado para uso personal o profesional, con soporte específico para Camunda 8 y paneles de propiedades personalizados.

## Objetivos del Proyecto

- Proporcionar una interfaz intuitiva para modelar procesos BPMN 2.0.

## Características Avanzadas

- **Template Manager:** Sistema centralizado para gestionar plantillas de procesos. Soporta metadatos personalizados (`sys:*` namespace) como `status`, `costHR`, `formKey` y `decisionRef`.
- **Integración nativa con Camunda 8 (Zeebe).**
- Capacidad de importar y exportar archivos `.bpmn` y `.xml`.
- Persistencia de sesión local para evitar pérdida de datos accidental.
- Gestión de múltiples pestañas de diagramas.

## Stack Tecnológico

- **Frontend:** TypeScript 6.0, HTML5, CSS3 (Vanilla).
- **Bundler:** Vite.
- **Testing:** Vitest.
- **Gestor de Paquetes:** pnpm.
- **Librerías Core:**
  - `bpmn-js`: Motor de modelado.
  - `zeebe-bpmn-moddle`: Soporte para extensiones de Camunda 8.
  - `bpmn-js-properties-panel`: Panel de propiedades dinámico.

## Estructura de Archivos

- `index.html`: Punto de entrada de la aplicación.
- `src/main.ts`: Punto de entrada de TypeScript y orquestación.
- `src/workers/`: Procesamiento en segundo plano (Web Workers) para validación y saneamiento XML.
- `src/state.ts`: Gestión del estado global reactivo.
- `src/services/`: Capa de lógica de negocio (modeler, storage, xml, cloud).
- `src/ui/`: Componentes de interfaz de usuario y renderizado.
- `assets/`: Recursos estáticos y estilos.

## Guías de Desarrollo

- **TypeScript:** Mantener tipado estricto. Evitar el uso de `any`. Se utiliza TypeScript 6.0 con `ignoreDeprecations: "6.0"` para `baseUrl`.
- **Estado:** Utilizar el objeto `state` en `src/state.ts` para la gestión del estado global.
- **Seguridad:** El procesamiento de XML se realiza en un Web Worker para aislar la lógica de parseo y evitar bloqueos en el hilo principal. Saneamiento de DOM obligatorio antes de usar `innerHTML`.
- **Testing:** Escribir tests unitarios en archivos `.test.ts` usando Vitest.

## Optimización de Rendimiento

- **Eventos Pasivos:** Se utiliza un shim para forzar listeners pasivos en eventos de desplazamiento, mejorando la respuesta del canvas.
- **Lazy Loading:** Módulos pesados (Properties Panel, Modeler) se cargan dinámicamente.

## Comandos Útiles (vía Turbo o pnpm)

- `pnpm run dev`: Servidor de desarrollo.
- `pnpm run build`: Compilación para producción.
- `pnpm run test`: Ejecución de tests.
- `pnpm run lint`: Verificación de estilo.

## Mantenimiento y Auditoría

- **ADRs**: Gestionar decisiones arquitectónicas en `docs/adr/`.
- **CI/CD Maintenance**: `./scripts/maintenance/ci-clean.sh [purge|clear-cache]`
- **Security Audit**: `./scripts/maintenance/security-audit.sh` (Ejecutar semanalmente)

## Roadmap de Mejora
Este repositorio sigue el plan de 20 puntos detallado en el [Roadmap Maestro](../ROADMAP.md).


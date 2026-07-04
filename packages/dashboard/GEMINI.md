# Shipment Intelligence Dashboard (Next.js Unified)

Un panel de BI avanzado para la auditoría y análisis de ecosistemas de datos logísticos, financieros y operativos. Esta versión unifica las funcionalidades de Logistics-Dashboard y Shipment-Tracker en una plataforma robusta basada en Next.js.

## Objetivos del Proyecto

- Facilitar la auditoría multidimensional de reportes corporativos (XML/Excel).
- Proporcionar inteligencia visual mediante gráficos dinámicos (Recharts).
- **AI Operational Intelligence:** Resúmenes contextuales automáticos basados en los datos filtrados.
- Seguimiento geoespacial en tiempo real (Leaflet) integrado en el módulo `/tracker`.
- Asegurar un entorno de análisis rápido y seguro con exportación estática para GitHub Pages.

## Stack Tecnológico

- **Frontend:** Next.js 16 (React 19), TypeScript 6.0.
- **Estilos:** Vanilla CSS (CSS Modules & Globals).
- **Gestor de Paquetes:** pnpm.
- **Librerías Core:**
  - `@torre/shared`: Utilidades de parseo XML y lógica de negocio compartida.
  - `@torre/ui`: Componentes de interfaz compartidos.
  - `leaflet`: Motor de mapas para el seguimiento de embarques.
  - `recharts`: Visualización de datos analíticos.
  - `lucide-react`: Set de iconos consistente.
  - `vitest`: Pruebas unitarias y de integración.

## Estructura de Rutas (App Router)

- `src/app/page.tsx`: Dashboard principal. Resumen de stock, embarques y recepciones.
- `src/app/tracker/page.tsx`: Módulo de seguimiento geoespacial.
- `src/app/api/`: Endpoints locales para el procesamiento de datos unificados.

## Servicios y Lógica

- `src/services/warehouse-service.ts`: Orquestación de datos desde archivos XML locales.
- `src/tracker-services/mapService.ts`: Gestión de la instancia de Leaflet y renderizado de capas.
- `src/tracker-services/shipmentService.ts`: Gestión del estado y persistencia de embarques.

## Estándares de Desarrollo y Seguridad

- **Seguridad de Tipos:** TypeScript estricto sin excepciones. Configurado con `ignoreDeprecations: "6.0"` para compatibilidad.
- **Saneamiento:** Uso obligatorio de `@torre/shared/escapeHTML` o manipulación nativa del DOM (`appendChild`, `textContent`) para evitar ataques XSS.
- **Auditoría:** La dependencia `xlsx` ha sido eliminada por seguridad; el procesamiento de datos se centraliza en servicios validados.
- **Despliegue:** Configurado para exportación estática (`output: 'export'`) y desplegado mediante GitHub Actions en la ruta `/Control-Tower/Shipment-Dashboard/`.

## Comandos Útiles

- `pnpm run dev`: Servidor de desarrollo con Turbopack.
- `pnpm run build`: Generación de la exportación estática en el directorio `out/`.
- `pnpm run lint`: Verificación estática de código.
- `pnpm run test`: Ejecución de pruebas con Vitest.

## Mantenimiento y Auditoría

- **ADRs**: Gestionar decisiones arquitectónicas en `docs/adr/`.
- **CI/CD Maintenance**: `./scripts/maintenance/ci-clean.sh [purge|clear-cache]`
- **Security Audit**: `./scripts/maintenance/security-audit.sh` (Ejecutar semanalmente)

## Roadmap de Mejora
Este repositorio sigue el plan de 20 puntos detallado en el [Roadmap Maestro](../ROADMAP.md).


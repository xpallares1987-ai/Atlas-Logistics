# Changelog

All notable changes to the Atlas Logistics monorepo will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Inteligencia Predictiva (Gemini AI)**: Nueva Firebase Function `predictETA` que utiliza Gemini 2.5 para analizar envíos y devolver un ETA ajustado con nivel de confianza.
- **PostgreSQL Data Connect**: Migración completa de la capa de datos de Drizzle a Firebase Data Connect. Directivas `@auth` y esquema definido en `/dataconnect`.
- **Nuevo Diseño UI**: Implementación global del diseño "Dark Premium Glassmorphism" en toda la Súper-App unificada.
- **Roles y Permisos**: Se preparó la base de datos con la nueva tabla `DictionaryTerm` con PK compuesta para gestionar maestros de datos de forma segura.

### Changed
- **Arquitectura Unificada (Frontend)**: Consolidación de todos los submódulos dispersos de la interfaz (`dashboard`, `bpmn-modeler`, etc.) en una sola Súper-App bajo el directorio `apps/atlas-scm`.
- **Configuración Knip**: Se implementó `knip.json` adaptado al monorepo para excluir archivos autogenerados de DataConnect y optimizar la detección de código muerto.
- El componente `RateTable` ahora maneja cálculos de recargos BAF dinámicamente con estilos glassmorphism y tooltips interactivos.

### Removed
- Eliminados los paquetes de frontend separados (`packages/frontend`, `packages/ui`, etc.) en favor del enfoque monolítico de React en `apps/atlas-scm`.
- Eliminados scripts antiguos de migración Drizzle y conectores directos a bases de datos en favor de los conectores generados por Firebase Data Connect.

## [1.0.0] - 2026-06-01
### Added
- Versión inicial estable del frontend Vite + React Router.
- Modelador BPMN básico integrado.

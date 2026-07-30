# Changelog

All notable changes to the Atlas Logistics monorepo will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Cost-0 Local Architecture**: Migración completa de la capa de datos en la nube hacia una arquitectura de base de datos local utilizando **SQLite (libSQL)** y **Drizzle ORM** para garantizar un coste operativo de $0.
- **Seguridad Mockeada**: Implementado un proveedor de autenticación simulado (Mock AuthProvider) para permitir el desarrollo y las pruebas sin incurrir en costes de Firebase Auth.
- **Integración Asíncrona (BullMQ)**: Nueva infraestructura para simular procesos en segundo plano utilizando BullMQ (AtlasEngine) en lugar de Google Cloud Tasks.
- **Nuevo Diseño UI**: Implementación global del diseño "Dark Premium Glassmorphism" en toda la Súper-App unificada.

### Changed
- **Arquitectura Unificada (Frontend)**: Consolidación de todos los submódulos dispersos de la interfaz en una sola Súper-App bajo el directorio `packages/frontend`.
- **Configuración Knip**: Se implementó `knip.json` adaptado al monorepo para optimizar la detección de código muerto.
- El componente `RateTable` ahora maneja cálculos de recargos BAF dinámicamente con estilos glassmorphism y tooltips interactivos.

### Removed
- Eliminada toda la infraestructura basada en Firebase Data Connect, Google Cloud SQL, Firebase Auth y Workload Identity Federation (WIF).
- Eliminados los directorios autogenerados de Data Connect y los scripts de migración asociados.

## [1.0.0] - 2026-06-01
### Added
- Versión inicial estable del frontend Vite + React Router.
- Modelador BPMN básico integrado.

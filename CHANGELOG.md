# Changelog

All notable changes to the Atlas Logistics monorepo will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Inteligencia Predictiva (Gemini AI)**: Nueva Firebase Function `predictETA` que utiliza Gemini 2.5 para analizar envíos y devolver un ETA ajustado con nivel de confianza.
- **Camunda 8 (Zeebe Workers)**: Integración total del SDK de Camunda 8 en el backend de Node (`functions/src/workers.ts`) para escuchar y procesar tareas del BPMN (`validate-customs`).
- **PostgreSQL Data Connect**: Directivas `@unique` en el esquema de Cloud SQL (`trackingNumber`, `quoteNumber`, `invoiceNumber`) para proteger la unicidad de las cargas.
- **Nuevo Diseño UI**: Implementación global del diseño "Dark Premium Glassmorphism" en `@atlas/dashboard` y `@atlas/freight-comparer`.

### Changed
- **Arquitectura Turborepo**: Migración completa de todos los repositorios dispersos a un único monorepo administrado por `pnpm`.
- **Configuración Knip**: Se implementó `knip.json` adaptado al monorepo para excluir archivos autogenerados de DataConnect y optimizar la detección de código muerto.
- El componente `RateTable` ahora maneja cálculos de recargos BAF dinámicamente con estilos glassmorphism y tooltips interactivos.

### Removed
- Limpieza masiva de componentes huérfanos (`RegionalProfitabilityChart`, `AIInsightsPanel`, etc.) para sanear la deuda técnica.
- Eliminados scripts antiguos de migración Drizzle (ahora usando Firebase DataConnect nativo).

## [1.0.0] - 2026-06-01
### Added
- Versión inicial estable del frontend Vite + React Router.
- Modelador BPMN básico integrado.

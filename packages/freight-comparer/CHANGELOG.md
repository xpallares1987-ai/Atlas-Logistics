# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added price volatility matrix chart (`VolatilityHeatmap` component) using `chartjs-chart-matrix`.
- Updated `DropZone` to support processing multiple Excel/CSV files simultaneously.
- Configured Rollup to treat `/assets/datos_encrypted.js` as an external module in `vite.config.ts`.

### Fixed
- Fixed Vitest configuration to exclude Playwright E2E tests (`tests/**`) from unit testing runs.

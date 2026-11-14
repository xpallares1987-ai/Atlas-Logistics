/**
 * @file index.ts
 * @description Canonical barrel exports for AirCargo module components, hooks, and types.
 * @module @atlas/frontend/components/AirCargo
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

export * from "./types/index";
export * from "./hooks/useAirCargo";
export * from "./Header";
export * from "./Panel/AwbList";
export * from "./Panel/AwbDetail";
export * from "./Modal/Simulator";

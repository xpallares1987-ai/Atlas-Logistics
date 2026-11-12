/**
 * @file index.ts
 * @description Canonical barrel exports for Demurrage & Detention Control Tower components, banners, tabs, and hooks.
 * @module @atlas/frontend/components/Demurrage
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

export { Header } from "./Header";
export { Navigation } from "./Navigation";
export { ShipmentContext } from "./Banner/ShipmentContext";
export { SummaryKpi } from "./Banner/SummaryKpi";
export { Radar } from "./Tab/Radar";
export { Suspensions } from "./Tab/Suspensions";
export { Audit } from "./Tab/Audit";
export { Dossier } from "./Tab/Dossier";

export * from "./hooks/demurrageHelpers";
export * from "./hooks/demurragePdfExporter";
export * from "./hooks/useDemurrageManager";

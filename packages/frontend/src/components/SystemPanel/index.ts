/**
 * @file index.ts
 * @description Canonical barrel exports for System Administration components, tabs, modals, and hooks.
 * @module @atlas/frontend/components/SystemPanel
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

export { Header } from "./Header";
export { Navigation } from "./Navigation";
export { NewNote } from "./Modal/NewNote";
export { Resolutions } from "./Tab/Resolutions";
export { Rbac } from "./Tab/Rbac";
export { DatabaseSeed } from "./Tab/DatabaseSeed";
export { Integrations } from "./Tab/Integrations";
export { ControlPlane } from "./Tab/ControlPlane";
export { SecurityVault } from "./Tab/SecurityVault";
export { Webhooks } from "./Tab/Webhooks";

export * from "./hooks/useDatabaseSeed";
export * from "./hooks/useGeminiGateway";
export * from "./hooks/systemPanelHelpers";

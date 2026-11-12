/**
 * @file index.ts
 * @description Canonical barrel export for Settings module components and custom hooks.
 * @module @atlas/frontend/components/Settings
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export { Sidebar } from "./Sidebar";
export { Appearance } from "./Tab/Appearance";
export { Profile } from "./Tab/Profile";
export { Company } from "./Tab/Company";
export { Api } from "./Tab/Api";
export { Notifications } from "./Tab/Notifications";
export { Devices } from "./Tab/Devices";
export { SystemAdmin } from "./Tab/SystemAdmin";
export { Security } from "./Tab/Security";
export { Database } from "./Tab/Database";
export { Resolutions } from "./Tab/Resolutions";

export { useDatabaseManager } from "./hooks/useDatabaseManager";
export { useSecuritySettings } from "./hooks/useSecuritySettings";

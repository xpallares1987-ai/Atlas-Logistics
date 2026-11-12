/**
 * @file index.ts
 * @description Barrel export for Shipment components, organized into domain sub-folders:
 * - Tab/ (Overview, Attention, Journey, Tasks, Exceptions, CargoRoute, Audit, GreenCompliance, Navigation)
 * - Banner/ (Hero)
 * - Modal/ (ExecuteAction, RaiseException)
 * - Root (Header, Sidebar)
 * Follows strict non-redundant naming rules (no domain names repeated within folders).
 * @module @atlas/frontend/components/Shipment
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

// Tabs
export {
  Overview,
  Overview as OverviewTab,
  Overview as ShipmentOverviewTab,
} from "./Tab/Overview.js";
export {
  Attention,
  Attention as AttentionTab,
  Attention as ShipmentAttentionTab,
} from "./Tab/Attention.js";
export {
  Journey,
  Journey as JourneyTab,
  Journey as ShipmentJourneyTab,
} from "./Tab/Journey.js";
export {
  Tasks,
  Tasks as TasksTab,
  Tasks as ShipmentTasksTab,
} from "./Tab/Tasks.js";
export {
  Exceptions,
  Exceptions as ExceptionsTab,
  Exceptions as ShipmentExceptionsTab,
} from "./Tab/Exceptions.js";
export {
  CargoRoute,
  CargoRoute as CargoRouteTab,
  CargoRoute as ShipmentCargoRouteTab,
} from "./Tab/CargoRoute.js";
export {
  Audit,
  Audit as AuditTab,
  Audit as ShipmentAuditTab,
} from "./Tab/Audit.js";
export {
  GreenCompliance,
  GreenCompliance as GreenComplianceTab,
  GreenCompliance as ShipmentGreenComplianceTab,
} from "./Tab/GreenCompliance.js";
export {
  Navigation,
  Navigation as NavigationTabs,
  Navigation as ShipmentNavigationTabs,
} from "./Tab/Navigation.js";

// Banners
export {
  Hero,
  Hero as HeroBanner,
  Hero as ShipmentHeroBanner,
} from "./Banner/Hero.js";

// Modals
export {
  ExecuteAction,
  ExecuteAction as ExecuteActionModal,
} from "./Modal/ExecuteAction.js";
export {
  RaiseException,
  RaiseException as RaiseExceptionModal,
} from "./Modal/RaiseException.js";

// Header & Sidebar
export {
  Header,
  Header as WorkspaceHeader,
  Header as ShipmentWorkspaceHeader,
} from "./Header.js";
export {
  Sidebar,
  Sidebar as WorkspaceSidebar,
  Sidebar as ShipmentWorkspaceSidebar,
} from "./Sidebar.js";

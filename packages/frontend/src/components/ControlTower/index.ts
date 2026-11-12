/**
 * @file index.ts
 * @description Barrel export for Control Tower Command Center components, tabs, and modals.
 * Organized into domain sub-folders (Tab/, Modal/) with non-redundant naming.
 * @module @atlas/frontend/components/ControlTower
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

// Tabs
export {
  Radar,
  Radar as RadarTab,
  Radar as ControlTowerRadarTab,
} from "./Tab/Radar.js";
export {
  Kanban,
  Kanban as KanbanTab,
  Kanban as ControlTowerKanbanTab,
} from "./Tab/Kanban.js";
export {
  Audit,
  Audit as AuditTab,
  Audit as ControlTowerAuditTab,
} from "./Tab/Audit.js";
export {
  Customs,
  Customs as CustomsTab,
  Customs as ControlTowerCustomsTab,
} from "./Tab/Customs.js";
export {
  Spot,
  Spot as SpotTab,
  Spot as ControlTowerSpotTab,
} from "./Tab/Spot.js";

// Modals
export {
  ResolveIncident,
  ResolveIncident as ResolveIncidentModal,
} from "./Modal/ResolveIncident.js";
export {
  DisputeLine,
  DisputeLine as DisputeLineModal,
} from "./Modal/DisputeLine.js";
export {
  NewIncident,
  NewIncident as NewIncidentModal,
} from "./Modal/NewIncident.js";
export { NewIcs2, NewIcs2 as NewIcs2Modal } from "./Modal/NewIcs2.js";

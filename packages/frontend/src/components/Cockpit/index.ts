/**
 * @file index.ts
 * @description Canonical barrel export for Operations Cockpit 2.0 components.
 * @module @atlas/frontend/components/Cockpit
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export { Header } from "./Header";
export { SummaryKpi } from "./Banner/SummaryKpi";
export { Confirmation } from "./Banner/Confirmation";
export { StationHero } from "./Banner/StationHero";
export { FilterBar } from "./Queue/FilterBar";
export { ItemCard } from "./Queue/ItemCard";
export {
  getModeFamily,
  ServiceIcon,
  ModeTaskBadge,
  UrgencyBadge,
  PriorityBadge,
} from "./Queue/badges";
export { Action } from "./Panel/Action";
export { EmittedDocument } from "./Modal/EmittedDocument";

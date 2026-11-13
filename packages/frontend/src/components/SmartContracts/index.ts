/**
 * @file index.ts
 * @description Canonical barrel exports for SmartContracts module components.
 * @module @atlas/frontend/components/SmartContracts
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export { Header } from "./Header";
export { RelationalDeployment } from "./Banner/RelationalDeployment";
export { SmartEscrowCard } from "./Panel/SmartEscrowCard";
export { EblMletrTracker } from "./Panel/EblMletrTracker";
export { DltLedgerVisualizer } from "./Panel/DltLedgerVisualizer";
export { EndorseTitle } from "./Modal/EndorseTitle";
export { TriggerDispute } from "./Modal/TriggerDispute";
export {
  useSmartContracts,
  filterLedgerBlocks,
  getEventBadgeClass,
} from "./hooks/useSmartContracts";

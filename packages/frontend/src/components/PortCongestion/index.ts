/**
 * @file index.ts
 * @description Canonical barrel exports for PortCongestion module components.
 * @module @atlas/frontend/components/PortCongestion
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export { Header } from "./Header";
export { KpiStrip } from "./Banner/KpiStrip";
export { Navigation } from "./Navigation";
export { GeospatialMap } from "./Tab/GeospatialMap";
export { BerthRadar } from "./Tab/BerthRadar";
export { LandsideDrayage } from "./Tab/LandsideDrayage";
export { DdSuspension } from "./Tab/DdSuspension";
export {
  usePortCongestion,
  filterActiveVessels,
} from "./hooks/usePortCongestion";

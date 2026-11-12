/**
 * @file index.ts
 * @description Canonical barrel exports for CarbonEmissions module components.
 * @module @atlas/frontend/components/CarbonEmissions
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export { Header } from "./Header";
export { Navigation } from "./Navigation";
export { Journeys } from "./Tab/Journeys";
export { Calculator } from "./Tab/Calculator";
export { Marketplace } from "./Tab/Marketplace";
export { Certificates } from "./Tab/Certificates";
export { OffsetPurchase } from "./Modal/OffsetPurchase";
export {
  useCarbonEmissions,
  toNumber,
  toFixed,
} from "./hooks/useCarbonEmissions";

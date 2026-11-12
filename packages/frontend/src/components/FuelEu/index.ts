/**
 * @file index.ts
 * @description Barrel export for FuelEU Maritime & EU ETS components.
 * @module @atlas/frontend/components/FuelEu
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export { Header } from "./Header";
export { VoyagesGhg } from "./Tab/VoyagesGhg";
export { EtsGreenBaf } from "./Tab/EtsGreenBaf";
export { PoolingFuels } from "./Tab/PoolingFuels";
export { StatusVerification } from "./Modal/StatusVerification";
export {
  useFuelEuMaritime,
  computeVoyageKpis,
} from "./hooks/useFuelEuMaritime";

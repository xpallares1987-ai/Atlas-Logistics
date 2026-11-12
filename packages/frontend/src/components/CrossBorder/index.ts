/**
 * @file index.ts
 * @description Barrel export for North American Cross-Border Corridor components.
 * @module @atlas/frontend/components/CrossBorder
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export { Header } from "./Header";
export { ShipmentSelector } from "./Banner/ShipmentSelector";
export { Navigation } from "./Navigation";
export { CartaPorte } from "./Tab/CartaPorte";
export { UsmcaImmex } from "./Tab/UsmcaImmex";
export { CustomsMl } from "./Tab/CustomsMl";
export {
  useCrossBorder,
  mapDbDeclarationToStampingResult,
} from "./hooks/useCrossBorder";

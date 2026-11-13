/**
 * @file index.ts
 * @description Canonical barrel exports for the CustomsWarehouse component hierarchy.
 * @module @atlas/frontend/components/CustomsWarehouse
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export { Header } from "./Header";
export type { HeaderProps } from "./Header";

export { LotsLedger } from "./Tab/LotsLedger";
export type { LotsLedgerProps } from "./Tab/LotsLedger";

export { GuaranteesTax } from "./Tab/GuaranteesTax";
export type { GuaranteesTaxProps } from "./Tab/GuaranteesTax";

export { FacilitiesHandling } from "./Tab/FacilitiesHandling";
export type { FacilitiesHandlingProps } from "./Tab/FacilitiesHandling";

export { UpdateLotStatus } from "./Modal/UpdateLotStatus";
export type { UpdateLotStatusProps } from "./Modal/UpdateLotStatus";

export {
  useCustomsWarehouse,
  formatCurrencyEs,
} from "./hooks/useCustomsWarehouse";

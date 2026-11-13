/**
 * @file index.ts
 * @description Barrel exports for the Trade Finance & Documentary Credits module.
 * @module @atlas/frontend/components/TradeFinance
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export { Header } from "./Header";
export type { HeaderProps } from "./Header";

export { InstrumentsDocs } from "./Tab/InstrumentsDocs";
export type { InstrumentsDocsProps } from "./Tab/InstrumentsDocs";

export { UcpDiscrepancies } from "./Tab/UcpDiscrepancies";
export type { UcpDiscrepanciesProps } from "./Tab/UcpDiscrepancies";

export { FeeSimulator } from "./Tab/FeeSimulator";
export type { FeeSimulatorProps } from "./Tab/FeeSimulator";

export {
  useTradeFinance,
  formatInstrumentFilterLabel,
} from "./hooks/useTradeFinance";

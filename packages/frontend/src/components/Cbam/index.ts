/**
 * @file index.ts
 * @description Barrel exports for the CBAM (Carbon Border Adjustment Mechanism) module.
 * @module @atlas/frontend/components/Cbam
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export { Header } from "./Header";
export type { HeaderProps } from "./Header";

export { Declarations } from "./Tab/Declarations";
export type { DeclarationsProps } from "./Tab/Declarations";

export { Calculator } from "./Tab/Calculator";
export type { CalculatorProps } from "./Tab/Calculator";

export { FinanceEts } from "./Tab/FinanceEts";
export type { FinanceEtsProps } from "./Tab/FinanceEts";

export { ValidateStatus } from "./Modal/ValidateStatus";
export type { ValidateStatusProps } from "./Modal/ValidateStatus";

export { useCbam, formatCbamStatusBadge } from "./hooks/useCbam";

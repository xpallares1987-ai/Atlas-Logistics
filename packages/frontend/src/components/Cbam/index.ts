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

export { CertificateInventory } from "./Tab/CertificateInventory";
export type { CertificateInventoryProps } from "./Tab/CertificateInventory";

export { PurchaseLot as PurchaseLotModal } from "./Modal/PurchaseLot";
export type { PurchaseLotProps as PurchaseLotModalProps } from "./Modal/PurchaseLot";

export { SurrenderWizard as SurrenderWizardModal } from "./Modal/SurrenderWizard";
export type { SurrenderWizardProps as SurrenderWizardModalProps } from "./Modal/SurrenderWizard";

export { ValidateStatus } from "./Modal/ValidateStatus";
export type { ValidateStatusProps } from "./Modal/ValidateStatus";

export { useCbam, formatCbamStatusBadge } from "./hooks/useCbam";

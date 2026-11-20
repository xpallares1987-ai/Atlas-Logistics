/**
 * @file index.ts
 * @description Canonical barrel exports for invoicing modals and agent settlement drawers.
 * @module @atlas/frontend/features/invoicing/components
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export {
  CreateInvoiceModal,
  CreateInvoiceModal as CreateInvoice,
} from "./Modal/CreateInvoice";
export {
  SettlementDetailsDrawer,
  SettlementDetailsDrawer as SettlementDetails,
} from "./Drawer/SettlementDetails";

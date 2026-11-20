/**
 * @file index.ts
 * @description Canonical barrel exports for Customer Portal tracking, upload, and quote wizard components.
 * @module @atlas/frontend/features/portal
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export { ShipmentTracker } from "./ShipmentTracker";
export { DocumentUpload } from "./DocumentUpload";
export {
  QuoteWizardModal,
  QuoteWizardModal as QuoteWizard,
  type PortalGeneratedQuote,
  type PortalBookedQuote,
} from "./Modal/QuoteWizard";

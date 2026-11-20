/**
 * @file index.ts
 * @description Canonical barrel for semantic modal dialogs in `@atlas/ui`, exposing atomic DRY exports alongside backwards-compatible `*Modal` aliases.
 * @module @atlas/ui/components/Modal
 * @see {@link docs/adr/0020-modular-frontend-decomposition-and-naming-standards.md}
 */

export * from "./Base";
export { Modal as BaseModal } from "./Base";

export * from "./Address";
export { AddressModal as Address } from "./Address";

export * from "./DrayageCalculator";
export { DrayageCalculatorModal as DrayageCalculator } from "./DrayageCalculator";

export * from "./DuplicateWarning";
export { DuplicateWarningModal as DuplicateWarning } from "./DuplicateWarning";

export * from "./QuoteBooking";
export { QuoteBookingModal as QuoteBooking } from "./QuoteBooking";

export * from "./RateIngestion";
export { RateIngestionModal as RateIngestion } from "./RateIngestion";

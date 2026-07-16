/**
 * Atlas Logistics — Standard BPMN Error Codes.
 *
 * These codes MUST match the `errorRef` definitions in our BPMN models.
 * Workers throw `AtlasBpmnError(code, message)` to trigger the
 * corresponding Error Boundary Event in the process.
 */

// ── Booking ──────────────────────────────────────────────────────────
export const CARRIER_REJECTION   = 'CARRIER_REJECTION';
export const BOOKING_TIMEOUT     = 'BOOKING_TIMEOUT';
export const NO_SPACE_AVAILABLE  = 'NO_SPACE_AVAILABLE';

// ── Customs ──────────────────────────────────────────────────────────
export const CUSTOMS_BLOCKED     = 'CUSTOMS_BLOCKED';
export const HS_CODE_INVALID     = 'HS_CODE_INVALID';
export const EMBARGO_VIOLATION   = 'EMBARGO_VIOLATION';
export const INSPECTION_REQUIRED = 'INSPECTION_REQUIRED';

// ── Documents ────────────────────────────────────────────────────────
export const MISSING_DATA        = 'MISSING_DATA';
export const DOCUMENT_REJECTED   = 'DOCUMENT_REJECTED';
export const SIGNATURE_REQUIRED  = 'SIGNATURE_REQUIRED';

// ── Rates ────────────────────────────────────────────────────────────
export const CARRIER_TIMEOUT     = 'CARRIER_TIMEOUT';
export const NO_RATES_FOUND      = 'NO_RATES_FOUND';
export const RATE_EXPIRED        = 'RATE_EXPIRED';

// ── Quote ────────────────────────────────────────────────────────────
export const QUOTE_EXPIRED       = 'QUOTE_EXPIRED';
export const MARGIN_TOO_LOW      = 'MARGIN_TOO_LOW';

// ── Tracking ─────────────────────────────────────────────────────────
export const VESSEL_NOT_FOUND    = 'VESSEL_NOT_FOUND';
export const AIS_UNAVAILABLE     = 'AIS_UNAVAILABLE';

// ── Finance ──────────────────────────────────────────────────────────
export const INVOICE_MISMATCH    = 'INVOICE_MISMATCH';
export const PAYMENT_OVERDUE     = 'PAYMENT_OVERDUE';

// ── Air Freight (Phase 2) ────────────────────────────────────────────
export const AIRLINE_REJECTION   = 'AIRLINE_REJECTION';
export const DG_DECLARATION_FAIL = 'DG_DECLARATION_FAIL';
export const FLIGHT_CANCELLED    = 'FLIGHT_CANCELLED';

// ── Warehouse (Phase 2) ─────────────────────────────────────────────
export const OVERWEIGHT          = 'OVERWEIGHT';
export const CARGO_DAMAGED       = 'CARGO_DAMAGED';
export const DEMURRAGE_ALERT     = 'DEMURRAGE_ALERT';

/**
 * All error codes as a const object for runtime lookups.
 */
export const BpmnErrorCodes = {
  CARRIER_REJECTION,
  BOOKING_TIMEOUT,
  NO_SPACE_AVAILABLE,
  CUSTOMS_BLOCKED,
  HS_CODE_INVALID,
  EMBARGO_VIOLATION,
  INSPECTION_REQUIRED,
  MISSING_DATA,
  DOCUMENT_REJECTED,
  SIGNATURE_REQUIRED,
  CARRIER_TIMEOUT,
  NO_RATES_FOUND,
  RATE_EXPIRED,
  QUOTE_EXPIRED,
  MARGIN_TOO_LOW,
  VESSEL_NOT_FOUND,
  AIS_UNAVAILABLE,
  INVOICE_MISMATCH,
  PAYMENT_OVERDUE,
  AIRLINE_REJECTION,
  DG_DECLARATION_FAIL,
  FLIGHT_CANCELLED,
  OVERWEIGHT,
  CARGO_DAMAGED,
  DEMURRAGE_ALERT,
} as const;

export type BpmnErrorCode = keyof typeof BpmnErrorCodes;

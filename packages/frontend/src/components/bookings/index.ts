/**
 * @file index.ts
 * @description Barrel export for bookings components, organized into domain sub-folders (Banner/, Panel/, Tab/, Modal/, hooks/).
 * @module @atlas/frontend/components/bookings
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export { Header } from "./Header.js";
export { Navigation } from "./Navigation.js";
export { KanbanSummary } from "./Banner/KanbanSummary.js";
export { RelationalContext } from "./Banner/RelationalContext.js";
export { KpiStrip } from "./Banner/KpiStrip.js";
export { BookingInbox } from "./Panel/BookingInbox.js";

export {
  BookingRateLockTab,
  BookingRateLockTab as RateLock,
} from "./Tab/RateLock.js";
export {
  BookingCutoffRadarTab,
  BookingCutoffRadarTab as CutoffRadar,
} from "./Tab/CutoffRadar.js";
export {
  BookingSiStudioTab,
  BookingSiStudioTab as SiStudio,
} from "./Tab/SiStudio.js";
export {
  BookingEquipmentReleaseTab,
  BookingEquipmentReleaseTab as EquipmentRelease,
} from "./Tab/EquipmentRelease.js";

export {
  BookingConfirmModal,
  BookingConfirmModal as Confirm,
} from "./Modal/Confirm.js";
export {
  NewBookingRequestModal,
  NewBookingRequestModal as NewRequest,
} from "./Modal/NewRequest.js";

export { useBookingManagement } from "./hooks/useBookingManagement.js";
export {
  CANONICAL_FALLBACK_OCEAN_BOOKING,
  mapDbToOceanBooking,
  formatCountdown,
  buildRateLockQuotes,
} from "./hooks/bookingHelpers.js";

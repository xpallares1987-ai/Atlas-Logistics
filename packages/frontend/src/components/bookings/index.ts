/**
 * @file index.ts
 * @description Barrel export for bookings components, organized into domain sub-folders (Tab/, Modal/).
 * @module @atlas/frontend/components/bookings
 */

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

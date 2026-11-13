/**
 * @file index.ts
 * @description Barrel exports for the Omnichannel Notifications & Driver Gateway module.
 * @module @atlas/frontend/components/OmnichannelNotifications
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export { Header } from "./Header";
export type { HeaderProps } from "./Header";

export { TeamsStudio } from "./Tab/TeamsStudio";
export type { TeamsStudioProps } from "./Tab/TeamsStudio";

export { TelegramDriver } from "./Tab/TelegramDriver";
export type { TelegramDriverProps } from "./Tab/TelegramDriver";

export { AuditLog } from "./Tab/AuditLog";
export type { AuditLogProps } from "./Tab/AuditLog";

export { DriverReport } from "./Modal/DriverReport";
export type { DriverReportProps } from "./Modal/DriverReport";

export { DispatchOrder } from "./Modal/DispatchOrder";
export type { DispatchOrderProps } from "./Modal/DispatchOrder";

export {
  useOmnichannelNotifications,
  ANOMALY_TEMPLATES,
} from "./hooks/useOmnichannelNotifications";

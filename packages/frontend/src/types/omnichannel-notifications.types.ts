/**
 * @file omnichannel-notifications.types.ts
 * @description Domain types for Omnichannel Notifications (MS Teams Adaptive Cards 1.5, Telegram Driver Gateway, and HMAC-SHA256 Webhook Audit).
 * @module @atlas/frontend/types/omnichannel-notifications
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export type OmnichannelTabId = "TEAMS_STUDIO" | "TELEGRAM_DRIVER" | "AUDIT_LOG";

export type DriverReportType =
  "GATE_OUT_TIMESTAMP" | "YARD_DELAY" | "FUEL_RECEIPT" | "POD_SUBMISSION";

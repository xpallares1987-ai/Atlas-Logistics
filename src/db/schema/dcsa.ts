import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

/**
 * DCSA 3.0 Webhook Subscriptions (Event Subscriptions API v3)
 */
export const dcsaEventSubscriptions = sqliteTable(
  "dcsa_event_subscriptions",
  {
    subscriptionId: text("subscription_id").primaryKey(),
    carrierCode: text("carrier_code").notNull(), // 'MSCU' | 'MAEU' | 'CMDU' | 'HLCU' | 'ONEY'
    callbackUrl: text("callback_url").notNull(),
    secretToken: text("secret_token").notNull(),
    eventTypeFiltersJson: text("event_type_filters_json")
      .notNull()
      .default("[]"), // ['EQUIPMENT', 'TRANSPORT', 'SHIPMENT']
    bookingReference: text("booking_reference"),
    equipmentReference: text("equipment_reference"),
    status: text("status").notNull().default("ACTIVE"), // 'ACTIVE' | 'PAUSED' | 'FAILED'
    deliveryCount: integer("delivery_count").notNull().default(0),
    lastDeliveredAt: integer("last_delivered_at", { mode: "timestamp" }),
    lastError: text("last_error"),
    ...commonAuditFields,
  },
  (table) => ({
    carrierIdx: index("dcsa_subs_carrier_idx").on(table.carrierCode),
    statusIdx: index("dcsa_subs_status_idx").on(table.status),
  }),
);

/**
 * DCSA 3.0 Events Ledger (Inbound & Outbound DCSA Telemetry)
 */
export const dcsaEventsLog = sqliteTable(
  "dcsa_events_log",
  {
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type").notNull(), // 'EQUIPMENT' | 'TRANSPORT' | 'SHIPMENT'
    eventClassifierCode: text("event_classifier_code").notNull().default("ACT"), // 'ACT' | 'EST' | 'PLN'
    eventDateTime: text("event_date_time").notNull(), // ISO 8601 string
    carrierBookingReference: text("carrier_booking_reference"),
    transportDocumentReference: text("transport_document_reference"), // B/L Number
    equipmentReference: text("equipment_reference"), // Container Number (e.g. 'MSCU9821034')
    eventTypeCode: text("event_type_code").notNull(), // 'LOAD' | 'DISC' | 'DEPA' | 'ARRI' | 'GTIN' | 'GTOT' | 'HOLD' | 'ROLL'
    locationLocode: text("location_locode").notNull(), // e.g. 'ESVLC'
    vesselImoNumber: text("vessel_imo_number"),
    vesselName: text("vessel_name"),
    voyageNumber: text("voyage_number"),
    payloadJson: text("payload_json").notNull(),
    signatureVerified: integer("signature_verified", { mode: "boolean" })
      .notNull()
      .default(true),
    scmLinkedShipmentId: text("scm_linked_shipment_id"),
    processedStatus: text("processed_status").notNull().default("PROCESSED"), // 'PROCESSED' | 'FLAGGED_EXCEPTION' | 'FAILED'
    exceptionTriggered: integer("exception_triggered", { mode: "boolean" })
      .notNull()
      .default(false),
    ...commonAuditFields,
  },
  (table) => ({
    typeIdx: index("dcsa_events_type_idx").on(table.eventType),
    bkgIdx: index("dcsa_events_bkg_idx").on(table.carrierBookingReference),
    eqIdx: index("dcsa_events_eq_idx").on(table.equipmentReference),
    scmShpIdx: index("dcsa_events_scm_shp_idx").on(table.scmLinkedShipmentId),
  }),
);

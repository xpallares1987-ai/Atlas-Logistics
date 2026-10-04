import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { companies } from "./core.js";
import { shipments } from "./operations.js";

/**
 * EDI Trading Partners configuration table (Carriers, Ocean Lines, Truckers, Customs)
 */
export const ediPartners = sqliteTable(
  "edi_partners",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").references(() => companies.id),
    name: text("name").notNull(),
    standard: text("standard").notNull(), // 'EDIFACT' | 'ANSI_X12'
    senderId: text("sender_id").notNull(), // Carrier or Atlas Partner ID (e.g. 'MAERSKLINE', 'MSCGVA')
    senderQualifier: text("sender_qualifier").notNull().default("ZZ"), // 'ZZ', '01' (DUNS), '14' (EAN)
    receiverId: text("receiver_id").notNull(), // Receiver ID (e.g. 'ATLASLOG')
    receiverQualifier: text("receiver_qualifier").notNull().default("ZZ"),
    transportProtocol: text("transport_protocol").notNull().default("REST_WEBHOOK"), // 'AS2' | 'SFTP' | 'REST_WEBHOOK'
    endpointUrl: text("endpoint_url"),
    testMode: integer("test_mode", { mode: "boolean" }).notNull().default(false),
    ...commonAuditFields,
  },
  (table) => ({
    nameIdx: index("edi_partners_name_idx").on(table.name),
    senderIdx: index("edi_partners_sender_idx").on(table.senderId),
  }),
);

/**
 * EDI Interchanges ledger (Transmissions UNB..UNZ or ISA..IEA)
 */
export const ediInterchanges = sqliteTable(
  "edi_interchanges",
  {
    id: text("id").primaryKey(),
    partnerId: text("partner_id").references(() => ediPartners.id),
    controlNumber: text("control_number").notNull(),
    direction: text("direction").notNull(), // 'INBOUND' | 'OUTBOUND'
    standard: text("standard").notNull(), // 'EDIFACT' | 'ANSI_X12'
    senderId: text("sender_id").notNull(),
    receiverId: text("receiver_id").notNull(),
    status: text("status").notNull(), // 'RECEIVED' | 'PARSED' | 'APPLIED' | 'ACKNOWLEDGED' | 'FAILED'
    rawPayload: text("raw_payload").notNull(),
    ackPayload: text("ack_payload"),
    ackStatus: text("ack_status"), // 'ACCEPTED' | 'REJECTED' | 'ACCEPTED_WITH_ERRORS'
    errorMessage: text("error_message"),
    processedAt: integer("processed_at", { mode: "timestamp" }),
    ...commonAuditFields,
  },
  (table) => ({
    controlNumIdx: index("edi_interchanges_ctrl_idx").on(table.controlNumber),
    directionIdx: index("edi_interchanges_direction_idx").on(table.direction),
    statusIdx: index("edi_interchanges_status_idx").on(table.status),
  }),
);

/**
 * Individual functional messages extracted from interchanges (UNH..UNT or ST..SE)
 */
export const ediMessages = sqliteTable(
  "edi_messages",
  {
    id: text("id").primaryKey(),
    interchangeId: text("interchange_id")
      .notNull()
      .references(() => ediInterchanges.id),
    messageType: text("message_type").notNull(), // 'IFTSTA' | 'IFTMIN' | '204' | '214' | '315' | 'CONTRL' | '997'
    controlNumber: text("control_number").notNull(),
    shipmentId: text("shipment_id").references(() => shipments.id),
    bookingReference: text("booking_reference"),
    status: text("status").notNull(), // 'PARSED' | 'APPLIED' | 'FAILED' | 'IGNORED'
    parsedContent: text("parsed_content", { mode: "json" }),
    extractedMilestone: text("extracted_milestone"), // e.g. 'IN_TRANSIT', 'DEPARTED', 'ARRIVED', 'CUSTOMS_HOLD'
    exceptionTriggered: integer("exception_triggered", { mode: "boolean" })
      .notNull()
      .default(false),
    exceptionDetails: text("exception_details"),
    processedAt: integer("processed_at", { mode: "timestamp" }),
    ...commonAuditFields,
  },
  (table) => ({
    msgTypeIdx: index("edi_messages_type_idx").on(table.messageType),
    shipmentIdx: index("edi_messages_shipment_idx").on(table.shipmentId),
  }),
);

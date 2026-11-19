/**
 * @file air_cargo_clearing.ts
 * @description Drizzle ORM schema for IATA Air Cargo Messaging (Cargo-IMP / Cargo-XML) and Agent Network Clearing & Netting.
 * @module @atlas/db/schema/air_cargo_clearing
 * @see {@link docs/adr/0029-air-cargo-messaging-cass-and-agent-network-clearing.md}
 */

import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { companies } from "./core.js";
import { shipments } from "./operations.js";
import { airwayBills } from "./air_cargo.js";
import { agentSettlements } from "./finance.js";

// ============================================================================
// 1. IATA AIR CARGO MESSAGING LEDGER (FWB, FHL, FSU, FSR, FSA)
// ============================================================================

export const airCargoMessages = sqliteTable(
  "air_cargo_messages",
  {
    id: text("id").primaryKey(),
    messageType: text("message_type", {
      enum: ["FWB", "FHL", "FSU", "FSR", "FSA"],
    }).notNull(),
    messageStandard: text("message_standard", {
      enum: ["CARGO_IMP", "CARGO_XML", "ONE_RECORD"],
    })
      .notNull()
      .default("CARGO_IMP"),
    messageVersion: text("message_version").notNull().default("16"),
    awbNumber: text("awb_number").notNull(), // PPP-NNNNNNNC
    airwayBillId: text("airway_bill_id").references(() => airwayBills.id),
    parentMawbNumber: text("parent_mawb_number"), // e.g. for FHL HAWB associations
    flightNumber: text("flight_number"),
    flightDate: text("flight_date"),
    originAirport: text("origin_airport").notNull(), // 3-letter IATA e.g. MAD
    destinationAirport: text("destination_airport").notNull(), // 3-letter IATA e.g. JFK
    milestoneCode: text("milestone_code", {
      enum: ["RCS", "DEP", "ARR", "RCF", "NFD", "AWD", "DLV", "DIS"],
    }),
    direction: text("direction", {
      enum: ["OUTBOUND_AIRLINE", "INBOUND_AIRLINE"],
    }).notNull(),
    payloadRaw: text("payload_raw").notNull(), // Raw teletype or XML
    piecesCount: integer("pieces_count").notNull().default(1),
    grossWeightKg: real("gross_weight_kg").notNull().default(0.0),
    chargeableWeightKg: real("chargeable_weight_kg").notNull().default(0.0),
    transmissionStatus: text("transmission_status", {
      enum: ["QUEUED", "SENT", "ACKNOWLEDGED", "REJECTED", "PROCESSED"],
    })
      .notNull()
      .default("QUEUED"),
    airlineAckCode: text("airline_ack_code"), // e.g. MSA (Acknowledge) or MSJ (Reject)
    airlineAckMessage: text("airline_ack_message"),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    awbIdx: index("idx_air_cargo_messages_awb").on(table.awbNumber),
    typeStatusIdx: index("idx_air_cargo_messages_type_status").on(
      table.messageType,
      table.transmissionStatus,
    ),
  }),
);

// ============================================================================
// 2. CORRESPONDING AGENT CLEARING LEDGER (DN / CN & PROFIT-SHARE SPLIT)
// ============================================================================

export const agentClearingLedger = sqliteTable(
  "agent_clearing_ledger",
  {
    id: text("id").primaryKey(),
    entryNumber: text("entry_number").notNull().unique(), // e.g. DN-2026-WCA-0012 or CN-2026-WCA-0015
    noteType: text("note_type", {
      enum: ["DEBIT_NOTE", "CREDIT_NOTE"],
    }).notNull(),
    agentCompanyId: text("agent_company_id")
      .notNull()
      .references(() => companies.id),
    shipmentId: text("shipment_id").references(() => shipments.id),
    hblOrHawbNumber: text("hbl_or_hawb_number").notNull(),
    currency: text("currency").notNull().default("USD"),
    amount: real("amount").notNull(),
    exchangeRateToEur: real("exchange_rate_to_eur").notNull().default(1.0),
    amountEur: real("amount_eur").notNull(),
    verifiedGrossProfitEur: real("verified_gross_profit_eur"),
    agentProfitSharePercent: real("agent_profit_share_percent")
      .notNull()
      .default(50.0),
    calculatedAgentShareEur: real("calculated_agent_share_eur"),
    originForwarderShareEur: real("origin_forwarder_share_eur"),
    description: text("description").notNull(),
    clearingStatus: text("clearing_status", {
      enum: ["OPEN", "MATCHED", "DISPUTED", "SETTLED_NETTED"],
    })
      .notNull()
      .default("OPEN"),
    settlementId: text("settlement_id").references(() => agentSettlements.id),
    disputeReason: text("dispute_reason"),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    agentStatusIdx: index("idx_agent_clearing_agent_status").on(
      table.agentCompanyId,
      table.clearingStatus,
    ),
    hblIdx: index("idx_agent_clearing_hbl").on(table.hblOrHawbNumber),
  }),
);

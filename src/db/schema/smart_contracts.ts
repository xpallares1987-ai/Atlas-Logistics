import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { shipments } from "./operations.js";

export const smartEscrowContracts = sqliteTable(
  "smart_escrow_contracts",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .unique()
      .references(() => shipments.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    carrierScac: text("carrier_scac").notNull(),
    shipperName: text("shipper_name").notNull(),
    consigneeName: text("consignee_name").notNull(),
    escrowAmountEur: real("escrow_amount_eur").notNull(),
    escrowStatus: text("escrow_status", {
      enum: ["FUNDED", "MILESTONE_IN_PROGRESS", "SETTLED", "DISPUTED"],
    })
      .notNull()
      .default("FUNDED"),
    disputeReason: text("dispute_reason"),
    eblDataJson: text("ebl_data_json").notNull(),
    milestonesDataJson: text("milestones_data_json").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    shipmentIdx: index("escrow_shipment_idx").on(table.shipmentId),
  }),
);

export const blockchainBlocks = sqliteTable(
  "blockchain_blocks",
  {
    id: text("id").primaryKey(),
    contractId: text("contract_id")
      .notNull()
      .references(() => smartEscrowContracts.id, { onDelete: "cascade" }),
    blockNumber: integer("block_number").notNull(),
    timestamp: text("timestamp").notNull(),
    previousHash: text("previous_hash").notNull(),
    blockHash: text("block_hash").notNull(),
    eventType: text("event_type").notNull(),
    payloadDataJson: text("payload_data_json").notNull(),
    signer: text("signer").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    contractIdx: index("blk_contract_idx").on(table.contractId),
    blockNumIdx: index("blk_num_idx").on(table.contractId, table.blockNumber),
    hashIdx: index("blk_hash_idx").on(table.blockHash),
  }),
);

import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { shipments } from "./operations.js";
import { documents } from "./support.js";

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

// ============================================================================
// MLETR ELECTRONIC TRANSFERABLE RECORDS (UNCITRAL Model Law & UCP 600)
// ============================================================================

export const mletrTransferableRecords = sqliteTable(
  "mletr_transferable_records",
  {
    id: text("id").primaryKey(), // mletr_...
    documentId: text("document_id").references(() => documents.id, {
      onDelete: "cascade",
    }),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    registryType: text("registry_type", {
      enum: [
        "ELECTRONIC_BILL_OF_LADING",
        "ELECTRONIC_AIR_WAYBILL",
        "ELECTRONIC_CMR",
      ],
    })
      .notNull()
      .default("ELECTRONIC_BILL_OF_LADING"),
    documentReference: text("document_reference").notNull(), // e.g. HBL-BK-2026-67116 or 075-88192031
    status: text("status", {
      enum: ["ISSUED", "PLEDGED", "ENDORSED", "SURRENDERED", "VOIDED"],
    })
      .notNull()
      .default("ISSUED"),
    currentHolder: text("current_holder").notNull(),
    currentHolderRole: text("current_holder_role", {
      enum: ["SHIPPER", "BANK", "CONSIGNEE", "CARRIER"],
    })
      .notNull()
      .default("SHIPPER"),
    issuerName: text("issuer_name").notNull(),
    consigneeName: text("consignee_name").notNull(),
    totalEndorsements: integer("total_endorsements").notNull().default(1),
    genesisHash: text("genesis_hash").notNull(),
    latestTxHash: text("latest_tx_hash").notNull(),
    isSurrendered: integer("is_surrendered", { mode: "boolean" })
      .notNull()
      .default(false),
    surrenderedAt: integer("surrendered_at", { mode: "timestamp" }),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    shipmentIdx: index("mletr_shipment_idx").on(table.shipmentId),
    docIdx: index("mletr_doc_idx").on(table.documentId),
    refIdx: index("mletr_ref_idx").on(table.documentReference),
    statusIdx: index("mletr_status_idx").on(table.status),
  }),
);

export const mletrEndorsementsLedger = sqliteTable(
  "mletr_endorsements_ledger",
  {
    id: text("id").primaryKey(), // blk_...
    recordId: text("record_id")
      .notNull()
      .references(() => mletrTransferableRecords.id, { onDelete: "cascade" }),
    blockNumber: integer("block_number").notNull(),
    previousHash: text("previous_hash").notNull(),
    txHash: text("tx_hash").notNull(),
    transferType: text("transfer_type", {
      enum: [
        "ORIGINAL_ISSUE",
        "PLEDGE_TO_BANK",
        "SPECIAL_ENDORSEMENT",
        "SURRENDER_FOR_RELEASE",
        "VOID_RECORD",
      ],
    }).notNull(),
    fromParty: text("from_party").notNull(),
    toParty: text("to_party").notNull(),
    signerName: text("signer_name").notNull(),
    signerTitle: text("signer_title"),
    signerCertificate: text("signer_certificate"),
    signature: text("signature").notNull(),
    details: text("details").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    recordIdx: index("mletr_ledger_rec_idx").on(table.recordId),
    blockSeqIdx: index("mletr_ledger_seq_idx").on(
      table.recordId,
      table.blockNumber,
    ),
    txHashIdx: index("mletr_ledger_hash_idx").on(table.txHash),
  }),
);

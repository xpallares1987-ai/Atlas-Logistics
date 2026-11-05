import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { shipments } from "./operations.js";

export const erpPurchaseOrders = sqliteTable(
  "erp_purchase_orders",
  {
    id: text("id").primaryKey(),
    poNumber: text("po_number").notNull().unique(),
    erpSystem: text("erp_system", {
      enum: ["SAP_S4HANA", "ORACLE_NETSUITE"],
    }).notNull(),
    shipmentId: text("shipment_id").references(() => shipments.id, {
      onDelete: "set null",
    }),
    vendorName: text("vendor_name").notNull(),
    companyCode: text("company_code").notNull(),
    purchasingGroup: text("purchasing_group").notNull(),
    totalAmount: real("total_amount").notNull(),
    currency: text("currency").notNull().default("EUR"),
    status: text("status", {
      enum: [
        "RELEASED",
        "IN_TRANSIT",
        "GOODS_RECEIPT_POSTED",
        "INVOICE_VERIFIED",
      ],
    })
      .notNull()
      .default("RELEASED"),
    lineItemsJson: text("line_items_json").notNull(),
    grnNumber: text("grn_number"),
    freightAccrualDocNumber: text("freight_accrual_doc_number"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    poNumIdx: index("erp_po_num_idx").on(table.poNumber),
    shipmentIdx: index("erp_shipment_idx").on(table.shipmentId),
    sysIdx: index("erp_system_idx").on(table.erpSystem),
  }),
);

export const erpSyncLogs = sqliteTable(
  "erp_sync_logs",
  {
    id: text("id").primaryKey(),
    poId: text("po_id").references(() => erpPurchaseOrders.id, {
      onDelete: "cascade",
    }),
    erpSystem: text("erp_system").notNull(),
    operation: text("operation").notNull(),
    status: text("status", {
      enum: ["SUCCESS", "FAILED", "PENDING_RETRY"],
    }).notNull(),
    requestPayloadJson: text("request_payload_json"),
    responsePayloadJson: text("response_payload_json"),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    poIdx: index("erp_log_po_idx").on(table.poId),
    statusIdx: index("erp_log_status_idx").on(table.status),
  }),
);

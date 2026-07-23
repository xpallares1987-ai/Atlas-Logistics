import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  real,
  date,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "DRAFT",
  "CONFIRMED",
  "DOCUMENTATION",
  "ON_BOARD",
  "BOOKED",
  "IN_TRANSIT",
  "ARRIVED",
  "CUSTOMS_CLEARED",
  "DELIVERED",
  "CANCELLED",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "Draft",
  "Issued",
  "Pending",
  "Paid",
  "Overdue",
  "Cancelled",
]);

export const invoiceTypeEnum = pgEnum("invoice_type", ["AR", "AP", "CN", "DN"]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "PENDING",
  "SETTLED",
]);

export const companyTypeEnum = pgEnum("company_type", [
  "Customer",
  "Supplier",
  "Bank",
  "Terminal",
  "CustomBroker",
  "Haulier",
  "Carrier",
  "Agent",
  "Depot",
]);

export const aiReviewStatusEnum = pgEnum("ai_review_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// ============================================================================
// CORE ENTITIES
// ============================================================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("USER"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  unlocode: varchar("unlocode", { length: 10 }).notNull().unique(), // e.g. USNYC, CNSHA
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  isSeaport: boolean("is_seaport").default(false).notNull(),
  isAirport: boolean("is_airport").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyCode: varchar("company_code", { length: 50 }).notNull().unique(), // e.g. CUST-0001
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 50 }).unique(), // UNIQUE constraint for deduplication
  street: text("street"),
  city: varchar("city", { length: 100 }),
  zipCode: varchar("zip_code", { length: 50 }),
  country: varchar("country", { length: 2 }),
  type: companyTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companyBlAliases = pgTable("company_bl_aliases", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  aliasText: text("alias_text").notNull(), // The literal text to print on B/L
  roleUsed: varchar("role_used", { length: 50 }), // 'Shipper', 'Consignee', etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// FREIGHT FORWARDING OPERATIONS
// ============================================================================

export const shipments = pgTable("shipments", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceNumber: varchar("reference_number", { length: 100 })
    .notNull()
    .unique(),

  // Commercial / Billing Anchors
  supplierId: uuid("supplier_id").references(() => companies.id), // Dueño origen
  billingPartyId: uuid("billing_party_id").references(() => companies.id), // Quien paga (Trader/Customer)

  // Documentary Anchors (B/L Texts)
  shipperAliasId: uuid("shipper_alias_id").references(
    () => companyBlAliases.id,
  ),
  consigneeAliasId: uuid("consignee_alias_id").references(
    () => companyBlAliases.id,
  ),
  notifyAliasId: uuid("notify_alias_id").references(() => companyBlAliases.id),

  // Routing
  originLocationId: uuid("origin_location_id").references(() => locations.id),
  destinationLocationId: uuid("destination_location_id").references(
    () => locations.id,
  ),

  // Execution
  vessel: varchar("vessel", { length: 255 }),
  voyage: varchar("voyage", { length: 100 }),
  status: shipmentStatusEnum("status").default("DRAFT").notNull(),

  // Metadata
  userId: uuid("user_id").references(() => users.id),
  documentUrl: varchar("document_url", { length: 500 }), // Deprecated, use shipmentDocuments
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("shipments_parties_idx").on(table.supplierId, table.billingPartyId),
  index("shipments_locations_idx").on(table.originLocationId, table.destinationLocationId),
  index("shipments_status_idx").on(table.status),
]);

export const lettersOfCredit = pgTable("letters_of_credit", {
  id: uuid("id").defaultRandom().primaryKey(),
  lcNumber: varchar("lc_number", { length: 100 }).notNull(),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  issuingBankId: uuid("issuing_bank_id")
    .references(() => companies.id)
    .notNull(),
  shipmentId: uuid("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shipmentContainers = pgTable("shipment_containers", {
  id: uuid("id").defaultRandom().primaryKey(),
  shipmentId: uuid("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  containerNumber: varchar("container_number", { length: 50 }).notNull(),
  isoType: varchar("iso_type", { length: 10 }).notNull(), // e.g. 22G1, 42R1
  sealNumber: varchar("seal_number", { length: 100 }),
  tareWeight: real("tare_weight"),
  vgm: real("vgm"), // Verified Gross Mass
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shipmentCommodities = pgTable("shipment_commodities", {
  id: uuid("id").defaultRandom().primaryKey(),
  shipmentId: uuid("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  hsCode: varchar("hs_code", { length: 50 }),
  description: text("description").notNull(),
  pieces: integer("pieces").notNull(),
  grossWeightKg: real("gross_weight_kg").notNull(),
  volumeCbm: real("volume_cbm").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  shipmentId: uuid("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  eventCode: varchar("event_code", { length: 50 }).notNull(), // e.g. 'GATE_IN', 'LOADED'
  locationId: uuid("location_id").references(() => locations.id),
  eventTime: timestamp("event_time").notNull(),
  isEstimated: boolean("is_estimated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shipmentDocuments = pgTable("shipment_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  shipmentId: uuid("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(), // e.g. 'BOOKING_INSTRUCTION', 'BILL_OF_LADING'
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  gcsUrl: varchar("gcs_url", { length: 500 }).notNull(),
  parsedData: jsonb("parsed_data"), // Stores AI extraction results securely
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pendingAiReviews = pgTable("pending_ai_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  shipmentId: uuid("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  documentUrl: varchar("document_url", { length: 500 }).notNull(),
  extractedData: jsonb("extracted_data").notNull(),
  confidenceScore: real("confidence_score"),
  status: aiReviewStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// FINANCIALS & QUOTING
// ============================================================================

export const rates = pgTable("rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  carrierId: uuid("carrier_id").references(() => companies.id), // Changed from string
  serviceLine: varchar("service_line", { length: 100 }).notNull(),
  originLocationId: uuid("origin_location_id").references(() => locations.id), // Changed from string
  destinationLocationId: uuid("destination_location_id").references(
    () => locations.id,
  ), // Changed from string
  transitTime: integer("transit_time").notNull(),
  validTo: date("valid_to").notNull(),
  baseOceanFreight: real("base_ocean_freight").notNull(),
  baf: real("baf").notNull(),
  pss: real("pss").notNull(),
  thc: real("thc").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteNumber: varchar("quote_number", { length: 100 }).notNull().unique(),
  customerId: uuid("customer_id")
    .references(() => companies.id)
    .notNull(), // Changed from string
  originLocationId: uuid("origin_location_id").references(() => locations.id), // Changed from string
  destinationLocationId: uuid("destination_location_id").references(
    () => locations.id,
  ), // Changed from string
  equipment: varchar("equipment", { length: 100 }).notNull(), // Could be linked to a catalog table later
  buyRateTotal: real("buy_rate_total").notNull(),
  sellMargin: real("sell_margin").notNull(),
  sellRateTotal: real("sell_rate_total").notNull(),
  status: quoteStatusEnum("status").default("DRAFT").notNull(),
  validTo: date("valid_to").notNull(),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("quotes_customer_idx").on(table.customerId),
]);

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  type: invoiceTypeEnum("type").notNull(),
  partyId: uuid("party_id")
    .references(() => companies.id)
    .notNull(),
  shipmentId: uuid("shipment_id").references(() => shipments.id),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  subtotal: real("subtotal").default(0).notNull(),
  taxAmount: real("tax_amount").default(0).notNull(),
  totalAmount: real("total_amount").notNull(),
  status: invoiceStatusEnum("status").default("Pending").notNull(),
  dueDate: date("due_date").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("invoices_party_status_idx").on(table.partyId, table.status),
]);

export const invoiceLines = pgTable("invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .references(() => invoices.id)
    .notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull(),
  amount: real("amount").notNull(),
  taxRate: real("tax_rate").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentSettlements = pgTable("agent_settlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  statementNumber: varchar("statement_number", { length: 100 })
    .notNull()
    .unique(),
  agentId: uuid("agent_id")
    .references(() => companies.id)
    .notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  netBalance: real("net_balance").notNull(), // Positive if we owe them, negative if they owe us
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  status: settlementStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settlementInvoices = pgTable("settlement_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  settlementId: uuid("settlement_id")
    .references(() => agentSettlements.id)
    .notNull(),
  invoiceId: uuid("invoice_id")
    .references(() => invoices.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  shipments: many(shipments),
  quotes: many(quotes),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  aliases: many(companyBlAliases),
  suppliedShipments: many(shipments, { relationName: "supplierShipments" }),
  billedShipments: many(shipments, { relationName: "billedShipments" }),
  invoices: many(invoices),
  quotes: many(quotes),
}));

export const companyBlAliasesRelations = relations(
  companyBlAliases,
  ({ one }) => ({
    company: one(companies, {
      fields: [companyBlAliases.companyId],
      references: [companies.id],
    }),
  }),
);

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  user: one(users, {
    fields: [shipments.userId],
    references: [users.id],
  }),
  supplier: one(companies, {
    fields: [shipments.supplierId],
    references: [companies.id],
    relationName: "supplierShipments",
  }),
  billingParty: one(companies, {
    fields: [shipments.billingPartyId],
    references: [companies.id],
    relationName: "billedShipments",
  }),
  shipperAlias: one(companyBlAliases, {
    fields: [shipments.shipperAliasId],
    references: [companyBlAliases.id],
  }),
  consigneeAlias: one(companyBlAliases, {
    fields: [shipments.consigneeAliasId],
    references: [companyBlAliases.id],
  }),
  notifyAlias: one(companyBlAliases, {
    fields: [shipments.notifyAliasId],
    references: [companyBlAliases.id],
  }),
  origin: one(locations, {
    fields: [shipments.originLocationId],
    references: [locations.id],
  }),
  destination: one(locations, {
    fields: [shipments.destinationLocationId],
    references: [locations.id],
  }),
  containers: many(shipmentContainers),
  commodities: many(shipmentCommodities),
  milestones: many(milestones),
  invoices: many(invoices),
  lettersOfCredit: many(lettersOfCredit),
}));

export const lettersOfCreditRelations = relations(
  lettersOfCredit,
  ({ one }) => ({
    shipment: one(shipments, {
      fields: [lettersOfCredit.shipmentId],
      references: [shipments.id],
    }),
    issuingBank: one(companies, {
      fields: [lettersOfCredit.issuingBankId],
      references: [companies.id],
    }),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [invoices.shipmentId],
    references: [shipments.id],
  }),
  party: one(companies, {
    fields: [invoices.partyId],
    references: [companies.id],
  }),
  lines: many(invoiceLines),
  settlements: many(settlementInvoices),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
}));

export const agentSettlementsRelations = relations(
  agentSettlements,
  ({ one, many }) => ({
    agent: one(companies, {
      fields: [agentSettlements.agentId],
      references: [companies.id],
    }),
    invoices: many(settlementInvoices),
  }),
);

export const settlementInvoicesRelations = relations(
  settlementInvoices,
  ({ one }) => ({
    settlement: one(agentSettlements, {
      fields: [settlementInvoices.settlementId],
      references: [agentSettlements.id],
    }),
    invoice: one(invoices, {
      fields: [settlementInvoices.invoiceId],
      references: [invoices.id],
    }),
  }),
);

// ============================================================================
// WAREHOUSE (WMS)
// ============================================================================

export const deviceTypeEnum = pgEnum("device_type", [
  "TRUCK",
  "WAGON",
  "CONTAINER_20",
  "CONTAINER_40",
]);

export const trafficStatusEnum = pgEnum("traffic_status", [
  "WAITING",
  "DOCK_ASSIGNED",
  "LOADING",
  "UNLOADING",
  "DISPATCHED",
]);

export const warehouseZoneEnum = pgEnum("warehouse_zone", [
  "DRY",
  "COLD",
  "HAZMAT",
  "CROSS_DOCK",
]);

export const warehouseTraffic = pgTable("warehouse_traffic", {
  id: uuid("id").defaultRandom().primaryKey(),
  shipmentId: uuid("shipment_id").references(() => shipments.id), // Link to Shipments
  driverName: varchar("driver_name", { length: 255 }),
  deviceNumber: varchar("device_number", { length: 100 }).notNull(), // Matricula/Vagón
  deviceType: deviceTypeEnum("device_type").notNull(),
  status: trafficStatusEnum("status").default("WAITING").notNull(),
  eta: timestamp("eta"),
  assignedDock: varchar("assigned_dock", { length: 50 }),
  cargoDescription: text("cargo_description"),
  totalWeightExpected: real("total_weight_expected"),
  expectedQuantity: integer("expected_quantity"),
  type: varchar("type", { length: 20 }).notNull(), // 'INBOUND' or 'OUTBOUND'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const warehouseInventory = pgTable("warehouse_inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  warehouseId: uuid("warehouse_id")
    .references(() => locations.id)
    .notNull(),
  ownership: varchar("ownership", { length: 20 }).notNull().default("INTERNAL"), // 'INTERNAL' vs 'EXTERNAL'
  customerId: uuid("customer_id").references(() => companies.id),
  buyerId: uuid("buyer_id").references(() => companies.id),
  productCode: varchar("product_code", { length: 100 }).notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  zone: warehouseZoneEnum("zone").default("DRY").notNull(),

  // Advanced Metadata mapped from Shipments parsing
  grammage: real("grammage"), // GM
  diameter: real("diameter"), // CM
  rollWidth: real("roll_width"), // CM
  rollLength: real("roll_length"), // CM
  netWeight: real("net_weight"), // Kgs
  grossWeight: real("gross_weight"), // Kgs
  purchaseOrder: varchar("purchase_order", { length: 100 }), // PO
  customerOrder: varchar("customer_order", { length: 100 }), // CO
  sealNumber: varchar("seal_number", { length: 100 }),

  receivedAt: timestamp("received_at").defaultNow().notNull(),
  status: varchar("status", { length: 50 }).default("IN_STOCK").notNull(), // IN_STOCK, RESERVED, DISPATCHED
});

export const warehouseTrafficRelations = relations(
  warehouseTraffic,
  ({ one }) => ({
    shipment: one(shipments, {
      fields: [warehouseTraffic.shipmentId],
      references: [shipments.id],
    }),
  }),
);

export const warehouseInventoryRelations = relations(
  warehouseInventory,
  ({ one }) => ({
    warehouse: one(locations, {
      fields: [warehouseInventory.warehouseId],
      references: [locations.id],
    }),
    customer: one(companies, {
      fields: [warehouseInventory.customerId],
      references: [companies.id],
    }),
    buyer: one(companies, {
      fields: [warehouseInventory.buyerId],
      references: [companies.id],
    }),
  }),
);

// ============================================================================
// WEBHOOKS
// ============================================================================

export const webhooks = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => companies.id), // Si es multi-tenant
  endpointUrl: varchar("endpoint_url", { length: 500 }).notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  events: jsonb("events").notNull(), // array of strings (e.g. ["shipment.created", "invoice.paid"])
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookId: uuid("webhook_id").references(() => webhooks.id).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // 'SUCCESS' or 'FAILED'
  responseCode: integer("response_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhooksRelations = relations(webhooks, ({ many }) => ({
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));

import {
  pgTable,
  serial,
  varchar,
  decimal,
  date,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "Booked",
  "Received",
  "OnBoard",
  "Discharged",
  "Delivered",
]);
export const shipmentModeEnum = pgEnum("shipment_mode", [
  "Ocean FCL",
  "Ocean LCL",
  "Air",
  "Road",
]);
export const shipmentTypeEnum = pgEnum("shipment_type", [
  "Direct",
  "MBL",
  "HBL",
]);
export const incotermEnum = pgEnum("incoterm", [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
]);
export const containerTypeEnum = pgEnum("container_type", [
  "20DC",
  "40DC",
  "40HQ",
  "45HQ",
  "LCL",
]);
export const quoteStatusEnum = pgEnum("quote_status", [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "Draft",
  "Issued",
  "Paid",
  "Overdue",
  "Cancelled",
]);
export const invoiceTypeEnum = pgEnum("invoice_type", ["AR", "AP"]);
export const customsStatusEnum = pgEnum("customs_status", [
  "Pending",
  "Submitted",
  "UnderReview",
  "Cleared",
  "Rejected",
]);
export const movementTypeEnum = pgEnum("movement_type", [
  "Receiving",
  "Putaway",
  "Picking",
  "Dispatch",
  "Adjustment",
]);
export const userRoleEnum = pgEnum("user_role", ["admin", "agent", "carrier"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: userRoleEnum("role").default("agent").notNull(),
  carrier_id: integer("carrier_id").references(() => carriers.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  carrier: one(carriers, {
    fields: [users.carrier_id],
    references: [carriers.id],
  }),
}));

export const carriersRelations = relations(carriers, ({ many }) => ({
  shipments: many(shipments),
  freight_rates: many(freight_rates),
  users: many(users),
  invoices: many(invoices),
}));

export const freight_rates = pgTable(
  "freight_rates",
  {
    id: serial("id").primaryKey(),
    carrier_id: integer("carrier_id")
      .references(() => carriers.id)
      .notNull(),
    origin_port: varchar("origin_port", { length: 100 }).notNull(),
    destination_port: varchar("destination_port", { length: 100 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    base_rate: decimal("base_rate", { precision: 12, scale: 2 }).notNull(),
    valid_from: date("valid_from").notNull(),
    valid_to: date("valid_to").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      carrierIdx: index("fr_carrier_id_idx").on(table.carrier_id),
      originIdx: index("origin_port_idx").on(table.origin_port),
      destinationIdx: index("destination_port_idx").on(table.destination_port),
      validToIdx: index("valid_to_idx").on(table.valid_to),
    };
  },
);

export const freightRatesRelations = relations(
  freight_rates,
  ({ one, many }) => ({
    carrier: one(carriers, {
      fields: [freight_rates.carrier_id],
      references: [carriers.id],
    }),
    surcharges: many(surcharges),
  }),
);

export const surcharge_types = pgTable("surcharge_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: varchar("description", { length: 255 }),
});

export const surchargeTypesRelations = relations(
  surcharge_types,
  ({ many }) => ({
    surcharges: many(surcharges),
  }),
);

export const surcharges = pgTable(
  "surcharges",
  {
    id: serial("id").primaryKey(),
    freight_rate_id: integer("freight_rate_id")
      .references(() => freight_rates.id)
      .notNull(),
    surcharge_type_id: integer("surcharge_type_id")
      .references(() => surcharge_types.id)
      .notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
  },
  (table) => {
    return {
      freightRateIdx: index("surch_fr_id_idx").on(table.freight_rate_id),
      typeIdx: index("surch_type_id_idx").on(table.surcharge_type_id),
    };
  },
);

export const surchargesRelations = relations(surcharges, ({ one }) => ({
  freightRate: one(freight_rates, {
    fields: [surcharges.freight_rate_id],
    references: [freight_rates.id],
  }),
  type: one(surcharge_types, {
    fields: [surcharges.surcharge_type_id],
    references: [surcharge_types.id],
  }),
}));

export const shipments = pgTable(
  "shipments",
  {
    id: serial("id").primaryKey(),
    customer_id: integer("customer_id").references(() => customers.id),
    booking_reference: varchar("booking_reference", { length: 100 }),
    tracking_number: varchar("tracking_number", { length: 100 })
      .notNull()
      .unique(),
    carrier_id: integer("carrier_id")
      .references(() => carriers.id)
      .notNull(),
    type: shipmentTypeEnum("type").default("Direct").notNull(),
    parent_shipment_id: integer("parent_shipment_id"),
    incoterm: incotermEnum("incoterm"),
    origin_agent_id: integer("origin_agent_id").references(() => customers.id),
    destination_agent_id: integer("destination_agent_id").references(
      () => customers.id,
    ),
    mode: shipmentModeEnum("mode").default("Ocean FCL").notNull(),
    origin_port: varchar("origin_port", { length: 10 })
      .default("CNSHA")
      .notNull(),
    destination_port: varchar("destination_port", { length: 10 })
      .default("ESBCN")
      .notNull(),
    status: shipmentStatusEnum("status").default("Booked").notNull(),
    ets: timestamp("ets", { withTimezone: true }),
    eta: timestamp("eta", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      trackingIdx: index("tracking_number_idx").on(table.tracking_number),
      carrierIdx: index("ship_carrier_id_idx").on(table.carrier_id),
      statusIdx: index("status_idx").on(table.status),
      parentShipmentIdx: index("parent_shipment_idx").on(
        table.parent_shipment_id,
      ),
    };
  },
);

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  carrier: one(carriers, {
    fields: [shipments.carrier_id],
    references: [carriers.id],
  }),
  customer: one(customers, {
    fields: [shipments.customer_id],
    references: [customers.id],
  }),
  parent_shipment: one(shipments, {
    fields: [shipments.parent_shipment_id],
    references: [shipments.id],
    relationName: "child_shipments",
  }),
  child_shipments: many(shipments, { relationName: "child_shipments" }),
  origin_agent: one(customers, {
    fields: [shipments.origin_agent_id],
    references: [customers.id],
    relationName: "origin_agent",
  }),
  destination_agent: one(customers, {
    fields: [shipments.destination_agent_id],
    references: [customers.id],
    relationName: "destination_agent",
  }),
  events: many(shipment_events),
  invoices: many(invoices),
  customs_declarations: many(customs_declarations),
  stock_items: many(stock_items),
  containers: many(containers),
  house_containers: many(house_containers),
}));

export const containers = pgTable("containers", {
  id: serial("id").primaryKey(),
  shipment_id: integer("shipment_id")
    .references(() => shipments.id)
    .notNull(), // MBL or Direct
  container_number: varchar("container_number", { length: 20 }).notNull(),
  type: containerTypeEnum("type").notNull(),
  seal_number: varchar("seal_number", { length: 50 }),
  gross_weight: decimal("gross_weight", { precision: 12, scale: 2 }),
  volume: decimal("volume", { precision: 12, scale: 2 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const containersRelations = relations(containers, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [containers.shipment_id],
    references: [shipments.id],
  }),
  house_containers: many(house_containers),
}));

export const house_containers = pgTable("house_containers", {
  id: serial("id").primaryKey(),
  house_shipment_id: integer("house_shipment_id")
    .references(() => shipments.id)
    .notNull(), // HBL
  container_id: integer("container_id")
    .references(() => containers.id)
    .notNull(),
  allocated_weight: decimal("allocated_weight", { precision: 12, scale: 2 }),
  allocated_volume: decimal("allocated_volume", { precision: 12, scale: 2 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const houseContainersRelations = relations(
  house_containers,
  ({ one }) => ({
    house_shipment: one(shipments, {
      fields: [house_containers.house_shipment_id],
      references: [shipments.id],
    }),
    container: one(containers, {
      fields: [house_containers.container_id],
      references: [containers.id],
    }),
  }),
);

export const shipment_events = pgTable("shipment_events", {
  id: serial("id").primaryKey(),
  shipment_id: integer("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  status: shipmentStatusEnum("status").notNull(),
  location: varchar("location", { length: 255 }),
  description: varchar("description", { length: 500 }),
  event_time: timestamp("event_time", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shipmentEventsRelations = relations(
  shipment_events,
  ({ one }) => ({
    shipment: one(shipments, {
      fields: [shipment_events.shipment_id],
      references: [shipments.id],
    }),
  }),
);

export const audit_logs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    table_name: varchar("table_name", { length: 50 }).notNull(),
    record_id: integer("record_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    old_data: jsonb("old_data"),
    new_data: jsonb("new_data"),
    changed_by: varchar("changed_by", { length: 255 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      tableRecordIdx: index("audit_table_record_idx").on(
        table.table_name,
        table.record_id,
      ),
    };
  },
);

export const documents = pgTable("documents", {
  id: varchar("id", { length: 50 }).primaryKey(),
  booking_ref: varchar("booking_ref", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  document_number: varchar("document_number", { length: 100 }).notNull(),
  issue_date: varchar("issue_date", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Phase 1: CRM Models

export const customerStatusEnum = pgEnum("customer_status", [
  "Active",
  "Inactive",
]);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  tax_id: varchar("tax_id", { length: 100 }),
  type: varchar("type", { length: 50 }).default("Cliente"),
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state_prov: varchar("state_prov", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postal_code: varchar("postal_code", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  contact_person: varchar("contact_person", { length: 255 }),
  notes: varchar("notes", { length: 1000 }),
  status: customerStatusEnum("status").default("Active").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  first_name: varchar("first_name", { length: 100 }).notNull(),
  last_name: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  is_primary: boolean("is_primary").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rate_agreements = pgTable("rate_agreements", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  valid_from: date("valid_from").notNull(),
  valid_to: date("valid_to").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rate_agreement_items = pgTable("rate_agreement_items", {
  id: serial("id").primaryKey(),
  rate_agreement_id: integer("rate_agreement_id")
    .references(() => rate_agreements.id)
    .notNull(),
  freight_rate_id: integer("freight_rate_id")
    .references(() => freight_rates.id)
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Phase 1: CRM Relations

export const customersRelations = relations(customers, ({ many }) => ({
  contacts: many(contacts),
  rate_agreements: many(rate_agreements),
  shipments: many(shipments),
  quotes: many(quotes),
  invoices: many(invoices),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  customer: one(customers, {
    fields: [contacts.customer_id],
    references: [customers.id],
  }),
}));

export const rateAgreementsRelations = relations(
  rate_agreements,
  ({ one, many }) => ({
    customer: one(customers, {
      fields: [rate_agreements.customer_id],
      references: [customers.id],
    }),
    items: many(rate_agreement_items),
  }),
);

export const rateAgreementItemsRelations = relations(
  rate_agreement_items,
  ({ one }) => ({
    rate_agreement: one(rate_agreements, {
      fields: [rate_agreement_items.rate_agreement_id],
      references: [rate_agreements.id],
    }),
    freight_rate: one(freight_rates, {
      fields: [rate_agreement_items.freight_rate_id],
      references: [freight_rates.id],
    }),
  }),
);

export const diagram_versions = pgTable("diagram_versions", {
  id: serial("id").primaryKey(),
  diagram_id: varchar("diagram_id", { length: 100 }).notNull(),
  author_id: varchar("author_id", { length: 100 }),
  xml: jsonb("xml").notNull(),
  label: varchar("label", { length: 255 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Phase 3: Quoting Models

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  origin_port: varchar("origin_port", { length: 100 }).notNull(),
  destination_port: varchar("destination_port", { length: 100 }).notNull(),
  valid_until: date("valid_until").notNull(),
  status: quoteStatusEnum("status").default("Draft").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const quote_options = pgTable("quote_options", {
  id: serial("id").primaryKey(),
  quote_id: integer("quote_id")
    .references(() => quotes.id)
    .notNull(),
  freight_rate_id: integer("freight_rate_id")
    .references(() => freight_rates.id)
    .notNull(),
  margin_percentage: decimal("margin_percentage", { precision: 5, scale: 2 }),
  total_price: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotes.customer_id],
    references: [customers.id],
  }),
  options: many(quote_options),
}));

export const quoteOptionsRelations = relations(quote_options, ({ one }) => ({
  quote: one(quotes, {
    fields: [quote_options.quote_id],
    references: [quotes.id],
  }),
  freight_rate: one(freight_rates, {
    fields: [quote_options.freight_rate_id],
    references: [freight_rates.id],
  }),
}));

// Phase 4: Financial Models

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  shipment_id: integer("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  customer_id: integer("customer_id").references(() => customers.id),
  carrier_id: integer("carrier_id").references(() => carriers.id),
  type: invoiceTypeEnum("type").notNull(),
  invoice_number: varchar("invoice_number", { length: 100 }).unique().notNull(),
  status: invoiceStatusEnum("status").default("Draft").notNull(),
  due_date: date("due_date").notNull(),
  total_amount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const invoice_items = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoice_id: integer("invoice_id")
    .references(() => invoices.id)
    .notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unit_price: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  total_price: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [invoices.shipment_id],
    references: [shipments.id],
  }),
  customer: one(customers, {
    fields: [invoices.customer_id],
    references: [customers.id],
  }),
  carrier: one(carriers, {
    fields: [invoices.carrier_id],
    references: [carriers.id],
  }),
  items: many(invoice_items),
}));

export const invoiceItemsRelations = relations(invoice_items, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoice_items.invoice_id],
    references: [invoices.id],
  }),
}));

// Phase 5: Customs & Compliance Models

export const hs_codes = pgTable("hs_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  duty_rate: decimal("duty_rate", { precision: 5, scale: 2 }).notNull(),
});

export const customs_declarations = pgTable("customs_declarations", {
  id: serial("id").primaryKey(),
  shipment_id: integer("shipment_id")
    .references(() => shipments.id)
    .notNull(),
  broker_name: varchar("broker_name", { length: 100 }),
  status: customsStatusEnum("status").default("Pending").notNull(),
  submission_date: timestamp("submission_date", { withTimezone: true }),
  clearance_date: timestamp("clearance_date", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const customs_declaration_items = pgTable("customs_declaration_items", {
  id: serial("id").primaryKey(),
  declaration_id: integer("declaration_id")
    .references(() => customs_declarations.id)
    .notNull(),
  hs_code_id: integer("hs_code_id")
    .references(() => hs_codes.id)
    .notNull(),
  commercial_description: varchar("commercial_description", {
    length: 255,
  }).notNull(),
  declared_value: decimal("declared_value", {
    precision: 12,
    scale: 2,
  }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  weight_kg: decimal("weight_kg", { precision: 10, scale: 2 }).notNull(),
});

export const customsDeclarationsRelations = relations(
  customs_declarations,
  ({ one, many }) => ({
    shipment: one(shipments, {
      fields: [customs_declarations.shipment_id],
      references: [shipments.id],
    }),
    items: many(customs_declaration_items),
  }),
);

export const customsDeclarationItemsRelations = relations(
  customs_declaration_items,
  ({ one }) => ({
    declaration: one(customs_declarations, {
      fields: [customs_declaration_items.declaration_id],
      references: [customs_declarations.id],
    }),
    hs_code: one(hs_codes, {
      fields: [customs_declaration_items.hs_code_id],
      references: [hs_codes.id],
    }),
  }),
);

// Phase 6: WMS (Warehouse Management System) Models

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location_address: varchar("location_address", { length: 500 }).notNull(),
});

export const stock_items = pgTable("stock_items", {
  id: serial("id").primaryKey(),
  warehouse_id: integer("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  shipment_id: integer("shipment_id").references(() => shipments.id),
  sku: varchar("sku", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity_on_hand: integer("quantity_on_hand").notNull().default(0),
  weight_kg: decimal("weight_kg", { precision: 10, scale: 2 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const inventory_movements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  stock_item_id: integer("stock_item_id")
    .references(() => stock_items.id)
    .notNull(),
  movement_type: movementTypeEnum("movement_type").notNull(),
  quantity_change: integer("quantity_change").notNull(),
  reference_note: varchar("reference_note", { length: 500 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  stock_items: many(stock_items),
}));

export const stockItemsRelations = relations(stock_items, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [stock_items.warehouse_id],
    references: [warehouses.id],
  }),
  shipment: one(shipments, {
    fields: [stock_items.shipment_id],
    references: [shipments.id],
  }),
  movements: many(inventory_movements),
}));

export const inventoryMovementsRelations = relations(
  inventory_movements,
  ({ one }) => ({
    stock_item: one(stock_items, {
      fields: [inventory_movements.stock_item_id],
      references: [stock_items.id],
    }),
  }),
);

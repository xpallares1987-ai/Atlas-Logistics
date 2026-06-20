import { pgTable, serial, varchar, decimal, date, integer, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const shipmentStatusEnum = pgEnum('shipment_status', ['Booked', 'Received', 'OnBoard', 'Discharged', 'Delivered']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'agent', 'carrier']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: userRoleEnum('role').default('agent').notNull(),
  carrier_id: integer('carrier_id').references(() => carriers.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const carriers = pgTable('carriers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  carrier: one(carriers, {
    fields: [users.carrier_id],
    references: [carriers.id],
  }),
}));

export const carriersRelations = relations(carriers, ({ many }) => ({
  shipments: many(shipments),
  freightRates: many(freight_rates),
}));

export const freight_rates = pgTable('freight_rates', {
  id: serial('id').primaryKey(),
  carrier_id: integer('carrier_id').references(() => carriers.id).notNull(),
  origin_port: varchar('origin_port', { length: 100 }).notNull(),
  destination_port: varchar('destination_port', { length: 100 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  base_rate: decimal('base_rate', { precision: 12, scale: 2 }).notNull(),
  valid_from: date('valid_from').notNull(),
  valid_to: date('valid_to').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    carrierIdx: index('fr_carrier_id_idx').on(table.carrier_id),
    originIdx: index('origin_port_idx').on(table.origin_port),
    destinationIdx: index('destination_port_idx').on(table.destination_port),
    validToIdx: index('valid_to_idx').on(table.valid_to)
  };
});

export const freightRatesRelations = relations(freight_rates, ({ one, many }) => ({
  carrier: one(carriers, {
    fields: [freight_rates.carrier_id],
    references: [carriers.id],
  }),
  surcharges: many(surcharges),
}));

export const surcharge_types = pgTable('surcharge_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }),
});

export const surchargeTypesRelations = relations(surcharge_types, ({ many }) => ({
  surcharges: many(surcharges),
}));

export const surcharges = pgTable('surcharges', {
  id: serial('id').primaryKey(),
  freight_rate_id: integer('freight_rate_id').references(() => freight_rates.id).notNull(),
  surcharge_type_id: integer('surcharge_type_id').references(() => surcharge_types.id).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
}, (table) => {
  return {
    freightRateIdx: index('surch_fr_id_idx').on(table.freight_rate_id),
    typeIdx: index('surch_type_id_idx').on(table.surcharge_type_id)
  };
});

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

export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  tracking_number: varchar('tracking_number', { length: 100 }).notNull().unique(),
  carrier_id: integer('carrier_id').references(() => carriers.id).notNull(),
  origin_port: varchar('origin_port', { length: 10 }).default('CNSHA').notNull(),
  destination_port: varchar('destination_port', { length: 10 }).default('ESBCN').notNull(),
  status: shipmentStatusEnum('status').default('Booked').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    trackingIdx: index('tracking_number_idx').on(table.tracking_number),
    carrierIdx: index('ship_carrier_id_idx').on(table.carrier_id),
    statusIdx: index('status_idx').on(table.status)
  };
});

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  carrier: one(carriers, {
    fields: [shipments.carrier_id],
    references: [carriers.id],
  }),
}));

export const audit_logs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  table_name: varchar('table_name', { length: 50 }).notNull(),
  record_id: integer('record_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  old_data: jsonb('old_data'),
  new_data: jsonb('new_data'),
  changed_by: varchar('changed_by', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    tableRecordIdx: index('audit_table_record_idx').on(table.table_name, table.record_id)
  };
});

export const documents = pgTable('documents', {
  id: varchar('id', { length: 50 }).primaryKey(),
  booking_ref: varchar('booking_ref', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  document_number: varchar('document_number', { length: 100 }).notNull(),
  issue_date: varchar('issue_date', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
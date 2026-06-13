import { pgTable, serial, varchar, decimal, date, integer, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';

export const shipmentStatusEnum = pgEnum('shipment_status', ['Booked', 'Received', 'OnBoard', 'Discharged', 'Delivered']);

export const carriers = pgTable('carriers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

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
});

export const surcharge_types = pgTable('surcharge_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }),
});

export const surcharges = pgTable('surcharges', {
  id: serial('id').primaryKey(),
  freight_rate_id: integer('freight_rate_id').references(() => freight_rates.id).notNull(),
  surcharge_type_id: integer('surcharge_type_id').references(() => surcharge_types.id).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
});

export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  tracking_number: varchar('tracking_number', { length: 100 }).notNull().unique(),
  carrier_id: integer('carrier_id').references(() => carriers.id).notNull(),
  status: shipmentStatusEnum('status').default('Booked').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const audit_logs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  table_name: varchar('table_name', { length: 50 }).notNull(),
  record_id: integer('record_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  old_data: jsonb('old_data'),
  new_data: jsonb('new_data'),
  changed_by: varchar('changed_by', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
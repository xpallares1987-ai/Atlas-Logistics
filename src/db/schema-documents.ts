import { pgTable, varchar, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { shipments } from './schema.js';

export const bill_of_ladings = pgTable('bill_of_ladings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  shipment_id: integer('shipment_id').references(() => shipments.id).notNull(),
  version: integer('version').notNull(),
  shipper: text('shipper').notNull(),
  consignee: text('consignee').notNull(),
  cargo_details: text('cargo_details').notNull(),
  previous_version_id: varchar('previous_version_id', { length: 36 }),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
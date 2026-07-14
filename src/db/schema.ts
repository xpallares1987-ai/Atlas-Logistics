import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, real, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const shipmentStatusEnum = pgEnum('shipment_status', [
  'DRAFT',
  'CONFIRMED',
  'DOCUMENTATION',
  'ON_BOARD',
  'BOOKED',
  'IN_TRANSIT',
  'ARRIVED',
  'CUSTOMS_CLEARED',
  'DELIVERED',
  'CANCELLED'
]);

export const quoteStatusEnum = pgEnum('quote_status', [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED'
]);

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('USER'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Shipments Table
export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  referenceNumber: varchar('reference_number', { length: 100 }).notNull().unique(),
  customer: varchar('customer', { length: 255 }).notNull().default('Unknown'),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  equipment: varchar('equipment', { length: 100 }).notNull().default('1x 20DC'),
  vessel: varchar('vessel', { length: 255 }),
  voyage: varchar('voyage', { length: 100 }),
  status: shipmentStatusEnum('status').default('DRAFT').notNull(),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Rates Table (Master Carrier Rates)
export const rates = pgTable('rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  carrier: varchar('carrier', { length: 100 }).notNull(),
  serviceLine: varchar('service_line', { length: 100 }).notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  transitTime: integer('transit_time').notNull(),
  validTo: date('valid_to').notNull(),
  baseOceanFreight: real('base_ocean_freight').notNull(),
  baf: real('baf').notNull(),
  pss: real('pss').notNull(),
  thc: real('thc').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Quotes Table
export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteNumber: varchar('quote_number', { length: 100 }).notNull().unique(),
  customer: varchar('customer', { length: 255 }).notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  equipment: varchar('equipment', { length: 100 }).notNull(),
  buyRateTotal: real('buy_rate_total').notNull(),
  sellMargin: real('sell_margin').notNull(),
  sellRateTotal: real('sell_rate_total').notNull(),
  status: quoteStatusEnum('status').default('DRAFT').notNull(),
  validTo: date('valid_to').notNull(),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  shipments: many(shipments),
  quotes: many(quotes),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  user: one(users, {
    fields: [shipments.userId],
    references: [users.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  user: one(users, {
    fields: [quotes.userId],
    references: [users.id],
  }),
}));

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'Paid',
  'Pending',
  'Overdue'
]);

export const invoiceTypeEnum = pgEnum('invoice_type', [
  'AR',
  'AP'
]);

// 5. Invoices Table
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
  type: invoiceTypeEnum('type').notNull(),
  party: varchar('party', { length: 255 }).notNull(),
  amount: real('amount').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  status: invoiceStatusEnum('status').default('Pending').notNull(),
  dueDate: date('due_date').notNull(),
  shipmentId: uuid('shipment_id').references(() => shipments.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoicesRelations = relations(invoices, ({ one }) => ({
  shipment: one(shipments, {
    fields: [invoices.shipmentId],
    references: [shipments.id],
  }),
}));

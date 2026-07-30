import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  role: text('role').notNull(),
});

export const shipments = sqliteTable('shipments', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  currentLat: real('currentLat'),
  currentLng: real('currentLng'),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoiceNumber').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
});

export const rates = sqliteTable('rates', {
  id: text('id').primaryKey(),
  carrier: text('carrier').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  containerType: text('containerType').notNull(),
  baseRate: real('baseRate').notNull(),
  transitDays: integer('transitDays').notNull(),
});

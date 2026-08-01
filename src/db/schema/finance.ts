import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { commonAuditFields } from './_common.js';
import { shipments } from './operations.js';
import { companies, users } from './core.js';
import { carriers } from './vendors.js';

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoiceNumber').notNull().unique(),
  shipmentId: text('shipment_id').references(() => shipments.id),
  companyId: text('company_id').notNull().references(() => companies.id),
  amount: real('amount').notNull(),
  taxAmount: real('tax_amount').default(0),
  taxRate: real('tax_rate').default(0),
  currency: text('currency').notNull(),
  status: text('status').notNull(), // DRAFT, ISSUED, PARTIAL, PAID, OVERDUE
  dueDate: integer('due_date', { mode: 'timestamp' }),
  paidDate: integer('paid_date', { mode: 'timestamp' }),
  createdBy: text('created_by').references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
  ...commonAuditFields
});

export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  total: real('total').notNull(),
  ...commonAuditFields
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id),
  amount: real('amount').notNull(),
  paymentDate: integer('payment_date', { mode: 'timestamp' }).notNull(),
  reference: text('reference'),
  ...commonAuditFields
});

export const exchangeRates = sqliteTable('exchange_rates', {
  id: text('id').primaryKey(),
  baseCurrency: text('base_currency').notNull(),
  targetCurrency: text('target_currency').notNull(),
  rate: real('rate').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
});

export const costs = sqliteTable('costs', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull().references(() => shipments.id),
  vendorId: text('vendor_id').references(() => carriers.id),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  description: text('description'),
  ...commonAuditFields
});

export const revenues = sqliteTable('revenues', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull().references(() => shipments.id),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  description: text('description'),
  ...commonAuditFields
});

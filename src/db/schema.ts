import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const shipmentStatusEnum = pgEnum('shipment_status', [
  'DRAFT',
  'BOOKED',
  'IN_TRANSIT',
  'ARRIVED',
  'CUSTOMS_CLEARED',
  'DELIVERED',
  'CANCELLED'
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
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  status: shipmentStatusEnum('status').default('DRAFT').notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  shipments: many(shipments),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  user: one(users, {
    fields: [shipments.userId],
    references: [users.id],
  }),
}));

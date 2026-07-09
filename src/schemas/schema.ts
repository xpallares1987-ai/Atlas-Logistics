import {
  pgTable,
  serial,
  varchar,
  decimal,
  date,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const freight_rates = pgTable("freight_rates", {
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
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const surcharge_types = pgTable("surcharge_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: varchar("description", { length: 255 }),
});

export const surcharges = pgTable("surcharges", {
  id: serial("id").primaryKey(),
  freight_rate_id: integer("freight_rate_id")
    .references(() => freight_rates.id)
    .notNull(),
  surcharge_type_id: integer("surcharge_type_id")
    .references(() => surcharge_types.id)
    .notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
});

import {
  sqliteTable,
  text,
  integer,
  real,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { commonAuditFields } from "./_common.js";
import { locations, companies, users } from "./core.js";
import { carriers } from "./vendors.js";

export const lanes = sqliteTable("lanes", {
  id: text("id").primaryKey(),
  originLocationId: text("origin_location_id")
    .notNull()
    .references(() => locations.id),
  destinationLocationId: text("destination_location_id")
    .notNull()
    .references(() => locations.id),
  distance: real("distance"),
  ...commonAuditFields,
});

export const rates = sqliteTable(
  "rates",
  {
    id: text("id").primaryKey(),
    carrierId: text("carrier_id")
      .notNull()
      .references(() => carriers.id),
    laneId: text("lane_id")
      .notNull()
      .references(() => lanes.id),
    containerType: text("containerType").notNull(),
    baseRate: real("baseRate").notNull(),
    baf: real("baf").notNull().default(0),
    pss: real("pss").notNull().default(0),
    thc: real("thc").notNull().default(0),
    serviceLine: text("service_line").notNull().default("Standard"),
    transitDays: integer("transitDays").notNull(),
    validFrom: integer("valid_from", { mode: "timestamp" }),
    validTo: integer("valid_to", { mode: "timestamp" }),
    companyId: text("company_id").references(() => companies.id),
    createdBy: text("created_by").references(() => users.id),
    updatedBy: text("updated_by").references(() => users.id),
    ...commonAuditFields,
  },
  (table) => ({
    dateCheck: check(
      "rates_dates_check",
      sql`${table.validTo} > ${table.validFrom}`,
    ),
    rateCheck: check("rates_base_check", sql`${table.baseRate} >= 0`),
  }),
);

export const surcharges = sqliteTable("surcharges", {
  id: text("id").primaryKey(),
  rateId: text("rate_id")
    .notNull()
    .references(() => rates.id),
  name: text("name").notNull(), // BAF, CAF, THC
  amount: real("amount").notNull(),
  ...commonAuditFields,
});

export const rateTiers = sqliteTable("rate_tiers", {
  id: text("id").primaryKey(),
  rateId: text("rate_id")
    .notNull()
    .references(() => rates.id),
  minWeight: real("min_weight").notNull(),
  maxWeight: real("max_weight").notNull(),
  pricePerKg: real("price_per_kg").notNull(),
  ...commonAuditFields,
});

export const quotes = sqliteTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    quoteNumber: text("quote_number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => companies.id),
    originLocationId: text("origin_location_id").references(() => locations.id),
    destinationLocationId: text("destination_location_id").references(
      () => locations.id,
    ),
    equipment: text("equipment").notNull(),
    buyRateTotal: real("buy_rate_total").notNull(),
    sellMargin: real("sell_margin").notNull(),
    sellRateTotal: real("sell_rate_total").notNull(),
    status: text("status").notNull().default("DRAFT"), // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
    validTo: integer("valid_to", { mode: "timestamp" }).notNull(),
    createdBy: text("created_by").references(() => users.id),
    ...commonAuditFields,
  },
  (table) => ({
    sellAmountCheck: check(
      "quotes_sell_amount_check",
      sql`${table.sellRateTotal} >= 0`,
    ),
    buyAmountCheck: check(
      "quotes_buy_amount_check",
      sql`${table.buyRateTotal} >= 0`,
    ),
  }),
);

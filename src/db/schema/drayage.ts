import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { addresses } from "./core.js";
import { shipments } from "./operations.js";

export const drayageTransportOrders = sqliteTable("drayage_transport_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(), // e.g. DRY-202611-4821
  status: text("status", {
    enum: [
      "DRAFT",
      "DISPATCHED",
      "ACCEPTED",
      "GATE_IN",
      "IN_TRANSIT",
      "DELIVERED",
      "CANCELLED",
    ],
  })
    .notNull()
    .default("DISPATCHED"),

  shipmentId: text("shipment_id").references(() => shipments.id, {
    onDelete: "set null",
  }),
  bookingReference: text("booking_reference"),
  containerNumber: text("container_number"),
  containerType: text("container_type").notNull().default("40HC"),
  cargoWeightKg: real("cargo_weight_kg").notNull().default(18500),

  isDangerousGoods: integer("is_dangerous_goods", { mode: "boolean" })
    .notNull()
    .default(false),
  requiresGenset: integer("requires_genset", { mode: "boolean" })
    .notNull()
    .default(false),

  haulierAddressId: text("haulier_address_id")
    .notNull()
    .references(() => addresses.id),
  originAddressId: text("origin_address_id")
    .notNull()
    .references(() => addresses.id),
  destinationAddressId: text("destination_address_id")
    .notNull()
    .references(() => addresses.id),

  distanceKm: real("distance_km").notNull(),
  baseRate: real("base_rate").notNull(),
  fuelSurcharge: real("fuel_surcharge").notNull(),
  tollsCost: real("tolls_cost").notNull(),
  extraSurcharges: real("extra_surcharges").notNull().default(0),
  subtotalCost: real("subtotal_cost").notNull(),
  profitMargin: real("profit_margin").notNull(),
  totalGrossCost: real("total_gross_cost").notNull(),
  currency: text("currency").notNull().default("EUR"),

  // GLEC v3.0 / ISO 14083 emissions metrics
  co2WtwKg: real("co2_wtw_kg").notNull(),
  co2TtwKg: real("co2_ttw_kg").notNull(),
  co2WteKg: real("co2_wte_kg").notNull(),
  emissionsIntensityFactor: real("emissions_intensity_factor").notNull(),

  driverPickupPin: text("driver_pickup_pin").notNull(),
  qrDigest: text("qr_digest").notNull(),

  appointmentWindowStart: text("appointment_window_start").notNull(),
  appointmentWindowEnd: text("appointment_window_end").notNull(),
  notes: text("notes"),

  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

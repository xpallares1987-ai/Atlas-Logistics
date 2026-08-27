import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const roadConsignments = sqliteTable("road_consignments", {
  id: text("id").primaryKey(),
  consignmentNumber: text("consignment_number").notNull().unique(), // CMR-2026-XXXXX or CDP-2026-XXXXX
  shipmentId: text("shipment_id"),
  consignmentType: text("consignment_type").notNull(), // INTERNATIONAL_CMR, NATIONAL_CARTA_PORTE
  status: text("status").notNull().default("PLANNED"), // PLANNED, DISPATCHED, IN_TRANSIT, DELIVERED, CANCELLED

  // Transport Parties
  senderName: text("sender_name").notNull(),
  senderAddress: text("sender_address").notNull(),
  senderCountry: text("sender_country").notNull(),
  consigneeName: text("consignee_name").notNull(),
  consigneeAddress: text("consignee_address").notNull(),
  consigneeCountry: text("consignee_country").notNull(),
  carrierName: text("carrier_name").notNull(),
  carrierVat: text("carrier_vat").notNull(),

  // Vehicle & Driver
  tractorPlate: text("tractor_plate").notNull(),
  trailerPlate: text("trailer_plate").notNull(),
  driverName: text("driver_name").notNull(),
  driverLicense: text("driver_license").notNull(),
  driverPhone: text("driver_phone"),

  // Route & Schedule
  originCity: text("origin_city").notNull(),
  destinationCity: text("destination_city").notNull(),
  totalDistanceKm: real("total_distance_km").notNull(),
  estimatedDrivingHours: real("estimated_driving_hours").notNull(),
  requiredRestBreaksCount: integer("required_rest_breaks_count")
    .notNull()
    .default(0),
  pickupDate: integer("pickup_date", { mode: "timestamp" }).notNull(),
  deliveryDate: integer("delivery_date", { mode: "timestamp" }),

  // Capacity & Load Utilization
  totalPallets: integer("total_pallets").notNull().default(1),
  palletCapacityMax: integer("pallet_capacity_max").notNull().default(33),
  totalGrossWeightKg: real("total_gross_weight_kg").notNull(),
  payloadCapacityMaxKg: real("payload_capacity_max_kg")
    .notNull()
    .default(24000),
  trailerFloorUtilizationPct: real("trailer_floor_utilization_pct").notNull(),

  // ADR Hazardous Goods
  isAdrHazardous: integer("is_adr_hazardous", { mode: "boolean" })
    .notNull()
    .default(false),
  adrTotalPoints: real("adr_total_points").notNull().default(0),
  adrExemption1136Applied: integer("adr_exemption_1136_applied", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  orangePlatesRequired: integer("orange_plates_required", { mode: "boolean" })
    .notNull()
    .default(false),
  tunnelRestrictionCode: text("tunnel_restriction_code"),

  // Cargo & Special Instructions
  goodsDescription: text("goods_description").notNull(),
  specialInstructions: text("special_instructions"),
  cargoItemsData: text("cargo_items_data", { mode: "json" }),
  routeStopsData: text("route_stops_data", { mode: "json" }),
  ...commonAuditFields,
});

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { lanes } from "./pricing.js";
import { carriers, customsBrokers } from "./vendors.js";
import { locations, companies, users } from "./core.js";

export const routeSegments = sqliteTable("route_segments", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull().references(() => shipments.id),
  sequenceOrder: integer("sequence_order").notNull(),
  transportMode: text("transport_mode").notNull(),
  originLocationId: text("origin_location_id").references(() => locations.id),
  destinationLocationId: text("destination_location_id").references(() => locations.id),
  departureTime: integer("departure_time", { mode: "timestamp" }),
  arrivalTime: integer("arrival_time", { mode: "timestamp" }),
  status: text("status").notNull(),
  ...commonAuditFields,
});

export const warehouseTraffic = sqliteTable("warehouse_traffic", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").references(() => shipments.id),
  driverName: text("driver_name"),
  deviceNumber: text("device_number").notNull(), // Matricula / Vagon
  deviceType: text("device_type").notNull(), // TRUCK, WAGON, CONTAINER_20, CONTAINER_40
  status: text("status").notNull(), // WAITING, DOCK_ASSIGNED, LOADING, UNLOADING, DISPATCHED
  eta: text("eta"), // string or timestamp
  assignedDock: text("assigned_dock"),
  cargoDescription: text("cargo_description"),
  totalWeightExpected: real("total_weight_expected"),
  expectedQuantity: integer("expected_quantity"),
  type: text("type").notNull(), // INBOUND, OUTBOUND
  ...commonAuditFields,
});

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  laneId: text("lane_id")
    .notNull()
    .references(() => lanes.id),
  carrierId: text("carrier_id")
    .notNull()
    .references(() => carriers.id),
  vesselName: text("vessel_name"),
  voyageNumber: text("voyage_number"),
  departureDate: integer("departure_date", { mode: "timestamp" }).notNull(),
  arrivalDate: integer("arrival_date", { mode: "timestamp" }).notNull(),
  ...commonAuditFields,
});

export const shipments = sqliteTable("shipments", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  incoterm: text("incoterm"), // FOB, CIF, EXW
  serviceType: text("service_type"), // FCL, LCL, AIR, ROAD
  laneId: text("lane_id").references(() => lanes.id),
  scheduleId: text("schedule_id").references(() => schedules.id),
  vesselName: text("vessel_name"),
  voyageNumber: text("voyage_number"),
  carbonFootprint: real("carbon_footprint"),
  trackingNumber: text("tracking_number"),
  origin: text("origin"),
  destination: text("destination"),
  distanceKm: real("distance_km"),
  weight: real("weight"),
  co2eTonnes: real("co2e_tonnes"),
  portOfEntryId: text("port_of_entry_id").references(() => locations.id),
  clearanceStatus: text("clearance_status"),
  currentLat: real("currentLat"),
  currentLng: real("currentLng"),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id),
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  ...commonAuditFields,
});

export const shipmentContainers = sqliteTable("shipment_containers", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id")
    .notNull()
    .references(() => shipments.id),
  containerNumber: text("container_number").notNull(),
  containerType: text("container_type").notNull(),
  sealNumber: text("seal_number"),
  weight: real("weight"),
  ...commonAuditFields,
});

export const cargoItems = sqliteTable("cargo_items", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id")
    .notNull()
    .references(() => shipments.id),
  containerId: text("container_id").references(() => shipmentContainers.id),
  label: text("label").notNull(),
  color: text("color").notNull(),
  width: real("width").notNull(),
  height: real("height").notNull(),
  depth: real("depth").notNull(),
  weight: real("weight").notNull(),
  x: real("x"),
  y: real("y"),
  z: real("z"),
  ...commonAuditFields,
});

export const hsCodes = sqliteTable("hs_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  ...commonAuditFields,
});

export const customsDeclarations = sqliteTable("customs_declarations", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id")
    .notNull()
    .references(() => shipments.id),
  brokerId: text("broker_id").references(() => customsBrokers.id),
  hsCodeId: text("hs_code_id").references(() => hsCodes.id),
  blNumber: text("bl_number"),
  type: text("type").default("Import"),
  dutiesAmount: real("duties_amount"),
  taxesAmount: real("taxes_amount"),
  status: text("status").notNull(),
  aiRiskScore: integer("ai_risk_score"),
  aiRiskFlag: text("ai_risk_flag"),
  ...commonAuditFields,
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  referenceNumber: text("reference_number"),
  customerId: text("customer_id")
    .notNull()
    .references(() => companies.id),
  status: text("status").notNull().default("Pending"), // Pending, Confirmed, Rejected, Cancelled
  origin: text("origin"),
  destination: text("destination"),
  serviceType: text("service_type"), // FCL, LCL, AIR, ROAD
  equipment: text("equipment"),
  vessel: text("vessel"),
  voyage: text("voyage"),
  cargoDetails: text("cargo_details"), // JSON string
  estimatedDeparture: integer("estimated_departure", { mode: "timestamp" }),
  ...commonAuditFields,
});

export const demurrageAlerts = sqliteTable("demurrage_alerts", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id")
    .notNull()
    .references(() => shipments.id),
  containerNumber: text("container_number").notNull(),
  alertStatus: text("alert_status").notNull().default("active"), // active, mitigated, dismissed
  lastNotified: integer("last_notified", { mode: "timestamp" }),
  ...commonAuditFields,
});


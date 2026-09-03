import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const iotDevices = sqliteTable("iot_devices", {
  id: text("id").primaryKey(),
  deviceCode: text("device_code").notNull().unique(),
  deviceType: text("device_type").notNull(), // CELLULAR_GPS_4G, BLE_BEACON, AIS_SATELLITE_TRANSPONDER, SATELLITE_ORBCOMM
  batteryLevelPct: integer("battery_level_pct").notNull().default(100),
  firmwareVersion: text("firmware_version").notNull().default("v2.4.1"),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, STANDBY, LOW_BATTERY, OFFLINE
  lastHeartbeatAt: text("last_heartbeat_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const trackedAssets = sqliteTable("tracked_assets", {
  id: text("id").primaryKey(),
  assetCode: text("asset_code").notNull().unique(), // e.g., CMA-SUEZ-01, LH-8220-FRA, VLV-TRUCK-ES01, TRF-RAIL-EU9
  name: text("name").notNull(),
  assetType: text("asset_type").notNull(), // CONTAINER_REEFER, CONTAINER_DRY, VESSEL, CARGO_AIRCRAFT, TRUCK_EV, TRAIN_WAGON
  deviceId: text("device_id").references(() => iotDevices.id),
  currentLat: real("current_lat").notNull(),
  currentLng: real("current_lng").notNull(),
  currentSpeedKnots: real("current_speed_knots").notNull().default(0),
  currentHeadingDeg: real("current_heading_deg").notNull().default(0),
  currentAltitudeMeters: real("current_altitude_meters").notNull().default(0),
  originName: text("origin_name").notNull(),
  destinationName: text("destination_name").notNull(),
  cargoDescription: text("cargo_description").notNull(),
  cargoCategory: text("cargo_category").notNull().default("GENERAL"), // PHARMA_GDP, FROZEN_FOOD, HIGH_VALUE_TECH, HAZMAT, GENERAL
  minTempCelsius: real("min_temp_celsius"),
  maxTempCelsius: real("max_temp_celsius"),
  plannedEta: text("planned_eta").notNull(),
  predictedEta: text("predicted_eta").notNull(),
  status: text("status").notNull().default("IN_TRANSIT"), // IN_TRANSIT, AT_PORT, CUSTOMS_HOLD, DELIVERED, CRITICAL_ALERT
  updatedAt: text("updated_at").notNull(),
});

export const telemetryReadings = sqliteTable("telemetry_readings", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => trackedAssets.id),
  deviceId: text("device_id").references(() => iotDevices.id),
  timestamp: text("timestamp").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  speedKnots: real("speed_knots").notNull().default(0),
  headingDeg: real("heading_deg").notNull().default(0),
  altitudeMeters: real("altitude_meters").notNull().default(0),
  temperatureCelsius: real("temperature_celsius"),
  humidityPct: real("humidity_pct"),
  shockGForce: real("shock_g_force").notNull().default(0.0),
  doorOpen: integer("door_open", { mode: "boolean" }).notNull().default(false),
  sealTampered: integer("seal_tampered", { mode: "boolean" })
    .notNull()
    .default(false),
  batteryPct: integer("battery_pct").notNull().default(100),
});

export const geofences = sqliteTable("geofences", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // PORT_TERMINAL, AIRPORT_HUB, LOGISTICS_PARK, CUSTOMS_BONDED_ZONE, CORRIDOR_SECURITY_ZONE
  centerLat: real("center_lat").notNull(),
  centerLng: real("center_lng").notNull(),
  radiusMeters: real("radius_meters").notNull(),
  polygonCoordinatesJson: text("polygon_coordinates_json"), // Array of [lat, lng]
  triggerOn: text("trigger_on").notNull().default("BOTH"), // ENTER, EXIT, BOTH
  createdAt: text("created_at").notNull(),
});

export const telemetryAlerts = sqliteTable("telemetry_alerts", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => trackedAssets.id),
  severity: text("severity").notNull(), // INFO, WARNING, CRITICAL
  alertType: text("alert_type").notNull(), // TEMPERATURE_EXCURSION, ROUTE_DEVIATION, SHOCK_IMPACT, GEOFENCE_EXIT, UNPLANNED_STOP, SEAL_TAMPERED
  message: text("message").notNull(),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, ACKNOWLEDGED, RESOLVED
  metricValue: text("metric_value"),
  thresholdValue: text("threshold_value"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by"),
});

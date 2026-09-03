import { db } from "./index.js";
import {
  iotDevices,
  trackedAssets,
  telemetryReadings,
  geofences,
  telemetryAlerts,
} from "./schema/index.js";
import { sql } from "drizzle-orm";

export async function seedTelemetry() {
  console.log(
    "🌱 Initializing and seeding IoT Control Tower & Telemetry Module...",
  );

  // 1. Create tables if not exist
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS iot_devices (
      id TEXT PRIMARY KEY,
      device_code TEXT NOT NULL UNIQUE,
      device_type TEXT NOT NULL,
      battery_level_pct INTEGER NOT NULL DEFAULT 100,
      firmware_version TEXT NOT NULL DEFAULT 'v2.4.1',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      last_heartbeat_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS tracked_assets (
      id TEXT PRIMARY KEY,
      asset_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      device_id TEXT REFERENCES iot_devices(id),
      current_lat REAL NOT NULL,
      current_lng REAL NOT NULL,
      current_speed_knots REAL NOT NULL DEFAULT 0,
      current_heading_deg REAL NOT NULL DEFAULT 0,
      current_altitude_meters REAL NOT NULL DEFAULT 0,
      origin_name TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      cargo_description TEXT NOT NULL,
      cargo_category TEXT NOT NULL DEFAULT 'GENERAL',
      min_temp_celsius REAL,
      max_temp_celsius REAL,
      planned_eta TEXT NOT NULL,
      predicted_eta TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_TRANSIT',
      updated_at TEXT NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS telemetry_readings (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES tracked_assets(id),
      device_id TEXT REFERENCES iot_devices(id),
      timestamp TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed_knots REAL NOT NULL DEFAULT 0,
      heading_deg REAL NOT NULL DEFAULT 0,
      altitude_meters REAL NOT NULL DEFAULT 0,
      temperature_celsius REAL,
      humidity_pct REAL,
      shock_g_force REAL NOT NULL DEFAULT 0.0,
      door_open INTEGER NOT NULL DEFAULT 0,
      seal_tampered INTEGER NOT NULL DEFAULT 0,
      battery_pct INTEGER NOT NULL DEFAULT 100
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS geofences (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      center_lat REAL NOT NULL,
      center_lng REAL NOT NULL,
      radius_meters REAL NOT NULL,
      polygon_coordinates_json TEXT,
      trigger_on TEXT NOT NULL DEFAULT 'BOTH',
      created_at TEXT NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS telemetry_alerts (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES tracked_assets(id),
      severity TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      metric_value TEXT,
      threshold_value TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT
    );
  `);

  const now = new Date();
  const isoNow = now.toISOString();

  // 2. Clear old data
  await db.delete(telemetryAlerts);
  await db.delete(telemetryReadings);
  await db.delete(trackedAssets);
  await db.delete(iotDevices);
  await db.delete(geofences);

  // 3. Seed Geofences
  const sampleGeofences = [
    {
      id: "geo-vlc-port",
      name: "Puerto de Valencia (CSP / MSC Terminals)",
      type: "PORT_TERMINAL",
      centerLat: 39.4485,
      centerLng: -0.3168,
      radiusMeters: 4500,
      polygonCoordinatesJson: JSON.stringify([
        [39.462, -0.332],
        [39.465, -0.301],
        [39.435, -0.298],
        [39.431, -0.335],
      ]),
      triggerOn: "BOTH",
      createdAt: isoNow,
    },
    {
      id: "geo-fra-cargo",
      name: "Frankfurt Airport (Lufthansa Cargo City)",
      type: "AIRPORT_HUB",
      centerLat: 50.0379,
      centerLng: 8.5622,
      radiusMeters: 3800,
      polygonCoordinatesJson: JSON.stringify([
        [50.052, 8.541],
        [50.051, 8.592],
        [50.022, 8.585],
        [50.025, 8.535],
      ]),
      triggerOn: "BOTH",
      createdAt: isoNow,
    },
    {
      id: "geo-plz-dryport",
      name: "Zaragoza Plaza Logística (Dry Port Rail)",
      type: "LOGISTICS_PARK",
      centerLat: 41.6322,
      centerLng: -0.9982,
      radiusMeters: 3000,
      polygonCoordinatesJson: null,
      triggerOn: "BOTH",
      createdAt: isoNow,
    },
    {
      id: "geo-rot-maas",
      name: "Rotterdam Maasvlakte Gateway",
      type: "PORT_TERMINAL",
      centerLat: 51.956,
      centerLng: 4.025,
      radiusMeters: 5500,
      polygonCoordinatesJson: null,
      triggerOn: "BOTH",
      createdAt: isoNow,
    },
  ];
  await db.insert(geofences).values(sampleGeofences);

  // 4. Seed IoT Devices
  const sampleDevices = [
    {
      id: "dev-ais-cma",
      deviceCode: "AIS-SAT-CMA01",
      deviceType: "AIS_SATELLITE_TRANSPONDER",
      batteryLevelPct: 100,
      firmwareVersion: "v4.1.0-maritime",
      status: "ACTIVE",
      lastHeartbeatAt: isoNow,
      createdAt: isoNow,
    },
    {
      id: "dev-ble-lh",
      deviceCode: "BLE-PHARMA-LH82",
      deviceType: "CELLULAR_GPS_4G",
      batteryLevelPct: 88,
      firmwareVersion: "v3.2.9-pharma",
      status: "ACTIVE",
      lastHeartbeatAt: isoNow,
      createdAt: isoNow,
    },
    {
      id: "dev-gps-vlv",
      deviceCode: "GPS-HCT-VLV01",
      deviceType: "CELLULAR_GPS_4G",
      batteryLevelPct: 96,
      firmwareVersion: "v2.8.4-fleet",
      status: "ACTIVE",
      lastHeartbeatAt: isoNow,
      createdAt: isoNow,
    },
    {
      id: "dev-orb-trf",
      deviceCode: "ORB-RAIL-TRF09",
      deviceType: "SATELLITE_ORBCOMM",
      batteryLevelPct: 94,
      firmwareVersion: "v1.9.0-rail",
      status: "ACTIVE",
      lastHeartbeatAt: isoNow,
      createdAt: isoNow,
    },
  ];
  await db.insert(iotDevices).values(sampleDevices);

  // 5. Seed Tracked Assets
  const plannedArrivalVessel = new Date(
    now.getTime() + 18 * 3600 * 1000,
  ).toISOString();
  const plannedArrivalFlight = new Date(
    now.getTime() + 4 * 3600 * 1000,
  ).toISOString();
  const plannedArrivalTruck = new Date(
    now.getTime() + 2.5 * 3600 * 1000,
  ).toISOString();
  const plannedArrivalRail = new Date(
    now.getTime() + 7 * 3600 * 1000,
  ).toISOString();

  const sampleAssets = [
    {
      id: "ast-vessel-cma",
      assetCode: "CMA-SUEZ-01",
      name: "CMA CGM Jacques Saadé (15,000 TEU)",
      assetType: "VESSEL",
      deviceId: "dev-ais-cma",
      currentLat: 37.85,
      currentLng: 7.42, // En aproximación por Mar Mediterráneo hacia Valencia
      currentSpeedKnots: 19.4,
      currentHeadingDeg: 285,
      currentAltitudeMeters: 0,
      originName: "Port Said / Suez Canal (EGY)",
      destinationName: "Puerto de Valencia (ESP)",
      cargoDescription:
        "12x Contenedores Reefer (Aguacates Hass & Cítricos Premium)",
      cargoCategory: "FROZEN_FOOD",
      minTempCelsius: -2.0,
      maxTempCelsius: 4.0,
      plannedEta: plannedArrivalVessel,
      predictedEta: plannedArrivalVessel,
      status: "IN_TRANSIT",
      updatedAt: isoNow,
    },
    {
      id: "ast-flight-lh",
      assetCode: "LH-8220-FRA",
      name: "Boeing 777F Lufthansa Cargo (LH8220)",
      assetType: "CARGO_AIRCRAFT",
      deviceId: "dev-ble-lh",
      currentLat: 48.12,
      currentLng: -42.55, // Cruzando el Atlántico Norte
      currentSpeedKnots: 475.0,
      currentHeadingDeg: 260,
      currentAltitudeMeters: 10600,
      originName: "Frankfurt Airport (FRA)",
      destinationName: "Chicago O'Hare Intl (ORD)",
      cargoDescription:
        "4x Envirotainer RAP e2 (Vacunas Oncológicas & Terapias Biológicas)",
      cargoCategory: "PHARMA_GDP",
      minTempCelsius: 2.0,
      maxTempCelsius: 8.0,
      plannedEta: plannedArrivalFlight,
      predictedEta: plannedArrivalFlight,
      status: "IN_TRANSIT",
      updatedAt: isoNow,
    },
    {
      id: "ast-truck-vlv",
      assetCode: "VLV-TRUCK-ES01",
      name: "Volvo FH Electric Duotrailer (72 Ton)",
      assetType: "TRUCK_EV",
      deviceId: "dev-gps-vlv",
      currentLat: 40.35,
      currentLng: -1.12, // Autovía Mudéjar A-23 hacia Teruel/Zaragoza
      currentSpeedKnots: 48.5,
      currentHeadingDeg: 340,
      currentAltitudeMeters: 920,
      originName: "Puerto de Valencia (BEST)",
      destinationName: "Zaragoza Plaza Logística (PLAZA)",
      cargoDescription: "Electrónica de Consumo & Microchips de Alta Densidad",
      cargoCategory: "HIGH_VALUE_TECH",
      minTempCelsius: 10.0,
      maxTempCelsius: 30.0,
      plannedEta: plannedArrivalTruck,
      predictedEta: plannedArrivalTruck,
      status: "IN_TRANSIT",
      updatedAt: isoNow,
    },
    {
      id: "ast-train-trf",
      assetCode: "TRF-RAIL-EU9",
      name: "Transfesa Rail TEN-T Continental Express",
      assetType: "TRAIN_WAGON",
      deviceId: "dev-orb-trf",
      currentLat: 43.61,
      currentLng: 3.87, // Corredor Mediterráneo cerca de Montpellier
      currentSpeedKnots: 55.0,
      currentHeadingDeg: 45,
      currentAltitudeMeters: 45,
      originName: "Barcelona Can Tunis Railhub (ESP)",
      destinationName: "Lyon Saint-Exupéry Logistics (FRA)",
      cargoDescription: "Chasis & Baterías de Litio para Automoción Eléctrica",
      cargoCategory: "HAZMAT",
      minTempCelsius: -5.0,
      maxTempCelsius: 35.0,
      plannedEta: plannedArrivalRail,
      predictedEta: plannedArrivalRail,
      status: "IN_TRANSIT",
      updatedAt: isoNow,
    },
  ];
  await db.insert(trackedAssets).values(sampleAssets);

  // 6. Seed Telemetry Historical Breadcrumbs (30 points for each asset)
  const readingsToInsert = [];

  // Generate Vessel path from Suez (31.2, 32.3) to current position (37.85, 7.42)
  for (let i = 29; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 15 * 60 * 1000).toISOString();
    const progress = (30 - i) / 30;
    const lat = 31.2 + progress * (37.85 - 31.2);
    const lng = 32.3 - progress * (32.3 - 7.42);

    readingsToInsert.push({
      id: `tel_vsl_${i}`,
      assetId: "ast-vessel-cma",
      deviceId: "dev-ais-cma",
      timestamp: t,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      speedKnots: 19.2 + (Math.random() - 0.5) * 0.8,
      headingDeg: 285,
      altitudeMeters: 0,
      temperatureCelsius: 1.8 + (Math.random() - 0.5) * 0.4,
      humidityPct: 82,
      shockGForce: 0.12,
      doorOpen: false,
      sealTampered: false,
      batteryPct: 100,
    });
  }

  // Generate Flight path FRA (50.03, 8.56) to current (48.12, -42.55)
  for (let i = 29; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 8 * 60 * 1000).toISOString();
    const progress = (30 - i) / 30;
    const lat = 50.03 - progress * (50.03 - 48.12);
    const lng = 8.56 - progress * (8.56 - -42.55);

    readingsToInsert.push({
      id: `tel_flt_${i}`,
      assetId: "ast-flight-lh",
      deviceId: "dev-ble-lh",
      timestamp: t,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      speedKnots: 470.0 + (Math.random() - 0.5) * 10,
      headingDeg: 260,
      altitudeMeters: 10600,
      temperatureCelsius: 4.8 + (Math.random() - 0.5) * 0.3, // Safe Pharma GDP (+2°C to +8°C)
      humidityPct: 45,
      shockGForce: 0.08,
      doorOpen: false,
      sealTampered: false,
      batteryPct: 88,
    });
  }

  // Generate Truck path Valencia (39.46, -0.38) to current (40.35, -1.12)
  for (let i = 29; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3 * 60 * 1000).toISOString();
    const progress = (30 - i) / 30;
    const lat = 39.46 + progress * (40.35 - 39.46);
    const lng = -0.38 - progress * (1.12 - 0.38);

    readingsToInsert.push({
      id: `tel_trk_${i}`,
      assetId: "ast-truck-vlv",
      deviceId: "dev-gps-vlv",
      timestamp: t,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      speedKnots: 48.0 + (Math.random() - 0.5) * 2,
      headingDeg: 340,
      altitudeMeters: 400 + progress * 520,
      temperatureCelsius: 21.5,
      humidityPct: 52,
      shockGForce: 0.25,
      doorOpen: false,
      sealTampered: false,
      batteryPct: 96,
    });
  }

  // Generate Train path Barcelona (41.38, 2.17) to current (43.61, 3.87)
  for (let i = 29; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 5 * 60 * 1000).toISOString();
    const progress = (30 - i) / 30;
    const lat = 41.38 + progress * (43.61 - 41.38);
    const lng = 2.17 + progress * (3.87 - 2.17);

    readingsToInsert.push({
      id: `tel_trn_${i}`,
      assetId: "ast-train-trf",
      deviceId: "dev-orb-trf",
      timestamp: t,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      speedKnots: 54.0 + (Math.random() - 0.5) * 3,
      headingDeg: 45,
      altitudeMeters: 45,
      temperatureCelsius: 19.0,
      humidityPct: 60,
      shockGForce: 0.3,
      doorOpen: false,
      sealTampered: false,
      batteryPct: 94,
    });
  }

  await db.insert(telemetryReadings).values(readingsToInsert);

  console.log(
    "✅ IoT Control Tower & Telemetry seeded successfully with 4 multimodal assets, geofences and telemetry breadcrumbs!",
  );
}

if (process.argv[1]?.includes("seed-telemetry")) {
  seedTelemetry()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}

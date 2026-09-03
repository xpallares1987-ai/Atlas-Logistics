import { db } from "../../db/index.js";
import {
  trackedAssets,
  iotDevices,
  telemetryReadings,
  geofences,
  telemetryAlerts,
} from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import { AnomalyDetectorService } from "./anomaly-detector.service.js";

export class TelemetryService {
  /**
   * Aggregates fleet-wide IoT metrics for the top KPI HUD
   */
  static async getFleetSummary() {
    const assets = await db.select().from(trackedAssets);
    const activeAlerts = await db
      .select()
      .from(telemetryAlerts)
      .where(eq(telemetryAlerts.status, "ACTIVE"));
    const devices = await db.select().from(iotDevices);

    const criticalAlertsCount = activeAlerts.filter(
      (a) => a.severity === "CRITICAL",
    ).length;
    const warningAlertsCount = activeAlerts.filter(
      (a) => a.severity === "WARNING",
    ).length;

    const inTransitCount = assets.filter(
      (a) => a.status === "IN_TRANSIT",
    ).length;
    const criticalAssetsCount = assets.filter(
      (a) => a.status === "CRITICAL_ALERT",
    ).length;

    const healthyDevicesCount = devices.filter(
      (d) => d.batteryLevelPct > 20 && d.status === "ACTIVE",
    ).length;

    return {
      totalTrackedAssets: assets.length,
      inTransitCount,
      criticalAssetsCount,
      activeAlertsCount: activeAlerts.length,
      criticalAlertsCount,
      warningAlertsCount,
      totalDevices: devices.length,
      healthyDevicesCount,
      deviceHealthPercentage:
        devices.length > 0
          ? Math.round((healthyDevicesCount / devices.length) * 100)
          : 100,
    };
  }

  /**
   * Retrieves all tracked assets with their latest state
   */
  static async getAllAssets() {
    return await db.select().from(trackedAssets);
  }

  /**
   * Retrieves single asset detail with its device, active alerts and latest readings
   */
  static async getAssetById(id: string) {
    const assetResults = await db
      .select()
      .from(trackedAssets)
      .where(eq(trackedAssets.id, id));

    if (assetResults.length === 0) return null;
    const asset = assetResults[0];

    const readings = await db
      .select()
      .from(telemetryReadings)
      .where(eq(telemetryReadings.assetId, id))
      .orderBy(desc(telemetryReadings.timestamp))
      .limit(60);

    const alerts = await db
      .select()
      .from(telemetryAlerts)
      .where(eq(telemetryAlerts.assetId, id))
      .orderBy(desc(telemetryAlerts.createdAt))
      .limit(20);

    const allGeofences = await db.select().from(geofences);

    return {
      asset,
      readings: readings.reverse(), // Ascending for charting
      alerts,
      geofences: allGeofences,
    };
  }

  /**
   * Returns full history of breadcrumbs for timeline playback
   */
  static async getAssetHistory(id: string) {
    const readings = await db
      .select()
      .from(telemetryReadings)
      .where(eq(telemetryReadings.assetId, id))
      .orderBy(telemetryReadings.timestamp);

    return readings;
  }

  /**
   * Returns all geofences
   */
  static async getGeofences() {
    return await db.select().from(geofences);
  }

  /**
   * Simulates an anomaly event (Temperature spike, G-force shock, or seal tamper)
   */
  static async simulateAnomaly(
    assetId: string,
    anomalyType:
      "TEMPERATURE_EXCURSION" | "SHOCK_IMPACT" | "SEAL_TAMPERED" | "NORMALIZE",
    customValue?: number,
  ) {
    const assetResults = await db
      .select()
      .from(trackedAssets)
      .where(eq(trackedAssets.id, assetId));

    if (assetResults.length === 0) {
      throw new Error(`Asset with ID ${assetId} not found`);
    }

    const asset = assetResults[0];
    const timestamp = new Date().toISOString();

    let tempCelsius = asset.cargoCategory === "PHARMA_GDP" ? 4.5 : -20.0;
    let shock = 0.1;
    let sealTampered = false;
    let newStatus = "IN_TRANSIT";

    if (anomalyType === "TEMPERATURE_EXCURSION") {
      tempCelsius = customValue !== undefined ? customValue : 14.8; // Dangerous excursion for pharma
      newStatus = "CRITICAL_ALERT";
    } else if (anomalyType === "SHOCK_IMPACT") {
      shock = customValue !== undefined ? customValue : 3.85; // Heavy impact
      newStatus = "CRITICAL_ALERT";
    } else if (anomalyType === "SEAL_TAMPERED") {
      sealTampered = true;
      newStatus = "CRITICAL_ALERT";
    } else if (anomalyType === "NORMALIZE") {
      newStatus = "IN_TRANSIT";
    }

    // 1. Insert new telemetry reading
    const readingId = `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(telemetryReadings).values({
      id: readingId,
      assetId: asset.id,
      deviceId: asset.deviceId,
      timestamp,
      lat: asset.currentLat + (Math.random() - 0.5) * 0.01,
      lng: asset.currentLng + (Math.random() - 0.5) * 0.01,
      speedKnots: asset.currentSpeedKnots,
      headingDeg: asset.currentHeadingDeg,
      altitudeMeters: asset.currentAltitudeMeters,
      temperatureCelsius: tempCelsius,
      humidityPct: 58,
      shockGForce: shock,
      doorOpen: sealTampered,
      sealTampered,
      batteryPct: 92,
    });

    // 2. Evaluate Anomaly Detector
    const detectedAlerts = AnomalyDetectorService.evaluateReading(asset, {
      temperatureCelsius: tempCelsius,
      humidityPct: 58,
      shockGForce: shock,
      doorOpen: sealTampered,
      sealTampered,
      batteryPct: 92,
      speedKnots: asset.currentSpeedKnots,
    });

    // 3. Persist detected alerts
    for (const alert of detectedAlerts) {
      await db.insert(telemetryAlerts).values({
        id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        assetId: asset.id,
        severity: alert.severity,
        alertType: alert.alertType,
        message: alert.message,
        status: "ACTIVE",
        metricValue: alert.metricValue,
        thresholdValue: alert.thresholdValue,
        createdAt: timestamp,
      });
    }

    // 4. Update asset status
    await db
      .update(trackedAssets)
      .set({
        status: newStatus,
        updatedAt: timestamp,
      })
      .where(eq(trackedAssets.id, asset.id));

    return {
      success: true,
      anomalyType,
      readingId,
      detectedAlertsCount: detectedAlerts.length,
      newStatus,
    };
  }

  /**
   * Resolves or acknowledges an active alert
   */
  static async resolveAlert(
    alertId: string,
    resolvedBy: string = "Admin Operator",
  ) {
    const timestamp = new Date().toISOString();
    await db
      .update(telemetryAlerts)
      .set({
        status: "RESOLVED",
        resolvedAt: timestamp,
        resolvedBy,
      })
      .where(eq(telemetryAlerts.id, alertId));

    return { success: true, alertId, resolvedAt: timestamp };
  }
}

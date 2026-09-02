import { describe, it, expect } from "vitest";
import { AnomalyDetectorService } from "./anomaly-detector.service.js";

const pharmaAsset = {
  id: "ast-flight-lh",
  assetCode: "LH-8220-FRA",
  name: "Boeing 777F Lufthansa Cargo",
  cargoCategory: "PHARMA_GDP",
  minTempCelsius: 2.0,
  maxTempCelsius: 8.0,
};

const frozenAsset = {
  id: "ast-vessel-cma",
  assetCode: "CMA-SUEZ-01",
  name: "CMA CGM Jacques Saade",
  cargoCategory: "FROZEN_FOOD",
  minTempCelsius: -25.0,
  maxTempCelsius: -18.0,
};

const baseReading = {
  temperatureCelsius: 4.5,
  humidityPct: 45,
  shockGForce: 0.05,
  doorOpen: false,
  sealTampered: false,
  batteryPct: 90,
  speedKnots: 470,
};

describe("AnomalyDetectorService (IoT Telemetry Anomaly Detection)", () => {
  it("should return no alerts when all readings are within safe parameters", () => {
    const alerts = AnomalyDetectorService.evaluateReading(
      pharmaAsset,
      baseReading,
    );
    expect(alerts).toHaveLength(0);
  });

  it("should trigger WARNING when Pharma temp slightly exceeds max (+2°C over limit)", () => {
    const reading = { ...baseReading, temperatureCelsius: 9.5 }; // 1.5°C above limit
    const alerts = AnomalyDetectorService.evaluateReading(pharmaAsset, reading);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe("TEMPERATURE_EXCURSION");
    expect(alerts[0].severity).toBe("WARNING");
  });

  it("should trigger CRITICAL when Pharma temp grossly exceeds max (>3°C over limit)", () => {
    const reading = { ...baseReading, temperatureCelsius: 14.8 }; // 6.8°C above limit
    const alerts = AnomalyDetectorService.evaluateReading(pharmaAsset, reading);
    const excursionAlert = alerts.find(
      (a) => a.alertType === "TEMPERATURE_EXCURSION",
    );
    expect(excursionAlert).toBeDefined();
    expect(excursionAlert!.severity).toBe("CRITICAL");
  });

  it("should trigger WARNING when temp goes below minimum (cold excursion)", () => {
    const reading = { ...baseReading, temperatureCelsius: 0.5 }; // Below +2°C
    const alerts = AnomalyDetectorService.evaluateReading(pharmaAsset, reading);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe("TEMPERATURE_EXCURSION");
  });

  it("should trigger WARNING for G-Force impact between 2.5G and 4G", () => {
    const reading = {
      ...baseReading,
      temperatureCelsius: 5.0,
      shockGForce: 3.0,
    };
    const alerts = AnomalyDetectorService.evaluateReading(pharmaAsset, reading);
    const shockAlert = alerts.find((a) => a.alertType === "SHOCK_IMPACT");
    expect(shockAlert).toBeDefined();
    expect(shockAlert!.severity).toBe("WARNING");
  });

  it("should trigger CRITICAL for severe G-Force impact >= 4G", () => {
    const reading = {
      ...baseReading,
      temperatureCelsius: 5.0,
      shockGForce: 4.5,
    };
    const alerts = AnomalyDetectorService.evaluateReading(pharmaAsset, reading);
    const shockAlert = alerts.find((a) => a.alertType === "SHOCK_IMPACT");
    expect(shockAlert).toBeDefined();
    expect(shockAlert!.severity).toBe("CRITICAL");
  });

  it("should trigger CRITICAL alert when electronic seal is tampered", () => {
    const reading = {
      ...baseReading,
      temperatureCelsius: 5.0,
      sealTampered: true,
    };
    const alerts = AnomalyDetectorService.evaluateReading(pharmaAsset, reading);
    const sealAlert = alerts.find((a) => a.alertType === "SEAL_TAMPERED");
    expect(sealAlert).toBeDefined();
    expect(sealAlert!.severity).toBe("CRITICAL");
  });

  it("should trigger multiple simultaneous alerts (temperature + shock)", () => {
    const reading = {
      ...baseReading,
      temperatureCelsius: 14.5,
      shockGForce: 4.2,
    };
    const alerts = AnomalyDetectorService.evaluateReading(pharmaAsset, reading);
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(alerts.some((a) => a.alertType === "TEMPERATURE_EXCURSION")).toBe(
      true,
    );
    expect(alerts.some((a) => a.alertType === "SHOCK_IMPACT")).toBe(true);
  });

  it("should correctly detect frozen food temperature excursion", () => {
    const reading = { ...baseReading, temperatureCelsius: -15.0 }; // above -18°C max
    const alerts = AnomalyDetectorService.evaluateReading(frozenAsset, reading);
    expect(alerts[0].alertType).toBe("TEMPERATURE_EXCURSION");
  });
});

/**
 * @file marine-telemetry-engine.test.ts
 * @description Comprehensive test suite for NMEA-0183 parsing, IMO number validation,
 * FuelEU Maritime WtW compliance balances, and IMO MEPC.337(76) Operational CII rating bands.
 */

import { describe, it, expect } from "vitest";
import {
  verifyNmeaChecksum,
  parseNmeaCoordinate,
  parseNmeaRmcSentence,
  parseNmeaVtgSentence,
  parseNmeaRpmSentence,
  isValidImoNumber,
  normalizeMarineTelemetry,
  calculateFuelEuCompliance,
  evaluateImoCii,
  detectMarineTelemetryAnomalies,
  assessVoyageTelemetry,
  type RawMqttMarineTelemetry,
} from "../src/scm/engines/marine-telemetry.engine.js";

describe("NMEA-0183 Marine Protocol Engine", () => {
  it("validates standard NMEA checksum correctly", () => {
    // Standard GPRMC sentence with valid checksum 61
    const validSentence =
      "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230324,003.1,W*61";
    expect(verifyNmeaChecksum(validSentence)).toBe(true);

    // Corrupted checksum
    const corruptedSentence =
      "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230324,003.1,W*99";
    expect(verifyNmeaChecksum(corruptedSentence)).toBe(false);

    // Invalid structure missing asterisks
    expect(verifyNmeaChecksum("GPRMC,123519,A")).toBe(false);
  });

  it("converts NMEA coordinate degrees and minutes to decimal degrees", () => {
    // 41°24.8963' N -> 41 + 24.8963 / 60 = 41.414938
    const lat = parseNmeaCoordinate("4124.8963", "N");
    expect(lat).toBeCloseTo(41.414938, 5);

    // 002°10.4521' W (West should be negative)
    const lonWest = parseNmeaCoordinate("00210.4521", "W");
    expect(lonWest).toBeCloseTo(-2.174202, 5);

    // South should be negative
    const latSouth = parseNmeaCoordinate("3350.5000", "S");
    expect(latSouth).toBeCloseTo(-33.841667, 5);
  });

  it("parses valid GPRMC sentence into structured telemetry", () => {
    const sentence =
      "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230324,003.1,W*61";
    const parsed = parseNmeaRmcSentence(sentence);

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe("ACTIVE");
    expect(parsed?.speedOverGroundKnots).toBe(22.4);
    expect(parsed?.trackAngleDeg).toBe(84.4);
    expect(parsed?.coordinate.latitude).toBeCloseTo(48.1173, 3);
    expect(parsed?.coordinate.longitude).toBeCloseTo(11.516667, 3);
  });

  it("parses GPVTG sentence into ground speed and courses", () => {
    // True track 054.7, speed 034.4 knots (063.7 km/h)
    const sentence = "$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48";
    const parsed = parseNmeaVtgSentence(sentence);

    expect(parsed).not.toBeNull();
    expect(parsed?.courseTrueDeg).toBe(54.7);
    expect(parsed?.speedKnots).toBe(5.5);
    expect(parsed?.speedKmh).toBe(10.2);
  });

  it("parses engine RPM sentences", () => {
    const sentence = "$ERRPM,E,1,105.4,85.0,A*7C";
    const parsed = parseNmeaRpmSentence(sentence);

    expect(parsed).not.toBeNull();
    expect(parsed?.source).toBe("ENGINE");
    expect(parsed?.engineNumber).toBe(1);
    expect(parsed?.rpm).toBe(105.4);
    expect(parsed?.pitchPercent).toBe(85.0);
    expect(parsed?.status).toBe("VALID");
  });
});

describe("IMO Ship Number Validation", () => {
  it("validates official IMO numbers using 7-digit weighted modulus check", () => {
    // Valid real container vessels
    // IMO 9811000: 9*7 + 8*6 + 1*5 + 1*4 + 0*3 + 0*2 = 63 + 48 + 5 + 4 = 120 mod 10 = 0 -> PASS
    expect(isValidImoNumber("IMO9811000")).toBe(true);
    expect(isValidImoNumber("9811000")).toBe(true);

    // IMO 9313400: 9*7 + 3*6 + 1*5 + 3*4 + 4*3 + 0*2 = 63 + 18 + 5 + 12 + 12 + 0 = 110 mod 10 = 0 -> PASS
    expect(isValidImoNumber("IMO9313400")).toBe(true);

    // Invalid check digits
    expect(isValidImoNumber("IMO9811001")).toBe(false);
    expect(isValidImoNumber("1234568")).toBe(false);
    expect(isValidImoNumber("ABC1234")).toBe(false);
  });
});

describe("FuelEU Maritime Compliance Engine (Regulation EU 2023/1805)", () => {
  it("calculates compliance deficit and statutory penalty for 100% VLSFO in 2025", () => {
    // 100 metric tonnes of standard VLSFO (41.0 MJ/kg, 91.16 gCO2eq/MJ)
    // 2025 target is 89.3368 gCO2eq/MJ -> Deficit
    const result = calculateFuelEuCompliance(
      [{ fuelType: "VLSFO", massMetricTonnes: 100 }],
      2025,
    );

    expect(result.actualGhgIntensityGPerMj).toBe(91.16);
    expect(result.targetGhgIntensityGPerMj).toBe(89.3368);
    expect(result.totalEnergyConsumedMj).toBe(4_100_000); // 100,000 kg * 41 MJ/kg
    expect(result.complianceBalanceGco2e).toBeLessThan(0);
    expect(result.isCompliant).toBe(false);
    expect(result.statutoryPenaltyEur).toBeGreaterThan(0);
    expect(result.bankingEligibleSurplusGco2e).toBe(0);
  });

  it("calculates compliance surplus and zero penalties for Biofuel blend", () => {
    // 50t VLSFO (91.16 g/MJ) + 50t Sustainable Biofuel (15.20 g/MJ)
    const result = calculateFuelEuCompliance(
      [
        { fuelType: "VLSFO", massMetricTonnes: 50 },
        { fuelType: "BIOFUEL", massMetricTonnes: 50 },
      ],
      2025,
    );

    // Weighted GHG intensity will be around ~55 gCO2eq/MJ, well below 89.3368
    expect(result.actualGhgIntensityGPerMj).toBeLessThan(60);
    expect(result.complianceBalanceGco2e).toBeGreaterThan(0);
    expect(result.isCompliant).toBe(true);
    expect(result.statutoryPenaltyEur).toBe(0);
    expect(result.bankingEligibleSurplusGco2e).toBe(
      result.complianceBalanceGco2e,
    );
  });

  it("applies shore power (OPS) zero-emission credit", () => {
    // OPS reduces overall average intensity
    const resultWithoutOps = calculateFuelEuCompliance(
      [{ fuelType: "MDO", massMetricTonnes: 10 }],
      2025,
      0,
    );

    const resultWithOps = calculateFuelEuCompliance(
      [{ fuelType: "MDO", massMetricTonnes: 10 }],
      2025,
      25000, // 25,000 kWh shore power
    );

    expect(resultWithOps.actualGhgIntensityGPerMj).toBeLessThan(
      resultWithoutOps.actualGhgIntensityGPerMj,
    );
  });
});

describe("IMO Operational CII Engine (MEPC.337(76))", () => {
  it("computes Attained Operational CII and assigns correct rating band", () => {
    // Container vessel, 120,000 DWT, sailed 2,000 nm, consuming 80t VLSFO
    // Total CO2 = 80t * 3.114 = 249.12 tonnes CO2 = 249,120,000 g
    // Transport work = 120,000 * 2,000 = 240,000,000 DWT*nm
    // Attained AER = 249,120,000 / 240,000,000 = 1.038 g/(DWT*nm)
    const cii = evaluateImoCii(
      "CONTAINER",
      120000,
      2000,
      [{ fuelType: "VLSFO", massMetricTonnes: 80 }],
      2026,
    );

    expect(cii.attainedAerGco2PerDwtNm).toBeCloseTo(1.038, 3);
    expect(cii.referenceCiiGco2PerDwtNm).toBeGreaterThan(0);
    expect(cii.requiredCiiGco2PerDwtNm).toBeLessThan(
      cii.referenceCiiGco2PerDwtNm,
    );
    expect(["A", "B", "C", "D", "E"]).toContain(cii.rating);
    expect(typeof cii.correctiveActionRequired).toBe("boolean");
  });

  it("assigns Rating A to ultra-efficient e-methanol propelled vessel", () => {
    const cii = evaluateImoCii(
      "CONTAINER",
      120000,
      2000,
      [{ fuelType: "E_METHANOL", massMetricTonnes: 100 }],
      2026,
    );

    // Zero operational carbon conversion under IMO CF guidelines
    expect(cii.attainedAerGco2PerDwtNm).toBe(0);
    expect(cii.rating).toBe("A");
    expect(cii.correctiveActionRequired).toBe(false);
  });

  it("flags corrective action when rating degrades to D or E", () => {
    // Excessively heavy fuel consumption over short distance -> rating E
    const cii = evaluateImoCii(
      "CONTAINER",
      20000,
      100, // short distance
      [{ fuelType: "VLSFO", massMetricTonnes: 150 }], // huge consumption
      2026,
    );

    expect(cii.rating).toBe("E");
    expect(cii.correctiveActionRequired).toBe(true);
  });
});

describe("Marine Telemetry Ingestion & Anomaly Detection", () => {
  const sampleTelemetry: RawMqttMarineTelemetry = {
    imoNumber: "IMO9811000",
    vesselName: "Atlas Atlantic Voyager",
    vesselType: "CONTAINER",
    deadweightTonnageDwt: 95000,
    timestamp: "2026-11-24T00:00:00Z",
    coordinate: { latitude: 41.35, longitude: 2.15 },
    speedOverGroundKnots: 19.5,
    distanceSailedNm: 420,
    fuelsConsumed: [
      { fuelType: "VLSFO", massMetricTonnes: 18.5 },
      { fuelType: "MDO", massMetricTonnes: 2.1 },
    ],
    shaftPowerKw: 24000,
    auxiliaryPowerKw: 2500,
    shorePowerConsumptionKwh: 0,
  };

  it("normalizes telematics and calculates energy and SFOC accurately", () => {
    const normalized = normalizeMarineTelemetry(sampleTelemetry);

    expect(normalized.totalFuelMassTonnes).toBeCloseTo(20.6, 2);
    expect(normalized.totalEnergyMj).toBeGreaterThan(800_000);
    expect(normalized.specificFuelOilConsumptionGPerKwh).toBeGreaterThan(0);
  });

  it("detects GPS position jump anomaly between telemetry packets", () => {
    const normalized = normalizeMarineTelemetry(sampleTelemetry);
    // Previous coordinate in Rotterdam (51.9° N), current in Barcelona (41.35° N) within 1 hour!
    const rotterdamCoord = { latitude: 51.92, longitude: 4.47 };

    const alerts = detectMarineTelemetryAnomalies(
      normalized,
      rotterdamCoord,
      1, // 1 hour elapsed
    );

    const jumpAlert = alerts.find(
      (a) => a.code === "GPS_TELEPORTATION_DISCONTINUITY",
    );
    expect(jumpAlert).toBeDefined();
    expect(jumpAlert?.severity).toBe("CRITICAL");
  });

  it("runs complete voyage assessment integrating telemetry, FuelEU, and CII", () => {
    const assessment = assessVoyageTelemetry(sampleTelemetry, 2026);

    expect(assessment.telemetry.imoNumber).toBe("IMO9811000");
    expect(assessment.fuelEu).toBeDefined();
    expect(assessment.fuelEu.totalEnergyConsumedMj).toBeGreaterThan(0);
    expect(assessment.cii).toBeDefined();
    expect(["A", "B", "C", "D", "E"]).toContain(assessment.cii.rating);
    expect(Array.isArray(assessment.alerts)).toBe(true);
  });
});

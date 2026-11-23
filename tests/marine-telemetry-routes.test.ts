/**
 * @file marine-telemetry-routes.test.ts
 * @description Integration tests for Fastify REST routes for Marine IoT Telemetry,
 * NMEA-0183 parsing, FuelEU Maritime calculation, and IMO CII ratings (ADR 0042).
 * @module @atlas/tests/marine-telemetry-routes
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { marineTelemetryRoutes } from "../src/routes/marine-telemetry.routes.js";
import { marineTelemetryService } from "../src/services/marine-telemetry.service.js";

describe("Marine Telemetry & FuelEU / IMO CII REST Routes (ADR 0042 T-68)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(marineTelemetryRoutes);
    await app.ready();
    marineTelemetryService.clearCache();
  });

  afterAll(async () => {
    marineTelemetryService.clearCache();
    await app.close();
  });

  it("POST /api/marine-telemetry/ingest - ingests MQTT stream and calculates FuelEU & CII", async () => {
    const payload = {
      imoNumber: "IMO9811000",
      vesselName: "Atlas Mediterranean Express",
      vesselType: "CONTAINER",
      deadweightTonnageDwt: 110000,
      timestamp: new Date().toISOString(),
      coordinate: { latitude: 39.46, longitude: -0.37 }, // Valencia Port approach
      speedOverGroundKnots: 18.2,
      distanceSailedNm: 580,
      fuelsConsumed: [
        { fuelType: "VLSFO", massMetricTonnes: 24.5 },
        { fuelType: "BIOFUEL", massMetricTonnes: 15.0 },
      ],
      shaftPowerKw: 22000,
      auxiliaryPowerKw: 2800,
      shorePowerConsumptionKwh: 12000,
      calendarYear: 2026,
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/marine-telemetry/ingest",
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.assessment).toBeDefined();

    // Telemetry fields
    expect(body.assessment.telemetry.imoNumber).toBe("IMO9811000");
    expect(body.assessment.telemetry.vesselName).toBe(
      "Atlas Mediterranean Express",
    );
    expect(body.assessment.telemetry.totalFuelMassTonnes).toBe(39.5);
    expect(body.assessment.telemetry.totalEnergyMj).toBeGreaterThan(0);

    // FuelEU Maritime fields
    expect(body.assessment.fuelEu.calendarYear).toBe(2026);
    expect(body.assessment.fuelEu.actualGhgIntensityGPerMj).toBeLessThan(
      89.3368,
    );
    expect(body.assessment.fuelEu.isCompliant).toBe(true);
    expect(body.assessment.fuelEu.statutoryPenaltyEur).toBe(0);

    // IMO CII evaluation fields
    expect(body.assessment.cii.calendarYear).toBe(2026);
    expect(["A", "B", "C", "D", "E"]).toContain(body.assessment.cii.rating);
    expect(body.assessment.cii.attainedAerGco2PerDwtNm).toBeGreaterThan(0);
    expect(body.assessment.cii.requiredCiiGco2PerDwtNm).toBeGreaterThan(0);
  });

  it("POST /api/marine-telemetry/nmea/parse - parses batch of NMEA-0183 sentences", async () => {
    const sentences = [
      "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230324,003.1,W*61",
      "$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48",
      "$ERRPM,E,1,105.4,85.0,A*7C",
      "$UNKNOWN_CORRUPTED_SENTENCE*00",
    ];

    const res = await app.inject({
      method: "POST",
      url: "/api/marine-telemetry/nmea/parse",
      payload: { sentences },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.parsed.rmc.length).toBe(1);
    expect(body.parsed.rmc[0].speedOverGroundKnots).toBe(22.4);
    expect(body.parsed.vtg.length).toBe(1);
    expect(body.parsed.vtg[0].speedKnots).toBe(5.5);
    expect(body.parsed.rpm.length).toBe(1);
    expect(body.parsed.rpm[0].rpm).toBe(105.4);
    expect(body.parsed.unparsedCount).toBe(1);
  });

  it("GET /api/marine-telemetry/vessels/:imoNumber/status - retrieves live snapshot", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/marine-telemetry/vessels/IMO9811000/status",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.assessment.telemetry.imoNumber).toBe("IMO9811000");
  });

  it("GET /api/marine-telemetry/vessels/:imoNumber/status - returns 404 for unknown vessel", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/marine-telemetry/vessels/IMO9999999/status",
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("GET /api/marine-telemetry/fleet/status - lists all cached fleet snapshots", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/marine-telemetry/fleet/status",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.fleet)).toBe(true);
    expect(body.fleet.length).toBeGreaterThanOrEqual(1);
  });
});

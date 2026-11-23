/**
 * @file marine-telemetry.routes.ts
 * @description Fastify REST routes for Marine IoT Telemetry (NMEA-0183 & MQTT streams),
 * FuelEU Maritime WtW compliance calculation, and IMO Operational CII ratings.
 * @module @atlas/api/routes/marine-telemetry
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { FastifyPluginAsync } from "fastify";
import { marineTelemetryService } from "../services/marine-telemetry.service.js";
import {
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";
import { type RawMqttMarineTelemetry } from "../scm/engines/marine-telemetry.engine.js";

// ============================================================================
// 1. OPENAPI TYPEBOX SCHEMAS
// ============================================================================

const FUEL_CONSUMED_ITEM_PROPERTIES = {
  fuelType: {
    type: "string",
    enum: ["VLSFO", "MDO", "LNG", "METHANOL", "BIOFUEL", "E_METHANOL"],
  },
  massMetricTonnes: { type: "number" },
  fuelTemperatureCelsius: { anyOf: [{ type: "number" }, { type: "null" }] },
  fuelDensityKgPerM3: { anyOf: [{ type: "number" }, { type: "null" }] },
};

const INGEST_TELEMETRY_BODY_SCHEMA = openApiObject({
  imoNumber: { type: "string" },
  vesselName: { type: "string" },
  vesselType: {
    type: "string",
    enum: ["CONTAINER", "BULK_CARRIER", "TANKER", "GENERAL_CARGO"],
  },
  deadweightTonnageDwt: { type: "number" },
  timestamp: { type: "string" },
  coordinate: openApiObject({
    latitude: { type: "number" },
    longitude: { type: "number" },
  }),
  speedOverGroundKnots: { type: "number" },
  distanceSailedNm: { type: "number" },
  fuelsConsumed: openApiArray(FUEL_CONSUMED_ITEM_PROPERTIES),
  shaftPowerKw: { type: "number" },
  auxiliaryPowerKw: { type: "number" },
  shorePowerConsumptionKwh: { anyOf: [{ type: "number" }, { type: "null" }] },
  calendarYear: { anyOf: [{ type: "number" }, { type: "null" }] },
});

const PARSE_NMEA_BODY_SCHEMA = openApiObject({
  sentences: { type: "array", items: { type: "string" } },
});

const TELEMETRY_ALERT_PROPERTIES = {
  code: { type: "string" },
  severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
  message: { type: "string" },
  detectedAt: { type: "string" },
  details: openApiObject({}),
};

const COMPLETE_ASSESSMENT_SCHEMA = openApiObject({
  telemetry: openApiObject({
    imoNumber: { type: "string" },
    vesselName: { type: "string" },
    vesselType: { type: "string" },
    deadweightTonnageDwt: { type: "number" },
    timestamp: { type: "string" },
    coordinate: openApiObject({
      latitude: { type: "number" },
      longitude: { type: "number" },
    }),
    speedOverGroundKnots: { type: "number" },
    distanceSailedNm: { type: "number" },
    totalFuelMassTonnes: { type: "number" },
    totalEnergyMj: { type: "number" },
    shaftPowerKw: { type: "number" },
    auxiliaryPowerKw: { type: "number" },
    specificFuelOilConsumptionGPerKwh: { type: "number" },
    shorePowerConsumptionKwh: { type: "number" },
  }),
  fuelEu: openApiObject({
    calendarYear: { type: "number" },
    targetGhgIntensityGPerMj: { type: "number" },
    actualGhgIntensityGPerMj: { type: "number" },
    totalEnergyConsumedMj: { type: "number" },
    complianceBalanceGco2e: { type: "number" },
    isCompliant: { type: "boolean" },
    statutoryPenaltyEur: { type: "number" },
    bankingEligibleSurplusGco2e: { type: "number" },
  }),
  cii: openApiObject({
    calendarYear: { type: "number" },
    attainedAerGco2PerDwtNm: { type: "number" },
    referenceCiiGco2PerDwtNm: { type: "number" },
    requiredCiiGco2PerDwtNm: { type: "number" },
    rating: { type: "string", enum: ["A", "B", "C", "D", "E"] },
    ratingBoundaries: openApiObject({
      superiorA: { type: "number" },
      minorSuperiorB: { type: "number" },
      moderateC: { type: "number" },
      minorInferiorD: { type: "number" },
    }),
    ratioToRequiredCii: { type: "number" },
    correctiveActionRequired: { type: "boolean" },
  }),
  alerts: openApiArray(TELEMETRY_ALERT_PROPERTIES),
});

// ============================================================================
// 2. ROUTE DEFINITIONS
// ============================================================================

export const marineTelemetryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/marine-telemetry/ingest
   * Ingests vessel telemetry packet, evaluates FuelEU Maritime & IMO CII, and emits outbox events.
   */
  fastify.post<{
    Body: RawMqttMarineTelemetry & { calendarYear?: number };
  }>(
    "/api/marine-telemetry/ingest",
    {
      schema: {
        description:
          "Ingests raw marine telemetry (MQTT/IoT), computes FuelEU Maritime compliance and IMO CII rating",
        tags: ["Marine Telemetry"],
        body: INGEST_TELEMETRY_BODY_SCHEMA,
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            assessment: COMPLETE_ASSESSMENT_SCHEMA,
          }),
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const assessment = await marineTelemetryService.ingestTelemetry(
        request.body,
        "global_default",
        request.body.calendarYear || 2026,
      );

      return reply.code(200).send({
        success: true,
        assessment,
      });
    },
  );

  /**
   * POST /api/marine-telemetry/nmea/parse
   * Parses a batch of raw NMEA-0183 sentences (GPRMC, GPVTG, RPM).
   */
  fastify.post<{
    Body: { sentences: string[] };
  }>(
    "/api/marine-telemetry/nmea/parse",
    {
      schema: {
        description:
          "Parses raw NMEA-0183 marine sentences and verifies XOR checksums",
        tags: ["Marine Telemetry"],
        body: PARSE_NMEA_BODY_SCHEMA,
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            parsed: openApiObject({
              rmc: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              vtg: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              rpm: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              unparsedCount: { type: "number" },
            }),
          }),
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const parsed = marineTelemetryService.parseNmeaBatch(
        request.body.sentences || [],
      );

      return reply.code(200).send({
        success: true,
        parsed,
      });
    },
  );

  /**
   * GET /api/marine-telemetry/vessels/:imoNumber/status
   * Retrieves the latest operational telemetry assessment for a vessel by IMO number.
   */
  fastify.get<{
    Params: { imoNumber: string };
  }>(
    "/api/marine-telemetry/vessels/:imoNumber/status",
    {
      schema: {
        description:
          "Retrieves latest operational telemetry, FuelEU balance, and CII rating by vessel IMO number",
        tags: ["Marine Telemetry"],
        params: openApiObject({
          imoNumber: { type: "string" },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            assessment: {
              anyOf: [COMPLETE_ASSESSMENT_SCHEMA, { type: "null" }],
            },
          }),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const assessment = marineTelemetryService.getLatestSnapshot(
        request.params.imoNumber,
      );

      if (!assessment) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: `No active telemetry snapshot found for vessel ${request.params.imoNumber}`,
        });
      }

      return reply.code(200).send({
        success: true,
        assessment,
      });
    },
  );

  /**
   * GET /api/marine-telemetry/fleet/status
   * Lists all active vessel telemetry snapshots across the fleet.
   */
  fastify.get(
    "/api/marine-telemetry/fleet/status",
    {
      schema: {
        description:
          "Lists latest operational telemetry snapshots for all active fleet vessels",
        tags: ["Marine Telemetry"],
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            fleet: { type: "array", items: COMPLETE_ASSESSMENT_SCHEMA },
          }),
          ...buildErrorResponses([500]),
        },
      },
    },
    async (_request, reply) => {
      const fleet = marineTelemetryService.listFleetSnapshots();

      return reply.code(200).send({
        success: true,
        fleet,
      });
    },
  );
};

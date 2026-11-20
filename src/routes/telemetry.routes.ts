/**
 * @file telemetry.routes.ts
 * @description IoT fleet telemetry endpoints for tracked assets, breadcrumb histories, geofences, anomaly injection, and alert resolution.
 * @module @atlas/api/routes/telemetry
 */

import { FastifyPluginAsync } from "fastify";
import { TelemetryService } from "../services/telemetry/telemetry.service.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
} from "./openapi.schemas.js";

const TELEMETRY_TAG = ["IoT Fleet Telemetry"] as const;

export const telemetryRoutes: FastifyPluginAsync = async (fastify) => {
  // Optional auth verification hook
  fastify.addHook("onRequest", async (req, _reply) => {
    try {
      if (req.headers.authorization) {
        await req.jwtVerify();
      }
    } catch {
      // Allow gracefully for dev/test endpoints
    }
  });

  // GET /api/telemetry/summary - Top KPI Aggregates
  fastify.get(
    "/summary",
    {
      schema: {
        tags: [...TELEMETRY_TAG],
        summary: "Retrieve IoT fleet telemetry KPI summary aggregates",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req, reply) => {
      try {
        const summary = await TelemetryService.getFleetSummary();
        return reply.send(summary);
      } catch (err: unknown) {
        fastify.log.error(err);
        return reply
          .status(500)
          .send({ message: "Error fetching fleet telemetry summary" });
      }
    },
  );

  // GET /api/telemetry/assets - List all tracked assets
  fastify.get(
    "/assets",
    {
      schema: {
        tags: [...TELEMETRY_TAG],
        summary:
          "List all IoT-tracked containers, reefers, and transport assets",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req, reply) => {
      try {
        const assets = await TelemetryService.getAllAssets();
        return reply.send(assets);
      } catch (err: unknown) {
        fastify.log.error(err);
        return reply
          .status(500)
          .send({ message: "Error fetching tracked assets" });
      }
    },
  );

  // GET /api/telemetry/assets/:id - Single asset details with live readings & alerts
  fastify.get<{ Params: { id: string } }>(
    "/assets/:id",
    {
      schema: {
        tags: [...TELEMETRY_TAG],
        summary: "Retrieve live readings and active alerts for a tracked asset",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const detail = await TelemetryService.getAssetById(req.params.id);
        if (!detail) {
          return reply.status(404).send({ message: "Tracked asset not found" });
        }
        return reply.send(detail);
      } catch (err: unknown) {
        fastify.log.error(err);
        return reply
          .status(500)
          .send({ message: "Error fetching asset details" });
      }
    },
  );

  // GET /api/telemetry/assets/:id/history - Full breadcrumb history for Timeline Playback
  fastify.get<{ Params: { id: string } }>(
    "/assets/:id/history",
    {
      schema: {
        tags: [...TELEMETRY_TAG],
        summary:
          "Retrieve historical telemetry breadcrumb readings for timeline playback",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const history = await TelemetryService.getAssetHistory(req.params.id);
        return reply.send(history);
      } catch (err: unknown) {
        fastify.log.error(err);
        return reply
          .status(500)
          .send({ message: "Error fetching asset history" });
      }
    },
  );

  // GET /api/telemetry/geofences - List all configured geofences
  fastify.get(
    "/geofences",
    {
      schema: {
        tags: [...TELEMETRY_TAG],
        summary: "List configured port, terminal, and corridor geofences",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req, reply) => {
      try {
        const geofencesList = await TelemetryService.getGeofences();
        return reply.send(geofencesList);
      } catch (err: unknown) {
        fastify.log.error(err);
        return reply.status(500).send({ message: "Error fetching geofences" });
      }
    },
  );

  // POST /api/telemetry/simulate-anomaly - Injects real-time simulated events/alarms
  fastify.post<{
    Body: {
      assetId: string;
      anomalyType:
        | "TEMPERATURE_EXCURSION"
        | "SHOCK_IMPACT"
        | "SEAL_TAMPERED"
        | "NORMALIZE";
      customValue?: number;
    };
  }>(
    "/simulate-anomaly",
    {
      schema: {
        tags: [...TELEMETRY_TAG],
        summary:
          "Inject a diagnostic telemetry excursion or seal-tamper anomaly",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const { assetId, anomalyType, customValue } = req.body;
        if (!assetId || !anomalyType) {
          return reply
            .status(400)
            .send({ message: "assetId and anomalyType are required" });
        }

        const result = await TelemetryService.simulateAnomaly(
          assetId,
          anomalyType,
          customValue,
        );
        return reply.send(result);
      } catch (err: unknown) {
        fastify.log.error(err);
        return reply.status(500).send({
          message:
            err instanceof Error ? err.message : "Error simulating anomaly",
        });
      }
    },
  );

  // POST /api/telemetry/alerts/:id/resolve - Resolves an active alert
  fastify.post<{
    Params: { id: string };
    Body: { resolvedBy?: string };
  }>(
    "/alerts/:id/resolve",
    {
      schema: {
        tags: [...TELEMETRY_TAG],
        summary: "Resolve an active IoT telemetry alert by identifier",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const result = await TelemetryService.resolveAlert(
          req.params.id,
          req.body?.resolvedBy || "Control Tower Operator",
        );
        return reply.send(result);
      } catch (err: unknown) {
        fastify.log.error(err);
        return reply.status(500).send({ message: "Error resolving alert" });
      }
    },
  );
};

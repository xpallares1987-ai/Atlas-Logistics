import { FastifyPluginAsync } from "fastify";
import { TelemetryService } from "../services/telemetry/telemetry.service.js";

export const telemetryRoutes: FastifyPluginAsync = async (fastify) => {
  // Optional auth verification hook
  fastify.addHook("onRequest", async (req, reply) => {
    try {
      if (req.headers.authorization) {
        await req.jwtVerify();
      }
    } catch {
      // Allow gracefully for dev/test endpoints
    }
  });

  // GET /api/telemetry/summary - Top KPI Aggregates
  fastify.get("/summary", async (req, reply) => {
    try {
      const summary = await TelemetryService.getFleetSummary();
      return reply.send(summary);
    } catch (err: any) {
      fastify.log.error(err);
      return reply
        .status(500)
        .send({ message: "Error fetching fleet telemetry summary" });
    }
  });

  // GET /api/telemetry/assets - List all tracked assets
  fastify.get("/assets", async (req, reply) => {
    try {
      const assets = await TelemetryService.getAllAssets();
      return reply.send(assets);
    } catch (err: any) {
      fastify.log.error(err);
      return reply
        .status(500)
        .send({ message: "Error fetching tracked assets" });
    }
  });

  // GET /api/telemetry/assets/:id - Single asset details with live readings & alerts
  fastify.get<{ Params: { id: string } }>("/assets/:id", async (req, reply) => {
    try {
      const detail = await TelemetryService.getAssetById(req.params.id);
      if (!detail) {
        return reply.status(404).send({ message: "Tracked asset not found" });
      }
      return reply.send(detail);
    } catch (err: any) {
      fastify.log.error(err);
      return reply
        .status(500)
        .send({ message: "Error fetching asset details" });
    }
  });

  // GET /api/telemetry/assets/:id/history - Full breadcrumb history for Timeline Playback
  fastify.get<{ Params: { id: string } }>(
    "/assets/:id/history",
    async (req, reply) => {
      try {
        const history = await TelemetryService.getAssetHistory(req.params.id);
        return reply.send(history);
      } catch (err: any) {
        fastify.log.error(err);
        return reply
          .status(500)
          .send({ message: "Error fetching asset history" });
      }
    },
  );

  // GET /api/telemetry/geofences - List all configured geofences
  fastify.get("/geofences", async (req, reply) => {
    try {
      const geofencesList = await TelemetryService.getGeofences();
      return reply.send(geofencesList);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ message: "Error fetching geofences" });
    }
  });

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
  }>("/simulate-anomaly", async (req, reply) => {
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
    } catch (err: any) {
      fastify.log.error(err);
      return reply
        .status(500)
        .send({ message: err.message || "Error simulating anomaly" });
    }
  });

  // POST /api/telemetry/alerts/:id/resolve - Resolves an active alert
  fastify.post<{
    Params: { id: string };
    Body: { resolvedBy?: string };
  }>("/alerts/:id/resolve", async (req, reply) => {
    try {
      const result = await TelemetryService.resolveAlert(
        req.params.id,
        req.body?.resolvedBy || "Control Tower Operator",
      );
      return reply.send(result);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ message: "Error resolving alert" });
    }
  });
};

/**
 * @file port-congestion.routes.ts
 * @description Fastify routes for Predictive Port Congestion, AIS berth collision detection, drayage appointment rebalancing, and Demurrage & Detention suspension notices.
 * @module @atlas/api/modules/port-congestion/routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PortCongestionService } from "./port-congestion.service.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const PORT_CONGESTION_TAG = ["Port Congestion & Berth AIS"] as const;

export default async function portCongestionRoutes(fastify: FastifyInstance) {
  const service = new PortCongestionService();

  // 1. GET /api/port-congestion/hubs
  fastify.get(
    "/hubs",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary:
          "List monitored global container port congestion hubs and AIS wait indices",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const hubs = service.getHubs();
      return reply.send({ success: true, count: hubs.length, hubs });
    },
  );

  // 2. GET /api/port-congestion/hubs/:portCode
  fastify.get<{ Params: { portCode: string } }>(
    "/hubs/:portCode",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary:
          "Retrieve congestion telemetry for a specific UN/LOCODE port hub",
        params: buildParamSchema(
          "portCode",
          "UN/LOCODE 5-character seaport identifier (e.g. ESBCN, NLRTM)",
        ),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const hub = service.getHub(req.params.portCode);
      if (!hub) {
        return reply.code(404).send({
          success: false,
          message: `Puerto ${req.params.portCode} no encontrado.`,
        });
      }
      return reply.send({ success: true, hub });
    },
  );

  // 3. GET /api/port-congestion/vessels
  fastify.get<{ Querystring: { portCode?: string } }>(
    "/vessels",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary: "List AIS-tracked container vessels at anchorage or berth",
        querystring: openApiObject({
          portCode: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const vessels = service.getVessels(req.query.portCode);
      return reply.send({ success: true, count: vessels.length, vessels });
    },
  );

  // 4. GET /api/port-congestion/collisions
  fastify.get<{ Querystring: { portCode?: string; bufferMinutes?: string } }>(
    "/collisions",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary:
          "Detect predicted berth schedule collisions within safety buffer minutes",
        querystring: openApiObject({
          portCode: { type: "string" },
          bufferMinutes: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const buffer = req.query.bufferMinutes
        ? parseInt(req.query.bufferMinutes, 10)
        : 120;
      const collisions = service.getBerthCollisions(req.query.portCode, buffer);
      return reply.send({
        success: true,
        count: collisions.length,
        collisions,
      });
    },
  );

  // 5. POST /api/port-congestion/collisions/resolve
  fastify.post<{ Body: { collisionId?: string } }>(
    "/collisions/resolve",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary: "Resolve a detected vessel berth collision alert",
        body: openApiObject({
          collisionId: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { collisionId } = req.body || {};
      if (!collisionId) {
        return reply
          .code(400)
          .send({ success: false, message: "collisionId es obligatorio." });
      }
      const result = service.resolveCollision(collisionId);
      if (!result.success) {
        return reply.code(404).send(result);
      }
      return reply.send(result);
    },
  );

  // 6. GET /api/port-congestion/drayage
  fastify.get<{ Querystring: { portCode?: string } }>(
    "/drayage",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary:
          "List terminal gate drayage appointments impacted by port congestion",
        querystring: openApiObject({
          portCode: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const appointments = service.getDrayageAppointments(req.query.portCode);
      return reply.send({
        success: true,
        count: appointments.length,
        appointments,
      });
    },
  );

  // 7. POST /api/port-congestion/rebalance-drayage
  fastify.post<{ Body: { portCode?: string } }>(
    "/rebalance-drayage",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary: "Rebalance impacted terminal drayage gate slots automatically",
        body: openApiObject({
          portCode: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const appointments = service.rebalanceDrayageAppointments(
        req.body?.portCode,
      );
      return reply.send({
        success: true,
        message: "Acarreo terrestre e intermodal rebalanceado exitosamente.",
        count: appointments.length,
        appointments,
      });
    },
  );

  // 8. POST /api/port-congestion/generate-dd-notice
  fastify.post<{
    Body: {
      portCode?: string;
      terminalName?: string;
      vesselName?: string;
      containerNo?: string;
      reason?:
        | "PORT_CONGESTION_ANCHORAGE_DWELL"
        | "BERTH_COLLISION_DELAY"
        | "TERMINAL_GATE_APPOINTMENT_UNAVAILABLE";
      dwellOrDelayHours?: number;
      issuer?:
        "ADMIN (SuperAdmin / Systems Lead)" | "TEST01 (Team Leader Customer01)";
    };
  }>(
    "/generate-dd-notice",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary:
          "Generate evidentiary Demurrage & Detention clock suspension certificate",
        body: openApiObject({
          portCode: { type: "string" },
          terminalName: { type: "string" },
          vesselName: { type: "string" },
          containerNo: { type: "string" },
          reason: {
            type: "string",
            enum: [
              "PORT_CONGESTION_ANCHORAGE_DWELL",
              "BERTH_COLLISION_DELAY",
              "TERMINAL_GATE_APPOINTMENT_UNAVAILABLE",
            ],
          },
          dwellOrDelayHours: { type: "number" },
          issuer: { type: "string" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const {
        portCode,
        terminalName,
        vesselName,
        containerNo,
        reason,
        dwellOrDelayHours,
        issuer,
      } = req.body || {};

      if (
        !portCode ||
        !terminalName ||
        !vesselName ||
        !containerNo ||
        !reason ||
        dwellOrDelayHours === undefined
      ) {
        return reply.code(400).send({
          success: false,
          message:
            "Faltan parámetros requeridos para generar la certificación D&D.",
        });
      }

      const certificate = service.generateDDCertificate({
        portCode,
        terminalName,
        vesselName,
        containerNo,
        reason,
        dwellOrDelayHours: Number(dwellOrDelayHours),
        issuer,
      });

      return reply.code(201).send({
        success: true,
        message:
          "Certificado de suspensión de plazo D&D generado exitosamente.",
        certificate,
      });
    },
  );

  // 9. GET /api/port-congestion/dd-notices
  fastify.get(
    "/dd-notices",
    {
      schema: {
        tags: [...PORT_CONGESTION_TAG],
        summary:
          "List issued Demurrage & Detention congestion suspension notices",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const certificates = service.getDDCertificates();
      return reply.send({
        success: true,
        count: certificates.length,
        certificates,
      });
    },
  );
}

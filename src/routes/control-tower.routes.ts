/**
 * @file control-tower.routes.ts
 * @description Fastify routes for Control Tower KPIs, operational incident triage, rerouting, freight audit disputes, ICS2 radar, and multimodal spot pricing.
 * @module @atlas/api/routes/control-tower
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  ControlTowerService,
  CreateIncidentInput,
  SpotRateParams,
} from "../services/control-tower/index.js";
import { logger } from "../config/logger.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  openApiObject,
} from "./openapi.schemas.js";

const CONTROL_TOWER_TAG = ["Control Tower"] as const;

export default async function controlTowerRoutes(fastify: FastifyInstance) {
  // GET /api/control-tower/kpis
  fastify.get(
    "/kpis",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary: "Retrieve Control Tower operational KPI aggregates",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const kpis = await ControlTowerService.getKpis();
        return reply.send({ success: true, data: kpis });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to get control tower KPIs");
        return reply.status(500).send({
          success: false,
          error: "Failed to retrieve control tower KPI metrics",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // GET /api/control-tower/incidents
  fastify.get(
    "/incidents",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary:
          "List Control Tower incidents with status, severity, and type filters",
        querystring: openApiObject({
          status: { type: "string" },
          severity: { type: "string" },
          incidentType: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          status?: string;
          severity?: string;
          incidentType?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const incidents = await ControlTowerService.listIncidents(
          request.query,
        );
        return reply.send({ success: true, data: incidents });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to list incidents");
        return reply.status(500).send({
          success: false,
          error: "Failed to list operational incidents",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // GET /api/control-tower/incidents/:id
  fastify.get(
    "/incidents/:id",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary:
          "Retrieve detailed Control Tower incident record by identifier",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const incident = await ControlTowerService.getIncidentById(
          request.params.id,
        );
        if (!incident) {
          return reply.status(404).send({
            success: false,
            error: "Incident not found",
          });
        }
        return reply.send({ success: true, data: incident });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to get incident");
        return reply.status(500).send({
          success: false,
          error: "Failed to retrieve incident",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/control-tower/incidents
  fastify.post(
    "/incidents",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary: "Register a new Control Tower operational disruption incident",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateIncidentInput }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await ControlTowerService.createIncident(request.body);
        return reply.status(201).send({ success: true, data: result });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to create incident");
        return reply.status(500).send({
          success: false,
          error: "Failed to register operational incident",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/control-tower/incidents/:id/reroute
  fastify.post(
    "/incidents/:id/reroute",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary:
          "Generate multimodal rerouting alternatives for an active incident",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { contextTitle?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const options = await ControlTowerService.generateRerouteOptions(
          request.params.id,
          request.body?.contextTitle || "Transport Incident",
        );
        return reply.send({ success: true, data: options });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to generate reroute options");
        return reply.status(500).send({
          success: false,
          error: "Failed to calculate reroute alternatives",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/control-tower/incidents/:id/resolve
  fastify.post(
    "/incidents/:id/resolve",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary: "Execute a resolution action on a Control Tower incident",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          action: string;
          selectedOptionId?: string;
          resolvedBy?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await ControlTowerService.resolveIncident(
          request.params.id,
          request.body.action,
          request.body.selectedOptionId,
          request.body.resolvedBy,
        );
        return reply.send({ success: true, data: result });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to resolve incident");
        return reply.status(500).send({
          success: false,
          error: "Failed to execute incident resolution",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // GET /api/control-tower/audit/matches
  fastify.get(
    "/audit/matches",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary:
          "List automated three-way freight audit invoice matches and variances",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const matches = await ControlTowerService.getFreightAuditMatches();
        return reply.send({ success: true, data: matches });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to get freight audit matches");
        return reply.status(500).send({
          success: false,
          error: "Failed to retrieve freight audit matches",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/control-tower/audit/dispute
  fastify.post(
    "/audit/dispute",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary:
          "File a freight audit variance dispute against a carrier invoice line",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          invoiceLineId: string;
          carrierInvoiceId?: string;
          shipmentId?: string;
          reason: string;
          resolutionNote?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const dispute = await ControlTowerService.createFreightDispute(
          request.body,
        );
        return reply.status(201).send({ success: true, data: dispute });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to file freight dispute");
        return reply.status(500).send({
          success: false,
          error: "Failed to file freight dispute",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // GET /api/control-tower/customs/radar
  fastify.get(
    "/customs/radar",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary: "Query EU ICS2 customs pre-arrival compliance radar status",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const radar = await ControlTowerService.getCustomsRadar();
        return reply.send({ success: true, data: radar });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to get customs radar");
        return reply.status(500).send({
          success: false,
          error: "Failed to query ICS2 customs radar",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/control-tower/customs/file-ics2
  fastify.post(
    "/customs/file-ics2",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary: "Submit an EU ICS2 Entry Summary Declaration (ENS)",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          shipmentId?: string;
          declarantEori: string;
          customsOfficeCode: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const ens = await ControlTowerService.fileIcs2Declaration(request.body);
        return reply.status(201).send({ success: true, data: ens });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to file ICS2 declaration");
        return reply.status(500).send({
          success: false,
          error: "Failed to submit ICS2 ENS declaration",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/control-tower/rates/calculate-spot
  fastify.post(
    "/rates/calculate-spot",
    {
      schema: {
        tags: [...CONTROL_TOWER_TAG],
        summary: "Calculate instant multimodal spot freight rate quotation",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: SpotRateParams }>,
      reply: FastifyReply,
    ) => {
      try {
        const calculation = ControlTowerService.calculateSpotRate(request.body);
        return reply.send({ success: true, data: calculation });
      } catch (err: unknown) {
        logger.error({ err }, "Failed to calculate spot rate");
        return reply.status(500).send({
          success: false,
          error: "Failed to calculate multimodal spot rate",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );
}

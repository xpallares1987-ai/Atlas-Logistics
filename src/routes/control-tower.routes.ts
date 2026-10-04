import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  ControlTowerService,
  CreateIncidentInput,
  SpotRateParams,
} from "../services/control-tower/index.js";
import { logger } from "../config/logger.js";

export default async function controlTowerRoutes(fastify: FastifyInstance) {
  // GET /api/control-tower/kpis
  fastify.get("/kpis", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const kpis = await ControlTowerService.getKpis();
      return reply.send({ success: true, data: kpis });
    } catch (err: any) {
      logger.error({ err }, "Failed to get control tower KPIs");
      return reply.status(500).send({
        success: false,
        error: "No se pudieron obtener las métricas de la Torre de Control",
        details: err?.message,
      });
    }
  });

  // GET /api/control-tower/incidents
  fastify.get(
    "/incidents",
    async (
      request: FastifyRequest<{
        Querystring: { status?: string; severity?: string; incidentType?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const incidents = await ControlTowerService.listIncidents(request.query);
        return reply.send({ success: true, data: incidents });
      } catch (err: any) {
        logger.error({ err }, "Failed to list incidents");
        return reply.status(500).send({
          success: false,
          error: "Error al listar incidencias operativas",
          details: err?.message,
        });
      }
    },
  );

  // GET /api/control-tower/incidents/:id
  fastify.get(
    "/incidents/:id",
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
            error: "Incidencia no encontrada",
          });
        }
        return reply.send({ success: true, data: incident });
      } catch (err: any) {
        logger.error({ err }, "Failed to get incident");
        return reply.status(500).send({
          success: false,
          error: "Error al obtener la incidencia",
          details: err?.message,
        });
      }
    },
  );

  // POST /api/control-tower/incidents
  fastify.post(
    "/incidents",
    async (
      request: FastifyRequest<{ Body: CreateIncidentInput }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await ControlTowerService.createIncident(request.body);
        return reply.status(201).send({ success: true, data: result });
      } catch (err: any) {
        logger.error({ err }, "Failed to create incident");
        return reply.status(500).send({
          success: false,
          error: "Error al registrar la incidencia",
          details: err?.message,
        });
      }
    },
  );

  // POST /api/control-tower/incidents/:id/reroute
  fastify.post(
    "/incidents/:id/reroute",
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
          request.body?.contextTitle || "Incidencia de Transporte",
        );
        return reply.send({ success: true, data: options });
      } catch (err: any) {
        logger.error({ err }, "Failed to generate reroute options");
        return reply.status(500).send({
          success: false,
          error: "Error al calcular alternativas de re-enrutamiento",
          details: err?.message,
        });
      }
    },
  );

  // POST /api/control-tower/incidents/:id/resolve
  fastify.post(
    "/incidents/:id/resolve",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { action: string; selectedOptionId?: string; resolvedBy?: string };
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
      } catch (err: any) {
        logger.error({ err }, "Failed to resolve incident");
        return reply.status(500).send({
          success: false,
          error: "Error al ejecutar la resolución del incidente",
          details: err?.message,
        });
      }
    },
  );

  // GET /api/control-tower/audit/matches
  fastify.get(
    "/audit/matches",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const matches = await ControlTowerService.getFreightAuditMatches();
        return reply.send({ success: true, data: matches });
      } catch (err: any) {
        logger.error({ err }, "Failed to get freight audit matches");
        return reply.status(500).send({
          success: false,
          error: "Error al obtener conciliaciones de auditoría de fletes",
          details: err?.message,
        });
      }
    },
  );

  // POST /api/control-tower/audit/dispute
  fastify.post(
    "/audit/dispute",
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
      } catch (err: any) {
        logger.error({ err }, "Failed to file freight dispute");
        return reply.status(500).send({
          success: false,
          error: "Error al emitir la disputa de flete",
          details: err?.message,
        });
      }
    },
  );

  // GET /api/control-tower/customs/radar
  fastify.get(
    "/customs/radar",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const radar = await ControlTowerService.getCustomsRadar();
        return reply.send({ success: true, data: radar });
      } catch (err: any) {
        logger.error({ err }, "Failed to get customs radar");
        return reply.status(500).send({
          success: false,
          error: "Error al consultar el radar aduanero ICS2",
          details: err?.message,
        });
      }
    },
  );

  // POST /api/control-tower/customs/file-ics2
  fastify.post(
    "/customs/file-ics2",
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
      } catch (err: any) {
        logger.error({ err }, "Failed to file ICS2 declaration");
        return reply.status(500).send({
          success: false,
          error: "Error al presentar la declaración ENS ICS2",
          details: err?.message,
        });
      }
    },
  );

  // POST /api/control-tower/rates/calculate-spot
  fastify.post(
    "/rates/calculate-spot",
    async (
      request: FastifyRequest<{ Body: SpotRateParams }>,
      reply: FastifyReply,
    ) => {
      try {
        const calculation = ControlTowerService.calculateSpotRate(request.body);
        return reply.send({ success: true, data: calculation });
      } catch (err: any) {
        logger.error({ err }, "Failed to calculate spot rate");
        return reply.status(500).send({
          success: false,
          error: "Error al calcular la cotización multimodal spot",
          details: err?.message,
        });
      }
    },
  );
}

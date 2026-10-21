/**
 * @file workload.routes.ts
 * @description Fastify REST routes for Workload Analysis, Portfolio Rebalancing,
 * Axle Load Kinematics Heatmap, and Carrier Charge Audit.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { WorkloadService } from "./workload.service.js";
import { WorkloadSettings, CoilPositionInput } from "@atlas/shared";

export default async function workloadRoutes(fastify: FastifyInstance) {
  const service = new WorkloadService();

  // GET /settings
  fastify.get(
    "/settings",
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const settings = service.getSettings();
      return reply.send({ success: true, settings });
    },
  );

  // POST /settings
  fastify.post(
    "/settings",
    async (
      req: FastifyRequest<{ Body: Partial<WorkloadSettings> }>,
      reply: FastifyReply,
    ) => {
      const updated = service.updateSettings(req.body || {});
      return reply.send({
        success: true,
        message: "Configuración de carga de trabajo actualizada correctamente.",
        settings: updated,
      });
    },
  );

  // GET /analysis
  fastify.get(
    "/analysis",
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const analysis = service.getWorkloadAnalysis();
      return reply.send({ success: true, ...analysis });
    },
  );

  // POST /rebalance/apply
  fastify.post(
    "/rebalance/apply",
    async (
      req: FastifyRequest<{
        Body: {
          sourceOperative: string;
          targetOperative: string;
          buyerName: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = req.body;
        if (
          !body ||
          !body.sourceOperative ||
          !body.targetOperative ||
          !body.buyerName
        ) {
          return reply.code(400).send({
            success: false,
            message:
              "sourceOperative, targetOperative y buyerName son obligatorios.",
          });
        }
        const result = service.applyRebalance(body);
        return reply.send(result);
      } catch (err: any) {
        return reply.code(400).send({ success: false, message: err.message });
      }
    },
  );

  // POST /stowage/axle-heatmap
  fastify.post(
    "/stowage/axle-heatmap",
    async (
      req: FastifyRequest<{
        Body: {
          coils: CoilPositionInput[];
          isUsa?: boolean;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const coils = req.body?.coils || [];
      const isUsa = Boolean(req.body?.isUsa);
      const result = service.calculateAxleHeatmap(coils, isUsa);
      return reply.send({ success: true, result });
    },
  );

  // GET /charge-audit/discrepancies
  fastify.get(
    "/charge-audit/discrepancies",
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const discrepancies = service.getChargeDiscrepancies();
      return reply.send({ success: true, ...discrepancies });
    },
  );
}

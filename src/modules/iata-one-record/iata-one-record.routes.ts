/**
 * @file iata-one-record.routes.ts
 * @description Fastify routes for IATA ONE Record Linked Data Hub, digital Air Cargo e-AWB logistics objects, Cargo iQ milestones, and e-DGD dangerous goods validation.
 * @module @atlas/api/modules/iata-one-record/routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { IataOneRecordService } from "./iata-one-record.service.js";
import { CargoIqMilestoneCode, DangerousGoodsItem } from "@atlas/shared";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const ONE_RECORD_TAG = ["IATA ONE Record & e-AWB"] as const;

export default async function iataOneRecordRoutes(fastify: FastifyInstance) {
  const service = new IataOneRecordService();

  // 1. GET /api/one-record/waybills
  fastify.get(
    "/waybills",
    {
      schema: {
        tags: [...ONE_RECORD_TAG],
        summary:
          "List IATA ONE Record digital Air Waybill (e-AWB) logistics objects",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const waybills = await service.getWaybills();
      return reply.send({ success: true, count: waybills.length, waybills });
    },
  );

  // 2. GET /api/one-record/waybills/:waybillId
  fastify.get<{ Params: { waybillId: string } }>(
    "/waybills/:waybillId",
    {
      schema: {
        tags: [...ONE_RECORD_TAG],
        summary:
          "Retrieve a single IATA ONE Record e-AWB logistics object by ID",
        params: buildParamSchema(
          "waybillId",
          "IATA ONE Record e-AWB logistics object identifier",
        ),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const waybill = await service.getWaybill(req.params.waybillId);
      if (!waybill) {
        return reply.code(404).send({
          success: false,
          message: `e-AWB ${req.params.waybillId} no encontrado.`,
        });
      }
      return reply.send({ success: true, waybill });
    },
  );

  // 3. GET /api/one-record/milestones/:awbNumber
  fastify.get<{ Params: { awbNumber: string } }>(
    "/milestones/:awbNumber",
    {
      schema: {
        tags: [...ONE_RECORD_TAG],
        summary:
          "Retrieve Cargo iQ milestone timeline events for an Air Waybill number",
        params: buildParamSchema(
          "awbNumber",
          "11-digit IATA Air Waybill number (e.g. 075-12345675)",
        ),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const milestones = await service.getMilestones(req.params.awbNumber);
      return reply.send({
        success: true,
        count: milestones.length,
        milestones,
      });
    },
  );

  // 4. POST /api/one-record/milestones/event
  fastify.post<{
    Body: {
      awbNumber?: string;
      milestoneCode?: CargoIqMilestoneCode;
      eventRemarks?: string;
    };
  }>(
    "/milestones/event",
    {
      schema: {
        tags: [...ONE_RECORD_TAG],
        summary: "Record a Cargo iQ milestone event against an Air Waybill",
        body: openApiObject({
          awbNumber: { type: "string" },
          milestoneCode: { type: "string" },
          eventRemarks: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { awbNumber, milestoneCode, eventRemarks } = req.body || {};
      if (!awbNumber || !milestoneCode) {
        return reply.code(400).send({
          success: false,
          message: "awbNumber y milestoneCode son obligatorios.",
        });
      }

      const result = await service.recordMilestoneEvent(
        awbNumber,
        milestoneCode,
        eventRemarks,
      );
      if (!result.success) {
        return reply.code(404).send(result);
      }
      return reply.send(result);
    },
  );

  // 5. POST /api/one-record/edgd/validate
  fastify.post<{ Body: DangerousGoodsItem }>(
    "/edgd/validate",
    {
      schema: {
        tags: [...ONE_RECORD_TAG],
        summary:
          "Validate IATA e-DGD Shipper's Declaration for Dangerous Goods item",
        body: openApiObject({
          unNumber: { type: "string" },
          properShippingName: { type: "string" },
          hazardClass: { type: "string" },
          packingGroup: { type: "string" },
          netQuantity: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const item = req.body;
      if (!item || !item.unNumber) {
        return reply.code(400).send({
          success: false,
          message:
            "Declaración de mercancías peligrosas inválida o incompleta.",
        });
      }

      const validation = service.validateDangerousGoods(item);
      return reply.send({ success: true, validation });
    },
  );
}

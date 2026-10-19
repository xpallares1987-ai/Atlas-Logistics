/**
 * @file iata-one-record.routes.ts
 * @description Fastify routes for IATA ONE Record & Air Cargo e-AWB Linked Data Hub.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IataOneRecordService } from './iata-one-record.service.js';
import { CargoIqMilestoneCode, DangerousGoodsItem } from '@atlas/shared';

export default async function iataOneRecordRoutes(fastify: FastifyInstance) {
  const service = new IataOneRecordService();

  // GET /api/one-record/waybills
  fastify.get('/waybills', async (_req: FastifyRequest, reply: FastifyReply) => {
    const waybills = service.getWaybills();
    return reply.send({ success: true, count: waybills.length, waybills });
  });

  // GET /api/one-record/waybills/:waybillId
  fastify.get(
    '/waybills/:waybillId',
    async (req: FastifyRequest<{ Params: { waybillId: string } }>, reply: FastifyReply) => {
      const waybill = service.getWaybill(req.params.waybillId);
      if (!waybill) {
        return reply.code(404).send({ success: false, message: `e-AWB ${req.params.waybillId} no encontrado.` });
      }
      return reply.send({ success: true, waybill });
    }
  );

  // GET /api/one-record/milestones/:awbNumber
  fastify.get(
    '/milestones/:awbNumber',
    async (req: FastifyRequest<{ Params: { awbNumber: string } }>, reply: FastifyReply) => {
      const milestones = service.getMilestones(req.params.awbNumber);
      return reply.send({ success: true, count: milestones.length, milestones });
    }
  );

  // POST /api/one-record/milestones/event
  fastify.post(
    '/milestones/event',
    async (
      req: FastifyRequest<{
        Body: {
          awbNumber: string;
          milestoneCode: CargoIqMilestoneCode;
          eventRemarks?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { awbNumber, milestoneCode, eventRemarks } = req.body || {};
      if (!awbNumber || !milestoneCode) {
        return reply.code(400).send({
          success: false,
          message: 'awbNumber y milestoneCode son obligatorios.'
        });
      }

      const result = service.recordMilestoneEvent(awbNumber, milestoneCode, eventRemarks);
      if (!result.success) {
        return reply.code(404).send(result);
      }
      return reply.send(result);
    }
  );

  // POST /api/one-record/edgd/validate
  fastify.post(
    '/edgd/validate',
    async (req: FastifyRequest<{ Body: DangerousGoodsItem }>, reply: FastifyReply) => {
      const item = req.body;
      if (!item || !item.unNumber) {
        return reply.code(400).send({
          success: false,
          message: 'Declaración de mercancías peligrosas inválida o incompleta.'
        });
      }

      const validation = service.validateDangerousGoods(item);
      return reply.send({ success: true, validation });
    }
  );
}

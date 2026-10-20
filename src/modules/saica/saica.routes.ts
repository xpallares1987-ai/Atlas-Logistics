/**
 * @file saica.routes.ts
 * @description Fastify REST routes for SAICA Logistics Platform (Book 012 · BCN.FE.FE01.012).
 * Implements decoupled REST ingestion for delivery notes (albaranes) and dock exceptions.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SaicaService } from './saica.service.js';
import { SaicaWarehouse, SaicaCoil } from '@atlas/shared';

export default async function saicaRoutes(fastify: FastifyInstance) {
  const service = new SaicaService();

  // GET /api/saica/albaranes
  fastify.get('/albaranes', async (_req: FastifyRequest, reply: FastifyReply) => {
    const albaranes = service.getAlbaranes();
    return reply.send({ success: true, count: albaranes.length, albaranes });
  });

  // GET /api/saica/albaranes/:id
  fastify.get(
    '/albaranes/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const albaran = service.getAlbaran(req.params.id);
      if (!albaran) {
        return reply.code(404).send({ success: false, message: `Albarán ${req.params.id} no encontrado.` });
      }
      return reply.send({ success: true, albaran });
    }
  );

  // POST /api/saica/albaranes/upload
  fastify.post(
    '/albaranes/upload',
    async (
      req: FastifyRequest<{
        Body: {
          albaranNumber: string;
          factoryOrigin: string;
          destinationWarehouse: SaicaWarehouse;
          vehicleIdentifier: string;
          coils: SaicaCoil[];
          targetContainerNumber?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const body = req.body;
        if (!body || !body.albaranNumber || !body.destinationWarehouse || !body.vehicleIdentifier) {
          return reply.code(400).send({
            success: false,
            message: 'albaranNumber, destinationWarehouse y vehicleIdentifier son obligatorios.'
          });
        }

        const albaran = service.uploadAlbaran(body);
        return reply.code(201).send({
          success: true,
          message: 'Albarán procesado e ingresado en stock correctamente.',
          albaran
        });
      } catch (err: any) {
        return reply.code(400).send({
          success: false,
          message: err.message || 'Error en procesamiento de albarán SAICA.'
        });
      }
    }
  );

  // GET /api/saica/exceptions
  fastify.get('/exceptions', async (_req: FastifyRequest, reply: FastifyReply) => {
    const exceptions = service.getExceptions();
    return reply.send({ success: true, count: exceptions.length, exceptions });
  });

  // POST /api/saica/exceptions/upload
  fastify.post(
    '/exceptions/upload',
    async (
      req: FastifyRequest<{
        Body: {
          warehouse: SaicaWarehouse;
          exceptionType: any;
          severity: any;
          affectedCoilId?: string;
          affectedVehicleId?: string;
          description: string;
          reportedByRole: 'ESXPA' | 'ESACA';
          reportedByName: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const body = req.body;
        if (!body || !body.warehouse || !body.exceptionType || !body.reportedByRole || !body.reportedByName) {
          return reply.code(400).send({
            success: false,
            message: 'warehouse, exceptionType, reportedByRole y reportedByName son obligatorios.'
          });
        }

        const exception = service.uploadException(body);
        return reply.code(201).send({
          success: true,
          message: 'Incidencia de muelle registrada con éxito.',
          exception
        });
      } catch (err: any) {
        return reply.code(400).send({
          success: false,
          message: err.message || 'Error registrando incidencia de muelle.'
        });
      }
    }
  );

  // POST /api/saica/stowage/verify
  fastify.post(
    '/stowage/verify',
    async (
      req: FastifyRequest<{
        Body: {
          coils: SaicaCoil[];
          payloadLimitKg?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { coils, payloadLimitKg } = req.body || {};
      if (!coils || !Array.isArray(coils)) {
        return reply.code(400).send({
          success: false,
          message: 'Lista de bobinas (coils) es obligatoria.'
        });
      }

      const result = service.verifyStowage(coils, payloadLimitKg);
      return reply.send({ success: true, stowage: result });
    }
  );

  // POST /api/saica/assignments/verify
  fastify.post(
    '/assignments/verify',
    async (
      req: FastifyRequest<{
        Body: {
          roleCode: string;
          personName: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { roleCode, personName } = req.body || {};
      if (!roleCode || !personName) {
        return reply.code(400).send({
          success: false,
          message: 'roleCode y personName son obligatorios.'
        });
      }

      const validation = service.verifyAssignment(roleCode, personName);
      return reply.send({ success: true, validation });
    }
  );
}

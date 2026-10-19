/**
 * @file port-congestion.routes.ts
 * @description Fastify routes for Predictive Port Congestion & AIS Berth Delay Early Warning Engine.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PortCongestionService } from './port-congestion.service.js';

export default async function portCongestionRoutes(fastify: FastifyInstance) {
  const service = new PortCongestionService();

  // GET /api/port-congestion/hubs
  fastify.get('/hubs', async (_req: FastifyRequest, reply: FastifyReply) => {
    const hubs = service.getHubs();
    return reply.send({ success: true, count: hubs.length, hubs });
  });

  // GET /api/port-congestion/hubs/:portCode
  fastify.get('/hubs/:portCode', async (req: FastifyRequest<{ Params: { portCode: string } }>, reply: FastifyReply) => {
    const hub = service.getHub(req.params.portCode);
    if (!hub) {
      return reply.code(404).send({ success: false, message: `Puerto ${req.params.portCode} no encontrado.` });
    }
    return reply.send({ success: true, hub });
  });

  // GET /api/port-congestion/vessels
  fastify.get('/vessels', async (req: FastifyRequest<{ Querystring: { portCode?: string } }>, reply: FastifyReply) => {
    const vessels = service.getVessels(req.query.portCode);
    return reply.send({ success: true, count: vessels.length, vessels });
  });

  // GET /api/port-congestion/collisions
  fastify.get(
    '/collisions',
    async (req: FastifyRequest<{ Querystring: { portCode?: string; bufferMinutes?: string } }>, reply: FastifyReply) => {
      const buffer = req.query.bufferMinutes ? parseInt(req.query.bufferMinutes, 10) : 120;
      const collisions = service.getBerthCollisions(req.query.portCode, buffer);
      return reply.send({ success: true, count: collisions.length, collisions });
    }
  );

  // POST /api/port-congestion/collisions/resolve
  fastify.post(
    '/collisions/resolve',
    async (req: FastifyRequest<{ Body: { collisionId: string } }>, reply: FastifyReply) => {
      const { collisionId } = req.body || {};
      if (!collisionId) {
        return reply.code(400).send({ success: false, message: 'collisionId es obligatorio.' });
      }
      const result = service.resolveCollision(collisionId);
      if (!result.success) {
        return reply.code(404).send(result);
      }
      return reply.send(result);
    }
  );

  // GET /api/port-congestion/drayage
  fastify.get('/drayage', async (req: FastifyRequest<{ Querystring: { portCode?: string } }>, reply: FastifyReply) => {
    const appointments = service.getDrayageAppointments(req.query.portCode);
    return reply.send({ success: true, count: appointments.length, appointments });
  });

  // POST /api/port-congestion/rebalance-drayage
  fastify.post(
    '/rebalance-drayage',
    async (req: FastifyRequest<{ Body: { portCode?: string } }>, reply: FastifyReply) => {
      const appointments = service.rebalanceDrayageAppointments(req.body?.portCode);
      return reply.send({
        success: true,
        message: 'Acarreo terrestre e intermodal rebalanceado exitosamente.',
        count: appointments.length,
        appointments
      });
    }
  );

  // POST /api/port-congestion/generate-dd-notice
  fastify.post(
    '/generate-dd-notice',
    async (
      req: FastifyRequest<{
        Body: {
          portCode: string;
          terminalName: string;
          vesselName: string;
          containerNo: string;
          reason: 'PORT_CONGESTION_ANCHORAGE_DWELL' | 'BERTH_COLLISION_DELAY' | 'TERMINAL_GATE_APPOINTMENT_UNAVAILABLE';
          dwellOrDelayHours: number;
          issuer?: 'ESXPA (SuperAdmin / Systems Lead)' | 'ESACA (Team Leader SAICA)';
        };
      }>,
      reply: FastifyReply
    ) => {
      const { portCode, terminalName, vesselName, containerNo, reason, dwellOrDelayHours, issuer } = req.body || {};

      if (!portCode || !terminalName || !vesselName || !containerNo || !reason || dwellOrDelayHours === undefined) {
        return reply.code(400).send({
          success: false,
          message: 'Faltan parámetros requeridos para generar la certificación D&D.'
        });
      }

      const certificate = service.generateDDCertificate({
        portCode,
        terminalName,
        vesselName,
        containerNo,
        reason,
        dwellOrDelayHours: Number(dwellOrDelayHours),
        issuer
      });

      return reply.code(201).send({
        success: true,
        message: 'Certificado de suspensión de plazo D&D generado exitosamente.',
        certificate
      });
    }
  );

  // GET /api/port-congestion/dd-notices
  fastify.get('/dd-notices', async (_req: FastifyRequest, reply: FastifyReply) => {
    const certificates = service.getDDCertificates();
    return reply.send({ success: true, count: certificates.length, certificates });
  });
}

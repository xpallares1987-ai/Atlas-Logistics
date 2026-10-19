/**
 * @file carbon-insetting.routes.ts
 * @description Fastify routes for Scope 3 Carbon Insetting & FuelEU Maritime Pooling.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CarbonInsettingService } from './carbon-insetting.service.js';
import { FuelType, TransportMode, PoolVesselInput } from '@atlas/shared';

export default async function carbonInsettingRoutes(fastify: FastifyInstance) {
  const service = new CarbonInsettingService();

  // GET /api/carbon-insetting/fuels
  fastify.get('/fuels', async (_req: FastifyRequest, reply: FastifyReply) => {
    const fuels = service.getFuelsCatalog();
    return reply.send({ success: true, fuels });
  });

  // GET /api/carbon-insetting/tokens
  fastify.get('/tokens', async (_req: FastifyRequest, reply: FastifyReply) => {
    const tokens = service.getInsettingTokens();
    return reply.send({ success: true, count: tokens.length, tokens });
  });

  // POST /api/carbon-insetting/tokens/issue
  fastify.post(
    '/tokens/issue',
    async (
      req: FastifyRequest<{
        Body: {
          fuelType: FuelType;
          fuelVolumeMT: number;
          bunkerLocation: string;
          bdnReference: string;
          sustainabilityCertificateNumber: string;
          allocatedShipmentRef: string;
          beneficiaryCompany: string;
          transportMode: TransportMode;
        };
      }>,
      reply: FastifyReply
    ) => {
      const {
        fuelType,
        fuelVolumeMT,
        bunkerLocation,
        bdnReference,
        sustainabilityCertificateNumber,
        allocatedShipmentRef,
        beneficiaryCompany,
        transportMode
      } = req.body || {};

      if (!fuelType || !fuelVolumeMT || !bunkerLocation || !bdnReference || !allocatedShipmentRef) {
        return reply.code(400).send({
          success: false,
          message: 'Faltan parámetros requeridos para expedir el token de insetting.'
        });
      }

      const token = service.issueToken({
        fuelType,
        fuelVolumeMT: Number(fuelVolumeMT),
        bunkerLocation,
        bdnReference,
        sustainabilityCertificateNumber: sustainabilityCertificateNumber || 'ISCC-EU-PENDING',
        allocatedShipmentRef,
        beneficiaryCompany: beneficiaryCompany || 'Atlas Beneficiary Client',
        transportMode: transportMode || 'MARITIME_OCEAN'
      });

      return reply.code(201).send({
        success: true,
        message: 'Token de Insetting emitido y retirado exitosamente en el ledger.',
        token
      });
    }
  );

  // GET /api/carbon-insetting/fueleu/vessels
  fastify.get('/fueleu/vessels', async (_req: FastifyRequest, reply: FastifyReply) => {
    const vessels = service.getPoolVessels();
    return reply.send({ success: true, count: vessels.length, vessels });
  });

  // POST /api/carbon-insetting/fueleu/pool
  fastify.post(
    '/fueleu/pool',
    async (
      req: FastifyRequest<{
        Body: {
          vessels?: PoolVesselInput[];
          reportingYear?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const pool = service.executePooling(req.body?.vessels, req.body?.reportingYear || 2026);
      return reply.send({
        success: true,
        message: 'Pool de cumplimiento FuelEU Maritime ejecutado y sellado.',
        pool
      });
    }
  );

  // GET /api/carbon-insetting/fueleu/pools
  fastify.get('/fueleu/pools', async (_req: FastifyRequest, reply: FastifyReply) => {
    const pools = service.getPoolHistory();
    return reply.send({ success: true, count: pools.length, pools });
  });
}

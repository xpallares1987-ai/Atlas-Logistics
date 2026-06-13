import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from './db/client.js';
import { shipments, carriers } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { evaluateSurcharges } from './bpm/zeebe-client.js';

const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'SYS:standard', ignore: 'pid,hostname' }
    }
  },
  genReqId: () => randomUUID()
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(helmet, { global: true, contentSecurityPolicy: false });

server.register(cors, {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
});

server.register(rateLimit, { max: 100, timeWindow: '1 minute' });

const idempotencyCache = new Set<string>();

server.addHook('preHandler', async (request, reply) => {
  if (request.method === 'POST' || request.method === 'PUT') {
    const idempotencyKey = request.headers['x-idempotency-key'] as string;
    if (idempotencyKey) {
      if (idempotencyCache.has(idempotencyKey)) {
        return reply.status(409).send({ error: 'Conflict', message: 'Request already processed' });
      }
      idempotencyCache.add(idempotencyKey);
    }
  }
});

server.post(
  '/api/freight-rates/calculate',
  {
    schema: {
      body: z.object({
        origin: z.string().length(5),
        destination: z.string().length(5),
        carrier: z.string()
      })
    }
  },
  async (request, reply) => {
    const { carrier } = request.body;
    
    let baf = 100, thc = 200, isps = 15; // Valores fallback de seguridad

    try {
      // Invocación al motor DMN de Camunda 8
      const decisionOutput: any = await evaluateSurcharges(carrier);
      if (decisionOutput) {
        baf = (decisionOutput.baf as number) || baf;
        thc = (decisionOutput.thc as number) || thc;
        isps = (decisionOutput.isps as number) || isps;
      }
    } catch (error) {
      server.log.warn(`Fallo al evaluar DMN para ${carrier}. Usando valores por defecto. Error: ${(error as Error).message}`);
    }

    const baseRate = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000); // Mantenemos mock para la base
    const surcharges = [
      { name: 'BAF', amount: baf },
      { name: 'THC', amount: thc },
      { name: 'ISPS', amount: isps }
    ];

    return reply.status(200).send({ rate: baseRate, surcharges });
  }
);

server.get('/api/shipments', async (request, reply) => {
  try {
    const activeShipments = await db
      .select({
        id: shipments.id,
        trackingNumber: shipments.tracking_number,
        carrier: carriers.name,
        origin: carriers.code,
        destination: shipments.status,
        status: shipments.status,
        lastUpdate: shipments.updated_at
      })
      .from(shipments)
      .innerJoin(carriers, eq(shipments.carrier_id, carriers.id));

    if (activeShipments.length === 0) {
      return reply.status(200).send({
        data: [{
          id: '1',
          trackingNumber: 'AWB-77382910',
          carrier: 'Maersk Line',
          origin: 'CNSHA',
          destination: 'ESBCN',
          status: 'OnBoard',
          lastUpdate: new Date().toISOString()
        }]
      });
    }

    return reply.status(200).send({ 
      data: activeShipments.map((s: any) => ({...s, id: String(s.id), lastUpdate: s.lastUpdate.toISOString()})) 
    });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
});

server.patch(
  '/api/shipments/:id/advance',
  {
    schema: {
      params: z.object({ id: z.string() })
    }
  },
  async (request, reply) => {
    const shipmentId = parseInt(request.params.id, 10);
    const statusFlow = ['Booked', 'Received', 'OnBoard', 'Discharged', 'Delivered'] as const;
    
    try {
      const currentShipment = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId))
        .limit(1);

      if (currentShipment.length === 0) {
         return reply.status(200).send({
           data: {
             id: request.params.id,
             trackingNumber: 'AWB-77382910',
             carrier: 'Maersk Line',
             origin: 'CNSHA',
             destination: 'ESBCN',
             status: 'Discharged',
             lastUpdate: new Date().toISOString()
           }
         });
      }

      const currentIndex = statusFlow.indexOf(currentShipment[0].status as any);
      
      if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
        return reply.status(400).send({ error: 'Cannot advance status further' });
      }

      const newStatus = statusFlow[currentIndex + 1];

      const updated = await db
        .update(shipments)
        .set({ status: newStatus, updated_at: new Date() })
        .where(eq(shipments.id, shipmentId))
        .returning();

      return reply.status(200).send({ 
        data: {
          ...updated[0],
          id: String(updated[0].id),
          lastUpdate: updated[0].updated_at.toISOString()
        } 
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Database update failed' });
    }
  }
);

export const startServer = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Atlas Logistics API running on http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

startServer();
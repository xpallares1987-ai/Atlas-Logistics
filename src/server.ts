import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
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

server.register(helmet);
server.register(cors);
server.register(rateLimit, { max: 100, timeWindow: '1 minute' });

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
  async (request: any, reply: any) => {
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
    
    const total = baseRate + baf + thc + isps;

    return reply.status(200).send({
      data: {
        carrier,
        baseRate,
        surcharges,
        total,
        currency: 'USD'
      }
    });
  }
);

server.get('/api/shipments', async (_request: any, reply: any) => {
  try {
    const activeShipments = await db.select().from(shipments).limit(50);
    return reply.status(200).send({ data: activeShipments });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
});

server.get(
  '/api/shipments/:id',
  {
    schema: {
      params: z.object({ id: z.string() })
    }
  },
  async (request: any, reply: any) => {
    const shipmentId = parseInt(request.params.id, 10);
    
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

      return reply.status(200).send({ data: currentShipment[0] });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
);

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

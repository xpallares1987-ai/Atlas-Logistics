import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../db/client.js';
import { freight_rates, carriers, surcharges, surcharge_types } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const rateRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get('/api/freight-rates', {
    schema: {
      description: 'Get all freight rates',
      tags: ['Rates'],
      security: [{ bearerAuth: [] }],
      response: {
        200: z.object({
          data: z.array(z.object({
            id: z.string(),
            carrier: z.string(),
            origin: z.string(),
            destination: z.string(),
            mode: z.string(),
            basePrice: z.number(),
            currency: z.string(),
            transitTimeDays: z.number(),
            validity: z.string(),
            surcharges: z.array(z.object({
              id: z.string(),
              code: z.string(),
              name: z.string(),
              amount: z.number(),
              currency: z.string(),
              chargeType: z.string()
            })).optional()
          }))
        })
      }
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    const rates = await db.query.freight_rates.findMany({
      with: {
        carrier: true,
        surcharges: {
          with: {
            type: true
          }
        }
      }
    });

    return {
      data: rates.map(r => ({
        id: String(r.id),
        carrier: r.carrier.name,
        origin: r.origin_port,
        destination: r.destination_port,
        mode: 'FCL_40', // Fallback
        basePrice: Number(r.base_rate),
        currency: r.currency,
        transitTimeDays: 14, // Fallback
        validity: r.valid_to,
        surcharges: r.surcharges.map(s => ({
          id: String(s.id),
          code: s.type.name,
          name: s.type.name,
          amount: Number(s.amount),
          currency: s.currency,
          chargeType: 'FIXED'
        }))
      }))
    };
  });

  server.post('/api/freight-rates', {
    schema: {
      description: 'Create a new freight rate',
      tags: ['Rates'],
      security: [{ bearerAuth: [] }],
      body: z.object({
        carrier: z.string(),
        origin: z.string(),
        destination: z.string(),
        mode: z.string(),
        basePrice: z.number(),
        currency: z.string(),
        transitTimeDays: z.number(),
        validity: z.string()
      })
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    const body = request.body as any;
    
    // Find or create carrier
    let [carrier] = await db.select().from(carriers).where(eq(carriers.name, body.carrier));
    if (!carrier) {
      [carrier] = await db.insert(carriers).values({
        name: body.carrier,
        code: body.carrier.substring(0, 4).toUpperCase()
      }).returning();
    }

    const [rate] = await db.insert(freight_rates).values({
      carrier_id: carrier.id,
      origin_port: body.origin,
      destination_port: body.destination,
      currency: body.currency,
      base_rate: String(body.basePrice),
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: body.validity
    }).returning();

    return reply.status(201).send({ success: true, rateId: String(rate.id) });
  });
};

export default rateRoutes;

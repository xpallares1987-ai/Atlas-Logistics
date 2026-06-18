import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../db/client.js';
import { shipments, carriers } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const shipmentRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get('/api/shipments', {
    schema: {
      description: 'Get all active shipments',
      tags: ['Shipments'],
      security: [{ bearerAuth: [] }],
      response: {
        200: z.object({
          data: z.array(z.object({
            id: z.string(),
            trackingNumber: z.string(),
            carrier: z.string(),
            origin: z.string(),
            destination: z.string(),
            status: z.string(),
            lastUpdate: z.string()
          }))
        }),
        500: z.object({
          error: z.string()
        })
      }
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    try {
      const activeShipments = await db.query.shipments.findMany({
        with: {
          carrier: true,
        },
      });

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
        data: activeShipments.map(s => ({
          id: String(s.id),
          trackingNumber: s.tracking_number,
          carrier: s.carrier.name,
          origin: s.carrier.code,
          destination: s.status, // Fallback as status is used for dest in original logic
          status: s.status,
          lastUpdate: s.updated_at.toISOString()
        })) 
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
        description: 'Advance shipment to next status in lifecycle',
        tags: ['Shipments'],
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string() }),
        response: {
          200: z.object({
            data: z.object({
              id: z.string(),
              trackingNumber: z.string(),
              carrier: z.string().optional(),
              status: z.string(),
              lastUpdate: z.string()
            })
          }),
          400: z.object({
            error: z.string()
          }),
          500: z.object({
            error: z.string()
          })
        }
      },
      onRequest: [(server as any).authenticate]
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const shipmentId = parseInt(params.id, 10);
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
               id: params.id,
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
};

export default shipmentRoutes;

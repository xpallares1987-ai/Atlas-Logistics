import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../db/client.js';
import { shipments, carriers, shipment_events } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { createShipmentInstance } from '../bpm/zeebe-client.js';
import {
  shipmentSchema, 
  createShipmentSchema, 
  updateShipmentSchema,
  shipmentEventSchema,
  createShipmentEventSchema,
  containerSchema
} from '../schemas/forwarding.schema.js';
import { forwardingService } from '../services/forwarding.service.js';

const shipmentRoutes: FastifyPluginAsyncZod = async (server) => {
  // GET /api/shipments
  server.get('/api/shipments', {
    schema: {
      description: 'Get all shipments',
      tags: ['Shipments'],
      querystring: z.object({
        customer_id: z.coerce.number().optional()
      }),
      response: {
        200: z.array(shipmentSchema)
      }
    }
  }, async (request, reply) => {
    const { customer_id } = request.query as { customer_id?: number };
    let query = db.select().from(shipments);
    if (customer_id) {
      query = query.where(eq(shipments.customer_id, customer_id)) as any;
    }
    const allShipments = await query;
    return allShipments.map(s => ({
      ...s,
      estimated_departure: s.estimated_departure?.toISOString() || null,
      estimated_arrival: s.estimated_arrival?.toISOString() || null,
      created_at: s.created_at.toISOString(),
      updated_at: s.updated_at.toISOString()
    }));
  });

  // POST /api/shipments
  server.post('/api/shipments', {
    schema: {
      description: 'Create a new shipment',
      tags: ['Shipments'],
      body: createShipmentSchema,
      response: {
        201: shipmentSchema
      }
    }
  }, async (request, reply) => {
    const body = request.body as z.infer<typeof createShipmentSchema>;
    
    // Default tracking number if not provided
    const tracking_number = body.tracking_number || `AWB-${Math.floor(Math.random() * 1000000)}`;

    const [shipment] = await db.insert(shipments).values({
      ...body,
      tracking_number,
      status: body.status || 'Booked',
      mode: body.mode || 'Ocean FCL',
      origin_port: body.origin_port || 'CNSHA',
      destination_port: body.destination_port || 'ESBCN',
      estimated_departure: body.estimated_departure ? new Date(body.estimated_departure) : null,
      estimated_arrival: body.estimated_arrival ? new Date(body.estimated_arrival) : null
    }).returning();

    // Trigger Zeebe workflow if connected
    try {
      await createShipmentInstance(shipment.tracking_number, shipment.carrier_id);
    } catch (err) {
      server.log.warn(`Could not start Zeebe process: ${(err as Error).message}`);
    }

    reply.status(201);
    return {
      ...shipment,
      estimated_departure: shipment.estimated_departure?.toISOString() || null,
      estimated_arrival: shipment.estimated_arrival?.toISOString() || null,
      created_at: shipment.created_at.toISOString(),
      updated_at: shipment.updated_at.toISOString()
    };
  });

  // GET /api/shipments/:id
  server.get('/api/shipments/:id', {
    schema: {
      description: 'Get shipment by ID with events',
      tags: ['Shipments'],
      params: z.object({ id: z.coerce.number() }),
      response: {
        200: shipmentSchema.extend({
          events: z.array(shipmentEventSchema)
        }),
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const shipmentData = await db.query.shipments.findFirst({
      where: eq(shipments.id, id),
      with: {
        events: {
          orderBy: [desc(shipment_events.event_time)]
        }
      }
    });

    if (!shipmentData) {
      return reply.status(404).send({ error: 'Shipment not found' });
    }

    return {
      ...shipmentData,
      estimated_departure: shipmentData.estimated_departure?.toISOString() || null,
      estimated_arrival: shipmentData.estimated_arrival?.toISOString() || null,
      created_at: shipmentData.created_at.toISOString(),
      updated_at: shipmentData.updated_at.toISOString(),
      events: shipmentData.events.map(e => ({
        ...e,
        event_time: e.event_time.toISOString(),
        created_at: e.created_at.toISOString()
      }))
    };
  });

  // PATCH /api/shipments/:id
  server.patch('/api/shipments/:id', {
    schema: {
      description: 'Update shipment details',
      tags: ['Shipments'],
      params: z.object({ id: z.coerce.number() }),
      body: updateShipmentSchema,
      response: {
        200: shipmentSchema,
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const body = request.body as z.infer<typeof updateShipmentSchema>;
    
    const updateData: any = { ...body, updated_at: new Date() };
    if (body.estimated_departure) updateData.estimated_departure = new Date(body.estimated_departure);
    if (body.estimated_arrival) updateData.estimated_arrival = new Date(body.estimated_arrival);

    const [updated] = await db.update(shipments)
      .set(updateData)
      .where(eq(shipments.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: 'Shipment not found' });
    }

    return {
      ...updated,
      estimated_departure: updated.estimated_departure?.toISOString() || null,
      estimated_arrival: updated.estimated_arrival?.toISOString() || null,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString()
    };
  });

  // POST /api/shipments/:id/events
  server.post('/api/shipments/:id/events', {
    schema: {
      description: 'Add a tracking event to a shipment',
      tags: ['Shipments'],
      params: z.object({ id: z.coerce.number() }),
      body: createShipmentEventSchema,
      response: {
        201: shipmentEventSchema,
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const body = request.body as z.infer<typeof createShipmentEventSchema>;

    // Ensure shipment exists
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    if (!shipment) return reply.status(404).send({ error: 'Shipment not found' });

    // Insert event and update shipment status in one transaction
    const newEvent = await db.transaction(async (tx) => {
      const [event] = await tx.insert(shipment_events).values({
        ...body,
        shipment_id: id,
        event_time: new Date(body.event_time)
      }).returning();

      // Update the main shipment status to match the latest event
      await tx.update(shipments)
        .set({ status: body.status, updated_at: new Date() })
        .where(eq(shipments.id, id));

      return event;
    });

    reply.status(201);
    return {
      ...newEvent,
      event_time: newEvent.event_time.toISOString(),
      created_at: newEvent.created_at.toISOString()
    };
  });

  // Compatibility: PATCH /api/shipments/:id/advance (used by Zeebe mock flow)
  server.patch('/api/shipments/:id/advance', {
    schema: {
      description: 'Advance shipment to next status in lifecycle',
      tags: ['Shipments'],
      params: z.object({ id: z.coerce.number() }),
      response: {
        200: z.object({
          data: z.object({
            id: z.string(),
            trackingNumber: z.string(),
            status: z.string(),
            lastUpdate: z.string()
          })
        }),
        400: z.object({ error: z.string() }),
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const statusFlow = ['Booked', 'Received', 'OnBoard', 'Discharged', 'Delivered'] as const;
    
    const [currentShipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    if (!currentShipment) {
      return reply.status(404).send({ error: 'Shipment not found' });
    }

    const currentIndex = statusFlow.indexOf(currentShipment.status as any);
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
      return reply.status(400).send({ error: 'Cannot advance status further' });
    }

    const newStatus = statusFlow[currentIndex + 1];

    const updated = await db.transaction(async (tx) => {
      const [upd] = await tx.update(shipments)
        .set({ status: newStatus, updated_at: new Date() })
        .where(eq(shipments.id, id))
        .returning();

      await tx.insert(shipment_events).values({
        shipment_id: id,
        status: newStatus,
        location: 'Auto-advanced location',
        description: `Status advanced to ${newStatus}`,
        event_time: new Date()
      });

      return upd;
    });

    return reply.status(200).send({ 
      data: {
        id: String(updated.id),
        trackingNumber: updated.tracking_number,
        status: updated.status,
        lastUpdate: updated.updated_at.toISOString()
      } 
    });
  });

  // POST /api/shipments/:id/consolidate
  server.post('/api/shipments/:id/consolidate', {
    schema: {
      description: 'Consolidate an HBL into an MBL',
      tags: ['Forwarding'],
      params: z.object({ id: z.coerce.number().describe('Master Shipment ID') }),
      body: z.object({
        houseId: z.number().describe('House Shipment ID to attach')
      }),
      response: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const { houseId } = request.body as { houseId: number };
    
    try {
      const result = await forwardingService.consolidateShipment(id, houseId);
      return reply.status(200).send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // POST /api/shipments/:id/containers
  server.post('/api/shipments/:id/containers', {
    schema: {
      description: 'Add a container to an MBL or Direct shipment',
      tags: ['Forwarding'],
      params: z.object({ id: z.coerce.number() }),
      body: containerSchema.omit({ id: true, shipment_id: true, created_at: true }),
      response: {
        201: containerSchema,
        400: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const containerData = request.body as any;
    
    try {
      const container = await forwardingService.addContainer(id, containerData);
      return reply.status(201).send({
        ...container,
        gross_weight: container.gross_weight ? Number(container.gross_weight) : null,
        volume: container.volume ? Number(container.volume) : null,
        created_at: container.created_at.toISOString()
      });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // GET /api/shipments/:id/profit-and-loss
  server.get('/api/shipments/:id/profit-and-loss', {
    schema: {
      description: 'Calculate P&L for a shipment based on Invoices',
      tags: ['Forwarding', 'Finance'],
      params: z.object({ id: z.coerce.number() }),
      response: {
        200: z.object({
          shipmentId: z.number(),
          totalRevenue: z.number(),
          totalCost: z.number(),
          profit: z.number(),
          marginPercentage: z.number(),
          currency: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const result = await forwardingService.calculateProfitAndLoss(id);
    return reply.status(200).send(result);
  });

};

export default shipmentRoutes;

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  shipmentSchema,
  createShipmentSchema,
  updateShipmentSchema,
  shipmentEventSchema,
  createShipmentEventSchema,
  containerSchema,
} from "../schemas/forwarding.schema.js";
import { forwardingService } from "../services/forwarding.service.js";
import { shipmentService } from "../services/shipment.service.js";

const shipmentRoutes: FastifyPluginAsyncZod = async (server) => {
  // GET /api/shipments
  server.get(
    "/api/shipments",
    {
      schema: {
        description: "Get all shipments",
        tags: ["Shipments"],
        querystring: z.object({
          customer_id: z.coerce.number().optional(),
        }),
        response: {
          200: z.array(shipmentSchema),
        },
      },
    },
    async (request) => {
      const { customer_id } = request.query as { customer_id?: number };
      const allShipments = await shipmentService.getAllShipments(customer_id);
      return allShipments.map((s) => ({
        ...s,
        ets: s.ets?.toISOString() || null,
        eta: s.eta?.toISOString() || null,
        created_at: s.created_at.toISOString(),
        updated_at: s.updated_at.toISOString(),
      }));
    },
  );

  // POST /api/shipments
  server.post(
    "/api/shipments",
    {
      schema: {
        description: "Create a new shipment",
        tags: ["Shipments"],
        body: createShipmentSchema,
        response: {
          201: shipmentSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof createShipmentSchema>;
      const shipment = await shipmentService.createShipment(body);

      reply.status(201);
      return {
        ...shipment,
        ets: shipment.ets?.toISOString() || null,
        eta: shipment.eta?.toISOString() || null,
        created_at: shipment.created_at.toISOString(),
        updated_at: shipment.updated_at.toISOString(),
      };
    },
  );

  // GET /api/shipments/:id
  server.get(
    "/api/shipments/:id",
    {
      schema: {
        description: "Get shipment by ID with events",
        tags: ["Shipments"],
        params: z.object({ id: z.coerce.number() }),
        response: {
          200: shipmentSchema.extend({
            events: z.array(shipmentEventSchema),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const shipmentData = await shipmentService.getShipmentById(id);

      if (!shipmentData) {
        return reply.status(404).send({ error: "Shipment not found" });
      }

      return {
        ...shipmentData,
        ets: shipmentData.ets?.toISOString() || null,
        eta: shipmentData.eta?.toISOString() || null,
        created_at: shipmentData.created_at.toISOString(),
        updated_at: shipmentData.updated_at.toISOString(),
        events: shipmentData.events.map((e) => ({
          ...e,
          event_time: e.event_time.toISOString(),
          created_at: e.created_at.toISOString(),
        })),
      };
    },
  );

  // PATCH /api/shipments/:id
  server.patch(
    "/api/shipments/:id",
    {
      schema: {
        description: "Update shipment details",
        tags: ["Shipments"],
        params: z.object({ id: z.coerce.number() }),
        body: updateShipmentSchema,
        response: {
          200: shipmentSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as z.infer<typeof updateShipmentSchema>;

      const updated = await shipmentService.updateShipment(id, body);

      if (!updated) {
        return reply.status(404).send({ error: "Shipment not found" });
      }

      return {
        ...updated,
        ets: updated.ets?.toISOString() || null,
        eta: updated.eta?.toISOString() || null,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
      };
    },
  );

  // POST /api/shipments/:id/events
  server.post(
    "/api/shipments/:id/events",
    {
      schema: {
        description: "Add a tracking event to a shipment",
        tags: ["Shipments"],
        params: z.object({ id: z.coerce.number() }),
        body: createShipmentEventSchema,
        response: {
          201: shipmentEventSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as z.infer<typeof createShipmentEventSchema>;

      const newEvent = await shipmentService.addTrackingEvent(id, body);
      if (!newEvent)
        return reply.status(404).send({ error: "Shipment not found" });

      reply.status(201);
      return {
        ...newEvent,
        event_time: newEvent.event_time.toISOString(),
        created_at: newEvent.created_at.toISOString(),
      };
    },
  );

  // Compatibility: PATCH /api/shipments/:id/advance (used by Zeebe mock flow)
  server.patch(
    "/api/shipments/:id/advance",
    {
      schema: {
        description: "Advance shipment to next status in lifecycle",
        tags: ["Shipments"],
        params: z.object({ id: z.coerce.number() }),
        response: {
          200: z.object({
            data: z.object({
              id: z.string(),
              trackingNumber: z.string(),
              status: z.string(),
              lastUpdate: z.string(),
            }),
          }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };

      try {
        const updated = await shipmentService.advanceShipmentStatus(id);
        return reply.status(200).send({
          data: {
            id: String(updated.id),
            trackingNumber: updated.tracking_number,
            status: updated.status,
            lastUpdate: updated.updated_at.toISOString(),
          },
        });
      } catch (e: any) {
        if (e.message === "Shipment not found") {
          return reply.status(404).send({ error: e.message });
        }
        return reply.status(400).send({ error: e.message });
      }
    },
  );

  // POST /api/shipments/:id/consolidate
  server.post(
    "/api/shipments/:id/consolidate",
    {
      schema: {
        description: "Consolidate an HBL into an MBL",
        tags: ["Forwarding"],
        params: z.object({
          id: z.coerce.number().describe("Master Shipment ID"),
        }),
        body: z.object({
          houseId: z.number().describe("House Shipment ID to attach"),
        }),
        response: {
          200: z.object({ success: z.boolean(), message: z.string() }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const { houseId } = request.body as { houseId: number };

      try {
        const result = await forwardingService.consolidateShipment(id, houseId);
        return reply.status(200).send(result);
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // POST /api/shipments/:id/containers
  server.post(
    "/api/shipments/:id/containers",
    {
      schema: {
        description: "Add a container to an MBL or Direct shipment",
        tags: ["Forwarding"],
        params: z.object({ id: z.coerce.number() }),
        body: containerSchema.omit({
          id: true,
          shipment_id: true,
          created_at: true,
        }),
        response: {
          201: containerSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const containerData = request.body as any;

      try {
        const container = await forwardingService.addContainer(
          id,
          containerData,
        );
        return reply.status(201).send({
          ...container,
          gross_weight: container.gross_weight
            ? Number(container.gross_weight)
            : null,
          volume: container.volume ? Number(container.volume) : null,
          created_at: container.created_at.toISOString(),
        });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // GET /api/shipments/:id/profit-and-loss
  server.get(
    "/api/shipments/:id/profit-and-loss",
    {
      schema: {
        description: "Calculate P&L for a shipment based on Invoices",
        tags: ["Forwarding", "Finance"],
        params: z.object({ id: z.coerce.number() }),
        response: {
          200: z.object({
            shipmentId: z.number(),
            totalRevenue: z.number(),
            totalCost: z.number(),
            profit: z.number(),
            marginPercentage: z.number(),
            currency: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const result = await forwardingService.calculateProfitAndLoss(id);
      return reply.status(200).send(result);
    },
  );
};

export default shipmentRoutes;

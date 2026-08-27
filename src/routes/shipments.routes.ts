import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { shipments, shipmentEventLogs } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { ShipmentIdParamsSchema } from "./shipments.schemas.js";
import {
  CreateShipmentSchema,
  UpdateShipmentSchema,
} from "@atlas/shared/src/logistics-schemas.js";

const shipmentsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/", async (request, reply) => {
    try {
      const allShipments = await db.select().from(shipments);
      return allShipments;
    } catch (error: any) {
      fastify.log.warn("DB unavailable for shipments, returning fallback data");
      return [];
    }
  });

  fastify.get(
    "/:id",
    { preHandler: [validate(ShipmentIdParamsSchema)] },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const shipment = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, id))
          .limit(1);

        if (shipment.length === 0) {
          return reply.code(404).send({ error: "Shipment not found" });
        }

        const events = await db
          .select()
          .from(shipmentEventLogs)
          .where(eq(shipmentEventLogs.shipmentId, id));

        return {
          ...shipment[0],
          events,
        };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  );

  fastify.post(
    "/",
    { preHandler: [validate(CreateShipmentSchema)] },
    async (request, reply) => {
      try {
        const {
          documentBase64,
          documentMimeType,
          documentName,
          ...shipmentData
        } = request.body as any;

        const newShipment = await db
          .insert(shipments)
          .values({
            id: "s-" + Date.now(),
            companyId: "c-1", // default mock company
            status: shipmentData.status || "PENDING",
            trackingNumber: `SHP-${Date.now()}`,
            origin: shipmentData.origin || "UNKNOWN",
            destination: shipmentData.destination || "UNKNOWN",
            weight: shipmentData.weight || null,
            distanceKm: shipmentData.distanceKm || null,
            co2eTonnes: shipmentData.co2eTonnes || null,
            serviceType: shipmentData.mode || "Ocean",
          })
          .returning();

        return newShipment[0];
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  );

  fastify.delete(
    "/:id",
    { preHandler: [validate(ShipmentIdParamsSchema)] },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        await db.delete(shipments).where(eq(shipments.id, id));
        return { success: true };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  );
};

export default shipmentsRoutes;

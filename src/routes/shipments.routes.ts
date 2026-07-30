import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { shipments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
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
             status: shipmentData.status || 'PENDING',
             origin: shipmentData.origin || 'UNKNOWN',
             destination: shipmentData.destination || 'UNKNOWN'
          })
          .returning();

        return newShipment[0];
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    },
  );

  fastify.delete("/:id", async (request, reply) => {
    try {
      const { id } = request.params as any;
      await db.delete(shipments).where(eq(shipments.id, id));
      return { success: true };
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default shipmentsRoutes;

import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import { warehouseTraffic } from "../../db/schema/operations.js";
import { warehouseInventory } from "../../db/schema/support.js";
import { eq } from "drizzle-orm";
import { logger } from "../../config/logger.js";
import { ensureOperationsSeedData } from "./seed-data.js";

export const warehouseTrafficOperationsRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  fastify.get("/warehouse/traffic", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      const traffic = await db.select().from(warehouseTraffic);
      return { success: true, data: traffic };
    } catch (error: any) {
      logger.error(error, "Failed to fetch warehouse traffic");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.put("/warehouse/traffic/:id", async (request: any, reply) => {
    const { id } = request.params;
    const { status, assignedDock, eta } = request.body;
    try {
      const updated = await db
        .update(warehouseTraffic)
        .set({ status, assignedDock, eta, updatedAt: new Date() })
        .where(eq(warehouseTraffic.id, id))
        .returning();

      if (updated.length === 0) {
        return reply
          .code(404)
          .send({ success: false, error: "Traffic record not found" });
      }
      return { success: true, data: updated[0] };
    } catch (error: any) {
      logger.error(error, "Failed to update warehouse traffic");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.get("/warehouse/inventory", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      const inventory = await db.select().from(warehouseInventory);
      const formatted = inventory.map((item, index) => {
        const row = Math.floor(index / 2) - 1;
        const col = index % 2 === 0 ? -1 : 1;
        const z = 0;

        return {
          id: item.id,
          warehouseId: item.locationId,
          ownership: item.ownership,
          customer: item.customer,
          buyer: item.buyer,
          productCode: item.productCode,
          description: item.itemDescription,
          quantity: item.quantity,
          zone: item.zone,
          metadata: item.metadata ? JSON.parse(item.metadata as string) : {},
          status: item.status,
          pos: [col, row * 2 + 0.7, z],
          color:
            item.status === "AVAILABLE"
              ? "#10b981"
              : item.status === "RESERVED"
                ? "#f59e0b"
                : "#3b82f6",
          sku: item.productCode,
          weight: item.quantity ? item.quantity * 100 : 500,
          destination: item.customer || "Unknown",
        };
      });
      return { success: true, data: formatted };
    } catch (error: any) {
      logger.error(error, "Failed to fetch warehouse inventory");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/warehouse/inventory", async (request: any, reply) => {
    const items = request.body.items;
    try {
      for (const item of items) {
        await db
          .insert(warehouseInventory)
          .values({
            id: item.id,
            locationId: item.warehouseId,
            ownership: item.ownership,
            customer: item.customer,
            buyer: item.buyer,
            productCode: item.productCode,
            itemDescription: item.description,
            quantity: item.quantity,
            zone: item.zone,
            metadata: JSON.stringify(item.metadata),
            status: item.status,
          })
          .onConflictDoUpdate({
            target: warehouseInventory.id,
            set: {
              quantity: item.quantity,
              status: item.status,
              zone: item.zone,
              updatedAt: new Date(),
            },
          });
      }
      return { success: true };
    } catch (error: any) {
      logger.error(error, "Failed to sync warehouse inventory");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });
};

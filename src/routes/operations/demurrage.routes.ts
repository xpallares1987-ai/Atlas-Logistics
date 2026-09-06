import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import { db } from "../../db/index.js";
import {
  shipmentContainers,
  shipments,
  demurrageAlerts,
} from "../../db/schema/operations.js";
import { eq } from "drizzle-orm";
import { ensureOperationsSeedData } from "./seed-data.js";

export const demurrageOperationsRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  // Demurrage & Detention Alerts GET
  fastify.get("/demurrage", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      const containers = await db
        .select({
          id: shipmentContainers.id,
          containerNumber: shipmentContainers.containerNumber,
          shipmentId: shipments.id,
          origin: shipments.origin,
          destination: shipments.destination,
        })
        .from(shipmentContainers)
        .leftJoin(shipments, eq(shipmentContainers.shipmentId, shipments.id))
        .limit(50);

      const existingAlerts = await db.select().from(demurrageAlerts);
      const alertMap = new Map(
        existingAlerts.map((a) => [a.containerNumber, a]),
      );

      const alerts: any[] = [];
      const now = Date.now();

      for (const c of containers) {
        if (!c.containerNumber) continue;

        let hash = 0;
        for (let i = 0; i < c.id.length; i++)
          hash = (hash << 5) - hash + c.id.charCodeAt(i);
        const freeTimeDays = 7;
        const dwellDays = 3 + (Math.abs(hash) % 10);
        const ratePerDay = 150;
        const remaining = freeTimeDays - dwellDays;

        let dbAlert = alertMap.get(c.containerNumber);
        if (remaining <= 2 && !dbAlert && c.shipmentId) {
          const newAlertId = crypto.randomUUID();
          await db.insert(demurrageAlerts).values({
            id: newAlertId,
            shipmentId: c.shipmentId,
            containerNumber: c.containerNumber,
            alertStatus: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          dbAlert = {
            id: newAlertId,
            shipmentId: c.shipmentId,
            containerNumber: c.containerNumber,
            alertStatus: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any;
          alertMap.set(c.containerNumber, dbAlert);
        }

        if (dbAlert && dbAlert.alertStatus !== "dismissed") {
          alerts.push({
            id: c.id,
            reference: `SHP-${(c.shipmentId || "").substring(0, 6)}`,
            container: c.containerNumber,
            carrier: "Maersk",
            pol: c.origin || "Shanghai",
            pod: c.destination || "Los Angeles",
            eta: new Date(now + 86400000).toISOString(),
            portArrivalDate: new Date(now - dwellDays * 86400000).toISOString(),
            dwellDays,
            freeTimeDays,
            ratePerDay,
            status: "port",
          });
        }
      }
      return reply.send(alerts);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // POST /demurrage/mitigate
  fastify.post("/demurrage/mitigate", async (request, reply) => {
    try {
      const { containerId } = request.body as any;
      const sc = await db
        .select()
        .from(shipmentContainers)
        .where(eq(shipmentContainers.id, containerId));
      if (sc.length > 0 && sc[0].containerNumber) {
        await db
          .update(demurrageAlerts)
          .set({ alertStatus: "mitigated", updatedAt: new Date() })
          .where(eq(demurrageAlerts.containerNumber, sc[0].containerNumber));
      }
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // POST /demurrage/dismiss
  fastify.post("/demurrage/dismiss", async (request, reply) => {
    try {
      const { containerId } = request.body as any;
      const sc = await db
        .select()
        .from(shipmentContainers)
        .where(eq(shipmentContainers.id, containerId));
      if (sc.length > 0 && sc[0].containerNumber) {
        await db
          .update(demurrageAlerts)
          .set({ alertStatus: "dismissed", updatedAt: new Date() })
          .where(eq(demurrageAlerts.containerNumber, sc[0].containerNumber));
      }
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
};

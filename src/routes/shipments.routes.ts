/**
 * @file shipments.routes.ts
 * @description Operational shipment CRUD routes, lifecycle state management, and milestone event queries.
 * @module @atlas/api/routes/shipments
 * @see {@link docs/adr/0018-cross-tenant-security-and-jwt-rbac-contracts.md}
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { shipments, shipmentEventLogs } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { ShipmentIdParamsSchema } from "./shipments.schemas.js";
import { CreateShipmentSchema } from "@atlas/shared/src/logistics-schemas.js";

interface CreateShipmentBody {
  status?: string;
  origin?: string;
  destination?: string;
  weight?: number | null;
  distanceKm?: number | null;
  co2eTonnes?: number | null;
  mode?: string;
  documentBase64?: string;
  documentMimeType?: string;
  documentName?: string;
  [key: string]: unknown;
}

const shipmentsRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.get("/", async (_request, _reply) => {
    try {
      const allShipments = await db.select().from(shipments);
      return allShipments;
    } catch {
      fastify.log.warn("DB unavailable for shipments, returning fallback data");
      return [];
    }
  });

  fastify.get<{
    Params: { id: string };
  }>(
    "/:id",
    { preHandler: [validate(ShipmentIdParamsSchema)] },
    async (request, reply) => {
      try {
        const { id } = request.params;
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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch shipment";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{
    Body: CreateShipmentBody;
  }>(
    "/",
    { preHandler: [validate(CreateShipmentSchema)] },
    async (request, reply) => {
      try {
        const {
          _documentBase64,
          _documentMimeType,
          _documentName,
          ...shipmentData
        } = request.body as Record<string, unknown>;

        const newShipment = await db
          .insert(shipments)
          .values({
            id: "s-" + Date.now(),
            companyId: "c-1", // default mock company
            status: (shipmentData.status as string) || "PENDING",
            trackingNumber: `SHP-${Date.now()}`,
            origin: (shipmentData.origin as string) || "UNKNOWN",
            destination: (shipmentData.destination as string) || "UNKNOWN",
            weight:
              typeof shipmentData.weight === "number"
                ? shipmentData.weight
                : null,
            distanceKm:
              typeof shipmentData.distanceKm === "number"
                ? shipmentData.distanceKm
                : null,
            co2eTonnes:
              typeof shipmentData.co2eTonnes === "number"
                ? shipmentData.co2eTonnes
                : null,
            serviceType: (shipmentData.mode as string) || "Ocean",
          })
          .returning();

        return newShipment[0];
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create shipment";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.delete<{
    Params: { id: string };
  }>(
    "/:id",
    { preHandler: [validate(ShipmentIdParamsSchema)] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await db.delete(shipments).where(eq(shipments.id, id));
        return { success: true };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to delete shipment";
        return reply.code(500).send({ error: message });
      }
    },
  );
};

export default shipmentsRoutes;

import { FastifyPluginAsync } from "fastify";
import { logger } from "../config/logger.js";
import { broadcastEvent } from "./events.routes.js";
import { db } from "../db/index.js";
import { shipments, locations } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

const trackingRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.post("/webhook/ais", async (request, reply) => {
    // 1. Validar la clave de API estática
    const apiKey = request.headers["x-api-key"];
    if (apiKey !== (process.env.AIS_WEBHOOK_SECRET || "atlas-ais-secret-123")) {
      logger.warn("Unauthorized access attempt to AIS Webhook");
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    try {
      const payload = request.body as {
        trackingNumber: string;
        imoNumber: string;
        latitude: number;
        longitude: number;
        status: string;
        eta?: string;
      };

      if (!payload.trackingNumber || !payload.status) {
        reply
          .code(400)
          .send({ error: "Missing required fields: trackingNumber, status" });
        return;
      }

      logger.info(
        `Received AIS Webhook for tracking number: ${payload.trackingNumber}`,
      );

      // We'll mock the lookup for now since schema might not have trackingNumber
      const shipmentRes = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, payload.trackingNumber))
        .limit(1);

      if (shipmentRes.length === 0) {
        logger.warn(
          `Shipment with tracking number ${payload.trackingNumber} not found.`,
        );
        reply.code(404).send({ error: "Shipment not found" });
        return;
      }

      const shipment = shipmentRes[0];
      const newStatus = payload.status;
      const locationStr = `${payload.latitude},${payload.longitude}`;

      // Update the shipment
      await db
        .update(shipments)
        .set({
          status: newStatus,
          currentLat: payload.latitude,
          currentLng: payload.longitude,
        })
        .where(eq(shipments.id, shipment.id));

      broadcastEvent({
        id: crypto.randomUUID(),
        type: "AIS_UPDATE",
        message: `Shipment ${payload.trackingNumber} is now ${newStatus}`,
        timestamp: new Date().toISOString(),
        metadata: {
          trackingNumber: payload.trackingNumber,
          shipmentId: shipment.id,
          status: newStatus,
          location: { lat: payload.latitude, lng: payload.longitude },
        },
      });

      logger.info(
        `Shipment ${payload.trackingNumber} updated successfully via AIS Webhook.`,
      );
      reply.code(200).send({ success: true, message: "Tracking updated" });
    } catch (error: any) {
      logger.error("Error processing AIS Webhook:", error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.get("/my-shipments", async (request, reply) => {
    try {
      // Mock auth: fetch shipments for the first company in the DB
      const companyIdRes = await db
        .select({ companyId: shipments.companyId })
        .from(shipments)
        .limit(1);
      if (companyIdRes.length === 0) return reply.send([]);

      const clientCompanyId = companyIdRes[0].companyId;

      const clientShipments = await db
        .select({
          id: shipments.id,
          referenceNumber: shipments.id,
          origin: locations.name,
          destination: locations.name, // Mocking destination name same as origin for now if joined improperly, but let's just send raw ID if location join is complex. Actually we can just select all.
          status: shipments.status,
        })
        .from(shipments)
        .leftJoin(locations, eq(shipments.portOfEntryId, locations.id))
        .where(eq(shipments.companyId, clientCompanyId))
        .limit(10);

      const { shipmentEventLogs } = await import("../db/schema/index.js");

      const enrichedShipments = await Promise.all(
        clientShipments.map(async (shipment) => {
          const events = await db
            .select()
            .from(shipmentEventLogs)
            .where(eq(shipmentEventLogs.shipmentId, shipment.id));
          return {
            ...shipment,
            events: events.map((e) => ({
              status: e.status,
              location: e.location,
              date: e.recordedAt,
            })),
          };
        }),
      );

      return reply.send(enrichedShipments);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/my-shipments", async (request, reply) => {
    try {
      const data: any = request.body;
      const shipmentId = crypto.randomUUID();

      // Find first company to mock client auth
      const companyIdRes = await db
        .select({ companyId: shipments.companyId })
        .from(shipments)
        .limit(1);

      const clientCompanyId =
        companyIdRes.length > 0
          ? companyIdRes[0].companyId
          : "00000000-0000-0000-0000-000000000000";

      await db.insert(shipments).values({
        id: shipmentId,
        trackingNumber: `TRK-${shipmentId.substring(0, 8).toUpperCase()}`,
        status: "PENDING",
        companyId: clientCompanyId,
        origin: data.origin,
        destination: data.destination,
        serviceType: data.type,
      });

      return reply.send({ success: true, shipmentId });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default trackingRoutes;

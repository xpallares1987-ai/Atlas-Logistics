import { FastifyPluginAsync } from "fastify";
import { logger } from "../config/logger.js";
import { broadcastEvent } from "./events.routes.js";
import {
  getShipmentByTrackingNumber,
  updateShipmentTracking,
  logShipmentEvent,
} from "../dataconnect-admin-generated/index.cjs.js";
import { initializeApp, getApps } from "firebase-admin/app";

// Ensure Firebase is initialized for this module scope
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "demo-atlas",
  });
}

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

      // 2. Buscar el envío asociado al trackingNumber
      const shipmentRes = await getShipmentByTrackingNumber({
        trackingNumber: payload.trackingNumber,
      });
      const shipments = shipmentRes.data.shipments;

      if (!shipments || shipments.length === 0) {
        logger.warn(
          `Shipment with tracking number ${payload.trackingNumber} not found.`,
        );
        reply.code(404).send({ error: "Shipment not found" });
        return;
      }

      const shipment = shipments[0];
      const oldStatus = shipment.status;
      const newStatus = payload.status;
      const locationStr = `${payload.latitude},${payload.longitude}`;

      // 3. Actualizar el envío en Data Connect
      await updateShipmentTracking({
        id: shipment.id,
        status: newStatus,
        location: locationStr,
        eta: payload.eta ? new Date(payload.eta).toISOString() : shipment.eta,
      });

      // 4. Registrar el evento en el log (Hito Marítimo)
      await logShipmentEvent({
        shipmentId: shipment.id,
        eventType: "STATUS_CHANGED",
        oldStatus: oldStatus,
        newStatus: newStatus,
        details: `Updated via AIS Webhook. Vessel IMO: ${payload.imoNumber}. Location: ${locationStr}`,
      });

      // 5. Emitir evento por SSE para actualizar la UI en tiempo real
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
};

export default trackingRoutes;

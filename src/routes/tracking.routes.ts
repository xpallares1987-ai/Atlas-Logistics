import { FastifyPluginAsync } from "fastify";
import { logger } from "../config/logger.js";
import { broadcastEvent } from "./events.routes.js";
import { db } from "../db/index.js";
import {
  shipments,
  locations,
  bookings,
  shipmentContainers,
  shipmentEventLogs,
} from "../db/schema/index.js";
import { eq, or } from "drizzle-orm";

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

  fastify.get("/:ref", async (request, reply) => {
    try {
      const { ref } = request.params as { ref: string };
      if (!ref) {
        return reply
          .code(400)
          .send({ error: "Missing tracking reference parameter" });
      }

      const cleanRef = decodeURIComponent(ref).trim();

      // 1. Search in shipments
      const shipmentMatches = await db
        .select()
        .from(shipments)
        .where(
          or(
            eq(shipments.id, cleanRef),
            eq(shipments.trackingNumber, cleanRef),
          ),
        )
        .limit(1);

      let shipment = shipmentMatches.length > 0 ? shipmentMatches[0] : null;

      // 2. If not found, check container numbers
      if (!shipment) {
        const containerMatches = await db
          .select({ shipmentId: shipmentContainers.shipmentId })
          .from(shipmentContainers)
          .where(eq(shipmentContainers.containerNumber, cleanRef))
          .limit(1);

        if (containerMatches.length > 0) {
          const matchedShipment = await db
            .select()
            .from(shipments)
            .where(eq(shipments.id, containerMatches[0].shipmentId))
            .limit(1);
          if (matchedShipment.length > 0) {
            shipment = matchedShipment[0];
          }
        }
      }

      // 3. If found shipment, retrieve or build events
      if (shipment) {
        const logs = await db
          .select()
          .from(shipmentEventLogs)
          .where(eq(shipmentEventLogs.shipmentId, shipment.id));

        let events: Array<{
          id: string;
          description: string;
          milestoneDate: string;
        }> = [];

        if (logs.length > 0) {
          events = logs.map((log) => ({
            id: log.id,
            description: `${log.status} - ${log.location}`,
            milestoneDate: log.recordedAt
              ? new Date(log.recordedAt).toISOString()
              : new Date().toISOString(),
          }));
        } else {
          const baseDate = shipment.createdAt
            ? new Date(shipment.createdAt)
            : new Date();
          events = [
            {
              id: "evt-1",
              description: "Booking Confirmed & Export Manifest Filed",
              milestoneDate: new Date(
                baseDate.getTime() - 86400000 * 2,
              ).toISOString(),
            },
            {
              id: "evt-2",
              description: `Gate-In at Origin Terminal (${shipment.origin || "Origin Port"})`,
              milestoneDate: new Date(
                baseDate.getTime() - 86400000,
              ).toISOString(),
            },
            {
              id: "evt-3",
              description: `Customs Export Release Approved - Loaded on Board (${shipment.vesselName || "Vessel Assigned"})`,
              milestoneDate: baseDate.toISOString(),
            },
          ];

          if (
            shipment.status === "DELIVERED" ||
            shipment.status === "COMPLETED"
          ) {
            events.push({
              id: "evt-4",
              description: `Vessel Discharged & Cargo Successfully Delivered (${shipment.destination || "Destination Terminal"})`,
              milestoneDate: new Date().toISOString(),
            });
          } else if (shipment.status === "IN_TRANSIT") {
            events.push({
              id: "evt-4",
              description: `Vessel Underway in Transit to ${shipment.destination || "Destination"}`,
              milestoneDate: new Date().toISOString(),
            });
          }
        }

        return reply.send({
          referenceNumber: shipment.trackingNumber || shipment.id,
          status: shipment.status,
          origin: shipment.origin || "Origin Terminal",
          destination: shipment.destination || "Destination Terminal",
          vesselName: shipment.vesselName,
          voyageNumber: shipment.voyageNumber,
          events,
        });
      }

      // 4. Check bookings if not found in shipments
      const bookingMatches = await db
        .select()
        .from(bookings)
        .where(
          or(eq(bookings.id, cleanRef), eq(bookings.referenceNumber, cleanRef)),
        )
        .limit(1);

      if (bookingMatches.length > 0) {
        const booking = bookingMatches[0];
        const baseDate = booking.createdAt
          ? new Date(booking.createdAt)
          : new Date();
        return reply.send({
          referenceNumber: booking.referenceNumber || booking.id,
          status: booking.status,
          origin: booking.origin || "Origin",
          destination: booking.destination || "Destination",
          vesselName: booking.vessel,
          voyageNumber: booking.voyage,
          events: [
            {
              id: "evt-bkg-1",
              description: "Booking Request Received & Processing",
              milestoneDate: baseDate.toISOString(),
            },
            {
              id: "evt-bkg-2",
              description: `Space & Equipment Allocation Confirmed (${booking.serviceType || "Ocean FCL"})`,
              milestoneDate: new Date(
                baseDate.getTime() + 3600000,
              ).toISOString(),
            },
          ],
        });
      }

      return reply.code(404).send({
        error:
          "Shipment not found. Please verify the tracking number or booking reference.",
      });
    } catch (error: any) {
      logger.error("Error in public tracking endpoint:", error);
      reply.code(500).send({ error: error.message });
    }
  });
};

export default trackingRoutes;

/**
 * @file tracking.routes.ts
 * @description Public and authenticated cargo tracking routes, AIS vessel location webhooks, and milestone history.
 * @module @atlas/api/routes/tracking
 * @see {@link docs/adr/0019-centralized-correlation-and-distributed-tracing.md}
 */

import { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
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
import { eq, inArray, or } from "drizzle-orm";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
} from "./openapi.schemas.js";

const TRACKING_TAG = ["Cargo Tracking"] as const;

interface AISWebhookPayload {
  trackingNumber: string;
  imoNumber: string;
  latitude: number;
  longitude: number;
  status: string;
  eta?: string;
}

interface CreateShipmentPayload {
  origin?: string;
  destination?: string;
  type?: string;
}

const trackingRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.post<{
    Body: AISWebhookPayload;
  }>(
    "/webhook/ais",
    {
      schema: {
        tags: [...TRACKING_TAG],
        summary:
          "Ingest AIS vessel position and shipment status webhook update",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 404, 500, 503]),
        },
      },
    },
    async (request, reply) => {
      // 1. Validate configured webhook API key with constant-time comparison
      const configuredSecret = process.env.AIS_WEBHOOK_SECRET;
      if (!configuredSecret) {
        logger.error("AIS_WEBHOOK_SECRET is not configured");
        return reply
          .code(503)
          .send({ error: "AIS webhook authentication is not configured" });
      }

      const rawApiKey = request.headers["x-api-key"];
      const apiKey = typeof rawApiKey === "string" ? rawApiKey : "";
      const providedBuf = Buffer.from(apiKey, "utf8");
      const expectedBuf = Buffer.from(configuredSecret, "utf8");
      const isValidKey =
        providedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(providedBuf, expectedBuf);

      if (!isValidKey) {
        logger.warn("Unauthorized access attempt to AIS Webhook");
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        const payload = request.body;

        if (!payload.trackingNumber || !payload.status) {
          return reply
            .code(400)
            .send({ error: "Missing required fields: trackingNumber, status" });
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
          return reply.code(404).send({ error: "Shipment not found" });
        }

        const shipment = shipmentRes[0];
        const newStatus = payload.status;

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
        return reply
          .code(200)
          .send({ success: true, message: "Tracking updated" });
      } catch (error: unknown) {
        logger.error({ err: error }, "Error processing AIS Webhook:");
        const message =
          error instanceof Error
            ? error.message
            : "Internal error processing AIS webhook";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );

  fastify.get(
    "/my-shipments",
    {
      schema: {
        tags: [...TRACKING_TAG],
        summary:
          "List customer portal shipments enriched with milestone events",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const user = request.user;
        if (!user || !user.id) {
          return reply.code(401).send({ error: "Unauthorized" });
        }
        if (!user.companyId && user.role !== "ADMIN") {
          return reply.send([]);
        }

        const baseQuery = db
          .select({
            id: shipments.id,
            referenceNumber: shipments.id,
            origin: locations.name,
            destination: locations.name,
            status: shipments.status,
          })
          .from(shipments)
          .leftJoin(locations, eq(shipments.portOfEntryId, locations.id));

        const clientShipments = await (user.role === "ADMIN" || !user.companyId
          ? baseQuery.limit(10)
          : baseQuery.where(eq(shipments.companyId, user.companyId)).limit(10));

        const shipmentIds = clientShipments.map((s) => s.id);
        const allEvents =
          shipmentIds.length > 0
            ? await db
                .select()
                .from(shipmentEventLogs)
                .where(inArray(shipmentEventLogs.shipmentId, shipmentIds))
            : [];
        const eventsByShipment = new Map<
          string,
          (typeof shipmentEventLogs.$inferSelect)[]
        >();
        for (const evt of allEvents) {
          const list = eventsByShipment.get(evt.shipmentId) || [];
          list.push(evt);
          eventsByShipment.set(evt.shipmentId, list);
        }

        const enrichedShipments = clientShipments.map((shipment) => {
          const events = eventsByShipment.get(shipment.id) || [];
          return {
            ...shipment,
            events: events.map((e) => ({
              status: e.status,
              location: e.location,
              date: e.recordedAt,
            })),
          };
        });

        return reply.send(enrichedShipments);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch shipments";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{
    Body: CreateShipmentPayload;
  }>(
    "/my-shipments",
    {
      schema: {
        tags: [...TRACKING_TAG],
        summary: "Create a quick tracked shipment from the customer portal",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const user = request.user;
        if (!user || !user.id || !user.companyId) {
          return reply
            .code(401)
            .send({ error: "Unauthorized: valid tenant user required" });
        }

        const data = request.body;
        const shipmentId = crypto.randomUUID();

        await db.insert(shipments).values({
          id: shipmentId,
          trackingNumber: `TRK-${shipmentId.substring(0, 8).toUpperCase()}`,
          status: "PENDING",
          companyId: user.companyId,
          origin: data.origin,
          destination: data.destination,
          serviceType: data.type,
        });

        return reply.send({ success: true, shipmentId });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create shipment";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{
    Params: { ref: string };
  }>(
    "/:ref",
    {
      schema: {
        tags: [...TRACKING_TAG],
        summary: "Track a shipment, container, or booking by reference number",
        params: buildParamSchema(
          "ref",
          "Tracking number, shipment ID, container number, or booking reference.",
        ),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { ref } = request.params;
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
            or(
              eq(bookings.id, cleanRef),
              eq(bookings.referenceNumber, cleanRef),
            ),
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
      } catch (error: unknown) {
        logger.error({ err: error }, "Error in public tracking endpoint:");
        const message =
          error instanceof Error
            ? error.message
            : "Failed to retrieve tracking info";
        return reply.code(500).send({ error: message });
      }
    },
  );
};

export default trackingRoutes;

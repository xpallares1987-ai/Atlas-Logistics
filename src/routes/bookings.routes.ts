/**
 * @file bookings.routes.ts
 * @description Ocean and multimodal booking request lifecycle, shipment materialization, and draft B/L inspection.
 * @module @atlas/api/routes/bookings
 * @see {@link docs/adr/0014-rate-comparer-port-drayage-booking-dispatch.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  createBookingRequest,
  listBookings,
  getBookingById,
  confirmBookingToShipment,
  cancelBookingRequest,
  CreateBookingInput,
  ConfirmBookingInput,
} from "../services/booking-lifecycle.service.js";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";

const BOOKING_RECORD_PROPERTIES = {
  id: { type: "string" },
  referenceNumber: { type: ["string", "null"] },
  customerId: { type: "string" },
  status: { type: "string" },
  origin: { type: ["string", "null"] },
  destination: { type: ["string", "null"] },
  serviceType: { type: ["string", "null"] },
  equipment: { type: ["string", "null"] },
  vessel: { type: ["string", "null"] },
  voyage: { type: ["string", "null"] },
  shipmentId: { type: ["string", "null"] },
  trackingNumber: { type: ["string", "null"] },
} as const;

interface ListBookingsQuery {
  status?: string;
  customerId?: string;
  limit?: string;
}

const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  // List bookings with optional status / customerId filters
  fastify.get<{
    Querystring: ListBookingsQuery;
  }>(
    "/",
    {
      schema: {
        tags: ["Bookings"],
        summary: "List ocean and multimodal booking requests",
        querystring: openApiObject({
          status: { type: "string", description: "Filter by booking status." },
          customerId: {
            type: "string",
            description: "Filter by customer company identifier.",
          },
          limit: { type: "string", description: "Maximum number of bookings." },
        }),
        response: {
          200: openApiArray(BOOKING_RECORD_PROPERTIES, "Booking list"),
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query || {};
        const items = await listBookings({
          status: query.status,
          customerId: query.customerId,
          limit: query.limit ? Number(query.limit) : 100,
        });
        return reply.send(items);
      } catch (error: unknown) {
        fastify.log.error(error, "Error listing bookings");
        const message =
          error instanceof Error ? error.message : "Failed to list bookings";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Get single booking detail with linked shipment, events and B/L document
  fastify.get<{
    Params: { id: string };
  }>(
    "/:id",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Get booking detail with linked shipment and draft B/L",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject(
            {
              ...BOOKING_RECORD_PROPERTIES,
              shipment: {
                type: ["object", "null"],
                additionalProperties: true,
              },
              events: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              blDocument: {
                type: ["object", "null"],
                additionalProperties: true,
              },
            },
            "Booking detail payload",
          ),
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const booking = await getBookingById(id);
        if (!booking) {
          return reply.code(404).send({ error: "Booking not found" });
        }
        return reply.send(booking);
      } catch (error: unknown) {
        fastify.log.error(error, "Error fetching booking detail");
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch booking detail";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Create new booking request (Phase 1: PENDING)
  fastify.post<{
    Body: CreateBookingInput;
  }>(
    "/",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Create a new booking request (Phase 1: PENDING)",
        body: openApiObject({
          origin: { type: "string" },
          destination: { type: "string" },
          carrier: { type: "string" },
          serviceType: { type: "string" },
          equipment: { type: "string" },
          customerId: { type: "string" },
          customerName: { type: "string" },
          consigneeName: { type: "string" },
          commodity: { type: "string" },
          weight: { type: "number" },
          incoterm: { type: "string" },
          rateAmount: { type: "number" },
          currency: { type: "string" },
          shipperAddressId: { type: "string" },
          consigneeAddressId: { type: "string" },
          notifyAddressId: { type: "string" },
          dischargeAgentAddressId: { type: "string" },
          isToOrder: { type: "boolean" },
          orderOf: { type: "string" },
        }),
        response: {
          201: openApiObject(BOOKING_RECORD_PROPERTIES, "Created booking"),
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body || ({} as CreateBookingInput);
        if (!body.origin || !body.destination) {
          return reply
            .code(400)
            .send({ error: "Fields 'origin' and 'destination' are required." });
        }
        const created = await createBookingRequest(body);
        return reply.code(201).send(created);
      } catch (error: unknown) {
        fastify.log.error(error, "Error creating booking request");
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create booking request";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Confirm booking and convert to active Shipment + Milestones + Draft B/L (Phase 2: CONFIRMED)
  fastify.post<{
    Params: { id: string };
    Body: ConfirmBookingInput;
  }>(
    "/:id/confirm",
    {
      schema: {
        tags: ["Bookings"],
        summary:
          "Confirm booking and materialize active Shipment, milestones, draft B/L, drayage, and customs docket",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          carrierBookingNumber: { type: "string" },
          vesselName: { type: "string" },
          voyageNumber: { type: "string" },
          containerNumber: { type: "string" },
          sealNumber: { type: "string" },
          incoterm: { type: "string" },
          shipperAddressId: { type: "string" },
          consigneeAddressId: { type: "string" },
          haulierAddressId: { type: "string" },
          drayageDestinationAddressId: { type: "string" },
        }),
        response: {
          200: openApiObject(
            {
              booking: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
              shipment: {
                type: ["object", "null"],
                additionalProperties: true,
              },
              container: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
              milestones: {
                type: "array",
                items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
              },
              blDocument: {
                type: ["object", "null"],
                additionalProperties: true,
              },
            },
            "Booking confirmation materialization result",
          ),
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const body = request.body || ({} as ConfirmBookingInput);
        const result = await confirmBookingToShipment(id, body);
        return reply.send(result);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Error confirming booking";
        if (message.includes("not found")) {
          return reply.code(404).send({ error: message });
        }
        fastify.log.error(error, "Error confirming booking to shipment");
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Cancel booking request
  fastify.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>(
    "/:id/cancel",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Cancel an active or pending booking request",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          reason: { type: "string" },
        }),
        response: {
          200: openApiObject(BOOKING_RECORD_PROPERTIES, "Cancelled booking"),
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const body = request.body || {};
        const cancelled = await cancelBookingRequest(id, body.reason);
        return reply.send(cancelled);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Error cancelling booking";
        if (message.includes("not found")) {
          return reply.code(404).send({ error: message });
        }
        fastify.log.error(error, "Error cancelling booking");
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Get Draft Bill of Lading document for a confirmed booking
  fastify.get<{
    Params: { id: string };
  }>(
    "/:id/bol",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Retrieve the generated draft Bill of Lading for a booking",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject(
            {
              id: { type: "string" },
              documentReference: { type: ["string", "null"] },
              status: { type: "string" },
              sha256Hash: { type: ["string", "null"] },
            },
            "Draft Bill of Lading document metadata and payload",
          ),
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const detail = await getBookingById(id);
        if (!detail) {
          return reply.code(404).send({ error: "Booking not found" });
        }
        if (!detail.blDocument) {
          return reply
            .code(404)
            .send({
              error: "Bill of Lading not yet generated for this booking",
            });
        }
        return reply.send(detail.blDocument);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch Bill of Lading";
        return reply.code(500).send({ error: message });
      }
    },
  );
};

export default bookingsRoutes;

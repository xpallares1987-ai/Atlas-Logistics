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

interface ListBookingsQuery {
  status?: string;
  customerId?: string;
  limit?: string;
}

const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  // List bookings with optional status / customerId filters
  fastify.get<{
    Querystring: ListBookingsQuery;
  }>("/", async (request, reply) => {
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
  });

  // Get single booking detail with linked shipment, events and B/L document
  fastify.get<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
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
  });

  // Create new booking request (Phase 1: PENDING)
  fastify.post<{
    Body: CreateBookingInput;
  }>("/", async (request, reply) => {
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
  });

  // Confirm booking and convert to active Shipment + Milestones + Draft B/L (Phase 2: CONFIRMED)
  fastify.post<{
    Params: { id: string };
    Body: ConfirmBookingInput;
  }>("/:id/confirm", async (request, reply) => {
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
  });

  // Cancel booking request
  fastify.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>("/:id/cancel", async (request, reply) => {
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
  });

  // Get Draft Bill of Lading document for a confirmed booking
  fastify.get<{
    Params: { id: string };
  }>("/:id/bol", async (request, reply) => {
    try {
      const { id } = request.params;
      const detail = await getBookingById(id);
      if (!detail) {
        return reply.code(404).send({ error: "Booking not found" });
      }
      if (!detail.blDocument) {
        return reply
          .code(404)
          .send({ error: "Bill of Lading not yet generated for this booking" });
      }
      return reply.send(detail.blDocument);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch Bill of Lading";
      return reply.code(500).send({ error: message });
    }
  });
};

export default bookingsRoutes;

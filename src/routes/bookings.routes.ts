import { FastifyPluginAsync } from "fastify";
import {
  createBookingRequest,
  listBookings,
  getBookingById,
  confirmBookingToShipment,
  cancelBookingRequest,
} from "../services/booking-lifecycle.service.js";

const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  // List bookings with optional status / customerId filters
  fastify.get("/", async (request, reply) => {
    try {
      const query = (request.query as any) || {};
      const items = await listBookings({
        status: query.status,
        customerId: query.customerId,
        limit: query.limit ? Number(query.limit) : 100,
      });
      return reply.send(items);
    } catch (error: any) {
      fastify.log.error(error, "Error listing bookings");
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get single booking detail with linked shipment, events and B/L document
  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const booking = await getBookingById(id);
      if (!booking) {
        return reply.code(404).send({ error: "Booking not found" });
      }
      return reply.send(booking);
    } catch (error: any) {
      fastify.log.error(error, "Error fetching booking detail");
      return reply.code(500).send({ error: error.message });
    }
  });

  // Create new booking request (Phase 1: PENDING)
  fastify.post("/", async (request, reply) => {
    try {
      const body = (request.body as any) || {};
      if (!body.origin || !body.destination) {
        return reply
          .code(400)
          .send({ error: "Campos 'origin' y 'destination' son obligatorios." });
      }
      const created = await createBookingRequest(body);
      return reply.code(201).send(created);
    } catch (error: any) {
      fastify.log.error(error, "Error creating booking request");
      return reply.code(500).send({ error: error.message });
    }
  });

  // Confirm booking and convert to active Shipment + Milestones + Draft B/L (Phase 2: CONFIRMED)
  fastify.post("/:id/confirm", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const result = await confirmBookingToShipment(id, body);
      return reply.send(result);
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        return reply.code(404).send({ error: error.message });
      }
      fastify.log.error(error, "Error confirming booking to shipment");
      return reply.code(500).send({ error: error.message });
    }
  });

  // Cancel booking request
  fastify.post("/:id/cancel", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const cancelled = await cancelBookingRequest(id, body.reason);
      return reply.send(cancelled);
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        return reply.code(404).send({ error: error.message });
      }
      fastify.log.error(error, "Error cancelling booking");
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get Draft Bill of Lading document for a confirmed booking
  fastify.get("/:id/bol", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
};

export default bookingsRoutes;

/**
 * @file ocean-booking.routes.ts
 * @description Fastify routes for Autonomous Multi-Carrier Ocean Booking Engine.
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { oceanBookingService } from "./ocean-booking.service.js";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, or } from "drizzle-orm";

const CarrierCodeEnum = z.enum([
  "MAERSK",
  "MSC",
  "CMA_CGM",
  "HAPAG_LLOYD",
  "ONE",
  "EVERGREEN",
]);
const ContainerIsoEnum = z.enum(["20GP", "40GP", "40HC", "40HR", "45HC"]);

const BookingRequestSchema = z.object({
  carrier: CarrierCodeEnum,
  originPort: z.string().min(2),
  destinationPort: z.string().min(2),
  commodityDescription: z.string().min(1),
  isoType: ContainerIsoEnum.default("40HC"),
  quantity: z.number().int().positive().default(1),
  rateLockToken: z.string().optional(),
});

const ContainerShippingDetailSchema = z.object({
  containerNumber: z.string().min(1),
  sealNumber: z.string().min(1),
  tareWeightKg: z.number().positive(),
  verifiedGrossMassKg: z.number().positive(),
  packagesCount: z.number().positive(),
  packageType: z.string().min(1),
  cargoDescription: z.string().min(1),
  hsCode: z.string().min(1),
});

const SubmitSISchema = z.object({
  bookingId: z.string().min(1),
  shipperName: z.string().min(1),
  shipperAddress: z.string().min(1),
  consigneeName: z.string().min(1),
  consigneeAddress: z.string().min(1),
  notifyPartyName: z.string().min(1),
  blType: z.enum(["WAYBILL", "ORIGINAL", "TELEX_RELEASE"]),
  freightPaymentTerm: z.enum(["PREPAID", "COLLECT"]).default("PREPAID"),
  placeOfIssue: z.string().min(1),
  containerDetails: z.array(ContainerShippingDetailSchema).min(1),
});

const ReleaseEquipmentSchema = z.object({
  bookingId: z.string().min(1),
  depotCode: z.string().optional(),
  depotName: z.string().optional(),
  depotAddress: z.string().optional(),
});

export const oceanBookingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/ocean-booking/details
   * Retrieves relational DCSA booking details from SQLite.
   */
  fastify.get("/details", async (request, reply) => {
    try {
      const { bookingId, shipmentId } = request.query as {
        bookingId?: string;
        shipmentId?: string;
      };

      let details;
      if (bookingId && shipmentId) {
        [details] = await db
          .select()
          .from(schema.oceanBookingDetails)
          .where(
            or(
              eq(schema.oceanBookingDetails.bookingId, bookingId),
              eq(schema.oceanBookingDetails.shipmentId, shipmentId),
            ),
          )
          .limit(1);
      } else if (bookingId) {
        [details] = await db
          .select()
          .from(schema.oceanBookingDetails)
          .where(eq(schema.oceanBookingDetails.bookingId, bookingId))
          .limit(1);
      } else if (shipmentId) {
        [details] = await db
          .select()
          .from(schema.oceanBookingDetails)
          .where(eq(schema.oceanBookingDetails.shipmentId, shipmentId))
          .limit(1);
      } else {
        [details] = await db.select().from(schema.oceanBookingDetails).limit(1);
      }

      if (!details) {
        return reply.status(404).send({
          error: "OCEAN_BOOKING_NOT_FOUND",
          message: "No ocean booking details found matching criteria.",
        });
      }

      // Fetch parent booking record for operational context
      const [parentBooking] = await db
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.id, details.bookingId))
        .limit(1);

      return reply.status(200).send({
        ...details,
        booking: parentBooking || null,
        vgm: details.vgmJson ? JSON.parse(details.vgmJson) : null,
        hazardous: details.hazardousDeclaration
          ? JSON.parse(details.hazardousDeclaration)
          : null,
      });
    } catch (err: any) {
      request.log.error(err, "Failed to fetch ocean booking details");
      return reply.status(500).send({
        error: "FAILED_FETCH_BOOKING_DETAILS",
        message: err.message,
      });
    }
  });

  /**
   * POST /api/ocean-booking/:id/shipping-instructions
   * Confirms DCSA Shipping Instructions and registers VGM in SQLite.
   */
  fastify.post("/:id/shipping-instructions", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { vgmKg, sealNumber, certifiedBy } = request.body as any;

      const vgmPayload = JSON.stringify({
        verifiedGrossMassKg: vgmKg || 28450,
        sealNumber: sealNumber || "ISO-17712-H-881920",
        certifiedBy: certifiedBy || "Atlas Weighing Station ESVLC-01",
        certifiedAt: new Date().toISOString(),
      });

      await db
        .update(schema.oceanBookingDetails)
        .set({
          siStatus: "CONFIRMED",
          vgmJson: vgmPayload,
          updatedAt: new Date(),
        })
        .where(eq(schema.oceanBookingDetails.id, id));

      const [updated] = await db
        .select()
        .from(schema.oceanBookingDetails)
        .where(eq(schema.oceanBookingDetails.id, id))
        .limit(1);

      return reply.status(200).send({
        success: true,
        details: updated,
      });
    } catch (err: any) {
      request.log.error(err, "Failed to submit shipping instructions");
      return reply.status(500).send({
        error: "FAILED_SUBMIT_SI",
        message: err.message,
      });
    }
  });

  /**
   * POST /api/ocean-booking/:id/generate-draft-bl
   * Issues official draft Bill of Lading in SQLite.
   */
  fastify.post("/:id/generate-draft-bl", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await db
        .update(schema.oceanBookingDetails)
        .set({
          draftBlStatus: "ISSUED",
          updatedAt: new Date(),
        })
        .where(eq(schema.oceanBookingDetails.id, id));

      const [updated] = await db
        .select()
        .from(schema.oceanBookingDetails)
        .where(eq(schema.oceanBookingDetails.id, id))
        .limit(1);

      return reply.status(200).send({
        success: true,
        details: updated,
      });
    } catch (err: any) {
      request.log.error(err, "Failed to generate draft B/L");
      return reply.status(500).send({
        error: "FAILED_GENERATE_DRAFT_BL",
        message: err.message,
      });
    }
  });
  /**
   * GET /api/ocean-booking/bookings
   */
  fastify.get("/bookings", async (_request, reply) => {
    const bookings = oceanBookingService.getBookings();
    return reply.status(200).send(bookings);
  });

  /**
   * GET /api/ocean-booking/presets
   */
  fastify.get("/presets", async (_request, reply) => {
    const presets = oceanBookingService.getPresets();
    return reply.status(200).send(presets);
  });

  /**
   * GET /api/ocean-booking/rate-locks
   */
  fastify.get("/rate-locks", async (request, reply) => {
    const { originPort, destPort, containerType } = request.query as any;
    const quotes = oceanBookingService.getLiveRateLocks(
      originPort || "CNSHA",
      destPort || "USLAX",
      (containerType as any) || "40HC",
    );
    return reply.status(200).send(quotes);
  });

  /**
   * POST /api/ocean-booking/request
   */
  fastify.post("/request", async (request, reply) => {
    const parse = BookingRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "INVALID_BOOKING_REQUEST",
        details: parse.error.issues,
      });
    }

    try {
      const booking = oceanBookingService.createBookingRequest(parse.data);
      return reply.status(201).send(booking);
    } catch (err: any) {
      request.log.error(err, "Failed to submit ocean booking request");
      return reply
        .status(500)
        .send({ error: "BOOKING_REQUEST_FAILED", message: err.message });
    }
  });

  /**
   * POST /api/ocean-booking/submit-si
   */
  fastify.post("/submit-si", async (request, reply) => {
    const parse = SubmitSISchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "INVALID_SHIPPING_INSTRUCTIONS",
        details: parse.error.issues,
      });
    }

    try {
      const { bookingId, ...siData } = parse.data;
      const result = oceanBookingService.submitShippingInstructions(
        bookingId,
        siData,
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      request.log.error(err, "Failed to submit shipping instructions");
      return reply
        .status(500)
        .send({ error: "SI_SUBMISSION_FAILED", message: err.message });
    }
  });

  /**
   * POST /api/ocean-booking/release-equipment
   */
  fastify.post("/release-equipment", async (request, reply) => {
    const parse = ReleaseEquipmentSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "INVALID_EQUIPMENT_RELEASE_REQUEST",
        details: parse.error.issues,
      });
    }

    try {
      const { bookingId, ...depotInfo } = parse.data;
      const result = oceanBookingService.issueEquipmentRelease(
        bookingId,
        depotInfo,
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      request.log.error(err, "Failed to issue equipment release order");
      return reply
        .status(500)
        .send({ error: "EQUIPMENT_RELEASE_FAILED", message: err.message });
    }
  });
};

export default oceanBookingRoutes;

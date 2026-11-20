/**
 * @file ocean-booking.routes.ts
 * @description Fastify routes for Autonomous Multi-Carrier Ocean Booking Engine, DCSA Shipping Instructions, SOLAS VGM registration, draft Bill of Lading issuance, rate locks, and container equipment release orders.
 * @module @atlas/api/modules/ocean-booking/routes
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ContainerIsoType } from "@atlas/shared";
import { oceanBookingService } from "./ocean-booking.service.js";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, or } from "drizzle-orm";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. ZOD VALIDATION SCHEMAS & PAYLOAD INTERFACES
// ============================================================================

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

interface ShippingInstructionsBody {
  vgmKg?: number;
  sealNumber?: string;
  certifiedBy?: string;
}

interface RateLocksQuery {
  originPort?: string;
  destPort?: string;
  containerType?: ContainerIsoType;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const OCEAN_BOOKING_TAG = ["Ocean Booking & DCSA"] as const;

export const oceanBookingRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/ocean-booking/details
  fastify.get(
    "/details",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary:
          "Retrieve relational DCSA ocean booking details, SOLAS VGM, and parent booking context",
        querystring: openApiObject({
          bookingId: { type: "string" },
          shipmentId: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
          [details] = await db
            .select()
            .from(schema.oceanBookingDetails)
            .limit(1);
        }

        if (!details) {
          return reply.status(404).send({
            error: "OCEAN_BOOKING_NOT_FOUND",
            message: "No ocean booking details found matching criteria.",
          });
        }

        const [parentBooking] = await db
          .select()
          .from(schema.bookings)
          .where(eq(schema.bookings.id, details.bookingId))
          .limit(1);

        return reply.status(200).send({
          ...details,
          booking: parentBooking || null,
          vgm: details.vgmJson
            ? (JSON.parse(details.vgmJson) as Record<string, unknown>)
            : null,
          hazardous: details.hazardousDeclaration
            ? (JSON.parse(details.hazardousDeclaration) as Record<
                string,
                unknown
              >)
            : null,
        });
      } catch (err: unknown) {
        request.log.error(err, "Failed to fetch ocean booking details");
        return reply.status(500).send({
          error: "FAILED_FETCH_BOOKING_DETAILS",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 2. POST /api/ocean-booking/:id/shipping-instructions
  fastify.post(
    "/:id/shipping-instructions",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary: "Confirm DCSA Shipping Instructions and certify SOLAS VGM",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          vgmKg: { type: "number" },
          sealNumber: { type: "string" },
          certifiedBy: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { vgmKg, sealNumber, certifiedBy } = (request.body ??
          {}) as ShippingInstructionsBody;

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
      } catch (err: unknown) {
        request.log.error(err, "Failed to submit shipping instructions");
        return reply.status(500).send({
          error: "FAILED_SUBMIT_SI",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 3. POST /api/ocean-booking/:id/generate-draft-bl
  fastify.post(
    "/:id/generate-draft-bl",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary: "Issue official Draft Bill of Lading for an ocean booking",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err, "Failed to generate draft B/L");
        return reply.status(500).send({
          error: "FAILED_GENERATE_DRAFT_BL",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 4. GET /api/ocean-booking/bookings
  fastify.get(
    "/bookings",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary: "List active multi-carrier ocean bookings",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      const bookings = oceanBookingService.getBookings();
      return reply.status(200).send(bookings);
    },
  );

  // 5. GET /api/ocean-booking/presets
  fastify.get(
    "/presets",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary: "Retrieve multi-carrier ocean booking reference presets",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      const presets = oceanBookingService.getPresets();
      return reply.status(200).send(presets);
    },
  );

  // 6. GET /api/ocean-booking/rate-locks
  fastify.get(
    "/rate-locks",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary: "Query live multi-carrier ocean spot rate lock quotes",
        querystring: openApiObject({
          originPort: { type: "string" },
          destPort: { type: "string" },
          containerType: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const { originPort, destPort, containerType } =
        request.query as RateLocksQuery;
      const quotes = oceanBookingService.getLiveRateLocks(
        originPort || "CNSHA",
        destPort || "USLAX",
        containerType || "40HC",
      );
      return reply.status(200).send(quotes);
    },
  );

  // 7. POST /api/ocean-booking/request
  fastify.post(
    "/request",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary: "Submit a new multi-carrier ocean booking request",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err, "Failed to submit ocean booking request");
        return reply.status(500).send({
          error: "BOOKING_REQUEST_FAILED",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 8. POST /api/ocean-booking/submit-si
  fastify.post(
    "/submit-si",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary:
          "Submit EDI 304 / DCSA Shipping Instructions for an ocean booking",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err, "Failed to submit shipping instructions");
        return reply.status(500).send({
          error: "SI_SUBMISSION_FAILED",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 9. POST /api/ocean-booking/release-equipment
  fastify.post(
    "/release-equipment",
    {
      schema: {
        tags: [...OCEAN_BOOKING_TAG],
        summary: "Issue Container Equipment Release Order (ERO) from depot",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err, "Failed to issue equipment release order");
        return reply.status(500).send({
          error: "EQUIPMENT_RELEASE_FAILED",
          message: getErrorMessage(err),
        });
      }
    },
  );
};

export default oceanBookingRoutes;

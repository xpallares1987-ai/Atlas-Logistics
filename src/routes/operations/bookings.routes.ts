/**
 * @file bookings.routes.ts
 * @description Operational booking lifecycle routes, company directory lookup, ESG carbon estimates, and booking confirmation/cancellation transitions.
 * @module @atlas/routes/operations/bookings
 */

import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import { db } from "../../db/index.js";
import {
  shipments,
  bookings,
  customsDeclarations,
} from "../../db/schema/operations.js";
import { companies } from "../../db/schema/core.js";
import { invoices, invoiceItems } from "../../db/schema/finance.js";
import { eq } from "drizzle-orm";
import { ensureOperationsSeedData } from "./seed-data.js";
import {
  confirmBookingToShipment,
  cancelBookingRequest,
  type ConfirmBookingInput,
} from "../../services/booking-lifecycle.service.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
} from "../openapi.schemas.js";

const OPERATIONS_BOOKINGS_TAG = ["Operations Bookings"] as const;

interface CargoItemInput {
  grossWeightKg?: number | string;
  [key: string]: unknown;
}

interface CreateBookingBody {
  bookingReference?: string;
  referenceNumber?: string;
  customerId?: string;
  status?: string;
  origin?: string;
  destination?: string;
  serviceType?: string;
  equipment?: string;
  vessel?: string;
  voyage?: string;
  commodities?: unknown[];
  commodity?: string;
  weight?: number;
}

interface UpdateBookingBody {
  status?: string;
  origin?: string;
  destination?: string;
  equipment?: string;
  vessel?: string;
  voyage?: string;
  commodities?: unknown[];
  customer?: string;
}

export const bookingOperationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get companies
  fastify.get(
    "/companies",
    {
      schema: {
        tags: [...OPERATIONS_BOOKINGS_TAG],
        summary: "List customer and partner company directory entries",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        await ensureOperationsSeedData();
        const allCompanies = await db
          .select({
            id: companies.id,
            name: companies.name,
          })
          .from(companies);
        return reply.send(allCompanies);
      } catch (error: unknown) {
        return reply.code(500).send({
          error:
            error instanceof Error ? error.message : "Error fetching companies",
        });
      }
    },
  );

  // Get bookings
  fastify.get(
    "/bookings",
    {
      schema: {
        tags: [...OPERATIONS_BOOKINGS_TAG],
        summary:
          "List operational freight bookings with parsed commodity details",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        await ensureOperationsSeedData();
        const items = await db.select().from(bookings).limit(50);
        const mappedItems = items.map((b) => ({
          ...b,
          customer: b.customerId === "c-1" ? "Demo Customer Ltd" : b.customerId,
          consignee: "Demo Consignee",
          commodities: b.cargoDetails ? JSON.parse(b.cargoDetails) : [],
          containers: [],
        }));
        return reply.send(mappedItems);
      } catch (error: unknown) {
        return reply.code(500).send({
          error:
            error instanceof Error ? error.message : "Error fetching bookings",
        });
      }
    },
  );

  // Carbon ESG Tracker Endpoint
  fastify.get(
    "/esg/carbon",
    {
      schema: {
        tags: [...OPERATIONS_BOOKINGS_TAG],
        summary:
          "Compute per-booking CO2e emissions estimates for the ESG tracker",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        await ensureOperationsSeedData();
        const items = await db.select().from(bookings).limit(50);

        const mappedItems = items.map((b) => {
          const hash =
            (b.origin || "a").charCodeAt(0) *
              (b.destination || "b").charCodeAt(0) *
              100 || 5000;
          const distanceKm = hash + b.id.length * 10;

          let weightTons = 10;
          if (b.cargoDetails) {
            try {
              const details = JSON.parse(b.cargoDetails) as CargoItemInput[];
              weightTons =
                details.reduce(
                  (acc: number, item: CargoItemInput) =>
                    acc + (Number(item.grossWeightKg) || 1000),
                  0,
                ) / 1000;
            } catch (_e: unknown) {
              // ignore parsing error
            }
          }

          const mode =
            b.serviceType === "Air"
              ? "Air"
              : b.serviceType === "Road"
                ? "Road"
                : "Ocean";

          // Emission factors (g CO2 per tonne-km): Air ~500, Road ~60, Ocean ~10
          const factor = mode === "Air" ? 500 : mode === "Road" ? 60 : 10;
          const co2eTonnes = (distanceKm * weightTons * factor) / 1000000;

          return {
            id: b.id,
            reference: b.referenceNumber,
            mode: mode,
            origin: b.origin || "Unknown",
            destination: b.destination || "Unknown",
            weightTons: weightTons,
            distanceKm: distanceKm,
            co2eTonnes: co2eTonnes,
            date: b.createdAt
              ? new Date(b.createdAt).toISOString().substring(0, 10)
              : new Date().toISOString().substring(0, 10),
          };
        });

        return reply.send(mappedItems);
      } catch (error: unknown) {
        return reply.code(500).send({
          error:
            error instanceof Error
              ? error.message
              : "Error fetching carbon tracking",
        });
      }
    },
  );

  // Create booking
  fastify.post<{ Body: CreateBookingBody }>(
    "/bookings",
    {
      schema: {
        tags: [...OPERATIONS_BOOKINGS_TAG],
        summary: "Create a new operational freight booking",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        await ensureOperationsSeedData();
        const body = request.body || {};
        const newBooking = await db
          .insert(bookings)
          .values({
            id: `bkg_${Date.now()}`,
            referenceNumber:
              body.bookingReference ||
              body.referenceNumber ||
              `BKG-${Date.now()}`,
            customerId: body.customerId || "c-1",
            status: body.status || "Pending",
            origin: body.origin,
            destination: body.destination,
            serviceType: body.serviceType || "Ocean",
            equipment: body.equipment,
            vessel: body.vessel,
            voyage: body.voyage,
            cargoDetails: body.commodities
              ? JSON.stringify(body.commodities)
              : body.commodity
                ? JSON.stringify([
                    { description: body.commodity, grossWeightKg: body.weight },
                  ])
                : undefined,
          })
          .returning();
        return reply.send({
          ...newBooking[0],
          customer:
            newBooking[0]?.customerId === "c-1"
              ? "Demo Customer Ltd"
              : newBooking[0]?.customerId,
          commodities: newBooking[0]?.cargoDetails
            ? JSON.parse(newBooking[0].cargoDetails)
            : [],
          containers: [],
        });
      } catch (error: unknown) {
        return reply.code(500).send({
          error:
            error instanceof Error ? error.message : "Error creating booking",
        });
      }
    },
  );

  // Update booking
  fastify.put<{ Params: { id: string }; Body: UpdateBookingBody }>(
    "/bookings/:id",
    {
      schema: {
        tags: [...OPERATIONS_BOOKINGS_TAG],
        summary:
          "Update booking fields and trigger shipment/invoice automation",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        await ensureOperationsSeedData();
        const { id } = request.params;
        const body = request.body || {};

        const updateData: Partial<typeof bookings.$inferInsert> = {};
        if (body.status) updateData.status = body.status;
        if (body.origin) updateData.origin = body.origin;
        if (body.destination) updateData.destination = body.destination;
        if (body.equipment) updateData.equipment = body.equipment;
        if (body.vessel) updateData.vessel = body.vessel;
        if (body.voyage) updateData.voyage = body.voyage;
        if (body.commodities)
          updateData.cargoDetails = JSON.stringify(body.commodities);
        if (body.customer && body.customer !== "Demo Customer Ltd") {
          updateData.customerId = body.customer;
        }

        const updated = await db.transaction(async (tx) => {
          const updatedRows = await tx
            .update(bookings)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(bookings.id, id))
            .returning();

          // Auto-generate Shipment and Customs Declaration
          if (
            updatedRows[0] &&
            (updatedRows[0].status === "DOCUMENTATION" ||
              updatedRows[0].status === "CONFIRMED" ||
              updatedRows[0].status === "Confirmed")
          ) {
            const existingShipment = await tx
              .select()
              .from(shipments)
              .where(eq(shipments.id, updatedRows[0].referenceNumber!))
              .limit(1);

            if (existingShipment.length === 0) {
              await tx.insert(shipments).values({
                id: updatedRows[0].referenceNumber!,
                status: "Pending",
                serviceType: updatedRows[0].serviceType,
                vesselName: updatedRows[0].vessel,
                voyageNumber: updatedRows[0].voyage,
                origin: updatedRows[0].origin,
                destination: updatedRows[0].destination,
                companyId: updatedRows[0].customerId || "c-1",
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
            const existingDecl = await tx
              .select()
              .from(customsDeclarations)
              .where(
                eq(
                  customsDeclarations.shipmentId,
                  updatedRows[0].referenceNumber!,
                ),
              )
              .limit(1);

            if (existingDecl.length === 0) {
              await tx.insert(customsDeclarations).values({
                id: `decl_${crypto.randomUUID().substring(0, 8)}`,
                shipmentId: updatedRows[0].referenceNumber!,
                blNumber: `HBL-${updatedRows[0].referenceNumber!}`,
                type: "Import",
                status: "Pending",
                aiRiskScore: 0,
                aiRiskFlag: "Awaiting Document Upload",
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }

          // Auto-generate AR Invoice when ON_BOARD
          if (updatedRows[0] && updatedRows[0].status === "ON_BOARD") {
            const existingInvoice = await tx
              .select()
              .from(invoices)
              .where(eq(invoices.shipmentId, updatedRows[0].referenceNumber!))
              .limit(1);

            if (existingInvoice.length === 0) {
              const newInvoiceId = `inv_${crypto.randomUUID().substring(0, 8)}`;
              await tx.insert(invoices).values({
                id: newInvoiceId,
                invoiceNumber: `INV-${updatedRows[0].referenceNumber!}`,
                type: "AR",
                shipmentId: updatedRows[0].referenceNumber!,
                companyId: updatedRows[0].customerId || "c-1",
                amount: 1500.0,
                currency: "USD",
                status: "Draft",
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              await tx.insert(invoiceItems).values({
                id: `item_${crypto.randomUUID().substring(0, 8)}`,
                invoiceId: newInvoiceId,
                description: `Freight Charges - ${updatedRows[0].origin} to ${updatedRows[0].destination}`,
                quantity: 1,
                unitPrice: 1500.0,
                total: 1500.0,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }

          return updatedRows;
        });

        return reply.send({
          ...updated[0],
          customer:
            updated[0]?.customerId === "c-1"
              ? "Demo Customer Ltd"
              : updated[0]?.customerId,
          commodities: updated[0]?.cargoDetails
            ? JSON.parse(updated[0].cargoDetails)
            : [],
          containers: [],
        });
      } catch (error: unknown) {
        return reply.code(500).send({
          error:
            error instanceof Error ? error.message : "Error updating booking",
        });
      }
    },
  );

  // Confirm booking to Shipment + Milestones + Draft B/L
  fastify.post<{ Params: { id: string }; Body: ConfirmBookingInput }>(
    "/bookings/:id/confirm",
    {
      schema: {
        tags: [...OPERATIONS_BOOKINGS_TAG],
        summary:
          "Confirm a booking and promote it to an active shipment with draft B/L",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const body = request.body || {};
        const result = await confirmBookingToShipment(id, body);
        return reply.send(result);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Error confirming booking";
        if (message.includes("not found")) {
          return reply.code(404).send({ error: message });
        }
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Cancel booking
  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    "/bookings/:id/cancel",
    {
      schema: {
        tags: [...OPERATIONS_BOOKINGS_TAG],
        summary:
          "Cancel an operational booking request with an optional reason",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
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
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Delete booking
  fastify.delete<{ Params: { id: string } }>(
    "/bookings/:id",
    {
      schema: {
        tags: [...OPERATIONS_BOOKINGS_TAG],
        summary: "Delete an operational booking by identifier",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await db.delete(bookings).where(eq(bookings.id, id));
        return reply.send({ success: true });
      } catch (error: unknown) {
        return reply.code(500).send({
          error:
            error instanceof Error ? error.message : "Error deleting booking",
        });
      }
    },
  );
};

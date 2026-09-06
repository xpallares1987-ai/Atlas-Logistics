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

export const bookingOperationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get companies
  fastify.get("/companies", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      const allCompanies = await db
        .select({
          id: companies.id,
          name: companies.name,
        })
        .from(companies);
      return reply.send(allCompanies);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get bookings
  fastify.get("/bookings", async (request, reply) => {
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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Carbon ESG Tracker Endpoint
  fastify.get("/esg/carbon", async (request, reply) => {
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
            const details = JSON.parse(b.cargoDetails);
            weightTons =
              details.reduce(
                (acc: number, item: any) =>
                  acc + (Number(item.grossWeightKg) || 1000),
                0,
              ) / 1000;
          } catch (e) {}
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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Create booking
  fastify.post("/bookings", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      const body = request.body as any;
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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update booking
  fastify.put("/bookings/:id", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const updateData: any = {};
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

      const updated = await db
        .update(bookings)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(bookings.id, id))
        .returning();

      // Auto-generate Shipment and Customs Declaration
      if (
        updated[0] &&
        (updated[0].status === "DOCUMENTATION" ||
          updated[0].status === "CONFIRMED" ||
          updated[0].status === "Confirmed")
      ) {
        const existingShipment = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, updated[0].referenceNumber!))
          .limit(1);

        if (existingShipment.length === 0) {
          await db.insert(shipments).values({
            id: updated[0].referenceNumber!,
            status: "Pending",
            serviceType: updated[0].serviceType,
            vesselName: updated[0].vessel,
            voyageNumber: updated[0].voyage,
            origin: updated[0].origin,
            destination: updated[0].destination,
            companyId: updated[0].customerId || "c-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        const existingDecl = await db
          .select()
          .from(customsDeclarations)
          .where(
            eq(customsDeclarations.shipmentId, updated[0].referenceNumber!),
          )
          .limit(1);

        if (existingDecl.length === 0) {
          await db.insert(customsDeclarations).values({
            id: `decl_${crypto.randomUUID().substring(0, 8)}`,
            shipmentId: updated[0].referenceNumber!,
            blNumber: `HBL-${updated[0].referenceNumber!}`,
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
      if (updated[0] && updated[0].status === "ON_BOARD") {
        const existingInvoice = await db
          .select()
          .from(invoices)
          .where(eq(invoices.shipmentId, updated[0].referenceNumber!))
          .limit(1);

        if (existingInvoice.length === 0) {
          const newInvoiceId = `inv_${crypto.randomUUID().substring(0, 8)}`;
          await db.insert(invoices).values({
            id: newInvoiceId,
            invoiceNumber: `INV-${updated[0].referenceNumber!}`,
            type: "AR",
            shipmentId: updated[0].referenceNumber!,
            companyId: updated[0].customerId || "c-1",
            amount: 1500.0,
            currency: "USD",
            status: "Draft",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await db.insert(invoiceItems).values({
            id: `item_${crypto.randomUUID().substring(0, 8)}`,
            invoiceId: newInvoiceId,
            description: `Freight Charges - ${updated[0].origin} to ${updated[0].destination}`,
            quantity: 1,
            unitPrice: 1500.0,
            total: 1500.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

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
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Delete booking
  fastify.delete("/bookings/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await db.delete(bookings).where(eq(bookings.id, id));
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
};

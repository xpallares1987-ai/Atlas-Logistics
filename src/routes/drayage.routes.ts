import { FastifyPluginAsync } from "fastify";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import { z } from "zod";
import {
  drayageEngineService,
  DrayageQuoteRequest,
} from "../services/drayage-engine.service.js";
import { db } from "../db/index.js";
import {
  addresses,
  addressContacts,
  drayageTransportOrders,
} from "../db/schema/index.js";
import { eq, desc, and } from "drizzle-orm";

const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const DrayageQuoteRequestSchema = z.object({
  originAddressId: z.string().optional(),
  originCoords: CoordinatesSchema.optional(),
  destinationAddressId: z.string().optional(),
  destinationCoords: CoordinatesSchema.optional(),
  containerType: z.any().optional(),
  cargoWeightKg: z.number().nonnegative().optional(),
  isDangerousGoods: z.boolean().optional(),
  requiresGenset: z.boolean().optional(),
  baseRateEuro: z.number().nonnegative().optional(),
  perKmRateEuro: z.number().nonnegative().optional(),
});

const drayageRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/drayage/quote - Calculate road drayage distance, costs and GLEC v3.0 emissions
  fastify.post("/quote", async (request, reply) => {
    try {
      const body = DrayageQuoteRequestSchema.parse(request.body || {});
      const quote = await drayageEngineService.calculateQuote(
        body as DrayageQuoteRequest,
      );
      return reply.send(quote);
    } catch (err: any) {
      fastify.log.error(err, "Failed to calculate drayage quote");
      return reply.code(400).send({ error: err.message });
    }
  });

  // GET /api/drayage/nearest-terminals - Find closest maritime port terminals and ICDs
  fastify.get("/nearest-terminals", async (request, reply) => {
    try {
      const query = request.query as any;
      let lat = query.lat ? Number(query.lat) : null;
      let lon = query.lon ? Number(query.lon) : null;

      if (
        (lat === null || lon === null || isNaN(lat) || isNaN(lon)) &&
        query.addressId
      ) {
        const addr = await db
          .select()
          .from(addresses)
          .where(eq(addresses.id, query.addressId))
          .limit(1);
        if (addr[0] && addr[0].lat !== null && addr[0].lon !== null) {
          lat = addr[0].lat;
          lon = addr[0].lon;
        }
      }

      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
        return reply.code(400).send({
          error:
            "Valid coordinates (lat, lon) or addressId with coordinates are required.",
        });
      }

      const limit = query.limit ? Number(query.limit) : 5;
      const terminals = await drayageEngineService.findNearestTerminals(
        { lat, lon },
        limit,
      );
      return reply.send(terminals);
    } catch (err: any) {
      fastify.log.error(err, "Failed to find nearest terminals");
      return reply.code(500).send({ error: err.message });
    }
  });

  // GET /api/drayage/hauliers - List registered hauliers with primary contact
  fastify.get("/hauliers", async (request, reply) => {
    try {
      const hauliers = await db
        .select()
        .from(addresses)
        .where(eq(addresses.addressType, "HAULIER"));

      const results: any[] = [];
      for (const h of hauliers) {
        const contacts = await db
          .select()
          .from(addressContacts)
          .where(eq(addressContacts.addressId, h.id));
        const primary =
          contacts.find((c) => c.isPrimary) || contacts[0] || null;

        results.push({
          ...h,
          contacts,
          primaryContact: primary,
        });
      }

      return reply.send(results);
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // GET /api/drayage/orders - List dispatched orders with parties & quote details
  fastify.get("/orders", async (request, reply) => {
    try {
      const query = request.query as any;
      const conditions: any[] = [];

      if (query.status && query.status !== "ALL") {
        conditions.push(eq(drayageTransportOrders.status, query.status));
      }
      if (query.shipmentId) {
        conditions.push(
          eq(drayageTransportOrders.shipmentId, query.shipmentId),
        );
      }

      const orders = await db
        .select()
        .from(drayageTransportOrders)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(drayageTransportOrders.createdAt));

      // Enrich with parties
      const enrichedOrders = await Promise.all(
        orders.map(async (o) => {
          const [haulier] = await db
            .select()
            .from(addresses)
            .where(eq(addresses.id, o.haulierAddressId))
            .limit(1);

          const [origin] = await db
            .select()
            .from(addresses)
            .where(eq(addresses.id, o.originAddressId))
            .limit(1);

          const [destination] = await db
            .select()
            .from(addresses)
            .where(eq(addresses.id, o.destinationAddressId))
            .limit(1);

          return {
            ...o,
            haulier: haulier
              ? {
                  id: haulier.id,
                  companyName: haulier.companyName,
                  city: haulier.city,
                  taxId: haulier.taxId,
                }
              : null,
            origin: origin
              ? {
                  id: origin.id,
                  companyName: origin.companyName,
                  street1: origin.street1,
                  city: origin.city,
                  zipCode: origin.zipCode,
                  country: origin.country,
                  unLocode: origin.unLocode,
                  lat: origin.lat,
                  lon: origin.lon,
                }
              : null,
            destination: destination
              ? {
                  id: destination.id,
                  companyName: destination.companyName,
                  street1: destination.street1,
                  city: destination.city,
                  zipCode: destination.zipCode,
                  country: destination.country,
                  unLocode: destination.unLocode,
                  lat: destination.lat,
                  lon: destination.lon,
                }
              : null,
          };
        }),
      );

      return reply.send(enrichedOrders);
    } catch (err: any) {
      fastify.log.error(err, "Failed to list drayage transport orders");
      return reply.code(500).send({ error: err.message });
    }
  });

  // GET /api/drayage/orders/:id - Get single order details
  fastify.get("/orders/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [order] = await db
        .select()
        .from(drayageTransportOrders)
        .where(eq(drayageTransportOrders.id, id))
        .limit(1);

      if (!order) {
        return reply.code(404).send({ error: "Drayage order not found" });
      }

      const [haulier] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, order.haulierAddressId))
        .limit(1);

      const [origin] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, order.originAddressId))
        .limit(1);

      const [destination] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, order.destinationAddressId))
        .limit(1);

      return reply.send({
        ...order,
        haulier,
        origin,
        destination,
      });
    } catch (err: any) {
      fastify.log.error(err, "Failed to retrieve drayage order");
      return reply.code(500).send({ error: err.message });
    }
  });

  // PATCH /api/drayage/orders/:id/status - Update order lifecycle state
  fastify.patch("/orders/:id/status", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { status: string };

      const validStatuses = [
        "DRAFT",
        "DISPATCHED",
        "ACCEPTED",
        "GATE_IN",
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
      ];

      if (!body.status || !validStatuses.includes(body.status)) {
        return reply.code(400).send({
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const now = new Date().toISOString();
      await db
        .update(drayageTransportOrders)
        .set({
          status: body.status as any,
          updatedAt: now,
        })
        .where(eq(drayageTransportOrders.id, id));

      const [updated] = await db
        .select()
        .from(drayageTransportOrders)
        .where(eq(drayageTransportOrders.id, id))
        .limit(1);

      return reply.send(updated);
    } catch (err: any) {
      fastify.log.error(err, "Failed to update drayage order status");
      return reply.code(500).send({ error: err.message });
    }
  });

  // POST /api/drayage/orders - Generate, persist and dispatch a Drayage Transport Order
  fastify.post("/orders", async (request, reply) => {
    try {
      const body = request.body as any;
      if (
        !body.haulierAddressId ||
        !body.originAddressId ||
        !body.destinationAddressId
      ) {
        return reply.code(400).send({
          error:
            "haulierAddressId, originAddressId, and destinationAddressId are required.",
        });
      }

      const orderId = `dry_${uuidv4().substring(0, 8)}`;
      const now = new Date();
      const orderNumber = `DRY-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Fetch parties
      const [haulier] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, body.haulierAddressId))
        .limit(1);

      const [origin] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, body.originAddressId))
        .limit(1);

      const [dest] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, body.destinationAddressId))
        .limit(1);

      if (!haulier || !origin || !dest) {
        return reply
          .code(404)
          .send({ error: "One or more addresses not found in directory." });
      }

      const quote = await drayageEngineService.calculateQuote({
        originCoords: { lat: origin.lat!, lon: origin.lon! },
        destinationCoords: { lat: dest.lat!, lon: dest.lon! },
        containerType: body.containerType || "40HC",
        cargoWeightKg: body.cargoWeightKg || 18500,
        isDangerousGoods: body.isDangerousGoods,
        requiresGenset: body.requiresGenset,
      });

      const driverPickupPin = String(Math.floor(1000 + Math.random() * 9000));
      const qrDigest = crypto
        .createHash("sha256")
        .update(
          `${orderNumber}:${haulier.companyName}:${quote.costs.totalGross}:${driverPickupPin}`,
        )
        .digest("hex");

      const windowStart = body.appointmentWindowStart || now.toISOString();
      const windowEnd =
        body.appointmentWindowEnd ||
        new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();

      await db.insert(drayageTransportOrders).values({
        id: orderId,
        orderNumber,
        status: "DISPATCHED",
        shipmentId: body.shipmentId || null,
        bookingReference: body.bookingReference || null,
        containerNumber: body.containerNumber || null,
        containerType: body.containerType || "40HC",
        cargoWeightKg: body.cargoWeightKg || 18500,
        isDangerousGoods: !!body.isDangerousGoods,
        requiresGenset: !!body.requiresGenset,
        haulierAddressId: haulier.id,
        originAddressId: origin.id,
        destinationAddressId: dest.id,
        distanceKm: quote.distanceKm,
        baseRate: quote.costs.baseRate,
        fuelSurcharge: quote.costs.fuelSurcharge,
        tollsCost: quote.costs.tollsEurovignette,
        extraSurcharges:
          quote.costs.equipmentSurcharge +
          quote.costs.dangerousGoodsSurcharge +
          quote.costs.heavyWeightSurcharge,
        subtotalCost: quote.costs.subtotalNet,
        profitMargin: Number((quote.costs.subtotalNet * 0.15).toFixed(2)),
        totalGrossCost: quote.costs.totalGross,
        currency: quote.costs.currency,
        co2WtwKg: quote.emissions.conventionalDieselKgCO2e,
        co2TtwKg: quote.emissions.hvo100RenewableKgCO2e,
        co2WteKg: quote.emissions.co2eSavingsKg,
        emissionsIntensityFactor:
          quote.emissions.tonnesKm > 0
            ? Number(
                (
                  quote.emissions.conventionalDieselKgCO2e /
                  quote.emissions.tonnesKm
                ).toFixed(4),
              )
            : 0.085,
        driverPickupPin,
        qrDigest,
        appointmentWindowStart: windowStart,
        appointmentWindowEnd: windowEnd,
        notes: body.notes || null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const orderPayload = {
        id: orderId,
        orderId,
        orderNumber,
        status: "DISPATCHED",
        haulier: {
          id: haulier.id,
          companyName: haulier.companyName,
          taxId: haulier.taxId,
          city: haulier.city,
        },
        origin: {
          id: origin.id,
          companyName: origin.companyName,
          street1: origin.street1,
          city: origin.city,
          zipCode: origin.zipCode,
          country: origin.country,
          unLocode: origin.unLocode,
          lat: origin.lat,
          lon: origin.lon,
        },
        destination: {
          id: dest.id,
          companyName: dest.companyName,
          street1: dest.street1,
          city: dest.city,
          zipCode: dest.zipCode,
          country: dest.country,
          unLocode: dest.unLocode,
          lat: dest.lat,
          lon: dest.lon,
        },
        bookingReference: body.bookingReference || null,
        containerNumber: body.containerNumber || null,
        containerType: body.containerType || "40HC",
        cargoWeightKg: body.cargoWeightKg || 18500,
        appointmentWindowStart: windowStart,
        appointmentWindowEnd: windowEnd,
        quote,
        driverPickupPin,
        notes: body.notes || null,
        qrDigest,
        createdAt: now.toISOString(),
      };

      return reply.code(201).send(orderPayload);
    } catch (err: any) {
      fastify.log.error(err, "Failed to create drayage transport order");
      return reply.code(500).send({ error: err.message });
    }
  });
};

export default drayageRoutes;

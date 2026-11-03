import { FastifyPluginAsync } from "fastify";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import {
  drayageEngineService,
  DrayageQuoteRequest,
} from "../services/drayage-engine.service.js";
import { db } from "../db/index.js";
import { addresses, addressContacts } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

const drayageRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/drayage/quote - Calculate road drayage distance, costs and GLEC v3.0 emissions
  fastify.post("/quote", async (request, reply) => {
    try {
      const body = request.body as DrayageQuoteRequest;
      const quote = await drayageEngineService.calculateQuote(body);
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

  // POST /api/drayage/orders - Generate and dispatch a Drayage Transport Order
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

      const orderPayload = {
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
        },
        destination: {
          id: dest.id,
          companyName: dest.companyName,
          street1: dest.street1,
          city: dest.city,
          zipCode: dest.zipCode,
          country: dest.country,
          unLocode: dest.unLocode,
        },
        bookingReference: body.bookingReference || null,
        containerNumber: body.containerNumber || null,
        containerType: body.containerType || "40HC",
        cargoWeightKg: body.cargoWeightKg || 18500,
        appointmentWindowStart:
          body.appointmentWindowStart || now.toISOString(),
        appointmentWindowEnd:
          body.appointmentWindowEnd ||
          new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        quote,
        driverPickupPin: String(Math.floor(1000 + Math.random() * 9000)),
        notes: body.notes || null,
        qrDigest: crypto
          .createHash("sha256")
          .update(
            `${orderNumber}:${haulier.companyName}:${quote.costs.totalGross}`,
          )
          .digest("hex"),
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

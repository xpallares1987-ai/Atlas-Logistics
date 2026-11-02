import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import bookingsRoutes from "../src/routes/bookings.routes.js";
import addressesRoutes, {
  ensureAddressesTables,
} from "../src/routes/addresses.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  addresses,
  addressContacts,
  bookings,
} from "../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

describe("Booking Lifecycle & Canonical Addresses Integration", () => {
  let app: FastifyInstance;
  const testTenantId = "tenant_test_bkg_addr_01";
  let shipperId: string;
  let consigneeId: string;
  let notifyId: string;
  let agentId: string;
  let createdBookingId: string;

  beforeAll(async () => {
    await ensureAddressesTables();
    const now = new Date();

    // 1. Seed tenant company
    await db
      .insert(companies)
      .values({
        id: testTenantId,
        name: "Trans-Iberia Global Logistics S.A.",
        taxId: "ESA99112233",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Register Addresses for B/L Parties
    const [sAddr] = await db
      .insert(addresses)
      .values({
        id: "addr_test_shipper_01",
        companyId: testTenantId,
        addressType: "CUSTOMER",
        companyName: "Iberian Olive Oil Exporters S.A.",
        taxId: "ESA12345678",
        street1: "Av. del Puerto 120, Muelle Sur",
        city: "Valencia",
        zipCode: "46024",
        country: "ES",
        unLocode: "ESVLC",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    shipperId = sAddr.id;

    await db.insert(addressContacts).values({
      id: "cont_test_shipper_01",
      addressId: shipperId,
      fullName: "Carlos Mendoza",
      email: "carlos.mendoza@iberianolive.es",
      phone: "+34 963 123 456",
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    });

    const [cAddr] = await db
      .insert(addresses)
      .values({
        id: "addr_test_consignee_01",
        companyId: testTenantId,
        addressType: "CUSTOMER",
        companyName: "Nordic Fine Foods B.V.",
        taxId: "NL889900112B01",
        street1: "Keizersgracht 450",
        city: "Rotterdam",
        zipCode: "3011 AA",
        country: "NL",
        unLocode: "NLRTM",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    consigneeId = cAddr.id;

    const [nAddr] = await db
      .insert(addresses)
      .values({
        id: "addr_test_notify_01",
        companyId: testTenantId,
        addressType: "CUSTOMS_BROKER",
        companyName: "Rotterdam Port Customs Agents B.V.",
        taxId: "NL112233445B02",
        street1: "Waalhaven Oostzijde 14",
        city: "Rotterdam",
        zipCode: "3087 BM",
        country: "NL",
        unLocode: "NLRTM",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    notifyId = nAddr.id;

    const [aAddr] = await db
      .insert(addresses)
      .values({
        id: "addr_test_agent_01",
        companyId: testTenantId,
        addressType: "CARRIER_AGENT",
        companyName: "Maersk Agencies Rotterdam B.V.",
        taxId: "NL998877665B01",
        street1: "Maasvlakte Boulevard 100",
        city: "Rotterdam",
        zipCode: "3199 LK",
        country: "NL",
        unLocode: "NLRTM",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    agentId = aAddr.id;

    // 3. Setup Fastify test server
    app = Fastify();
    await app.register(addressesRoutes, { prefix: "/api/addresses" });
    await app.register(bookingsRoutes, { prefix: "/api/bookings" });
    await app.ready();
  });

  afterAll(async () => {
    if (createdBookingId) {
      await db.delete(bookings).where(eq(bookings.id, createdBookingId));
    }
    const addrIds = [shipperId, consigneeId, notifyId, agentId].filter(Boolean);
    if (addrIds.length > 0) {
      await db
        .delete(addressContacts)
        .where(inArray(addressContacts.addressId, addrIds));
    }
    await db.delete(addresses).where(eq(addresses.companyId, testTenantId));
    await db.delete(companies).where(eq(companies.id, testTenantId));
    await app.close();
  });

  it("creates a booking request with linked directory addresses and straight B/L snapshot", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        customerName: "Iberian Olive Oil Exporters S.A.",
        carrier: "Maersk",
        origin: "ESVLC (Valencia)",
        destination: "NLRTM (Rotterdam)",
        serviceType: "FCL",
        incoterm: "CIF",
        equipment: "40HC",
        commodity: "Extra Virgin Olive Oil Bottles (Palletized)",
        weight: 22000,
        totalCost: 1850,
        currency: "EUR",
        transitTimeDays: 7,
        shipperAddressId: shipperId,
        consigneeAddressId: consigneeId,
        notifyAddressId: notifyId,
        dischargeAgentAddressId: agentId,
        isToOrder: false,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    createdBookingId = body.id;
    expect(body.shipperAddressId).toBe(shipperId);
    expect(body.consigneeAddressId).toBe(consigneeId);
    expect(body.notifyAddressId).toBe(notifyId);
    expect(body.dischargeAgentAddressId).toBe(agentId);
    expect(body.isToOrder).toBe(false);

    // Verify canonical B/L parties snapshot was generated
    expect(body.blPartiesSnapshot).toBeDefined();
    expect(body.blPartiesSnapshot.shipper.rawBlock).toContain(
      "IBERIAN OLIVE OIL EXPORTERS S.A.",
    );
    expect(body.blPartiesSnapshot.shipper.rawBlock).toContain(
      "ATTN: CARLOS MENDOZA",
    );
    expect(body.blPartiesSnapshot.consignee.rawBlock).toContain(
      "NORDIC FINE FOODS B.V.",
    );
    expect(body.blPartiesSnapshot.notify.rawBlock).toContain(
      "ROTTERDAM PORT CUSTOMS AGENTS B.V.",
    );
    expect(body.blPartiesSnapshot.agent.rawBlock).toContain(
      "MAERSK AGENCIES ROTTERDAM B.V.",
    );
  });

  it("updates and confirms booking with Negotiable (TO ORDER) mode and persists immutable snapshot", async () => {
    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/bookings/${createdBookingId}/confirm`,
      payload: {
        bookingNumber: "MSK-VLC-RTM-99812",
        vesselName: "MAERSK MC-KINNEY MOLLER",
        voyageNumber: "2604N",
        carrierScac: "MAEU",
        shipperAddressId: shipperId,
        consigneeAddressId: consigneeId,
        notifyAddressId: notifyId,
        dischargeAgentAddressId: agentId,
        isToOrder: true,
        orderOf: "BANCO SANTANDER CENTRAL HISPANO S.A.",
      },
    });

    expect(confirmRes.statusCode).toBe(200);
    const confirmedBody = confirmRes.json();
    expect(confirmedBody.booking.status).toBe("CONFIRMED");
    expect(confirmedBody.booking.bookingNumber).toBe("MSK-VLC-RTM-99812");
    expect(confirmedBody.booking.isToOrder).toBe(true);
    expect(confirmedBody.booking.orderOf).toBe(
      "BANCO SANTANDER CENTRAL HISPANO S.A.",
    );

    // Validate negotiable consignee formatting
    const snapshot = confirmedBody.booking.blPartiesSnapshot;
    expect(snapshot).toBeDefined();
    expect(snapshot.consignee.rawBlock).toContain(
      "TO ORDER OF BANCO SANTANDER",
    );
    expect(snapshot.consignee.rawBlock).toContain(
      "NOTIFY PARTY MUST BE SPECIFIED",
    );
    expect(snapshot.notify.rawBlock).toContain(
      "ROTTERDAM PORT CUSTOMS AGENTS B.V.",
    );

    // Verify downstream operational shipment was initialized
    expect(
      confirmedBody.shipment?.id || confirmedBody.booking?.shipmentId,
    ).toBeDefined();
    expect(
      confirmedBody.shipment?.trackingNumber ||
        confirmedBody.booking?.trackingNumber,
    ).toMatch(/^(SHP-|ATLS-)/);
  });

  it("retrieves confirmed booking via GET and maintains all address links and B/L snapshots", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/bookings/${createdBookingId}`,
    });

    expect(res.statusCode).toBe(200);
    const booking = res.json();
    expect(booking.id).toBe(createdBookingId);
    expect(booking.shipperAddressId).toBe(shipperId);
    expect(booking.isToOrder).toBe(true);
    expect(booking.blPartiesSnapshot.consignee.rawBlock).toContain(
      "TO ORDER OF BANCO SANTANDER",
    );
  });
});

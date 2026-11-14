import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import bookingsRoutes from "../src/routes/bookings.routes.js";
import drayageRoutes from "../src/routes/drayage.routes.js";
import quotesRoutes from "../src/routes/quotes.routes.js";
import { ensureAddressesTables } from "../src/routes/addresses.routes.js";
import {
  createBookingRequest,
  confirmBookingToShipment,
  getBookingById,
} from "../src/services/booking-lifecycle.service.js";
import { db } from "../src/db/index.js";
import {
  companies,
  addresses,
  bookings,
  shipments,
  drayageTransportOrders,
  shipmentEventLogs,
} from "../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

describe("Rate-Comparer Port Drayage End-to-End Booking Lifecycle", () => {
  let app: FastifyInstance;

  const testCompanyId = "co_drayage_booking_test";
  const testTerminalId = "addr_term_best_bcn_test";
  const testWarehouseId = "addr_wh_zal_prat_test";
  const testHaulierId = "addr_haul_transmaritim_test";

  beforeAll(async () => {
    await ensureAddressesTables();
    const now = new Date();

    // 1. Seed Company
    await db
      .insert(companies)
      .values({
        id: testCompanyId,
        name: "Atlas Global Import & Export S.L.",
        taxId: "ESB12345678",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Seed Terminal (Origin of Drayage)
    await db
      .insert(addresses)
      .values({
        id: testTerminalId,
        companyId: testCompanyId,
        addressType: "TRM",
        companyName: "Hutchison Ports BEST Terminal",
        street1: "Muelle Prat s/n, Port de Barcelona",
        zipCode: "08039",
        city: "Barcelona",
        country: "ES",
        unLocode: "ESBCN",
        lat: 41.3195,
        lon: 2.1557,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 3. Seed Consignee Warehouse (Destination of Drayage)
    await db
      .insert(addresses)
      .values({
        id: testWarehouseId,
        companyId: testCompanyId,
        addressType: "WH",
        companyName: "ZAL Port Prat Logistics Hub",
        street1: "Avinguda Ports d'Europa 100",
        zipCode: "08820",
        city: "El Prat de Llobregat",
        country: "ES",
        lat: 41.332,
        lon: 2.109,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 4. Seed Haulier
    await db
      .insert(addresses)
      .values({
        id: testHaulierId,
        companyId: testCompanyId,
        addressType: "HAU",
        companyName: "Transportes Portuarios Trans-Marítim S.L.",
        street1: "Carrer del Foc 45",
        zipCode: "08038",
        city: "Barcelona",
        country: "ES",
        lat: 41.355,
        lon: 2.138,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // Initialize Fastify app
    app = Fastify();
    await app.register(bookingsRoutes, { prefix: "/api/bookings" });
    await app.register(drayageRoutes, { prefix: "/api/drayage" });
    await app.register(quotesRoutes, { prefix: "/api/quotes" });
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("1. Creates a booking request with drayageQuote and persists in SQLite as PENDING", async () => {
    const drayageQuote = {
      distanceKm: 18.5,
      baseRate: 260,
      fuelSurcharge: 38,
      tollsCost: 8,
      subtotalCost: 306,
      profitMargin: 45.9,
      totalGrossCost: 351.9,
      co2WtwKg: 24.2,
      co2TtwKg: 19.4,
      co2WteKg: 4.8,
      currency: "EUR",
      destinationAddressId: testWarehouseId,
      destinationName: "ZAL Port Prat Logistics Hub",
    };

    const booking = await createBookingRequest({
      origin: "CNSHA",
      destination: "ESBCN",
      carrier: "Maersk",
      equipment: "40HC",
      customerName: "Atlas Global Imports S.L.",
      consigneeName: "Continental Distribution Hub Ltd",
      rateAmount: 2450,
      currency: "USD",
      transitDays: 28,
      status: "PENDING",
      drayageQuote,
      haulierAddressId: testHaulierId,
      drayageDestinationAddressId: testWarehouseId,
    });

    expect(booking).toBeDefined();
    expect(booking.id).toBeDefined();
    expect(booking.status).toBe("PENDING");
    expect(booking.cargoDetails).toBeDefined();

    const storedDetails =
      typeof booking.cargoDetails === "string"
        ? JSON.parse(booking.cargoDetails)
        : booking.cargoDetails;

    expect(storedDetails.drayageQuote).toBeDefined();
    expect(storedDetails.drayageQuote.distanceKm).toBe(18.5);
    expect(storedDetails.drayageQuote.totalGrossCost).toBe(351.9);
    expect(storedDetails.haulierAddressId).toBe(testHaulierId);
    expect(storedDetails.drayageDestinationAddressId).toBe(testWarehouseId);
  });

  it("2. Confirming booking automatically materializes drayageTransportOrders and emits DRAYAGE_DISPATCHED", async () => {
    const drayageQuote = {
      distanceKm: 25.4,
      baseRate: 290,
      fuelSurcharge: 42,
      tollsCost: 10,
      subtotalCost: 342,
      profitMargin: 51.3,
      totalGrossCost: 393.3,
      co2WtwKg: 31.8,
      currency: "EUR",
      destinationAddressId: testWarehouseId,
    };

    // 1. Create booking
    const created = await createBookingRequest({
      origin: "CNSHA",
      destination: "ESBCN",
      carrier: "CMA CGM",
      equipment: "40HC",
      customerName: "Atlas Global Imports S.L.",
      rateAmount: 2600,
      currency: "USD",
      transitDays: 26,
      status: "PENDING",
      drayageQuote,
      haulierAddressId: testHaulierId,
      drayageDestinationAddressId: testWarehouseId,
    });

    // 2. Confirm booking
    const confirmed = await confirmBookingToShipment(created.id, {
      vesselName: "CMA CGM ANTOINE DE SAINT EXUPERY",
      voyageNumber: "0FM88W1MA",
      containerNumber: "CMAU7718291",
      sealNumber: "SL-99214",
    });

    expect(confirmed).toBeDefined();
    expect(confirmed.shipment).toBeDefined();
    expect(confirmed.drayageOrder).toBeDefined();

    const drayageOrder = confirmed.drayageOrder;
    expect(drayageOrder.status).toBe("DISPATCHED");
    expect(drayageOrder.orderNumber).toMatch(/^DRY-\d{6}-\d{4}$/);
    expect(drayageOrder.distanceKm).toBe(25.4);
    expect(drayageOrder.totalGrossCost).toBe(393.3);

    // 3. Verify in SQLite database directly
    const dbOrders = await db
      .select()
      .from(drayageTransportOrders)
      .where(eq(drayageTransportOrders.id, drayageOrder.id));

    expect(dbOrders.length).toBe(1);
    const dbOrder = dbOrders[0];
    expect(dbOrder.shipmentId).toBe(confirmed.shipment.id);
    expect(dbOrder.bookingReference).toBe(created.referenceNumber);
    expect(dbOrder.containerNumber).toBe("CMAU7718291");
    expect(dbOrder.status).toBe("DISPATCHED");
    expect(dbOrder.haulierAddressId).toBe(testHaulierId);
    expect(["addr_term_best_bcn", testTerminalId]).toContain(
      dbOrder.originAddressId,
    );
    expect(dbOrder.destinationAddressId).toBe(testWarehouseId);
    expect(dbOrder.driverPickupPin).toBeDefined();
    expect(dbOrder.qrDigest).toBeDefined();

    // 4. Verify DRAYAGE_DISPATCHED event in shipmentEventLogs
    const logs = await db
      .select()
      .from(shipmentEventLogs)
      .where(eq(shipmentEventLogs.shipmentId, confirmed.shipment.id));

    const drayageLog = logs.find(
      (l) =>
        l.status === "DRAYAGE_DISPATCHED" ||
        (l as any).eventTypeCode === "DRAYAGE_DISPATCHED",
    );
    expect(drayageLog).toBeDefined();
  });

  it("3. HTTP POST /api/bookings and confirm via API produces valid drayage order queryable via /api/drayage/orders", async () => {
    // 3.1 Create booking via HTTP
    const createRes = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        origin: "CNSHA",
        destination: "ESBCN",
        carrier: "Hapag-Lloyd",
        equipment: "40HC",
        customerName: "Atlas Test Client",
        rateAmount: 2300,
        currency: "USD",
        transitDays: 30,
        drayageQuote: {
          distanceKm: 33.2,
          baseRate: 310,
          fuelSurcharge: 45,
          tollsCost: 14,
          totalGrossCost: 424.35,
          co2WtwKg: 42.1,
          destinationAddressId: testWarehouseId,
        },
        haulierAddressId: testHaulierId,
        drayageDestinationAddressId: testWarehouseId,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createdBooking = JSON.parse(createRes.body);

    // 3.2 Confirm booking via HTTP
    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/bookings/${createdBooking.id}/confirm`,
      payload: {
        vesselName: "AL DAHNA EXPRESS",
        voyageNumber: "2601W",
        containerNumber: "HLXU4488210",
        sealNumber: "SL-33819",
      },
    });

    expect(confirmRes.statusCode).toBe(200);
    const confirmData = JSON.parse(confirmRes.body);
    expect(confirmData.drayageOrder).toBeDefined();
    expect(confirmData.drayageOrder.orderNumber).toBeDefined();

    // 3.3 Query drayage orders via /api/drayage/orders
    const drayageRes = await app.inject({
      method: "GET",
      url: `/api/drayage/orders?shipmentId=${confirmData.shipment.id}`,
    });

    expect(drayageRes.statusCode).toBe(200);
    const drayageList = JSON.parse(drayageRes.body);
    expect(drayageList.length).toBeGreaterThanOrEqual(1);
    const matched = drayageList.find(
      (o: any) => o.id === confirmData.drayageOrder.id,
    );
    expect(matched).toBeDefined();
    expect(matched.status).toBe("DISPATCHED");
    expect(matched.containerNumber).toBe("HLXU4488210");
  });

  it("4. 1-Click Accept-and-Book /api/quotes/:id/accept-and-book automatically dispatches drayage", async () => {
    const acceptRes = await app.inject({
      method: "POST",
      url: "/api/quotes/dynamic/accept-and-book",
      payload: {
        origin: "CNNGB",
        destination: "ESBCN",
        carrier: "Ocean Network Express (ONE)",
        equipment: "40HC",
        rateAmount: 2550,
        currency: "USD",
        transitDays: 27,
        shipperName: "One Logistics Shipper Ltd",
        consigneeName: "Iberian Imports Hub S.A.",
        commodityDescription: "Solar Inverters and Power Supplies",
        grossWeightKg: 19800,
        paymentMode: "ESCROW_SMART_CONTRACT",
        drayageQuote: {
          distanceKm: 42.0,
          baseRate: 350,
          fuelSurcharge: 50,
          tollsCost: 15,
          totalGrossCost: 477.25,
          co2WtwKg: 52.8,
          destinationAddressId: testWarehouseId,
        },
        haulierAddressId: testHaulierId,
        drayageDestinationAddressId: testWarehouseId,
      },
    });

    expect(acceptRes.statusCode).toBe(200);
    const result = JSON.parse(acceptRes.body);

    expect(result.booking).toBeDefined();
    expect(result.shipment).toBeDefined();
    expect(result.drayageOrder).toBeDefined();
    expect(result.drayageOrder.status).toBe("DISPATCHED");
    expect(result.drayageOrder.totalGrossCost).toBe(477.25);
    expect(result.links?.drayageHubUrl).toBe("/drayage");
  });
});

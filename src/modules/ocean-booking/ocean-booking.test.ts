import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import oceanBookingRoutes from "./ocean-booking.routes.js";
import { OCEAN_BOOKING_PRESETS } from "@atlas/shared";

describe("Ocean Booking Module: Fastify API Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(oceanBookingRoutes, { prefix: "/api/ocean-booking" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/ocean-booking/presets - should return all predefined booking scenarios", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/ocean-booking/presets",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);

    const transpac = body.find((b: any) => b.id === "bkg-transpac-01");
    const asiaEu = body.find((b: any) => b.id === "bkg-asiaeu-02");
    const bcn = body.find((b: any) => b.id === "bkg-bcn-cantunis-03");

    expect(transpac).toBeDefined();
    expect(transpac.carrier).toBe("MAERSK");
    expect(asiaEu).toBeDefined();
    expect(asiaEu.carrier).toBe("CMA_CGM");
    expect(bcn).toBeDefined();
    expect(bcn.carrier).toBe("HAPAG_LLOYD");
    expect(bcn.originPort).toBe("ESBCN");
  });

  it("GET /api/ocean-booking/bookings - should return active bookings list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/ocean-booking/bookings",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("GET /api/ocean-booking/rate-locks - should return multi-carrier instant spot rate lock quotes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/ocean-booking/rate-locks?originPort=CNSHA&destPort=USLAX&containerType=40HC",
    });

    expect(res.statusCode).toBe(200);
    const quotes = JSON.parse(res.body);
    expect(Array.isArray(quotes)).toBe(true);
    expect(quotes.length).toBe(5); // Maersk, MSC, CMA CGM, Hapag-Lloyd, ONE

    const maerskQuote = quotes.find((q: any) => q.carrier === "MAERSK");
    expect(maerskQuote).toBeDefined();
    expect(maerskQuote.totalSpotUsd).toBeGreaterThan(0);
    expect(maerskQuote.rateLockToken).toContain("RL-MAEU-");
    expect(maerskQuote.validityExpiresAt).toBeDefined();
  });

  it("POST /api/ocean-booking/request - should create new booking request and return confirmed status", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ocean-booking/request",
      payload: {
        carrier: "HAPAG_LLOYD",
        originPort: "ESBCN",
        destinationPort: "USNYC",
        commodityDescription: "Customer01 Paper Book TEST01 Coils",
        isoType: "40HC",
        quantity: 2,
      },
    });

    expect(res.statusCode).toBe(201);
    const booking = JSON.parse(res.body);
    expect(booking.bookingNumber).toBeDefined();
    expect(booking.referenceNumber).toContain("ATL-BKG-ESBCN-USNYC-");
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.cutOffs).toBeDefined();
    expect(booking.cutOffs.siCutOff).toBeDefined();
  });

  it("POST /api/ocean-booking/request - should reject invalid payload with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ocean-booking/request",
      payload: {
        invalid: true,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("INVALID_BOOKING_REQUEST");
  });

  it("POST /api/ocean-booking/submit-si - should submit shipping instructions and return EDI 304 payload", async () => {
    const targetBooking = OCEAN_BOOKING_PRESETS[1]; // bkg-asiaeu-02
    const res = await app.inject({
      method: "POST",
      url: "/api/ocean-booking/submit-si",
      payload: {
        bookingId: targetBooking.id,
        shipperName: "Atlas Cargo Logistics Singapore",
        shipperAddress: "10 Marina Blvd, Singapore",
        consigneeName: "Euro Retail Imports BV",
        consigneeAddress: "Maasvlakte 2, Rotterdam, Netherlands",
        notifyPartyName: "Atlas Logistics Rotterdam Lead",
        blType: "WAYBILL",
        freightPaymentTerm: "PREPAID",
        placeOfIssue: "Singapore",
        containerDetails: [
          {
            containerNumber: "CMAU8173920",
            sealNumber: "SL-CMDU-991201",
            tareWeightKg: 3950,
            verifiedGrossMassKg: 25800,
            packagesCount: 850,
            packageType: "Boxes",
            cargoDescription: "Eco Apparel and Textiles",
            hsCode: "61091000",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.booking.status).toBe("SI_SUBMITTED");
    expect(body.booking.shippingInstructions).toBeDefined();
    expect(body.edi304Payload).toContain("ST*304*0001");
    expect(body.edi304Payload).toContain("B2**CMDU*");
  });

  it("POST /api/ocean-booking/release-equipment - should issue empty equipment pickup order with PIN", async () => {
    const targetBooking = OCEAN_BOOKING_PRESETS[1];
    const res = await app.inject({
      method: "POST",
      url: "/api/ocean-booking/release-equipment",
      payload: {
        bookingId: targetBooking.id,
        depotCode: "SGSIN-DEPOT-JURONG",
        depotName: "Jurong Port Container Depot",
        depotAddress: "37 Jurong Port Road, Singapore",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.booking.status).toBe("ALLOCATED");
    expect(body.releaseOrder.releaseOrderNumber).toContain("REL-CMDU-");
    expect(body.releaseOrder.pickupPin).toHaveLength(4);
    expect(body.releaseOrder.sealNumbersAllocated).toBeDefined();
  });
});

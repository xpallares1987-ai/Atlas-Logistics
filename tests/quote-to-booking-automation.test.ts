import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import quotesRoutes from "../src/routes/quotes.routes.js";
import smartContractsRoutes from "../src/modules/smart-contracts/smart-contracts.routes.js";
import { getSmartContractsActiveState } from "../src/modules/smart-contracts/smart-contracts.routes.js";

describe("Commercial Automation: Quote-to-Booking with Escrow & EDI Confirmation", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(quotesRoutes, { prefix: "/api/quotes" });
    await app.register(smartContractsRoutes, {
      prefix: "/api/smart-contracts",
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("successfully accepts quote and confirms booking with Smart Contract Escrow deposit", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/quotes/qt-test-escrow-01/accept-and-book",
      payload: {
        quoteNumber: "QT-2026-98124",
        origin: "CNSHA",
        destination: "NLRTM",
        carrier: "Maersk",
        equipment: "40HC",
        rateAmount: 2650,
        currency: "USD",
        transitDays: 28,
        shipperName: "Atlas Global Shipper S.A.",
        consigneeName: "Rotterdam Logistic Hub B.V.",
        commodityDescription: "Precision Medical Instruments",
        grossWeightKg: 17800,
        specialInstructions: "Temperature-controlled 20C. Fragile sensors.",
        paymentMode: "ESCROW_SMART_CONTRACT",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.success).toBe(true);
    expect(body.quote.status).toBe("ACCEPTED");

    // Booking assertions
    expect(body.booking.referenceNumber).toMatch(/^BKG-\d{6}-\d{4}$/);
    expect(body.booking.carrierBookingNumber).toBeDefined();
    expect(body.booking.vessel).toBeDefined();
    expect(body.booking.voyage).toBeDefined();
    expect(body.booking.containerNumber).toBeDefined();
    expect(body.booking.sealNumber).toBeDefined();
    expect(body.booking.cutOffDate).toBeDefined();

    // Shipment assertions
    expect(body.shipment).toBeDefined();
    expect(body.shipment.status).toBe("BOOKED");

    // Smart Contract Escrow assertions
    expect(body.payment.mode).toBe("ESCROW_SMART_CONTRACT");
    expect(body.payment.amount).toBe(2650);
    expect(body.payment.currency).toBe("USD");
    expect(body.payment.escrowBlock).toBeDefined();
    expect(body.payment.escrowBlock.payload.event).toBe("ESCROW_DEPOSITED");
    expect(body.payment.escrowBlock.txHash).toMatch(/^[a-f0-9]{64}$/);

    // DCSA EDI simulation assertions
    expect(body.edi).toBeDefined();
    expect(body.edi.dcsaEvent).toBeDefined();
    expect(body.edi.dcsaEvent.eventTypeCode).toBe("CONF");
    expect(body.edi.verified).toBe(true);

    // Multi-module Deep Links assertions
    expect(body.links.shipment360Url).toContain("/shipment-360?id=");
    expect(body.links.ediHubUrl).toContain("/edi?ref=");
    expect(body.links.smartContractsUrl).toBe("/smart-contracts");
    expect(body.links.quotePdfUrl).toBeDefined();

    // Verify Active Ledger updated in memory
    const state = getSmartContractsActiveState();
    expect(state.escrow.status).toBe("FUNDED");
    expect(state.escrow.totalAmountUsd).toBe(2650);
    const lastBlock = state.ledger[state.ledger.length - 1];
    expect(lastBlock.payload.event).toBe("ESCROW_DEPOSITED");
  });

  it("successfully accepts quote with Net-30 Commercial Credit terms", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/quotes/qt-test-net30-02/accept-and-book",
      payload: {
        quoteNumber: "QT-2026-55210",
        origin: "ESVLC",
        destination: "USNYC",
        carrier: "MSC",
        equipment: "20GP",
        rateAmount: 1890,
        currency: "USD",
        transitDays: 16,
        shipperName: "Ceramicas Levante S.L.",
        consigneeName: "Manhattan Tile & Stone Corp",
        commodityDescription: "Polished Ceramic Tiles",
        grossWeightKg: 21000,
        paymentMode: "NET_30_CREDIT",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.success).toBe(true);
    expect(body.quote.status).toBe("ACCEPTED");
    expect(body.booking.referenceNumber).toMatch(/^BKG-\d{6}-\d{4}$/);
    expect(body.payment.mode).toBe("NET_30_CREDIT");
    expect(body.payment.proformaInvoiceNumber).toMatch(/^INV-PRO-\d{6}$/);
    expect(body.payment.escrowBlock).toBeNull();
    expect(body.booking.carrier).toBe("MSC");
  });

  it("supports dynamic quote creation and booking without prior persistence", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/quotes/dynamic/accept-and-book",
      payload: {
        origin: "CNSHA",
        destination: "ESBCN",
        carrier: "CMA CGM",
        equipment: "40HC",
        rateAmount: 2420,
        currency: "USD",
        transitDays: 25,
        shipperName: "Ningbo Electronics Ltd",
        consigneeName: "Barcelona Tech Hub S.L.",
        commodityDescription: "Telecommunication Microchips",
        grossWeightKg: 14200,
        paymentMode: "ESCROW_SMART_CONTRACT",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.quote.id).toBeDefined();
    expect(body.quote.status).toBe("ACCEPTED");
    expect(body.booking.referenceNumber).toMatch(/^BKG-\d{6}-\d{4}$/);
  });
});

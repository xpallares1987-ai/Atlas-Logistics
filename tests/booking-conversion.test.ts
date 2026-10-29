import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import bookingsRoutes from "../src/routes/bookings.routes.js";

describe("2-Phase Booking-to-Shipment Conversion Lifecycle", () => {
  let app: FastifyInstance;
  let createdBookingId: string;
  let createdReferenceNumber: string;

  beforeAll(async () => {
    app = Fastify();
    await app.register(bookingsRoutes, { prefix: "/api/bookings" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("Phase 1: creates a PENDING booking request with canonical BKG-YYYYMM-XXXX reference", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        customerName: "Atlas Global Imports S.L.",
        carrier: "Maersk",
        origin: "CNSHA (Shanghai)",
        destination: "ESBCN (Barcelona)",
        serviceType: "FCL",
        incoterm: "FOB",
        equipment: "40HC",
        commodity: "Precision Industrial Robotics",
        weight: 21400,
        poNumber: "PO-2026-9941",
        totalCost: 2780,
        currency: "USD",
        transitTimeDays: 26,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.status).toBe("PENDING");
    expect(body.referenceNumber).toMatch(/^BKG-\d{6}-\d{4}$/);
    expect(body.origin).toBe("CNSHA (Shanghai)");
    expect(body.destination).toBe("ESBCN (Barcelona)");
    expect(body.parsedCargoDetails.carrier).toBe("Maersk");
    expect(body.parsedCargoDetails.incoterm).toBe("FOB");
    expect(body.parsedCargoDetails.weight).toBe(21400);

    createdBookingId = body.id;
    createdReferenceNumber = body.referenceNumber;
  });

  it("lists pending bookings in the operational inbox", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/bookings?status=PENDING",
    });

    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(Array.isArray(list)).toBe(true);
    const found = list.find((b: any) => b.id === createdBookingId);
    expect(found).toBeDefined();
    expect(found.referenceNumber).toBe(createdReferenceNumber);
  });

  it("Phase 2: confirms booking and atomically generates Shipment, Container, 3 Milestones, and Draft B/L", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/bookings/${createdBookingId}/confirm`,
      payload: {
        carrierBookingNumber: "MAEU-99887766",
        vesselName: "MAERSK MC-KINNEY MOLLER",
        voyageNumber: "614W",
        containerNumber: "MSKU8473621",
        sealNumber: "SL-MAEU-44112",
        shipperName: "Shanghai Robotics Manufacturing Co.",
        consigneeName: "Atlas Global Imports S.L.",
      },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json();

    // 1. Booking transitioned to CONFIRMED
    expect(result.booking.status).toBe("CONFIRMED");

    // 2. Active Shipment created with canonical ATLS-YYYY-XXXXX tracking number
    expect(result.shipment).toBeDefined();
    expect(result.shipment.status).toBe("BOOKED");
    expect(result.shipment.trackingNumber).toMatch(/^ATLS-\d{4}-\d{5}$/);
    expect(result.shipment.vesselName).toBe("MAERSK MC-KINNEY MOLLER");
    expect(result.shipment.voyageNumber).toBe("614W");
    expect(result.shipment.incoterm).toBe("FOB");

    // 3. Container created
    expect(result.container).toBeDefined();
    expect(result.container.containerNumber).toBe("MSKU8473621");

    // 4. 3 Standard Operational Milestones initialized
    expect(Array.isArray(result.milestones)).toBe(true);
    expect(result.milestones.length).toBe(3);
    const statuses = result.milestones.map((m: any) => m.status);
    expect(statuses).toContain("BOOKING_CONFIRMED");
    expect(statuses).toContain("CONTAINER_ASSIGNED");
    expect(statuses).toContain("CARGO_READY_FOR_RECEIPT");

    // 5. Draft Bill of Lading emitted and persisted in documents
    expect(result.blDocument).toBeDefined();
    expect(result.blDocument.type).toBe("BILL_OF_LADING");
    expect(result.blDocument.status).toBe("DRAFT");
    expect(result.blDocument.documentReference).toBe(
      `BL-${result.shipment.trackingNumber}`,
    );
    expect(result.blDocument.sha256Hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("ensures idempotency if confirm is called again on an already CONFIRMED booking", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/bookings/${createdBookingId}/confirm`,
      payload: {
        carrierBookingNumber: "MAEU-99887766",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.alreadyConfirmed).toBe(true);
    expect(body.shipment).toBeDefined();
    expect(body.blDocument).toBeDefined();
  });

  it("retrieves the generated Draft Bill of Lading via GET /api/bookings/:id/bol", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/bookings/${createdBookingId}/bol`,
    });

    expect(res.statusCode).toBe(200);
    const bl = res.json();
    expect(bl.type).toBe("BILL_OF_LADING");
    expect(bl.payloadData.carrierBookingNumber).toBe("MAEU-99887766");
    expect(bl.payloadData.containerNumber).toBe("MSKU8473621");
    expect(bl.payloadData.shipper.name).toBe(
      "Shanghai Robotics Manufacturing Co.",
    );
  });

  it("cancels a PENDING booking and blocks subsequent confirmation", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        origin: "SGSIN (Singapore)",
        destination: "NLRTM (Rotterdam)",
        carrier: "MSC",
        equipment: "20GP",
      },
    });
    const toCancel = createRes.json();

    const cancelRes = await app.inject({
      method: "POST",
      url: `/api/bookings/${toCancel.id}/cancel`,
      payload: { reason: "Customer postponed shipment" },
    });
    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.json().status).toBe("CANCELLED");

    const confirmCancelledRes = await app.inject({
      method: "POST",
      url: `/api/bookings/${toCancel.id}/confirm`,
      payload: {},
    });
    expect(confirmCancelledRes.statusCode).toBe(500);
  });
});

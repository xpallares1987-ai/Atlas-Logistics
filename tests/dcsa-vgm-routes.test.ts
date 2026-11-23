/**
 * @file dcsa-vgm-routes.test.ts
 * @description Integration tests for Fastify REST routes for DCSA v3.0 Container Lifecycles and SOLAS VGM.
 * Tests Method 1/2 VGM declarations, EDIFACT VERMAS synthesis, carrier acknowledgments, and DCSA event ingestion.
 * @module @atlas/tests/dcsa-vgm-routes
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { dcsaVgmRoutes } from "../src/routes/dcsa-vgm.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  shipments,
  containers,
  containerVgm,
  dcsaEventsLog,
} from "../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

describe("DCSA v3.0 & SOLAS VGM REST Routes (ADR 0038)", () => {
  let app: FastifyInstance;
  const testCompanyId = "comp_test_vgm_owner_01";
  const testShipmentId = "sh_test_vgm_shipment_01";
  const testContainerId = "cnt_test_vgm_container_01";
  const testContainerNum = "CSQU3054383";

  beforeAll(async () => {
    const now = new Date();

    // 1. Seed Company
    await db
      .insert(companies)
      .values({
        id: testCompanyId,
        name: "Test Maritime Container Line S.A.",
        taxId: "ESA11223399",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Clean previous test records
    await db
      .delete(containerVgm)
      .where(eq(containerVgm.containerNumber, testContainerNum));

    await db.delete(containers).where(eq(containers.id, testContainerId));

    await db.delete(shipments).where(eq(shipments.id, testShipmentId));

    // 3. Seed Shipment
    await db.insert(shipments).values({
      id: testShipmentId,
      companyId: testCompanyId,
      status: "IN_TRANSIT",
      origin: "ESBCN",
      destination: "USNYC",
      weight: 24500,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Seed Container
    await db.insert(containers).values({
      id: testContainerId,
      shipmentId: testShipmentId,
      containerNumber: testContainerNum,
      isoSizeType: "42G1",
      tareWeightKg: 3800,
      maxPayloadKg: 28200,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Initialize Fastify instance
    app = Fastify({ logger: false });
    await app.register(dcsaVgmRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("POST /api/dcsa/v3/vgm/declare declares Method 1 VGM and returns EDIFACT VERMAS", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dcsa/v3/vgm/declare",
      payload: {
        containerId: testContainerId,
        shipmentId: testShipmentId,
        containerNumber: testContainerNum,
        isoSizeType: "42G1",
        bookingReference: "BK-2026-VGM-8812",
        weighingMethod: "METHOD_1",
        tareWeightKg: 3800,
        scaleGrossWeightKg: 24500,
        authorizedPerson: "Alejandro Ruiz",
        weighingPartyName: "Terminal de Contenedores de Barcelona",
        certifiedScaleId: "TCB-SCALE-01",
        tenantId: testCompanyId,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.vgmRecord).toBeDefined();
    expect(body.vgmRecord.containerNumber).toBe(testContainerNum);
    expect(body.vgmRecord.vgmWeightKg).toBe(24500);
    expect(body.declarationReference).toMatch(/^VGM-/);
    expect(body.edifactVermas).toContain("UNH+1+VERMAS:D:16B:UN:SMDG20'");
    expect(body.edifactVermas).toContain("MEA+AAE+VGM+KGM:24500'");
    expect(body.dcsaJson.verifiedGrossMass).toBe(24500);
  });

  it("POST /api/dcsa/v3/vgm/declare rejects corrupt ISO 6346 container number", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dcsa/v3/vgm/declare",
      payload: {
        containerId: testContainerId,
        shipmentId: testShipmentId,
        containerNumber: "CSQU3054389", // Invalid check digit (should be 3)
        bookingReference: "BK-2026-VGM-8812",
        weighingMethod: "METHOD_1",
        tareWeightKg: 3800,
        scaleGrossWeightKg: 24500,
        authorizedPerson: "Alejandro Ruiz",
        weighingPartyName: "Terminal",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.message).toContain("Invalid ISO 6346 container number");
  });

  it("GET /api/dcsa/v3/vgm lists declarations by container number", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/dcsa/v3/vgm?containerNumber=${testContainerNum}`,
    });

    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].containerNumber).toBe(testContainerNum);
  });

  it("POST /api/dcsa/v3/vgm/:id/ack processes carrier VERMAS acknowledgment", async () => {
    // 1. Fetch created VGM record ID
    const listRes = await app.inject({
      method: "GET",
      url: `/api/dcsa/v3/vgm?containerNumber=${testContainerNum}`,
    });
    const vgmId = listRes.json()[0].id;

    // 2. Dispatch APERAK ACK
    const ackPayload = `UNB+UNOA:2+CARRIER+ATLAS+261123:1500+VGM-ACK-99'
UNH+1+APERAK:D:16B:UN'
BGM+VGM+VGM-REF+9'
EQD+CN+${testContainerNum}'
UNT+4+1'
UNZ+1+VGM-ACK-99'`;

    const ackRes = await app.inject({
      method: "POST",
      url: `/api/dcsa/v3/vgm/${vgmId}/ack`,
      payload: { rawPayload: ackPayload },
    });

    expect(ackRes.statusCode).toBe(200);
    const body = ackRes.json();
    expect(body.ack.status).toBe("VGM_ACCEPTED");
    expect(body.updatedRecord.ediTransmittedAt).toBeDefined();
  });

  it("POST /api/dcsa/v3/events ingests a DCSA v3.0 operational telemetry event", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dcsa/v3/events",
      payload: {
        eventType: "EQUIPMENT",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-11-23T15:30:00.000Z",
        carrierBookingReference: "BK-2026-VGM-8812",
        equipmentReference: testContainerNum,
        eventTypeCode: "GTIN",
        locationLocode: "ESBCN",
        vesselName: "MAERSK MC-KINNEY MOLLER",
      },
    });

    if (res.statusCode !== 201) {
      console.error("VGM DECLARE ERROR:", res.json());
    }

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.eventId).toMatch(/^dcsa_/);
    expect(body.eventType).toBe("EQUIPMENT");
    expect(body.eventTypeCode).toBe("GTIN");
  });
});

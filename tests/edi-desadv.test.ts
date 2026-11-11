import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import ediRoutes from "../src/routes/edi.routes.js";
import { ensureScmFoundationTables } from "../src/scm/kernel/outbox-bus.js";
import {
  EdifactDesadvService,
  DespatchAdvice,
} from "../src/services/edi/edifact-desadv.service.js";
import { EdifactIftstaService } from "../src/services/edi/edifact-iftsta.service.js";

describe("EDIFACT DESADV D96A & IFTSTA / CONTRL Gateway", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(ediRoutes, { prefix: "/api/edi" });
    await app.ready();
    await ensureScmFoundationTables();
  });

  afterAll(async () => {
    await app.close();
  });

  const sampleDesadv =
    "UNB+UNOA:2+SUPPLIER01+ATLASLOG+261111:1200+100099'UNH+1+DESADV:D:96A:UN'BGM+351+DESADV-2026-8819+9'DTM+137:202611111200:203'RFF+ON:ORD-2026-9921'RFF+BM:MSKU9284712'NAD+SE+SUPPLIER01::92+Global Industrial Parts S.L.+Poligono Prat+Barcelona++08820+ES'NAD+CN+CUSTOMER01::92+Atlas Logistics Hub+Carrer Motors 10+Barcelona++08040+ES'CPS+1'PAC+10++CT'MEA+WT+G+KGM:850'LIN+1++SENSOR-X100:IN'IMD+F++:::Industrial Telemetry Sensors'QTY+12:500:PCE'MEA+WT+G+KGM:850'PAC+10++CT'UNT+15+1'UNZ+1+100099'";

  it("should parse raw EDIFACT D96A DESADV message into typed DespatchAdvice", () => {
    const parsed = EdifactDesadvService.parse(sampleDesadv);

    expect(parsed.despatchAdviceNumber).toBe("DESADV-2026-8819");
    expect(parsed.orderReference).toBe("ORD-2026-9921");
    expect(parsed.billOfLadingReference).toBe("MSKU9284712");
    expect(parsed.consignor.name).toContain("Global Industrial Parts");
    expect(parsed.consignee.name).toContain("Atlas Logistics Hub");
    expect(parsed.items.length).toBe(1);
    expect(parsed.items[0].productId).toBe("SENSOR-X100");
    expect(parsed.items[0].description).toBe("Industrial Telemetry Sensors");
    expect(parsed.items[0].quantity).toBe(500);
    expect(parsed.items[0].unitOfMeasure).toBe("PCE");
    expect(parsed.totalGrossWeightKg).toBe(850);
  });

  it("should generate valid UN/EDIFACT D96A DESADV from typed DespatchAdvice object", () => {
    const advice: DespatchAdvice = {
      despatchAdviceNumber: "DESADV-TEST-001",
      despatchDate: "2026-11-12T10:00:00.000Z",
      orderReference: "PO-2026-4411",
      billOfLadingReference: "HBL-2026-001",
      consignor: {
        name: "Iberica Manufacturing SL",
        code: "IBER01",
        city: "Valencia",
        countryCode: "ES",
      },
      consignee: {
        name: "Nordic Imports AB",
        code: "NORDIC02",
        city: "Gothenburg",
        countryCode: "SE",
      },
      items: [
        {
          itemNumber: 1,
          productId: "MOTOR-V6-TURBO",
          description: "High Performance Electric Motors",
          quantity: 25,
          unitOfMeasure: "PCE",
          packageCount: 5,
          packageType: "CR",
          grossWeightKg: 1250,
        },
      ],
      totalPackages: 5,
      totalGrossWeightKg: 1250,
    };

    const ediOutput = EdifactDesadvService.generate(
      advice,
      "ATLASLOG",
      "NORDIC02",
    );

    expect(ediOutput).toContain("UNB+UNOA:2+ATLASLOG+NORDIC02");
    expect(ediOutput).toContain("UNH+1+DESADV:D:96A:UN'");
    expect(ediOutput).toContain("BGM+351+DESADV-TEST-001+9'");
    expect(ediOutput).toContain("RFF+ON:PO-2026-4411'");
    expect(ediOutput).toContain("NAD+SE+IBER01::92+Iberica Manufacturing SL");
    expect(ediOutput).toContain("NAD+CN+NORDIC02::92+Nordic Imports AB");
    expect(ediOutput).toContain("LIN+1++MOTOR-V6-TURBO:IN'");
    expect(ediOutput).toContain("QTY+12:25:PCE'");
    expect(ediOutput).toContain("UNZ+1+");
  });

  it("POST /api/edi/desadv/parse - should expose Fastify DESADV parser endpoint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/edi/desadv/parse",
      payload: { rawPayload: sampleDesadv },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.despatchAdviceNumber).toBe("DESADV-2026-8819");
    expect(body.data.items[0].productId).toBe("SENSOR-X100");
  });

  it("POST /api/edi/desadv/ingest - should ingest DESADV and emit outbox event", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/edi/desadv/ingest",
      payload: { rawPayload: sampleDesadv },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.outboxEventId).toBeDefined();
    expect(body.despatchAdvice.despatchAdviceNumber).toBe("DESADV-2026-8819");
  });

  it("POST /api/edi/iftsta/generate - should generate UN/EDIFACT IFTSTA status message", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/edi/iftsta/generate",
      payload: {
        statusCode: "VD",
        milestone: "VESSEL_DEPARTED",
        bookingReference: "BK-2026-67116",
        billOfLading: "MSKU9284712",
        containerNumber: "MSKU9284712",
        vesselName: "MSC OSCAR",
        voyageNumber: "2601W",
        locationCode: "ESBCN",
        locationName: "BARCELONA PORT",
        senderId: "ATLASLOG",
        receiverId: "CARRIER01",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ediText).toContain("UNH+1+IFTSTA:D:96A:UN'");
    expect(body.data.ediText).toContain("STS+1+VD'");
    expect(body.data.ediText).toContain("RFF+BN:BK-2026-67116'");
  });

  it("POST /api/edi/contrl/generate - should generate positive technical ACK CONTRL", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/edi/contrl/generate",
      payload: {
        interchangeSender: "SUPPLIER01",
        interchangeReceiver: "ATLASLOG",
        referenceControlNum: "100099",
        status: "ACCEPTED",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ediText).toContain("UNH+1+CONTRL:D:96A:UN'");
    expect(body.data.ediText).toContain("UCI+100099+SUPPLIER01+ATLASLOG+7'");
  });

  it("POST /api/edi/contrl/generate - should generate negative technical ACK CONTRL on error", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/edi/contrl/generate",
      payload: {
        interchangeSender: "SUPPLIER01",
        interchangeReceiver: "ATLASLOG",
        referenceControlNum: "100099",
        status: "REJECTED",
        errorMessage: "Mandatory segment BGM missing in transmission",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ediText).toContain("UCI+100099+SUPPLIER01+ATLASLOG+4'");
    expect(body.data.ediText).toContain("SYNTAX ERROR");
  });
});

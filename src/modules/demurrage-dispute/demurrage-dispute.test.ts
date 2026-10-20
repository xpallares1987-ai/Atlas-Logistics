import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import demurrageDisputeRoutes from "./demurrage-dispute.routes.js";
import { DEMURRAGE_DISPUTE_PRESETS } from "@atlas/shared";

describe("Demurrage Dispute Module: Fastify API Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(demurrageDisputeRoutes, { prefix: "/api/demurrage-dispute" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/demurrage-dispute/presets - should return all predefined jurisdiction scenarios", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/demurrage-dispute/presets",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);

    const usPreset = body.find((p: any) => p.id === "us_west_coast_la_lb");
    const euPreset = body.find((p: any) => p.id === "eu_rotterdam_ect");
    const esPreset = body.find((p: any) => p.id === "es_barcelona_cantunis");

    expect(usPreset).toBeDefined();
    expect(usPreset.jurisdiction).toBe("US_FMC_OSRA_2022");
    expect(euPreset).toBeDefined();
    expect(euPreset.jurisdiction).toBe("EU_PORT_STANDARD");
    expect(esPreset).toBeDefined();
    expect(esPreset.jurisdiction).toBe("ES_PUERTOS_ESTADO");
  });

  it("GET /api/demurrage-dispute/containers - should return monitored active containers with dwell telemetry", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/demurrage-dispute/containers",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const cont = body[0];
    expect(cont.containerNumber).toBeDefined();
    expect(cont.grossDwellDays).toBeDefined();
    expect(cont.netDwellDays).toBeDefined();
    expect(cont.status).toBeDefined();
  });

  it("POST /api/demurrage-dispute/audit - should audit carrier invoice against clock-pause suspensions", async () => {
    const preset = DEMURRAGE_DISPUTE_PRESETS[0]; // US West Coast FMC Defective
    const res = await app.inject({
      method: "POST",
      url: "/api/demurrage-dispute/audit",
      payload: {
        invoice: preset.invoice,
        suspensions: preset.suspensions,
        milestones: preset.milestones,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.containerNumber).toBe("MSKU9284712");
    expect(body.auditStatus).toBe("FULL_WAIVER_JUSTIFIED");
    expect(body.disputedWaiverAmount).toBe(3600);
    expect(body.fmcCompliance.isCompliant).toBe(false);
    expect(body.totalSuspendedDays).toBe(5);
  });

  it("POST /api/demurrage-dispute/audit - should reject malformed payload with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/demurrage-dispute/audit",
      payload: {
        invalidKey: 123,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("INVALID_AUDIT_REQUEST");
  });

  it("POST /api/demurrage-dispute/generate-pack - should build formal dispute dossier", async () => {
    const preset = DEMURRAGE_DISPUTE_PRESETS[2]; // ES Barcelona Can Tunis
    const auditRes = await app.inject({
      method: "POST",
      url: "/api/demurrage-dispute/audit",
      payload: {
        invoice: preset.invoice,
        suspensions: preset.suspensions,
        milestones: preset.milestones,
      },
    });
    const auditResult = JSON.parse(auditRes.body);

    const packRes = await app.inject({
      method: "POST",
      url: "/api/demurrage-dispute/generate-pack",
      payload: {
        auditResult,
        shipperOrConsignee: {
          companyName: "Customer01 Paper Book TEST01",
          contactName: "System Admin",
          email: "ops@customer01.internal",
          accountReference: "DEPT-TEST01",
        },
      },
    });

    expect(packRes.statusCode).toBe(200);
    const pack = JSON.parse(packRes.body);
    expect(pack.dossierId).toBeDefined();
    expect(pack.formalLetterSubject).toContain("FORMAL DISPUTE NOTICE");
    expect(pack.formalLetterBody).toContain("Hapag-Lloyd");
    expect(pack.formalLetterBody).toContain("Can Tunis");
    expect(pack.evidenceAttachments.length).toBeGreaterThan(0);
  });

  it("POST /api/demurrage-dispute/dispatch-email - should dispatch dispute letter and record receipt", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/demurrage-dispute/dispatch-email",
      payload: {
        dossierId: "DSP-MSKU9284712-TEST",
        recipientEmail: "claims.nam@maersk.com",
        subject: "FORMAL DISPUTE NOTICE: Demurrage Invoice #MSK-LAX-2026-90412",
        body: "Please find attached formal evidentiary dispute notice...",
      },
    });

    expect(res.statusCode).toBe(200);
    const receipt = JSON.parse(res.body);
    expect(receipt.status).toBe("SENT");
    expect(receipt.confirmationCode).toContain("CARRIER-ACK-");
    expect(receipt.recipientEmail).toBe("claims.nam@maersk.com");
  });

  it("GET /api/demurrage-dispute/history - should return dispute history records", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/demurrage-dispute/history",
    });

    expect(res.statusCode).toBe(200);
    const history = JSON.parse(res.body);
    expect(Array.isArray(history.audits)).toBe(true);
    expect(Array.isArray(history.packs)).toBe(true);
    expect(Array.isArray(history.dispatches)).toBe(true);
    expect(history.dispatches.length).toBeGreaterThan(0);
  });
});

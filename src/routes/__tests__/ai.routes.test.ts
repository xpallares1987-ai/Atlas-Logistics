import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import aiRoutes from "../ai.routes.js";

describe("Google Gemini AI On-Demand Routes (Free-Tier Multi-Model Suite)", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(aiRoutes, { prefix: "/api/ai" });
    await app.ready();
  });

  it("GET /api/ai/config-status returns per-model Free-Tier guardrails (Flash, Flash-Lite, Embedding-004)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/ai/config-status",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.defaultModel).toBe("gemini-2.5-flash");
    expect(body.liteModel).toBe("gemini-2.5-flash-lite");
    expect(body.embeddingModel).toBe("text-embedding-004");
    expect(body.mode).toBe("ON_DEMAND_FREE_TIER");
    expect(body.freeTierGuardrails.maxRpm).toBe(12);
    expect(body.freeTierGuardrails.flashLiteMaxRpm).toBe(15);
    expect(body.freeTierGuardrails.embeddingMaxRpm).toBe(100);
    expect(body.modelQuotas["gemini-2.5-flash"].rpmLimit).toBe(12);
    expect(body.modelQuotas["gemini-2.5-flash-lite"].rpmLimit).toBe(15);
    expect(body.modelQuotas["text-embedding-004"].rpmLimit).toBe(100);
  });

  it("POST /api/ai/chat returns deterministic or live response with SQLite context", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      payload: {
        message: "Resume el estado aduanero de la expedición sh_demo_01",
        context: { shipmentId: "sh_demo_01" },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reply).toBeTruthy();
    expect([
      "gemini-live",
      "gemini-cache",
      "sqlite-cache",
      "deterministic-fallback",
    ]).toContain(body.source);
    expect(typeof body.quotaRemainingRpm).toBe("number");
  });

  it("POST /api/ai/fmc-dispute-draft generates FMC 46 CFR Part 541 legal dispute draft on demand", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/fmc-dispute-draft",
      payload: {
        invoiceId: "dinv_sh_demo_01",
        shipmentId: "sh_demo_01",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.draftText).toContain("541");
    expect(body.invoiceNumber).toBeTruthy();
  });

  it("POST /api/ai/stowage-safety-audit returns structured CTU/IMDG safety audit using gemini-2.5-flash-lite", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/stowage-safety-audit",
      payload: {
        containerId: "cnt_msku_9284712",
        shipmentId: "sh_demo_01",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.model).toBe("gemini-2.5-flash-lite");
    expect(typeof body.audit.ctuCompliant).toBe("boolean");
    expect(typeof body.audit.safetyScore).toBe("number");
    expect(Array.isArray(body.audit.recommendations)).toBe(true);
  });

  it("POST /api/ai/dcsa-customs-check returns structured HS Code & EU CBAM compliance check using gemini-2.5-flash-lite", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/dcsa-customs-check",
      payload: {
        shipmentId: "sh_demo_01",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.model).toBe("gemini-2.5-flash-lite");
    expect(body.audit.suggestedHsCode).toBeTruthy();
    expect(typeof body.audit.cbamApplicable).toBe("boolean");
  });

  it("POST /api/ai/ucp600-lc-audit returns structured ICC UCP 600 documentary credit audit", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/ucp600-lc-audit",
      payload: {
        shipmentId: "sh_demo_01",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(typeof body.audit.compliantWithUcp600).toBe("boolean");
    expect(Array.isArray(body.audit.discrepanciesFound)).toBe(true);
  });

  it("POST /api/ai/extract-document extracts structured shipping fields from document payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/extract-document",
      payload: {
        rawText:
          "PACKING LIST & DRAFT BL - Booking BK-2026-67116 - Container MSKU9284712 - Gross Weight 24,180 KG - 18 Pallets",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.extracted.containerNumber).toBeTruthy();
    expect(typeof body.extracted.grossWeightKg).toBe("number");
  });

  it("POST /api/ai/executive-briefing generates 1-click Control Tower Shift Briefing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/executive-briefing",
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.briefing.shiftHeadline).toBeTruthy();
    expect(Array.isArray(body.briefing.topPriorities)).toBe(true);
  });

  it("POST /api/ai/semantic-protocol-search ranks protocols using text-embedding-004 pool", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ai/semantic-protocol-search",
      payload: {
        query: "inspección física aduana CBP demora contenedor",
        topK: 3,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.model).toBe("text-embedding-004");
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0].id).toBe("proto-fmc-541");
  });
});

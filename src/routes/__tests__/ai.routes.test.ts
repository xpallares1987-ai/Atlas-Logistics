import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import aiRoutes from "../ai.routes.js";

describe("Google Gemini AI On-Demand Routes (Free-Tier Protected)", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(aiRoutes, { prefix: "/api/ai" });
    await app.ready();
  });

  it("GET /api/ai/config-status returns Free-Tier guardrails and quota metrics", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/ai/config-status",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.defaultModel).toBe("gemini-2.5-flash");
    expect(body.liteModel).toBe("gemini-2.5-flash-lite");
    expect(body.mode).toBe("ON_DEMAND_FREE_TIER");
    expect(body.freeTierGuardrails.maxRpm).toBe(12);
    expect(body.freeTierGuardrails.maxRpd).toBe(1400);
    expect(body.quota.rpmLimit).toBe(12);
  });

  it("POST /api/ai/chat returns deterministic response with live SQLite context when key is missing or on-demand", async () => {
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
    expect(["gemini-live", "gemini-cache", "deterministic-fallback"]).toContain(
      body.source,
    );
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
});

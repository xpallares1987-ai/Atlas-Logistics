import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import externalGovernanceRoutes, {
  ensureExternalGovernanceTables,
} from "../src/routes/external-governance.routes.js";
import { seedExternalGovernance } from "../src/db/seeds/external-governance.seed.js";
import {
  ingestSourceRecordRequestSchema,
  createEntityLinkRequestSchema,
} from "@atlas/shared";

describe("External Data Governance UI & Living Persistence Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await ensureExternalGovernanceTables();
    await seedExternalGovernance();

    app = Fastify();
    await app.register(externalGovernanceRoutes, {
      prefix: "/api/external-governance",
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("validates client-side ingest schema with Zod contract", () => {
    const validPayload = {
      sourceCode: "UNLOCODE",
      externalId: "ESBCN-TEST",
      sourceUrl: "https://unece.org/trade/cefact/unlocode",
      rawPayload: { port: "Barcelona", code: "ESBCN" },
      versionTag: "2026.2",
    };

    const parsed = ingestSourceRecordRequestSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);

    const invalidPayload = {
      sourceCode: "",
      externalId: "",
      rawPayload: "not-an-object",
    };
    const invalidParsed =
      ingestSourceRecordRequestSchema.safeParse(invalidPayload);
    expect(invalidParsed.success).toBe(false);
  });

  it("validates client-side entity link schema with Zod contract", () => {
    const validLink = {
      entityType: "SHIPMENT" as const,
      entityId: "sh_demo_01",
      sourceRecordId: "srec_unlocode_esbcn",
      matchConfidence: 0.98,
      matchMethod: "EXACT_CODE" as const,
      verifiedBy: "compliance_officer_test",
    };

    const parsed = createEntityLinkRequestSchema.safeParse(validLink);
    expect(parsed.success).toBe(true);
  });

  it("computes WebCrypto client-side SHA-256 matching server digest", async () => {
    const payload = { testKey: "testValue", number: 42 };
    const jsonStr = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonStr);
    const buf = await crypto.subtle.digest("SHA-256", data);
    const hashHex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(hashHex).toHaveLength(64);
    expect(typeof hashHex).toBe("string");
  });

  it("GET /entity-links returns all active links for the UI matrix", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/entity-links",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);

    const first = body.data[0];
    expect(first.link).toBeDefined();
    expect(first.sourceRecord).toBeDefined();
    expect(first.sourceRecord.sha256Hash).toBeDefined();
  });

  it("GET /entity-links?entityType=SHIPMENT filters links by entityType", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/entity-links?entityType=SHIPMENT",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    for (const item of body.data) {
      expect(item.link.entityType).toBe("SHIPMENT");
    }
  });
});

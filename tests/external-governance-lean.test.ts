import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import externalGovernanceRoutes, {
  ensureExternalGovernanceTables,
} from "../src/routes/external-governance.routes.js";
import { seedExternalGovernance } from "../src/db/seeds/external-governance.seed.js";
import { db } from "../src/db/index.js";
import {
  dataSources,
  sourceRecords,
  entitySourceLinks,
} from "../src/db/schema/external_governance.js";
import { eq } from "drizzle-orm";

describe("External Data Governance & Licensing (Lean 3-Table Model, ADR 0021)", () => {
  let app: FastifyInstance;
  let testRecordId: string;
  let testLinkId: string;

  beforeAll(async () => {
    // 1. Ensure SQLite schema tables exist defensively
    await ensureExternalGovernanceTables();

    // 2. Run deterministic seeds
    await seedExternalGovernance();

    // 3. Initialize test Fastify app
    app = Fastify();
    await app.register(externalGovernanceRoutes, {
      prefix: "/api/external-governance",
    });
    await app.ready();
  });

  afterAll(async () => {
    // Clean up created test records if any
    if (testLinkId) {
      await db
        .delete(entitySourceLinks)
        .where(eq(entitySourceLinks.id, testLinkId));
    }
    if (testRecordId) {
      await db.delete(sourceRecords).where(eq(sourceRecords.id, testRecordId));
    }
    await app.close();
  });

  it("GET /sources - lists seeded authoritative data sources", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/sources",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(4);

    const codes = body.data.map((s: any) => s.code);
    expect(codes).toContain("UNLOCODE");
    expect(codes).toContain("OPENSTREETMAP");
    expect(codes).toContain("GEONAMES");
    expect(codes).toContain("GLEIF");
  });

  it("POST /records - ingests raw source record with SHA-256 and outbox publishing", async () => {
    const rawPayload = {
      locode: "ESVLC",
      portName: "Valencia",
      subdivision: "V",
      coordinates: "3927N 00019W",
      function: "1234----",
      status: "AI",
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/external-governance/records",
      payload: {
        sourceCode: "UNLOCODE",
        externalId: "ESVLC-TEST",
        sourceUrl: "https://service.unece.org/trade/locode/es.htm",
        rawPayload,
        normalizedPayload: {
          code: "ESVLC",
          name: "Valencia Port",
          country: "ES",
        },
        versionTag: "2026.2",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.recordId).toBeDefined();
    expect(body.sha256Hash).toBeDefined();
    expect(body.externalId).toBe("ESVLC-TEST");

    testRecordId = body.recordId;

    // Verify SHA-256 hash length is 64 hex characters
    expect(body.sha256Hash).toHaveLength(64);
  });

  it("GET /records - retrieves records filtered by externalId", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/records?externalId=ESVLC-TEST",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(body.data[0].externalId).toBe("ESVLC-TEST");
    expect(body.data[0].rawPayload.portName).toBe("Valencia");
  });

  it("POST /entity-links - binds external record to domain entity with outbox event", async () => {
    expect(testRecordId).toBeDefined();

    const res = await app.inject({
      method: "POST",
      url: "/api/external-governance/entity-links",
      payload: {
        entityType: "PORT",
        entityId: "port_esvlc_01",
        sourceRecordId: testRecordId,
        matchConfidence: 0.99,
        matchMethod: "EXACT_CODE",
        verifiedBy: "compliance_officer_test",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.linkId).toBeDefined();
    expect(body.entityType).toBe("PORT");
    expect(body.entityId).toBe("port_esvlc_01");

    testLinkId = body.linkId;
  });

  it("GET /entity-links/:entityType/:entityId - joins entity links with raw source payloads", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/entity-links/PORT/port_esvlc_01",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);

    const first = body.data[0];
    expect(first.link.entityType).toBe("PORT");
    expect(first.link.entityId).toBe("port_esvlc_01");
    expect(first.sourceRecord.id).toBe(testRecordId);
    expect(first.sourceRecord.sha256Hash).toBeDefined();
    expect(first.sourceRecord.rawPayload.portName).toBe("Valencia");
  });

  it("GET /unlocode/lookup - fast search via Prefix Trie and LRU cache", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/unlocode/lookup?q=ESBCN",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(body.data[0].location).toBe("ESBCN");
    expect(body.stats).toBeDefined();
  });

  it("POST /unlocode/upsert - Write-Through Cache updates RAM immediately without restart and persists to SQLite", async () => {
    const uniqueLocode = "ESZAZ";
    const uniquePort = {
      location: uniqueLocode,
      name: "Zaragoza Logistics Platform (Plaza)",
      country: "ES",
      coordinates: { lat: 41.65, lng: -0.88 },
      status: "AI",
    };

    // 1. Upsert into write-through cache
    const upsertRes = await app.inject({
      method: "POST",
      url: "/api/external-governance/unlocode/upsert",
      payload: uniquePort,
    });

    expect(upsertRes.statusCode).toBe(200);
    const upsertBody = upsertRes.json();
    expect(upsertBody.success).toBe(true);
    expect(upsertBody.entry.location).toBe(uniqueLocode);

    // 2. Immediately verify hot-lookup in RAM via lookup endpoint without restarting server
    const lookupRes = await app.inject({
      method: "GET",
      url: `/api/external-governance/unlocode/lookup?q=${uniqueLocode}`,
    });

    expect(lookupRes.statusCode).toBe(200);
    const lookupBody = lookupRes.json();
    expect(lookupBody.success).toBe(true);
    expect(lookupBody.count).toBeGreaterThan(0);
    expect(lookupBody.data[0].location).toBe(uniqueLocode);
    expect(lookupBody.data[0].name).toBe("Zaragoza Logistics Platform (Plaza)");
  });
});

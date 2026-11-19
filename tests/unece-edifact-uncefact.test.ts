/**
 * @file unece-edifact-uncefact.test.ts
 * @description Integration tests for the official UN/EDIFACT message directory (~212 codes),
 * UN/CEFACT XML Schemas registry, and live SQLite-backed CII & MMT-RDM XML generators.
 * @module @atlas/tests/unece-edifact-uncefact
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import ediRoutes from "../src/routes/edi.routes.js";
import { seedUneceEdifactAndXmlCatalogs } from "../src/db/seeds/unece-edifact-uncefact.seed.js";

describe("UN/EDIFACT Directory & UN/CEFACT XML Standards", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await seedUneceEdifactAndXmlCatalogs();
    app = Fastify();
    await app.register(ediRoutes, { prefix: "/api/edi" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("exposes all 212 strictly unique 6-char official UN/EDIFACT codes with normalized ASCII tokens", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/edi/edifact-catalog",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(212);

    const codes: string[] = body.data.map((r: any) => r.code);
    expect(new Set(codes).size).toBe(212);
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z]{6}$/);
    }

    // Verify all 7 normalized official UN/EDIFACT ASCII codes + CONTRL
    for (const expected of [
      "JAPRES",
      "ORDERS",
      "PRPAID",
      "QUOTES",
      "RECORD",
      "RELIST",
      "UTILTS",
      "CONTRL",
      "CODECO",
      "COPARN",
      "IFTMIN",
      "IFTSTA",
      "CUSDEC",
      "INVOIC",
    ]) {
      expect(codes).toContain(expected);
    }
  });

  it("filters UN/EDIFACT catalog by domain, logistics core flag, and 25-code entity type", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/edi/edifact-catalog?domain=MARITIME_CONTAINER&entityType=SPT&q=CODECO",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.data[0].code).toBe("CODECO");
    expect(body.data[0].typicalSenderTypes).toContain("SPT");
  });

  it("exposes all 10 official UN/CEFACT XML Schemas with EDIFACT crosswalks", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/edi/uncefact-catalog",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(10);
    const cii = body.data.find((s: any) => s.code === "CII");
    expect(cii).toBeDefined();
    expect(cii.supportsLiveGenerator).toBe(true);
    expect(cii.edifactEquivalents).toContain("INVOIC");
  });

  it("generates standards-compliant UN/CEFACT Cross Industry Invoice (CII D23B) XML from live SQLite records", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/edi/uncefact/generate/cii",
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.schemaCode).toBe("CII");
    expect(body.data.xml).toContain("<rsm:CrossIndustryInvoice");
    expect(body.data.xml).toContain(
      "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
    );
    expect(body.data.xml).toContain("<ram:SellerTradeParty>");
    expect(body.data.xml).not.toMatch(/Atlas\s+(Logistics|Global)/i);
  });

  it("generates standards-compliant UN/CEFACT MMT-RDM Consignment XML for sh_demo_01", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/edi/uncefact/generate/mmt-rdm",
      payload: { shipmentId: "sh_demo_01" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.schemaCode).toBe("MMT_CONSIGNMENT");
    expect(body.data.xml).toContain("<rsm:SupplyChainConsignment");
    expect(body.data.xml).toContain("<ram:RoleCode>MCC</ram:RoleCode>");
    expect(body.data.xml).toContain("<ram:RoleCode>FFC</ram:RoleCode>");
    expect(body.data.xml).toContain("<ram:RoleCode>OCA</ram:RoleCode>");
    expect(body.data.xml).toContain("<ram:TypeCode>POL</ram:TypeCode>");
    expect(body.data.xml).toContain("<ram:TypeCode>POD</ram:TypeCode>");
  });
});

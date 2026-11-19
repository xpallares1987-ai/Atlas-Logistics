/**
 * @file unlocode-2022-2-catalog.test.ts
 * @description Integration tests verifying the official UNECE UN/LOCODE 2022-2 catalog
 * (~115,841 locations, 249 countries/territories) in SQLite and Fastify lookup endpoints.
 * @module @atlas/tests/unlocode-2022-2-catalog
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import externalGovernanceRoutes from "../src/routes/external-governance.routes.js";
import addressesRoutes from "../src/routes/addresses.routes.js";
import { db } from "../src/db/index.js";
import { unlocodeLocations } from "../src/db/schema/unlocode.js";
import { sql } from "drizzle-orm";

describe("Official UNECE UN/LOCODE 2022-2 Full Catalog & API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(externalGovernanceRoutes, {
      prefix: "/api/external-governance",
    });
    await app.register(addressesRoutes, { prefix: "/api/addresses" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("contains over 115,000 official UNECE 2022-2 locations in SQLite", async () => {
    const res = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(unlocodeLocations);
    const count = Number(res[0]?.cnt ?? 0);
    expect(count).toBeGreaterThanOrEqual(115000);
  });

  it("queries global and regional UNECE 2022-2 locations via /api/external-governance/unlocode/lookup", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/unlocode/lookup?q=ADALV",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.source).toBe("sqlite_unlocode_2022_2");
    expect(body.stats.totalEntries).toBeGreaterThanOrEqual(115000);
    expect(body.data.some((x: any) => x.location === "ADALV")).toBe(true);
  });

  it("supports country and transport mode filtering (port/rail/airport)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/unlocode/lookup?country=ES&mode=port&q=BCN",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    const bcn = body.data.find((x: any) => x.location === "ESBCN");
    expect(bcn).toBeDefined();
    expect(bcn.isPort).toBe(true);
  });

  it("exposes ISO 3166-1 country and territory summaries via /api/external-governance/unlocode/countries", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/external-governance/unlocode/countries",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.totalCountries).toBeGreaterThanOrEqual(240);
    expect(body.totalLocations).toBeGreaterThanOrEqual(115000);
    const spain = body.countries.find((c: any) => c.code === "ES");
    expect(spain).toBeDefined();
    expect(spain.name).toContain("Spain");
    expect(spain.portsCount).toBeGreaterThan(50);
  });
});

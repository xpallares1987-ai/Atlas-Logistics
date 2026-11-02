import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../src/app.js";
import jwt from "jsonwebtoken";
import {
  normalizeAliasKey,
  resolvePort,
  previewRates,
} from "../src/services/rate-ingestion.service.js";

// Use test-specific secrets for tests (guaranteed to be >= 32 chars)
const TEST_JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.TEST_JWT_SECRET ||
  "atlas-logistics-jwt-secret-key-super-secure";

describe("Rate Ingestion Engine — Unit & Integration Tests", () => {
  let authHeader: { authorization: string };

  beforeAll(async () => {
    await app.ready();
    const token = jwt.sign(
      {
        id: "admin_user_id",
        email: "admin@atlas.com",
        role: "ADMIN",
        name: "Admin User",
      },
      TEST_JWT_SECRET,
      { expiresIn: "1h" },
    );
    authHeader = { authorization: `Bearer ${token}` };
  });

  afterAll(async () => {
    await app.close();
  });

  describe("UN/LOCODE & Port Normalization Unit Tests", () => {
    it("normalizeAliasKey should normalize whitespace, punctuation and case", () => {
      expect(normalizeAliasKey("  Barcelona / Spain  ")).toBe("BARCELONASPAIN");
      expect(normalizeAliasKey("shanghai-port")).toBe("SHANGHAIPORT");
      expect(normalizeAliasKey("ESVLC")).toBe("ESVLC");
    });

    it("resolvePort should resolve seeded ports immediately", async () => {
      const resBcn = await resolvePort("Barcelona");
      expect(resBcn.resolved).toBe(true);
      expect(resBcn.locode).toBe("ESBCN");

      const resSha = await resolvePort("SHANGHAI");
      expect(resSha.resolved).toBe(true);
      expect(resSha.locode).toBe("CNSHA");

      const resRtm = await resolvePort("RTM");
      expect(resRtm.resolved).toBe(true);
      expect(resRtm.locode).toBe("NLRTM");
    });

    it("resolvePort should mark unrecognized port as ambiguous", async () => {
      const resUnknown = await resolvePort("Puerto Desconocido Ficticio 99");
      expect(resUnknown.resolved).toBe(false);
      expect(resUnknown.locode).toBeUndefined();
    });
  });

  describe("Rate Preview Parsing Unit Tests", () => {
    it("previewRates should parse raw rows and classify new vs ambiguous", async () => {
      const rawRows = [
        {
          origin: "Shanghai",
          destination: "Rotterdam",
          carrier: "Maersk",
          containerType: "40HC",
          oceanFreight: 2200,
          baf: 300,
          pss: 150,
          thc: 180,
          transitDays: 28,
        },
        {
          origin: "Puerto Desconocido ABC",
          destination: "Barcelona",
          carrier: "MSC",
          containerType: "20GP",
          oceanFreight: 1400,
          baf: 200,
          pss: 0,
          thc: 120,
        },
      ];

      const preview = await previewRates(rawRows, "Maersk");
      expect(preview.totalRows).toBe(2);
      expect(preview.previewRows.length).toBe(2);
      expect(preview.previewRows[0].originLocode).toBe("CNSHA");
      expect(preview.previewRows[0].destinationLocode).toBe("NLRTM");
      expect(
        preview.ambiguousPorts.some(
          (p) => p.original === "Puerto Desconocido ABC",
        ),
      ).toBe(true);
    });
  });

  describe("Fastify Rate Ingestion Endpoints Integration Tests", () => {
    it("GET /api/rates/unlocode-lookup should resolve known query", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rates/unlocode-lookup?q=Valencia",
        headers: authHeader,
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.resolved).toBe(true);
      expect(data.locode).toBe("ESVLC");
    });

    it("POST /api/rates/preview should return valid preview structure", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/rates/preview",
        headers: authHeader,
        payload: {
          rows: [
            {
              pol: "CNSHA",
              pod: "ESBCN",
              carrier: "CMA CGM",
              containerType: "40HC",
              oceanFreight: 2450,
              baf: 350,
              thc: 190,
            },
          ],
          defaultCarrier: "CMA CGM",
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.totalRows).toBe(1);
      expect(data.previewRows[0].originLocode).toBe("CNSHA");
      expect(data.previewRows[0].destinationLocode).toBe("ESBCN");
      expect(data.previewRows[0].baseOceanFreight).toBe(2450);
    });

    it("POST /api/rates/bulk-import should commit rates, store aliases and record batch audit", async () => {
      const testAlias = `PUERTO_TEST_${Date.now()}`;
      const res = await app.inject({
        method: "POST",
        url: "/api/rates/bulk-import",
        headers: authHeader,
        payload: {
          fileName: "test-rates-q4.csv",
          rates: [
            {
              rowNumber: 1,
              originRaw: testAlias,
              destinationRaw: "Rotterdam",
              originLocode: "ESBCN",
              destinationLocode: "NLRTM",
              carrier: "Maersk",
              containerType: "40HC",
              baseOceanFreight: 2600,
              baf: 320,
              pss: 100,
              thc: 195,
              currency: "USD",
              serviceLine: "Direct Express",
              transitDays: 26,
              validFrom: "2026-10-01",
              validTo: "2026-12-31",
              extraSurcharges: [
                {
                  name: "ETS_CARBON",
                  amount: 45,
                  currency: "EUR",
                  calcBasis: "PER_CONTAINER",
                },
              ],
            },
          ],
          newAliases: [{ alias: testAlias, locationId: "ESBCN" }],
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.batchId).toBeDefined();
      expect(data.totalRows).toBe(1);
      expect(data.insertedCount + data.updatedCount).toBe(1);

      // Verify alias learning works on subsequent lookup
      const lookup = await app.inject({
        method: "GET",
        url: `/api/rates/unlocode-lookup?q=${testAlias}`,
        headers: authHeader,
      });
      const lookupData = JSON.parse(lookup.payload);
      expect(lookupData.resolved).toBe(true);
      expect(lookupData.locode).toBe("ESBCN");
    });

    it("GET /api/rates/import-batches should return audit batches history", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rates/import-batches?limit=5",
        headers: authHeader,
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].id).toBeDefined();
      expect(data[0].fileName).toBeDefined();
      expect(data[0].status).toBeDefined();
    });
  });
});

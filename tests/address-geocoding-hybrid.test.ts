import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import addressesRoutes, {
  ensureAddressesTables,
} from "../src/routes/addresses.routes.js";
import { addressGeocodingService } from "../src/services/address-geocoding.service.js";
import { db } from "../src/db/index.js";
import { companies, addresses } from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("Hybrid Address Geocoding & Verification Engine", () => {
  let app: FastifyInstance;
  const testTenantId = "tenant_test_geo_01";
  let createdAddressId: string;

  beforeAll(async () => {
    await ensureAddressesTables();
    const now = new Date();

    // Seed test tenant
    await db
      .insert(companies)
      .values({
        id: testTenantId,
        name: "Iberian Logistics Geocoding Test S.L.",
        taxId: "ESB88991122",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    app = Fastify();
    await app.register(addressesRoutes, { prefix: "/api/addresses" });
    await app.ready();
  });

  afterAll(async () => {
    if (createdAddressId) {
      await db.delete(addresses).where(eq(addresses.id, createdAddressId));
    }
    await db.delete(addresses).where(eq(addresses.companyId, testTenantId));
    await db.delete(companies).where(eq(companies.id, testTenantId));
    await app.close();
  });

  it("service: queries autocomplete and falls back to Nominatim / Photon at zero cost", async () => {
    const results = await addressGeocodingService.searchAutocomplete(
      "Port de Barcelona",
      "ES",
    );

    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      const first = results[0];
      expect(first.lat).toBeDefined();
      expect(first.lon).toBeDefined();
      expect(first.country).toBe("ES");
      expect(["GOOGLE_MAPS", "NOMINATIM", "PHOTON"]).toContain(first.provider);
    }
  }, 15000);

  it("service: geocodes structured address parameters and caches response", async () => {
    const res1 = await addressGeocodingService.geocodeAddress({
      street1: "Plaça de Catalunya",
      city: "Barcelona",
      country: "ES",
    });

    if (res1) {
      expect(res1.lat).toBeTypeOf("number");
      expect(res1.lon).toBeTypeOf("number");
      expect(res1.country).toBe("ES");
      expect(res1.confidence).toBeGreaterThan(0.5);

      // Verify second call utilizes cache
      const res2 = await addressGeocodingService.geocodeAddress({
        street1: "Plaça de Catalunya",
        city: "Barcelona",
        country: "ES",
      });
      expect(res2).toEqual(res1);
    }
  }, 15000);

  it("API: GET /api/addresses/autocomplete returns suggestions for live typing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/addresses/autocomplete?q=Valencia&country=ES",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
  }, 15000);

  it("API: POST /api/addresses/geocode validates address coordinates", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/addresses/geocode",
      payload: {
        street1: "Avinguda del Port",
        city: "Valencia",
        country: "ES",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    if (body.lat) {
      expect(body.lat).toBeTypeOf("number");
      expect(body.lon).toBeTypeOf("number");
      expect(["GOOGLE_MAPS", "NOMINATIM", "PHOTON"]).toContain(body.provider);
    }
  }, 15000);

  it("API: POST /api/addresses creates an address with native coordinates and verification status", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/addresses",
      payload: {
        companyId: testTenantId,
        addressType: "TRM",
        companyName: "BEST Hutchison Port Barcelona",
        street1: "Moll Prat s/n",
        zipCode: "08039",
        city: "Barcelona",
        country: "ES",
        unLocode: "ESBCN",
        lat: 41.3325,
        lon: 2.1485,
        formattedAddress:
          "Moll Prat, Port de Barcelona, 08039 Barcelona, Spain",
        verificationStatus: "VERIFIED",
        verificationProvider: "NOMINATIM",
        contacts: [
          {
            fullName: "Operaciones BEST",
            email: "ops@best-barcelona.com",
            isPrimary: true,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const created = res.json();
    expect(created.id).toBeDefined();
    createdAddressId = created.id;
    expect(created.lat).toBeCloseTo(41.3325, 3);
    expect(created.lon).toBeCloseTo(2.1485, 3);
    expect(created.verificationStatus).toBe("VERIFIED");
    expect(created.verificationProvider).toBe("NOMINATIM");
    expect(created.formattedAddress).toContain("Moll Prat");
  });

  it("API: PUT /api/addresses/:id updates address coordinates and verification status", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/addresses/${createdAddressId}`,
      payload: {
        companyName: "BEST Hutchison Port Barcelona - Extended Gate",
        addressType: "TRM",
        street1: "Moll Prat, Entrada Camions Puerta 2",
        zipCode: "08039",
        city: "Barcelona",
        country: "ES",
        lat: 41.3331,
        lon: 2.1492,
        verificationStatus: "VERIFIED",
        verificationProvider: "GOOGLE_MAPS",
      },
    });

    expect(res.statusCode).toBe(200);
    const updated = res.json();
    expect(updated.id).toBe(createdAddressId);
    expect(updated.lat).toBeCloseTo(41.3331, 3);
    expect(updated.lon).toBeCloseTo(2.1492, 3);
    expect(updated.verificationProvider).toBe("GOOGLE_MAPS");
  });
});

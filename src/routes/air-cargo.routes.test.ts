import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock auth middleware for integration tests
vi.mock("../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

import app from "../app.js";

describe("Air Cargo & e-AWB Routes Integration Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/air-cargo/awb should return all Airway Bills with consolidation tree", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/air-cargo/awb",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0]).toHaveProperty("awbNumber");
    expect(json[0]).toHaveProperty("originAirport");
    expect(json[0]).toHaveProperty("destinationAirport");
  });

  it("POST /api/air-cargo/calculate-rating should compute volumetric weight and itemized surcharges", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/air-cargo/calculate-rating",
      payload: {
        originAirport: "MAD",
        destinationAirport: "JFK",
        pieces: [{ lengthCm: 120, widthCm: 80, heightCm: 100, quantity: 2 }],
        actualGrossWeightKg: 250,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.volumetricWeightKg).toBe(320);
    expect(json.chargeableWeightKg).toBe(320);
    expect(json.isVolumetricHigher).toBe(true);
    expect(json.freightCharge).toBeGreaterThan(0);
    expect(json.otherCharges.length).toBeGreaterThan(0);
    expect(json.totalFreightPayable).toBe(
      json.freightCharge + json.totalOtherCharges,
    );
  });

  it("POST /api/air-cargo/screen-dgr should identify dangerous goods and restrictions", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/air-cargo/screen-dgr",
      payload: {
        natureOfGoods: "Lithium ion batteries for solar power storage",
        unNumber: "UN3480",
        grossWeightKg: 75,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.isDgr).toBe(true);
    expect(json.aircraftRestriction).toBe("CARGO_AIRCRAFT_ONLY");
    expect(json.specialHandlingCodes).toContain("ELI");
    expect(json.specialHandlingCodes).toContain("CAO");
    expect(json.requiredDocuments).toContain(
      "DGD (Shipper's Declaration for Dangerous Goods)",
    );
  });

  it("GET /api/air-cargo/airports should return IATA airport catalog", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/air-cargo/airports?q=MAD",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(Array.isArray(json)).toBe(true);
    expect(json.some((a: any) => a.code === "MAD")).toBe(true);
  });

  it("GET /api/air-cargo/dgr-registry should search UN dangerous goods catalog", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/air-cargo/dgr-registry?q=3480",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(Array.isArray(json)).toBe(true);
    expect(json.some((d: any) => d.unNumber === "UN3480")).toBe(true);
  });

  it("GET /api/air-cargo/awb/:id/pdf should stream printable IATA AWB PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/air-cargo/awb",
    });
    const list = JSON.parse(listRes.payload);
    const targetAwb = list[0];

    const response = await app.inject({
      method: "GET",
      url: `/api/air-cargo/awb/${targetAwb.id}/pdf`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/air-cargo/awb/:id/cargo-xml should stream IATA Cargo-XML message", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/air-cargo/awb",
    });
    const list = JSON.parse(listRes.payload);
    const targetAwb = list[0];

    const response = await app.inject({
      method: "GET",
      url: `/api/air-cargo/awb/${targetAwb.id}/cargo-xml`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/xml");
    expect(response.payload).toContain("<?xml");
    expect(response.payload).toContain("iata:XFWB");
  });
});

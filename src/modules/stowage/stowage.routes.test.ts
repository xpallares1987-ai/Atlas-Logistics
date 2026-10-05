import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock auth middleware for integration tests
vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

import app from "../../app.js";

describe("Stowage 3D & Axle Weight Routes Integration Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/stowage/equipment should return the full equipment catalog", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/stowage/equipment",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.equipment).toHaveProperty("20ft_dry");
    expect(json.equipment).toHaveProperty("40ft_hc");
    expect(json.equipment).toHaveProperty("megatrailer_136");
    expect(json.equipment["40ft_hc"].internalLengthM).toBe(12.03);
  });

  it("GET /api/stowage/presets should return available stowage demo presets", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/stowage/presets",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.presets).toHaveProperty("balanced_40hc");
    expect(json.presets).toHaveProperty("heavy_axle_warning");
  });

  it("POST /api/stowage/optimize should calculate 3D packing, CoG, and axle weights", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/stowage/optimize",
      payload: {
        containerType: "40ft_hc",
        items: [
          {
            id: "genset-1",
            name: "Industrial Generator",
            lengthM: 2.0,
            widthM: 1.2,
            heightM: 1.4,
            weightKg: 2500,
            stackable: false,
          },
          {
            id: "pallets-1",
            name: "Automotive Parts",
            lengthM: 1.2,
            widthM: 1.0,
            heightM: 1.2,
            weightKg: 900,
            stackable: true,
          },
        ],
        options: {
          centerPayload: true,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.packedItems.length).toBe(2);
    expect(json.data.centerOfGravity).toHaveProperty("stabilityScore");
    expect(json.data.axleDistribution).toHaveProperty("grossCombinedWeightKg");
    expect(json.data.imoSegregation).toHaveProperty("hasIncompatibleHazard");
  });

  it("POST /api/stowage/axle-distribution should evaluate road axle loads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/stowage/axle-distribution",
      payload: {
        containerType: "40ft_dry",
        items: [
          {
            id: "c1",
            name: "Cargo Block",
            lengthM: 6.0,
            widthM: 2.2,
            heightM: 1.5,
            weightKg: 16000,
            stackable: true,
            placed: true,
            x: 0.1,
            y: 3.0,
            z: 0,
            rotated: false,
            effectiveWidthM: 2.2,
            effectiveLengthM: 6.0,
            effectiveHeightM: 1.5,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.axleDistribution.isLegal).toBe(true);
    expect(json.data.centerOfGravity.stabilityScore).toBeGreaterThan(60);
  });

  it("POST /api/operations/containers/demo-cont-1/optimize-load should return Three.js coordinates and metrics", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/operations/containers/demo-cont-1/optimize-load",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items.length).toBeGreaterThan(0);
    expect(json).toHaveProperty("metrics");
    expect(json).toHaveProperty("suggestion");
  });
});

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

vi.mock("oslo/password", () => ({
  Argon2id: vi.fn().mockImplementation(() => ({
    hash: vi.fn(async () => "mocked-hash"),
    verify: vi.fn(async () => true),
  })),
}));

import app from "../../app.js";

describe("Container Stowage Relational Endpoints", () => {
  beforeAll(async () => {
    await app.ready();
    await app.inject({
      method: "POST",
      url: "/api/admin/seed/5",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/stowage/plan should return stowage plan and items for cnt_msku_9284712", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/stowage/plan?containerId=cnt_msku_9284712",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe("stow_cnt_msku_9284712");
    expect(body.containerId).toBe("cnt_msku_9284712");
    expect(body.totalCargoWeightKg).toBeGreaterThan(0);
    expect(body.stabilityCertified).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("POST /api/stowage/calculate-stability should update CoG and certify stability in SQLite", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/stowage/calculate-stability",
      headers: { "Content-Type": "application/json" },
      payload: {
        containerId: "cnt_msku_9284712",
        certifiedBy: "Chief Mate Roberts (Safety Officer)",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.plan.stabilityCertified).toBe(true);
    expect(body.plan.certifiedBy).toBe("Chief Mate Roberts (Safety Officer)");
  });
});

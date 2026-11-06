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

describe("Ocean Booking Relational Endpoints", () => {
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

  it("GET /api/ocean-booking/details should return DCSA details linked to bk_demo_01", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/ocean-booking/details?bookingId=bk_demo_01",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe("bkg_sh_demo_01");
    expect(body.carrierScac).toBe("MSCU");
    expect(body.siStatus).toBeDefined();
    expect(body.cargoCutOff).toBeDefined();
  });

  it("POST /api/ocean-booking/:id/shipping-instructions should confirm SI and record VGM", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ocean-booking/bkg_sh_demo_01/shipping-instructions",
      headers: { "Content-Type": "application/json" },
      payload: {
        vgmKg: 28450,
        sealNumber: "ISO-17712-H-881920",
        certifiedBy: "Atlas Weighing Station ESVLC-01",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.details.siStatus).toBe("CONFIRMED");
  });

  it("POST /api/ocean-booking/:id/generate-draft-bl should issue draft bill of lading", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/ocean-booking/bkg_sh_demo_01/generate-draft-bl",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.details.draftBlStatus).toBe("ISSUED");
  });
});

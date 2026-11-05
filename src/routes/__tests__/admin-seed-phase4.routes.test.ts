import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../../app.js";

describe("Admin Seed Phase 4 API", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/admin/seed/4 should successfully seed phase 4 records linked to sh_demo_01", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/seed/4",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.phase).toBe("4");
  });
});

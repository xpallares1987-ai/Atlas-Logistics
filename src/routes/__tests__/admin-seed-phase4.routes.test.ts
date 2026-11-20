import { describe, it, expect, beforeAll, afterAll } from "vitest";
import jwt from "jsonwebtoken";
import app from "../../app.js";
import { getJWTConfig } from "../../config/jwt.js";

describe("Admin Seed Phase 4 API", () => {
  let adminAuth: string;

  beforeAll(async () => {
    await app.ready();
    const token = jwt.sign(
      {
        id: "admin_user_id",
        email: "admin@atlas.com",
        role: "ADMIN",
        companyId: "c-1",
      },
      getJWTConfig().secret,
      { expiresIn: "1h" },
    );
    adminAuth = `Bearer ${token}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/admin/seed/4 should successfully seed phase 4 records linked to sh_demo_01", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/seed/4",
      headers: {
        "Content-Type": "application/json",
        authorization: adminAuth,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.phase).toBe("4");
  });
});

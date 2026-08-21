import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";

describe("Health & Monitoring Routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/health should return ok status with db & system diagnostics", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(body.timestamp).toBeDefined();
    expect(body.db).toBeDefined();
    expect(body.system).toBeDefined();
    expect(body.system.memory).toBeDefined();
    expect(typeof body.system.eventLoopDelayMs).toBe("number");
  });

  it("GET /metrics should return Prometheus formatted metrics", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/metrics",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.payload).toContain("http_request");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { db } from "../../db/index.js";

// Mock auth middleware for unit tests
vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

// Mock the database
vi.mock("../../db/index.js", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi
      .fn()
      .mockResolvedValue([{ id: "test-id", referenceNumber: "REF-123" }]),
  },
}));

describe("Shipments Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get all shipments", async () => {
    (db as any).from.mockResolvedValue([{ id: "1", status: "PENDING" }]);

    await app.ready();
    const response = await request(app.server).get("/api/shipments");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "1", status: "PENDING" }]);
  });

  it("should create a new shipment", async () => {
    const payload = {
      referenceNumber: "SHP-001",
      status: "DRAFT",
    };

    await app.ready();
    const response = await request(app.server)
      .post("/api/shipments")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.referenceNumber).toBe("REF-123");
  });
});

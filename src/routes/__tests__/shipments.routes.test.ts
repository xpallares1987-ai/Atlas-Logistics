// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { db } from "../../db/db.config.js";

// Mock the database
vi.mock("../../db/db.config.js", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "test-id", referenceNumber: "REF-123" }]),
  },
}));

describe("Shipments Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get all shipments", async () => {
    (db.from as any).mockResolvedValue([{ id: "1", status: "PENDING" }]);

    const response = await request(app).get("/api/shipments");
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "1", status: "PENDING" }]);
  });

  it("should create a new shipment", async () => {
    const payload = {
      referenceNumber: "SHP-001",
      originLocationId: "LOC-A",
      destinationLocationId: "LOC-B",
      status: "PENDING",
      transportMode: "OCEAN",
    };

    const response = await request(app).post("/api/shipments").send(payload);
    
    expect(response.status).toBe(200);
    expect(response.body.referenceNumber).toBe("REF-123");
  });
});

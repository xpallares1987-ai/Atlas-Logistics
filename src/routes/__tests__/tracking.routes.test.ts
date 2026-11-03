import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { db } from "../../db/index.js";

// Mock auth middleware
vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

// Mock database
vi.mock("../../db/index.js", () => ({
  client: {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
  },
}));

describe("Public Tracking Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 for unknown shipment reference", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await app.ready();
    const response = await request(app.server).get(
      "/api/tracking/UNKNOWN-REF-999",
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("Shipment not found");
  });

  it("should return tracking details and milestones for valid shipment", async () => {
    const mockShipment = {
      id: "shp-test-123",
      trackingNumber: "ATLS-2026-99999",
      status: "IN_TRANSIT",
      origin: "CNSHA (Shanghai)",
      destination: "ESBCN (Barcelona)",
      vesselName: "MAERSK MC-KINNEY MOLLER",
      voyageNumber: "2610W",
      createdAt: new Date("2026-10-25T10:00:00Z"),
    };

    let callCount = 0;
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First query: shipment lookup with .limit(1)
            return {
              limit: vi.fn().mockResolvedValue([mockShipment]),
            };
          }
          // Second query: shipmentEventLogs without .limit()
          return Promise.resolve([]);
        }),
      })),
    }));

    await app.ready();
    const response = await request(app.server).get(
      "/api/tracking/ATLS-2026-99999",
    );

    expect(response.status).toBe(200);
    expect(response.body.referenceNumber).toBe("ATLS-2026-99999");
    expect(response.body.status).toBe("IN_TRANSIT");
    expect(response.body.origin).toBe("CNSHA (Shanghai)");
    expect(response.body.destination).toBe("ESBCN (Barcelona)");
    expect(response.body.events.length).toBeGreaterThan(0);
  });
});

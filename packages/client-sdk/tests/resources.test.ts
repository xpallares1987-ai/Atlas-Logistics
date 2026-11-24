/**
 * @file resources.test.ts
 * @description Unit tests for domain resource endpoints across Shipments, Bookings, Financial, Customs, Warehouse, Telemetry.
 * @module @atlas/client-sdk/tests/resources
 */

import { describe, it, expect, vi } from "vitest";
import { createAtlasClient } from "../src/client.js";

describe("AtlasClient Domain Resources", () => {
  it("should dispatch shipments.list with correct query params", async () => {
    const mockData = {
      items: [
        {
          id: "shp-1",
          trackingNumber: "TRK-100",
          status: "BOOKED",
          mode: "OCEAN",
          originUnlocode: "DEHAM",
          destinationUnlocode: "ESBCN",
          shipperName: "Shipper A",
          consigneeName: "Consignee B",
          totalPieces: 10,
          totalWeightKg: 1000,
          totalVolumeCbm: 15,
          createdAt: "2026-11-24T00:00:00Z",
          updatedAt: "2026-11-24T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.test",
      fetch: mockFetch,
    });
    const response = await client.shipments.list({
      page: 1,
      limit: 20,
      search: "TRK",
    });

    expect(response.total).toBe(1);
    expect(response.items[0].trackingNumber).toBe("TRK-100");
    expect(mockFetch.mock.calls[0][0]).toContain(
      "/shipments?page=1&limit=20&search=TRK",
    );
  });

  it("should dispatch shipments.updateStatus with PATCH method", async () => {
    const mockDetail = {
      id: "shp-1",
      trackingNumber: "TRK-100",
      status: "IN_TRANSIT",
      containerNumbers: ["MSKU1234567"],
      milestones: [],
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.test",
      fetch: mockFetch,
    });
    const result = await client.shipments.updateStatus("shp-1", {
      status: "IN_TRANSIT",
      remarks: "Vessel departed",
    });

    expect(result.status).toBe("IN_TRANSIT");
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("https://api.test/shipments/shp-1/status");
    expect(calledInit.method).toBe("PATCH");
    expect(JSON.parse(calledInit.body)).toEqual({
      status: "IN_TRANSIT",
      remarks: "Vessel departed",
    });
  });

  it("should dispatch bookings.allocateContainer with POST method", async () => {
    const mockBooking = {
      id: "bkg-1",
      bookingReference: "BKG-2026-001",
      status: "CONTAINER_ALLOCATED",
      containerAllocations: [
        { containerNumber: "MSKU9999991", isoType: "40HC" },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockBooking), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.test",
      fetch: mockFetch,
    });
    const result = await client.bookings.allocateContainer("bkg-1", {
      containerNumber: "MSKU9999991",
      isoType: "40HC",
    });

    expect(result.status).toBe("CONTAINER_ALLOCATED");
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("https://api.test/bookings/bkg-1/containers");
    expect(calledInit.method).toBe("POST");
  });

  it("should dispatch customs.estimateDuties with POST payload", async () => {
    const mockDutyResult = {
      hsCode: "8504.40.90",
      generalDutyRatePercent: 2.5,
      estimatedDutyAmount: 1250,
      vatRatePercent: 21,
      estimatedVatAmount: 10762.5,
      totalCustomsPayable: 12012.5,
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockDutyResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.test",
      fetch: mockFetch,
    });
    const result = await client.customs.estimateDuties({
      hsCode: "8504.40.90",
      originCountryCode: "CN",
      destinationCountryCode: "ES",
      customsValue: 50000,
      currency: "EUR",
    });

    expect(result.totalCustomsPayable).toBe(12012.5);
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://api.test/customs/duties/estimate",
    );
  });

  it("should dispatch telemetry.checkHealth with skipAuth set", async () => {
    const mockHealth = {
      status: "HEALTHY",
      uptimeSeconds: 3600,
      version: "1.0.0",
      databaseConnected: true,
      timestamp: "2026-11-24T00:00:00Z",
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockHealth), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.test",
      token: "secret-token",
      fetch: mockFetch,
    });

    const result = await client.telemetry.checkHealth();
    expect(result.status).toBe("HEALTHY");

    const [, calledInit] = mockFetch.mock.calls[0];
    // skipAuth should prevent injecting Authorization header
    expect(calledInit.headers["Authorization"]).toBeUndefined();
  });
});

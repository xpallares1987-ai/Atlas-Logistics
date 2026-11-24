/**
 * @file client.test.ts
 * @description Unit tests for AtlasClient core networking, authentication, and error handling.
 * @module @atlas/client-sdk/tests/client
 */

import { describe, it, expect, vi } from "vitest";
import { AtlasClient, createAtlasClient } from "../src/client.js";
import { AtlasApiError } from "../src/errors/atlas-api.error.js";

describe("AtlasClient Core", () => {
  it("should initialize with default base URL when not provided", () => {
    const client = new AtlasClient();
    expect(client).toBeDefined();
    expect(client.shipments).toBeDefined();
    expect(client.bookings).toBeDefined();
    expect(client.financial).toBeDefined();
    expect(client.customs).toBeDefined();
    expect(client.warehouse).toBeDefined();
    expect(client.telemetry).toBeDefined();
  });

  it("should inject static token and station headers into requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { test: 123 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.example.com",
      token: "test-secret-token",
      stationContext: "FRA",
      tenantId: "tenant-42",
      fetch: mockFetch,
    });

    const result = await client.request<{
      success: boolean;
      data: { test: number };
    }>("GET", "/test");

    expect(result.data.test).toBe(123);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("https://api.example.com/test");
    expect(calledInit.headers["Authorization"]).toBe(
      "Bearer test-secret-token",
    );
    expect(calledInit.headers["X-Station-Context"]).toBe("FRA");
    expect(calledInit.headers["X-Tenant-Id"]).toBe("tenant-42");
    expect(calledInit.headers["Accept"]).toBe("application/json");
  });

  it("should evaluate dynamic token provider on each request", async () => {
    let currentToken = "token-initial";
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.example.com",
      token: () => Promise.resolve(currentToken),
      fetch: mockFetch,
    });

    await client.request("GET", "/dynamic-1");
    expect(mockFetch.mock.calls[0][1].headers["Authorization"]).toBe(
      "Bearer token-initial",
    );

    currentToken = "token-rotated";
    await client.request("GET", "/dynamic-2");
    expect(mockFetch.mock.calls[1][1].headers["Authorization"]).toBe(
      "Bearer token-rotated",
    );
  });

  it("should serialize query parameters properly", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.example.com/api",
      fetch: mockFetch,
    });

    await client.request("GET", "/items", undefined, {
      query: { page: 2, limit: 10, search: "cargo test", filter: undefined },
    });

    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=10");
    expect(calledUrl).toContain("search=cargo+test");
    expect(calledUrl).not.toContain("filter");
  });

  it("should throw AtlasApiError on 404 response", async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            message: "Shipment not found",
            code: "SHIPMENT_NOT_FOUND",
          }),
          {
            status: 404,
            statusText: "Not Found",
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.example.com",
      fetch: mockFetch,
    });

    await expect(client.request("GET", "/shipments/SHP-999")).rejects.toThrow(
      AtlasApiError,
    );

    try {
      await client.request("GET", "/shipments/SHP-999");
    } catch (err) {
      expect(err instanceof AtlasApiError).toBe(true);
      const apiErr = err as AtlasApiError;
      expect(apiErr.statusCode).toBe(404);
      expect(apiErr.code).toBe("SHIPMENT_NOT_FOUND");
      expect(apiErr.message).toBe("Shipment not found");
      expect(apiErr.hasStatus(404)).toBe(true);
      expect(apiErr.isAuthError()).toBe(false);
      expect(apiErr.isRetryable()).toBe(false);
    }
  });

  it("should handle 204 No Content responses gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
        statusText: "No Content",
      }),
    );

    const client = createAtlasClient({
      baseUrl: "https://api.example.com",
      fetch: mockFetch,
    });

    const result = await client.request<void>("DELETE", "/shipments/SHP-123");
    expect(result).toBeUndefined();
  });

  it("should retry on transient 503 and succeed when subsequent attempt passes", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Service Unavailable" }), {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "recovered" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const client = createAtlasClient({
      baseUrl: "https://api.example.com",
      maxRetries: 2,
      fetch: mockFetch,
    });

    const result = await client.request<{ status: string }>("GET", "/flaky");
    expect(result.status).toBe("recovered");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

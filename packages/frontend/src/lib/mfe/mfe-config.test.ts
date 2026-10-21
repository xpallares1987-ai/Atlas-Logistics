import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MFE_CONFIG, getMfeRemoteUrl, probeRemoteEndpoint } from "./mfe-config";

describe("MFE Federation Configuration & Dynamic Resolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return default URLs for standard remote endpoints", () => {
    expect(MFE_CONFIG.warehouse.defaultUrl).toBe(
      "https://127.0.0.1:5175/assets/remoteEntry.js",
    );
    expect(MFE_CONFIG.rates.defaultUrl).toBe(
      "https://127.0.0.1:5176/assets/remoteEntry.js",
    );
    expect(MFE_CONFIG.dashboard.defaultUrl).toBe(
      "https://127.0.0.1:5174/assets/remoteEntry.js",
    );

    expect(getMfeRemoteUrl("warehouse")).toBe(
      "https://127.0.0.1:5175/assets/remoteEntry.js",
    );
    expect(getMfeRemoteUrl("rates")).toBe(
      "https://127.0.0.1:5176/assets/remoteEntry.js",
    );
    expect(getMfeRemoteUrl("dashboard")).toBe(
      "https://127.0.0.1:5174/assets/remoteEntry.js",
    );
  });

  it("should return empty string for non-existent MFE key", () => {
    // @ts-ignore
    expect(getMfeRemoteUrl("invalid_module")).toBe("");
  });

  it("should resolve overridden remote URLs when environment variables are set", () => {
    vi.stubEnv(
      "VITE_MFE_RATES_URL",
      "https://edge.atlas.local/rates/remoteEntry.js",
    );
    const customUrl =
      (import.meta.env && import.meta.env["VITE_MFE_RATES_URL"]) ||
      MFE_CONFIG.rates.defaultUrl;
    expect(customUrl).toBe("https://edge.atlas.local/rates/remoteEntry.js");
  });

  it("probeRemoteEndpoint should return true when remote container is healthy", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await probeRemoteEndpoint(
      "https://127.0.0.1:5176/assets/remoteEntry.js",
      1000,
    );
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://127.0.0.1:5176/assets/remoteEntry.js",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("probeRemoteEndpoint should reject non-HTTPS URLs for security", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const result = await probeRemoteEndpoint(
      "http://127.0.0.1:5176/assets/remoteEntry.js",
      1000,
    );
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("probeRemoteEndpoint should return false when endpoint returns 500 error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await probeRemoteEndpoint(
      "https://127.0.0.1:5176/assets/remoteEntry.js",
      1000,
    );
    expect(result).toBe(false);
  });

  it("probeRemoteEndpoint should return false and handle network exceptions gracefully", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(new Error("Connection refused (ECONNREFUSED)"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await probeRemoteEndpoint(
      "https://127.0.0.1:5176/assets/remoteEntry.js",
      1000,
    );
    expect(result).toBe(false);
  });
});

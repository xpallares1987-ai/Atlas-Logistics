/**
 * @file useApiQuery.test.ts
 * @description Unit tests for API URL normalization and defensive endpoint resolution.
 * @module @atlas/frontend/hooks/__tests__
 * @see {@link docs/adr/0024-github-pages-spa-continuous-deployment.md}
 */

import { describe, it, expect } from "vitest";
import { resolveApiUrl } from "./useApiQuery";

describe("resolveApiUrl (ADR 0024)", () => {
  it("resolves relative path with /api prefix when base URL is empty", () => {
    expect(resolveApiUrl("/shipments", "")).toBe("/api/shipments");
    expect(resolveApiUrl("shipments", "")).toBe("/api/shipments");
    expect(resolveApiUrl("/api/bookings", "")).toBe("/api/bookings");
  });

  it("appends /api and path when base URL does not have /api suffix", () => {
    const base = "https://atlas-backend.europe-west1.run.app";
    expect(resolveApiUrl("/shipments", base)).toBe(
      "https://atlas-backend.europe-west1.run.app/api/shipments",
    );
    expect(resolveApiUrl("shipments", base)).toBe(
      "https://atlas-backend.europe-west1.run.app/api/shipments",
    );
  });

  it("prevents double /api when base URL already ends with /api", () => {
    const base = "https://atlas-backend.europe-west1.run.app/api";
    expect(resolveApiUrl("/shipments", base)).toBe(
      "https://atlas-backend.europe-west1.run.app/api/shipments",
    );
    expect(resolveApiUrl("/api/shipments", base)).toBe(
      "https://atlas-backend.europe-west1.run.app/api/shipments",
    );
  });

  it("handles trailing slashes on base URL defensively", () => {
    const baseWithSlash = "https://atlas-backend.europe-west1.run.app/api/";
    expect(resolveApiUrl("/shipments", baseWithSlash)).toBe(
      "https://atlas-backend.europe-west1.run.app/api/shipments",
    );

    const baseWithoutApiSlash = "https://atlas-backend.europe-west1.run.app/";
    expect(resolveApiUrl("/shipments", baseWithoutApiSlash)).toBe(
      "https://atlas-backend.europe-west1.run.app/api/shipments",
    );
  });

  it("resolves auth endpoints cleanly without path duplication", () => {
    const base = "https://atlas-backend.europe-west1.run.app/api";
    expect(resolveApiUrl("/api/auth/login", base)).toBe(
      "https://atlas-backend.europe-west1.run.app/api/auth/login",
    );
    expect(resolveApiUrl("/api/auth/me", base)).toBe(
      "https://atlas-backend.europe-west1.run.app/api/auth/me",
    );
  });

  it("never double-prefixes already-absolute http(s) URLs", () => {
    const base = "http://localhost:3001";
    expect(resolveApiUrl("http://localhost:3001/api/health", base)).toBe(
      "http://localhost:3001/api/health",
    );
    expect(
      resolveApiUrl(
        "https://atlas-backend.europe-west1.run.app/api/health",
        base,
      ),
    ).toBe("https://atlas-backend.europe-west1.run.app/api/health");
  });
});

import { describe, it, expect } from "vitest";
import { resolveWebSocketUrl } from "./useAppWebSocket";

describe("resolveWebSocketUrl", () => {
  it("should preserve absolute ws:// and wss:// URLs directly", () => {
    expect(resolveWebSocketUrl("ws://broker.atlas.io/live")).toBe(
      "ws://broker.atlas.io/live",
    );
    expect(resolveWebSocketUrl("wss://broker.atlas.io/live")).toBe(
      "wss://broker.atlas.io/live",
    );
  });

  it("should convert http VITE_API_URL to ws", () => {
    const url = resolveWebSocketUrl(
      "/api/dashboard/live",
      "http://api.atlas.local:3001",
    );
    expect(url).toBe("ws://api.atlas.local:3001/api/dashboard/live");
  });

  it("should convert https VITE_API_URL to wss", () => {
    const url = resolveWebSocketUrl(
      "/api/dashboard/live",
      "https://api.atlas.local:3001",
    );
    expect(url).toBe("wss://api.atlas.local:3001/api/dashboard/live");
  });

  it("should fallback to windowLocation when apiUrl is not defined", () => {
    const url = resolveWebSocketUrl("/ws/notifications", undefined, {
      protocol: "https:",
      host: "atlas.corp.internal",
    });
    expect(url).toBe("wss://atlas.corp.internal/ws/notifications");
  });

  it("should normalize path without leading slash", () => {
    const url = resolveWebSocketUrl("ws/notifications", undefined, {
      protocol: "http:",
      host: "localhost:3100",
    });
    expect(url).toBe("ws://localhost:3100/ws/notifications");
  });
});

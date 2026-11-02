/**
 * @file mfe-config.ts
 * @description Dynamic Micro-Frontend URL resolution and probing with timeout resilience.
 */

export const MFE_CONFIG = {
  warehouse: {
    name: "warehouse",
    defaultUrl: "https://127.0.0.1:5175/assets/remoteEntry.js",
    envKey: "VITE_MFE_WAREHOUSE_URL",
  },
  rates: {
    name: "rates",
    defaultUrl: "https://127.0.0.1:5176/assets/remoteEntry.js",
    envKey: "VITE_MFE_RATES_URL",
  },
  dashboard: {
    name: "dashboard",
    defaultUrl: "https://127.0.0.1:5174/assets/remoteEntry.js",
    envKey: "VITE_MFE_DASHBOARD_URL",
  },
};

export function getMfeRemoteUrl(mfeKey: keyof typeof MFE_CONFIG): string {
  const item = MFE_CONFIG[mfeKey];
  if (!item) return "";
  return (import.meta.env && import.meta.env[item.envKey]) || item.defaultUrl;
}

// Cache probe results to prevent spamming unreachable local endpoints
const probeCache = new Map<string, { reachable: boolean; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Checks if a remoteEntry endpoint is reachable within the specified timeout.
 * Strictly requires HTTPS to prevent insecure script loading (CWE-829).
 */
export async function probeRemoteEndpoint(
  url: string,
  timeoutMs: number = 2000,
): Promise<boolean> {
  if (!url || typeof url !== "string" || !url.startsWith("https://")) {
    return false;
  }

  // If local loopback and standalone dev servers are not explicitly enabled, skip network probe
  const isLocalLoopback =
    url.includes("127.0.0.1") || url.includes("localhost");
  const isStandaloneEnabled =
    (import.meta as any).env?.VITE_ENABLE_MFE_STANDALONE === "true";
  const isTest =
    (import.meta as any).env?.MODE === "test" ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test");
  if (isLocalLoopback && !isStandaloneEnabled && !isTest) {
    return false;
  }

  if (!isTest) {
    const cached = probeCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.reachable;
    }
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      probeCache.set(url, { reachable: false, timestamp: Date.now() });
      return false;
    }
  } catch {
    probeCache.set(url, { reachable: false, timestamp: Date.now() });
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const isReachable = response.ok || response.status === 200;
    probeCache.set(url, { reachable: isReachable, timestamp: Date.now() });
    return isReachable;
  } catch {
    clearTimeout(timeoutId);
    probeCache.set(url, { reachable: false, timestamp: Date.now() });
    return false;
  }
}

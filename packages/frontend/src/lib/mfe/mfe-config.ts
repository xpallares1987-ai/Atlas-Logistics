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

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return false;
    }
  } catch {
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
    return response.ok || response.status === 200;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

import {
  encryptPayloadEnvelope,
  decryptPayloadEnvelope,
  isEncryptedEnvelope,
} from "@atlas/shared";

export function getAuthHeaders(
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const token =
    (typeof window !== "undefined" &&
      (localStorage.getItem("atlas_token") || localStorage.getItem("token"))) ||
    "";

  const stationContext =
    (typeof window !== "undefined" &&
      localStorage.getItem("atlas_station_context")) ||
    "ALL";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(stationContext && stationContext !== "ALL"
      ? { "X-Station-Context": stationContext }
      : {}),
    ...extraHeaders,
  };
}

// Configurable global flag for automatic transaction envelope encryption
export const TRANSACTION_ENCRYPTION_ENABLED = true;

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const customHeaders = (options.headers as Record<string, string>) || {};
  const headers = getAuthHeaders(customHeaders);

  let body = options.body;

  // Automated Request Payload Encryption
  if (
    TRANSACTION_ENCRYPTION_ENABLED &&
    body !== undefined &&
    typeof body === "string" &&
    headers["Content-Type"]?.includes("application/json")
  ) {
    try {
      const parsed = JSON.parse(body);
      if (!isEncryptedEnvelope(parsed)) {
        const envelope = await encryptPayloadEnvelope(parsed);
        body = JSON.stringify(envelope);
        headers["X-Atlas-Encrypted-Payload"] = "true";
      }
    } catch {
      // Body is not JSON, proceed as-is
    }
  } else if (
    TRANSACTION_ENCRYPTION_ENABLED &&
    (options.method === "GET" || !options.method)
  ) {
    // Request server to encrypt sensitive response payload
    headers["X-Atlas-Encrypted-Payload"] = "true";
  }

  // If no body is provided and caller didn't explicitly request Content-Type, strip it
  if (body === undefined && !customHeaders["Content-Type"]) {
    delete headers["Content-Type"];
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  // Intercept 403 Forbidden with active station context and notify application
  if (
    response.status === 403 &&
    typeof window !== "undefined" &&
    headers["X-Station-Context"]
  ) {
    window.dispatchEvent(
      new CustomEvent("atlas-station-forbidden", {
        detail: {
          url,
          stationCode: headers["X-Station-Context"],
          status: 403,
        },
      }),
    );
  }

  // Intercept and automatically decrypt response.json() if an encrypted envelope was received
  const originalJson = response.json.bind(response);
  response.json = async () => {
    const rawData = await originalJson();
    if (isEncryptedEnvelope(rawData)) {
      return await decryptPayloadEnvelope(rawData);
    }
    return rawData;
  };

  return response;
}

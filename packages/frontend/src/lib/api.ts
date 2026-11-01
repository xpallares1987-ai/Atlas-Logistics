export function getAuthHeaders(
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const token =
    (typeof window !== "undefined" &&
      (localStorage.getItem("atlas_token") || localStorage.getItem("token"))) ||
    "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = getAuthHeaders(
    (options.headers as Record<string, string>) || {},
  );
  return fetch(url, {
    ...options,
    headers,
  });
}

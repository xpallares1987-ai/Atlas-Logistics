/**
 * @file useApiQuery.ts
 * @description React Query hooks for standardized API fetching and URL path normalization.
 * @module @atlas/frontend/hooks/useApiQuery
 * @see {@link docs/adr/0024-github-pages-spa-continuous-deployment.md}
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

// ============================================================================
// 1. URL NORMALIZATION & RESOLUTION
// ============================================================================

/**
 * Normalizes API endpoint paths and prepends the backend base URL.
 * Guarantees that the '/api' prefix appears exactly once regardless of whether
 * customBaseUrl or VITE_API_URL includes or omits it.
 */
export function resolveApiUrl(path: string, customBaseUrl?: string): string {
  const rawBase = (
    customBaseUrl !== undefined
      ? customBaseUrl
      : import.meta.env.VITE_API_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // If no base URL configured, route relatively to /api
  if (!rawBase) {
    return cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
  }

  // If base ends with /api, remove it so we can re-attach cleanly
  const baseWithoutApi = rawBase.endsWith("/api")
    ? rawBase.slice(0, -4)
    : rawBase;

  const pathWithApi = cleanPath.startsWith("/api")
    ? cleanPath
    : `/api${cleanPath}`;

  return `${baseWithoutApi}${pathWithApi}`;
}

// ============================================================================
// 2. FETCH WRAPPER
// ============================================================================

/**
 * Performs a JSON API request against the configured backend base URL.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("atlas_token") || localStorage.getItem("token")
      : null;

  const targetUrl = resolveApiUrl(path);

  const res = await fetch(targetUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${""}${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }
  return res.json();
}

// ============================================================================
// 3. REACT QUERY HOOKS
// ============================================================================

export function useApiQuery<T>(
  key: readonly unknown[],
  path: string,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  const isEnabled =
    Boolean(path && path.trim().length > 0) && options?.enabled !== false;
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: () => apiFetch<T>(path),
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: true,
    ...options,
    enabled: isEnabled,
  });
}

/**
 * Creates a mutation hook for JSON endpoints with a shared fetch wrapper.
 */
export function useApiMutation<TData, TVariables>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">,
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) =>
      apiFetch<TData>(path, {
        method,
        body: JSON.stringify(variables),
      }),
    ...options,
  });
}

export { useQueryClient };

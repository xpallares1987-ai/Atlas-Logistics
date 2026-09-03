import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

export { useQueryClient };

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * Performs a JSON API request against the configured backend base URL.
 */
async function apiRequest(path: string, options?: RequestInit) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("atlas_token") || localStorage.getItem("token")
      : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }
  return res;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiRequest(path, options);
  return res.json();
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  const res = await apiRequest(path);
  return res.blob();
}

export interface PaginatedApiResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

async function paginatedApiFetch<T>(
  path: string,
): Promise<PaginatedApiResult<T>> {
  const res = await apiRequest(path);
  const items = (await res.json()) as T[];
  return {
    items,
    total: Number(res.headers.get("x-total-count") ?? items.length),
    page: Number(res.headers.get("x-page") ?? 1),
    pageSize: Number(res.headers.get("x-page-size") ?? items.length),
  };
}

export function useApiQuery<T>(
  key: readonly unknown[],
  path: string,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: () => apiFetch<T>(path),
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function usePaginatedApiQuery<T>(
  key: readonly unknown[],
  path: string,
  options?: Omit<
    UseQueryOptions<PaginatedApiResult<T>, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<PaginatedApiResult<T>, Error>({
    queryKey: key,
    queryFn: () => paginatedApiFetch<T>(path),
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: true,
    ...options,
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

/**
 * Invalidate one or more query key prefixes.
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return (...keys: (readonly unknown[])[]) =>
    Promise.all(
      keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

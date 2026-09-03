import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export type PaginatedApiResponse<T> = {
  data: T;
  totalCount: number;
  page: number;
  pageSize: number;
};

/**
 * Performs a JSON API request against the configured backend base URL.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("atlas_token") || localStorage.getItem("token")
      : null;

  const res = await fetch(`${BASE_URL}${path}`, {
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

async function apiFetchPaginated<T>(
  path: string,
  options?: RequestInit,
): Promise<PaginatedApiResponse<T>> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("atlas_token") || localStorage.getItem("token")
      : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `******""}${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }
  return {
    data: await res.json(),
    totalCount: Number(res.headers.get("x-total-count") ?? 0),
    page: Number(res.headers.get("x-page") ?? 1),
    pageSize: Number(res.headers.get("x-page-size") ?? 50),
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

export function useApiAllPagesQuery<T>(
  key: readonly unknown[],
  path: string,
  options?: Omit<UseQueryOptions<T[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<T[], Error>({
    queryKey: key,
    queryFn: async () => {
      const firstPage = await apiFetchPaginated<T[]>(path);
      const totalPages = Math.max(
        1,
        Math.ceil(firstPage.totalCount / Math.max(firstPage.pageSize, 1)),
      );
      if (totalPages === 1) {
        return firstPage.data;
      }

      const allItems = [...firstPage.data];
      for (let page = 2; page <= totalPages; page += 1) {
        const separator = path.includes("?") ? "&" : "?";
        const nextPage = await apiFetchPaginated<T[]>(
          `${path}${separator}page=${page}&pageSize=${firstPage.pageSize}`,
        );
        allItems.push(...nextPage.data);
      }
      return allItems;
    },
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

export { useQueryClient };

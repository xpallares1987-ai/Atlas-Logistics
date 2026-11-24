/**
 * @file client.types.ts
 * @description Core client configuration and request/response type definitions for @atlas/client-sdk.
 * @module @atlas/client-sdk/types/client
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

// ============================================================================
// 1. CONFIGURATION CONTRACTS
// ============================================================================

export type TokenProvider =
  string | (() => string | null | Promise<string | null>);
export type HeaderProvider =
  string | (() => string | null | Promise<string | null>);

export interface AtlasClientConfig {
  /**
   * Root API base URL (e.g. "https://api.atlas-logistics.io/api" or "/api").
   * Defaults to "/api" in browser and "http://127.0.0.1:3001/api" in Node.js.
   */
  readonly baseUrl?: string;

  /**
   * Bearer authentication token or dynamic provider function.
   */
  readonly token?: TokenProvider;

  /**
   * Station context code (e.g. "FRA", "MAD", "HAM", "ALL").
   */
  readonly stationContext?: HeaderProvider;

  /**
   * Optional multi-tenant organizational partition ID.
   */
  readonly tenantId?: HeaderProvider;

  /**
   * Additional immutable custom headers injected in every request.
   */
  readonly defaultHeaders?: Record<string, string>;

  /**
   * Request timeout in milliseconds (default: 15000 ms).
   */
  readonly timeoutMs?: number;

  /**
   * Maximum retry attempts on 502/503/504 or network errors (default: 2).
   */
  readonly maxRetries?: number;

  /**
   * Whether to encrypt sensitive payloads using Atlas transaction envelope crypto.
   * Default: false (pure client SDK opt-in).
   */
  readonly encryptionEnabled?: boolean;

  /**
   * Injectable custom fetch implementation (useful for tests or specific Node runtime versions).
   */
  readonly fetch?: typeof fetch;
}

// ============================================================================
// 2. HTTP REQUEST CONTRACTS
// ============================================================================

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export interface RequestOptions {
  readonly headers?: Record<string, string>;
  readonly query?: Record<string, string | number | boolean | undefined | null>;
  readonly timeoutMs?: number;
  readonly skipAuth?: boolean;
  readonly signal?: AbortSignal;
}

// ============================================================================
// 3. PAGINATION & STANDARD RESPONSE CONTRACTS
// ============================================================================

export interface PaginationParams {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly sortBy?: string;
  readonly sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface ApiSuccessResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
  readonly timestamp?: string;
}

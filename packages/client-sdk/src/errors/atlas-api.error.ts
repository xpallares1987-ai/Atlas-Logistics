/**
 * @file atlas-api.error.ts
 * @description Standardized HTTP API error representation for @atlas/client-sdk.
 * @module @atlas/client-sdk/errors
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

export interface AtlasApiErrorData {
  readonly message: string;
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestUrl?: string;
  readonly responseHeaders?: Headers;
}

export class AtlasApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly requestUrl?: string;
  public readonly responseHeaders?: Headers;

  public constructor(data: AtlasApiErrorData) {
    super(data.message);
    this.name = "AtlasApiError";
    this.statusCode = data.statusCode;
    this.code = data.code ?? `HTTP_${data.statusCode}`;
    this.details = data.details;
    this.requestUrl = data.requestUrl;
    this.responseHeaders = data.responseHeaders;

    // Maintains proper stack trace for where error was instantiated
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AtlasApiError);
    }
  }

  /**
   * Helper checking whether an error is a specific HTTP status.
   */
  public hasStatus(status: number): boolean {
    return this.statusCode === status;
  }

  /**
   * Returns true if error represents an authorization or authentication barrier.
   */
  public isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /**
   * Returns true if the request can safely be retried (e.g. transient 5xx or rate limit).
   */
  public isRetryable(): boolean {
    return (
      this.statusCode === 429 ||
      this.statusCode === 502 ||
      this.statusCode === 503 ||
      this.statusCode === 504
    );
  }
}

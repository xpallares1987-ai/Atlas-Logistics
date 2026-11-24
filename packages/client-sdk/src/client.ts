/**
 * @file client.ts
 * @description Authoritative HTTP client implementation for Atlas-Logistics API operations.
 * @module @atlas/client-sdk/client
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

import {
  encryptPayloadEnvelope,
  decryptPayloadEnvelope,
  isEncryptedEnvelope,
} from "@atlas/shared";

import { AtlasApiError } from "./errors/atlas-api.error.js";
import type { IHttpClient } from "./resources/base.resource.js";
import { ShipmentsResource } from "./resources/shipments.resource.js";
import { BookingsResource } from "./resources/bookings.resource.js";
import { FinancialResource } from "./resources/financial.resource.js";
import { CustomsResource } from "./resources/customs.resource.js";
import { WarehouseResource } from "./resources/warehouse.resource.js";
import { TelemetryResource } from "./resources/telemetry.resource.js";
import type {
  AtlasClientConfig,
  HttpMethod,
  RequestOptions,
} from "./types/client.types.js";

// ============================================================================
// 1. ATLAS CLIENT IMPLEMENTATION
// ============================================================================

export class AtlasClient implements IHttpClient {
  private readonly baseUrl: string;
  private readonly config: AtlasClientConfig;
  private readonly fetchImpl: typeof fetch;

  public readonly shipments: ShipmentsResource;
  public readonly bookings: BookingsResource;
  public readonly financial: FinancialResource;
  public readonly customs: CustomsResource;
  public readonly warehouse: WarehouseResource;
  public readonly telemetry: TelemetryResource;

  public constructor(config: AtlasClientConfig = {}) {
    this.config = config;
    let rawBase =
      config.baseUrl ??
      (typeof window !== "undefined" ? "/api" : "http://127.0.0.1:3001/api");
    while (rawBase.endsWith("/")) {
      rawBase = rawBase.slice(0, -1);
    }
    this.baseUrl = rawBase;
    this.fetchImpl = config.fetch ?? fetch;

    // Instantiate resources
    this.shipments = new ShipmentsResource(this);
    this.bookings = new BookingsResource(this);
    this.financial = new FinancialResource(this);
    this.customs = new CustomsResource(this);
    this.warehouse = new WarehouseResource(this);
    this.telemetry = new TelemetryResource(this);
  }

  /**
   * Dispatches an HTTP request with automatic header injection, retry, and envelope handling.
   */
  public async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers = await this.resolveHeaders(options);

    let serializedBody: string | undefined = undefined;

    if (body !== undefined && method !== "GET" && method !== "HEAD") {
      if (typeof body === "string") {
        serializedBody = body;
      } else {
        headers["Content-Type"] = "application/json";
        if (
          this.config.encryptionEnabled &&
          typeof body === "object" &&
          body !== null
        ) {
          try {
            if (!isEncryptedEnvelope(body as Record<string, unknown>)) {
              const envelope = await encryptPayloadEnvelope(
                body as Record<string, unknown>,
              );
              serializedBody = JSON.stringify(envelope);
              headers["X-Atlas-Encrypted-Payload"] = "true";
            } else {
              serializedBody = JSON.stringify(body);
            }
          } catch {
            serializedBody = JSON.stringify(body);
          }
        } else {
          serializedBody = JSON.stringify(body);
        }
      }
    }

    const maxRetries = this.config.maxRetries ?? 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutMs = options.timeoutMs ?? this.config.timeoutMs ?? 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Chain external signal if provided
      if (options.signal) {
        options.signal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers,
          body: serializedBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorPayload: unknown;
          let errorMessage = `HTTP ${response.status} ${response.statusText}`;
          let errorCode: string | undefined = undefined;

          try {
            const rawError = await response.json();
            errorPayload = rawError;
            if (rawError && typeof rawError === "object") {
              const errObj = rawError as Record<string, unknown>;
              errorMessage =
                (typeof errObj.message === "string" && errObj.message) ||
                (typeof errObj.error === "string" && errObj.error) ||
                errorMessage;
              errorCode =
                typeof errObj.code === "string" ? errObj.code : undefined;
            }
          } catch {
            // Non-JSON error body fallback
            try {
              const text = await response.text();
              if (text) errorMessage = text;
            } catch {
              // Ignore text decoding errors
            }
          }

          const apiError = new AtlasApiError({
            message: errorMessage,
            statusCode: response.status,
            code: errorCode,
            details: errorPayload,
            requestUrl: url,
            responseHeaders: response.headers,
          });

          // Check if retryable
          if (attempt < maxRetries && apiError.isRetryable()) {
            attempt++;
            const backoffMs = Math.min(
              1000 * Math.pow(2, attempt) + Math.random() * 200,
              5000,
            );
            await new Promise((res) => setTimeout(res, backoffMs));
            continue;
          }

          throw apiError;
        }

        // Empty response handling (e.g. 204 No Content)
        if (
          response.status === 204 ||
          response.headers.get("content-length") === "0"
        ) {
          return undefined as unknown as T;
        }

        const rawData = await response.json();

        // Automatic decryption if response was an encrypted envelope
        if (isEncryptedEnvelope(rawData)) {
          return (await decryptPayloadEnvelope(rawData)) as T;
        }

        return rawData as T;
      } catch (err) {
        clearTimeout(timeoutId);

        if (err instanceof AtlasApiError) {
          throw err;
        }

        const isAbortError = err instanceof Error && err.name === "AbortError";
        const isNetworkError = !isAbortError;

        if (attempt < maxRetries && (isNetworkError || isAbortError)) {
          attempt++;
          const backoffMs = Math.min(
            1000 * Math.pow(2, attempt) + Math.random() * 200,
            5000,
          );
          await new Promise((res) => setTimeout(res, backoffMs));
          continue;
        }

        throw new AtlasApiError({
          message: isAbortError
            ? `Request timed out after ${timeoutMs}ms`
            : err instanceof Error
              ? err.message
              : "Unknown network failure",
          statusCode: isAbortError ? 408 : 0,
          code: isAbortError ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
          details: err,
          requestUrl: url,
        });
      }
    }

    throw new AtlasApiError({
      message: "Maximum retry attempts exceeded",
      statusCode: 504,
      code: "MAX_RETRIES_EXCEEDED",
      requestUrl: url,
    });
  }

  // ============================================================================
  // 2. HELPER UTILITIES
  // ============================================================================

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
  ): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const fullUrl = `${this.baseUrl}${cleanPath}`;

    if (!query) return fullUrl;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }

  private async resolveHeaders(
    options: RequestOptions,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.config.defaultHeaders,
      ...options.headers,
    };

    if (!options.skipAuth) {
      const token = await this.resolveValue(this.config.token);
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const stationContext = await this.resolveValue(this.config.stationContext);
    if (stationContext) {
      headers["X-Station-Context"] = stationContext;
    }

    const tenantId = await this.resolveValue(this.config.tenantId);
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }

    return headers;
  }

  private async resolveValue(
    provider?: string | (() => string | null | Promise<string | null>),
  ): Promise<string | null> {
    if (!provider) return null;
    if (typeof provider === "function") {
      return await provider();
    }
    return provider;
  }
}

/**
 * Functional factory to create an AtlasClient instance.
 */
export function createAtlasClient(config: AtlasClientConfig = {}): AtlasClient {
  return new AtlasClient(config);
}

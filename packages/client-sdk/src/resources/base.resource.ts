/**
 * @file base.resource.ts
 * @description Abstract base class providing core HTTP method dispatchers for resource clients.
 * @module @atlas/client-sdk/resources/base
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

import type { HttpMethod, RequestOptions } from "../types/client.types.js";

export interface IHttpClient {
  request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T>;
}

export abstract class BaseResource {
  protected readonly http: IHttpClient;

  public constructor(http: IHttpClient) {
    this.http = http;
  }

  protected get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.http.request<T>("GET", path, undefined, options);
  }

  protected post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.http.request<T>("POST", path, body, options);
  }

  protected put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.http.request<T>("PUT", path, body, options);
  }

  protected patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.http.request<T>("PATCH", path, body, options);
  }

  protected delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.http.request<T>("DELETE", path, undefined, options);
  }
}

/**
 * @file telemetry.resource.ts
 * @description Resource accessor for Platform health checks, latency, and telemetry metrics.
 * @module @atlas/client-sdk/resources/telemetry
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

import { BaseResource } from "./base.resource.js";
import type { MetricSnapshot, SystemHealthStatus } from "../types/api.types.js";
import type { RequestOptions } from "../types/client.types.js";

export class TelemetryResource extends BaseResource {
  /**
   * Performs an unauthenticated system health check against the server.
   */
  public checkHealth(options?: RequestOptions): Promise<SystemHealthStatus> {
    return this.get<SystemHealthStatus>("/health", {
      ...options,
      skipAuth: true,
    });
  }

  /**
   * Retrieves real-time platform telemetry and operational queue metrics.
   */
  public getMetrics(options?: RequestOptions): Promise<MetricSnapshot> {
    return this.get<MetricSnapshot>("/telemetry/metrics", options);
  }
}

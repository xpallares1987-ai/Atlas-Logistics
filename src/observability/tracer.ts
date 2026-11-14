/**
 * @file tracer.ts
 * @description Zero-overhead OpenTelemetry distributed tracing utility for Atlas Logistics.
 * Provides unified span creation, exception recording, and request context propagation across
 * the Fastify HTTP request lifecycle and SCM transactional outbox workers.
 * @module @atlas/backend/observability/tracer
 * @see {@link docs/superpowers/plans/2026-11-14-governance-hardening-and-observability-plan.md}
 */

import {
  trace,
  context,
  Span,
  SpanStatusCode,
  Tracer,
  Attributes,
} from "@opentelemetry/api";

// ============================================================================
// 1. TRACER INITIALIZATION & SINGLETON ACCESS
// ============================================================================

const TRACER_NAME = "atlas-logistics";
const TRACER_VERSION = "1.0.0";

/**
 * Returns the singleton or scoped OpenTelemetry Tracer instance.
 * Defaults to NoopTracer if no global TracerProvider is configured.
 */
export function getTracer(
  name: string = TRACER_NAME,
  version: string = TRACER_VERSION,
): Tracer {
  return trace.getTracer(name, version);
}

// ============================================================================
// 2. ACTIVE SPAN EXECUTION & HELPERS
// ============================================================================

/**
 * Executes an asynchronous function within an active OpenTelemetry span.
 * Automatically records unhandled exceptions, sets status to ERROR, and ends the span.
 *
 * @param name Span name (e.g., 'http.request', 'outbox.publish', 'outbox.relay')
 * @param attributes Initial span attributes
 * @param fn Asynchronous handler receiving the active span
 * @returns Result of the executed handler
 */
export async function traceSpan<T>(
  name: string,
  attributes: Record<string, any> = {},
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = getTracer();

  // Format attributes safely for OpenTelemetry
  const sanitizedAttributes: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) {
      if (typeof value === "object") {
        sanitizedAttributes[key] = JSON.stringify(value);
      } else {
        sanitizedAttributes[key] = value as any;
      }
    }
  }

  return tracer.startActiveSpan(
    name,
    { attributes: sanitizedAttributes },
    async (span: Span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error?.message || String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Starts a detached manual span. Callers must invoke `span.end()` when complete.
 *
 * @param name Span name
 * @param attributes Initial span attributes
 */
export function startSpan(
  name: string,
  attributes: Record<string, any> = {},
): Span {
  const tracer = getTracer();
  const sanitizedAttributes: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) {
      sanitizedAttributes[key] =
        typeof value === "object" ? JSON.stringify(value) : (value as any);
    }
  }
  return tracer.startSpan(name, { attributes: sanitizedAttributes });
}

/**
 * Retrieves the currently active span from the OpenTelemetry context, if any.
 */
export function getActiveSpan(): Span | undefined {
  return trace.getSpan(context.active());
}

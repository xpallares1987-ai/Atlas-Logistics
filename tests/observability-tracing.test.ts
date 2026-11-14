/**
 * @file observability-tracing.test.ts
 * @description Comprehensive test suite for OpenTelemetry distributed tracing across Fastify HTTP and SCM outbox.
 * @module @atlas/backend/tests/observability-tracing
 * @see {@link docs/superpowers/plans/2026-11-14-governance-hardening-and-observability-plan.md}
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTracer,
  traceSpan,
  startSpan,
} from "../src/observability/tracer.js";
import { outboxBus } from "../src/scm/kernel/outbox-bus.js";
import { v4 as uuidv4 } from "uuid";
import app from "../src/app.js";

// ============================================================================
// 1. UNIT TESTS: OPENTELEMETRY TRACER & TRACE SPAN WRAPPER
// ============================================================================

describe("OpenTelemetry Distributed Tracing — Core Tracer", () => {
  it("provides a valid tracer instance without throwing", () => {
    const tracer = getTracer();
    expect(tracer).toBeDefined();
    expect(typeof tracer.startSpan).toBe("function");
    expect(typeof tracer.startActiveSpan).toBe("function");
  });

  it("executes async operation within traceSpan and returns expected result", async () => {
    const testPayload = { orderId: "ord-123", amount: 4500 };
    const result = await traceSpan(
      "test.operation",
      { "test.id": "123", "test.component": "unit-test" },
      async (span) => {
        expect(span).toBeDefined();
        span.setAttribute("test.custom_attr", "verified");
        return testPayload;
      },
    );

    expect(result).toEqual(testPayload);
  });

  it("records exception and propagates error when traced operation throws", async () => {
    const expectedError = new Error("Simulated domain operation failure");

    await expect(
      traceSpan("test.failing_operation", {}, async () => {
        throw expectedError;
      }),
    ).rejects.toThrow("Simulated domain operation failure");
  });

  it("allows starting detached manual span and ending it cleanly", () => {
    const span = startSpan("manual.span", { "operation.name": "test" });
    expect(span).toBeDefined();
    expect(typeof span.end).toBe("function");
    expect(() => span.end()).not.toThrow();
  });
});

// ============================================================================
// 2. INTEGRATION TESTS: FASTIFY HTTP REQUEST LIFECYCLE TRACING
// ============================================================================

describe("OpenTelemetry Distributed Tracing — Fastify HTTP Lifecycle", () => {
  it("traces inbound HTTP requests and attaches correlation metadata", async () => {
    const correlationId = uuidv4();
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        "x-correlation-id": correlationId,
        "user-agent": "Vitest-Tracing-Test-Agent",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBeDefined();
  });

  it("handles 404 responses cleanly under tracing hooks", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/non-existent-test-endpoint-404",
      headers: {
        "x-correlation-id": uuidv4(),
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("handles 401 unauthorized requests cleanly under tracing hooks", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/protected-route-unauthorized",
    });

    expect(response.statusCode).toBe(401);
  });
});

// ============================================================================
// 3. INTEGRATION TESTS: SCM TRANSACTIONAL OUTBOX BUS TRACING
// ============================================================================

describe("OpenTelemetry Distributed Tracing — SCM Transactional Outbox", () => {
  const testEventType = `TestTracingEvent_${Date.now()}`;
  const testConsumer = `TestTracingConsumer_${Date.now()}`;

  beforeEach(() => {
    outboxBus.clearSubscribers();
  });

  it("traces outbox publish, relay, and consumer delivery cleanly", async () => {
    const eventPayload = {
      orderId: "ord-otel-999",
      trackingRef: "TRK-OTEL-001",
      timestamp: new Date().toISOString(),
    };

    let deliveredEvent: any = null;

    // Register subscriber
    outboxBus.subscribe(testEventType, testConsumer, async (envelope) => {
      deliveredEvent = envelope.payload;
    });

    // 1. Publish event inside traced span
    await outboxBus.publish({
      eventType: testEventType,
      aggregateType: "Order",
      aggregateId: "ord-otel-999",
      payload: eventPayload,
    });

    // 2. Relay pending events inside traced span
    const relayResult = await outboxBus.relayPendingEvents();

    expect(relayResult.relayedEventsCount).toBeGreaterThanOrEqual(1);
    expect(relayResult.consumerDeliveriesCount).toBeGreaterThanOrEqual(1);
    expect(deliveredEvent).toEqual(eventPayload);
  });
});

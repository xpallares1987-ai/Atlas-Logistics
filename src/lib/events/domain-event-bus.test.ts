import { describe, it, expect, beforeEach, vi } from "vitest";
import { DomainEventBus } from "./domain-event-bus.js";
import { runWithTenant } from "../tenancy/index.js";

describe("DomainEventBus", () => {
  let bus: DomainEventBus;

  beforeEach(() => {
    bus = new DomainEventBus();
    bus.clear();
  });

  it("publishes and subscribes to typed domain events", async () => {
    const receivedEvents: any[] = [];
    bus.subscribe("treasury:invoice-reconciled", (event) => {
      receivedEvents.push(event);
    });

    await bus.publish("treasury:invoice-reconciled", "inv-456", {
      invoiceId: "inv-456",
      carrierId: "carr-maersk",
      discrepancyStatus: "EXACT_MATCH",
      amountEur: 12500,
    });

    // Wait for setImmediate async dispatch
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].aggregateId).toBe("inv-456");
    expect(receivedEvents[0].payload.discrepancyStatus).toBe("EXACT_MATCH");
    expect(receivedEvents[0].payload.amountEur).toBe(12500);
  });

  it("automatically attaches current tenant context to dispatched event", async () => {
    let capturedOrgId: string | undefined;

    bus.subscribe("claims:claim-filed", (event) => {
      capturedOrgId = event.organizationId;
    });

    await runWithTenant(
      { organizationId: "org_iberia_cargo", isSuperAdmin: false },
      async () => {
        await bus.publish("claims:claim-filed", "clm-99", {
          claimId: "clm-99",
          shipmentId: "shp-88",
          claimedAmount: 4500,
          liabilityLimitEur: 3800,
          transportMode: "AIR",
        });
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(capturedOrgId).toBe("org_iberia_cargo");
  });

  it("isolates errors in listener so other listeners and publisher continue", async () => {
    const errorListener = vi.fn().mockImplementation(() => {
      throw new Error("Simulated subscriber crash");
    });
    const goodListener = vi.fn();

    bus.subscribe("customs:cleared", errorListener);
    bus.subscribe("customs:cleared", goodListener);

    await bus.publish("customs:cleared", "dec-100", {
      declarationId: "dec-100",
      channel: "GREEN",
      duaReference: "DUA-ES-2026-9999",
      totalDutyPayable: 0,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(goodListener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes listener when unsubscribe function is called", async () => {
    let count = 0;
    const unsubscribe = bus.subscribe("trade-finance:instrument-issued", () => {
      count++;
    });

    await bus.publish("trade-finance:instrument-issued", "lc-1", {
      instrumentId: "lc-1",
      instrumentType: "LETTER_OF_CREDIT",
      amount: 100000,
      currency: "EUR",
      applicantCompanyId: "comp-1",
      beneficiaryCompanyId: "comp-2",
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(count).toBe(1);

    unsubscribe();

    await bus.publish("trade-finance:instrument-issued", "lc-2", {
      instrumentId: "lc-2",
      instrumentType: "LETTER_OF_CREDIT",
      amount: 50000,
      currency: "EUR",
      applicantCompanyId: "comp-1",
      beneficiaryCompanyId: "comp-2",
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(count).toBe(1);
  });
});

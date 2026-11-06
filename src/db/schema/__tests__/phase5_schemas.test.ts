import { describe, it, expect } from "vitest";
import {
  demurrageInvoices,
  demurrageSuspensions,
  demurrageDisputes,
  oceanBookingDetails,
  containerStowagePlans,
} from "../index.js";

describe("Phase 5 Drizzle Schemas", () => {
  it("exports demurrage tables with required FMC columns", () => {
    expect(demurrageInvoices).toBeDefined();
    expect(demurrageInvoices.id).toBeDefined();
    expect(demurrageInvoices.fmcCompliant).toBeDefined();
    expect(demurrageInvoices.totalInvoicedUsd).toBeDefined();

    expect(demurrageSuspensions).toBeDefined();
    expect(demurrageSuspensions.invoiceId).toBeDefined();
    expect(demurrageSuspensions.reason).toBeDefined();

    expect(demurrageDisputes).toBeDefined();
    expect(demurrageDisputes.invoiceId).toBeDefined();
    expect(demurrageDisputes.fmcRuleClause).toBeDefined();
  });

  it("exports ocean_booking_details with DCSA cut-off and SI columns", () => {
    expect(oceanBookingDetails).toBeDefined();
    expect(oceanBookingDetails.bookingId).toBeDefined();
    expect(oceanBookingDetails.siStatus).toBeDefined();
    expect(oceanBookingDetails.draftBlStatus).toBeDefined();
  });

  it("exports container_stowage_plans with CoG and stability certification columns", () => {
    expect(containerStowagePlans).toBeDefined();
    expect(containerStowagePlans.containerId).toBeDefined();
    expect(containerStowagePlans.centerOfGravityJson).toBeDefined();
    expect(containerStowagePlans.axleLoadDistributionJson).toBeDefined();
    expect(containerStowagePlans.stabilityCertified).toBeDefined();
  });
});

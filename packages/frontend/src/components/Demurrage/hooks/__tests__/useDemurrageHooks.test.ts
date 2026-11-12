/**
 * @file useDemurrageHooks.test.ts
 * @description Unit test suite for Demurrage & Detention mappers, FMC 46 CFR § 541 checklist builders, and calculators.
 * @module @atlas/frontend/components/Demurrage/hooks/__tests__
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { describe, it, expect } from "vitest";
import {
  CANONICAL_FALLBACK_INVOICE,
  mapDbInvoiceToCarrierData,
  mapDbSuspensionToClockSuspension,
  buildEdi315Milestones,
  calculateSuspensionDays,
  filterDemurrageInvoices,
  buildFmcChecklistItems,
} from "../demurrageHelpers";

describe("demurrageHelpers", () => {
  describe("mapDbInvoiceToCarrierData", () => {
    it("returns CANONICAL_FALLBACK_INVOICE when input is null or undefined", () => {
      expect(mapDbInvoiceToCarrierData(null)).toEqual(
        CANONICAL_FALLBACK_INVOICE,
      );
      expect(mapDbInvoiceToCarrierData(undefined)).toEqual(
        CANONICAL_FALLBACK_INVOICE,
      );
    });

    it("normalizes database invoice columns into CarrierInvoiceData format", () => {
      const dbRow = {
        invoiceNumber: "INV-2026-100",
        createdAt: "2026-11-01T10:30:00Z",
        carrierName: "MSC Mediterranean Shipping",
        carrierScac: "MSCU",
        billOfLading: "BK-999",
        containerNumber: "MSCU1234567",
        vesselDischargeDate: "2026-10-20T08:00:00Z",
        availableDate: "2026-10-20T14:00:00Z",
        freeTimeStartDate: "2026-10-21T00:00:00Z",
        freeTimeEndDate: "2026-10-25T23:59:59Z",
        freeDaysGranted: 5,
        dailyRateUsd: 200,
        totalInvoicedUsd: 1600,
      };

      const mapped = mapDbInvoiceToCarrierData(dbRow);
      expect(mapped.invoiceNumber).toBe("INV-2026-100");
      expect(mapped.invoiceDate).toBe("2026-11-01");
      expect(mapped.carrierScac).toBe("MSCU");
      expect(mapped.dischargeDate).toBe("2026-10-20");
      expect(mapped.freeDaysGranted).toBe(5);
      expect(mapped.billedDailyRate).toBe(200);
      expect(mapped.invoicedAmount).toBe(1600);
    });
  });

  describe("mapDbSuspensionToClockSuspension", () => {
    it("maps database suspension row and truncates ISO timestamps", () => {
      const row = {
        id: "susp-99",
        reason: "PORT_STRIKE_FORCE_MAJEURE",
        justificationText: "Dockworker union stoppage at Pier 400",
        startDate: "2026-10-28T00:00:00Z",
        endDate: "2026-10-30T23:59:59Z",
        daysSuspended: 3,
        approved: true,
      };

      const mapped = mapDbSuspensionToClockSuspension(row);
      expect(mapped.id).toBe("susp-99");
      expect(mapped.code).toBe("PORT_STRIKE_FORCE_MAJEURE");
      expect(mapped.reason).toBe("Dockworker union stoppage at Pier 400");
      expect(mapped.startDate).toBe("2026-10-28");
      expect(mapped.endDate).toBe("2026-10-30");
      expect(mapped.suspendedDays).toBe(3);
      expect(mapped.approved).toBe(true);
    });
  });

  describe("buildEdi315Milestones", () => {
    it("generates 4 verified EDI 315 milestones (VD, AL, CO, CR)", () => {
      const milestones = buildEdi315Milestones({
        terminalName: "BEST Terminal Barcelona",
        vesselDischargeDate: "2026-10-22T06:00:00Z",
      });
      expect(milestones).toHaveLength(4);
      expect(milestones.map((m) => m.code)).toEqual(["VD", "AL", "CO", "CR"]);
      expect(milestones[0].locationName).toBe("BEST Terminal Barcelona");
      expect(milestones[0].timestamp).toBe("2026-10-22T06:00:00Z");
    });
  });

  describe("calculateSuspensionDays", () => {
    it("computes inclusive calendar days between start and end dates", () => {
      expect(calculateSuspensionDays("2026-10-27", "2026-10-29")).toBe(3);
      expect(calculateSuspensionDays("2026-10-27", "2026-10-27")).toBe(1);
    });

    it("clamps negative ranges or invalid dates to minimum 1 day", () => {
      expect(calculateSuspensionDays("2026-10-30", "2026-10-27")).toBe(1);
      expect(calculateSuspensionDays("invalid", "2026-10-27")).toBe(1);
    });
  });

  describe("filterDemurrageInvoices", () => {
    const sample = [
      {
        containerNumber: "MSKU9284712",
        billOfLading: "BK-2026-67116",
        invoiceNumber: "INV-01",
      },
      {
        containerNumber: "CMAU4455667",
        billOfLading: "BK-2026-88888",
        invoiceNumber: "INV-02",
      },
    ];

    it("returns full list when query is empty", () => {
      expect(filterDemurrageInvoices(sample, "")).toHaveLength(2);
    });

    it("filters by container number, B/L, or invoice number case-insensitively", () => {
      expect(filterDemurrageInvoices(sample, "cmau")).toHaveLength(1);
      expect(filterDemurrageInvoices(sample, "67116")).toHaveLength(1);
      expect(filterDemurrageInvoices(sample, "inv-02")).toHaveLength(1);
    });
  });

  describe("buildFmcChecklistItems", () => {
    it("evaluates all 13 mandatory statutory fields under 46 CFR § 541.6", () => {
      const checklist = buildFmcChecklistItems(CANONICAL_FALLBACK_INVOICE);
      expect(checklist).toHaveLength(13);
      expect(checklist.every((item) => item.valid)).toBe(true);
    });

    it("flags missing fields as invalid", () => {
      const incomplete = {
        ...CANONICAL_FALLBACK_INVOICE,
        disputeContactEmail: "",
        terminalHoursProvided: false,
      };
      const checklist = buildFmcChecklistItems(incomplete);
      const emailCheck = checklist.find(
        (i) => i.name === "Designated Dispute Contact Email",
      );
      const hoursCheck = checklist.find(
        (i) => i.name === "Terminal Gate Hours Provided",
      );
      expect(emailCheck?.valid).toBe(false);
      expect(hoursCheck?.valid).toBe(false);
    });
  });
});

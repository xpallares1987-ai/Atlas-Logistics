/**
 * @file po-allocation-engine.test.ts
 * @description Unit tests for pure SCM PO Allocation Engine (ADR 0032).
 * Verifies split shipments, decimal arithmetic, over-allocation guards, and status derivations.
 */

import { describe, it, expect } from "vitest";
import {
  parseQty,
  formatQty,
  calculateRemainingQuantity,
  validateAllocationRequest,
  calculateSplitAllocations,
  calculateTotalCbmAndWeight,
  derivePoStatus,
  AllocationCandidateItem,
} from "../src/scm/engines/po-allocation.engine.js";

describe("SCM PO Allocation Engine (Pure Domain)", () => {
  describe("Decimal Precision & Formatting", () => {
    it("parses numbers and strings to 3 decimals accurately", () => {
      expect(parseQty("100.500")).toBe(100.5);
      expect(parseQty("100.5555")).toBe(100.556);
      expect(parseQty(null)).toBe(0);
      expect(parseQty(undefined)).toBe(0);
      expect(parseQty("invalid")).toBe(0);
    });

    it("formats floating points into exact 3-decimal strings", () => {
      expect(formatQty(100)).toBe("100.000");
      expect(formatQty(100.5)).toBe("100.500");
      expect(formatQty(0.1234)).toBe("0.123");
    });
  });

  describe("Remaining Quantity & Allocation Validation", () => {
    it("calculates remaining unallocated quantities correctly", () => {
      expect(calculateRemainingQuantity("1000.000", "0.000")).toBe(1000);
      expect(calculateRemainingQuantity("1000.000", "450.500")).toBe(549.5);
      expect(calculateRemainingQuantity("500.000", "500.000")).toBe(0);
      expect(calculateRemainingQuantity("500.000", "600.000")).toBe(0); // Clamped at 0
    });

    it("validates successful allocation request within capacity", () => {
      const item: AllocationCandidateItem = {
        skuCode: "SKU-TECH-01",
        quantity: "500.000",
        allocatedQuantity: "200.000",
      };

      const result = validateAllocationRequest(item, 150);
      expect(result.valid).toBe(true);
      expect(result.remainingQty).toBe(300);
      expect(result.requestedQty).toBe(150);
      expect(result.error).toBeUndefined();
    });

    it("rejects zero or negative allocation quantities", () => {
      const item: AllocationCandidateItem = {
        skuCode: "SKU-TECH-01",
        quantity: "500.000",
        allocatedQuantity: "0.000",
      };

      const resZero = validateAllocationRequest(item, 0);
      expect(resZero.valid).toBe(false);
      expect(resZero.error).toContain("must be greater than zero");

      const resNeg = validateAllocationRequest(item, -50);
      expect(resNeg.valid).toBe(false);
      expect(resNeg.error).toContain("must be greater than zero");
    });

    it("rejects allocation exceeding remaining unallocated quantity", () => {
      const item: AllocationCandidateItem = {
        skuCode: "SKU-TECH-01",
        quantity: "500.000",
        allocatedQuantity: "350.000",
      };

      const result = validateAllocationRequest(item, 200);
      expect(result.valid).toBe(false);
      expect(result.remainingQty).toBe(150);
      expect(result.error).toContain("exceeds remaining unallocated quantity");
    });
  });

  describe("Split Shipments & Allocation Calculation", () => {
    it("handles multiple partial split allocations correctly", () => {
      const item: AllocationCandidateItem = {
        id: "item_01",
        skuCode: "SKU-TEXTILE-01",
        quantity: "1000.000",
        allocatedQuantity: "0.000",
      };

      // Split 1: Allocate 400
      const split1 = calculateSplitAllocations(item, 400);
      expect(split1.newAllocatedQuantity).toBe("400.000");
      expect(split1.remainingQuantity).toBe("600.000");
      expect(split1.isFullyAllocated).toBe(false);

      // Split 2: Allocate another 600
      const itemAfterSplit1: AllocationCandidateItem = {
        ...item,
        allocatedQuantity: split1.newAllocatedQuantity,
      };
      const split2 = calculateSplitAllocations(itemAfterSplit1, 600);
      expect(split2.newAllocatedQuantity).toBe("1000.000");
      expect(split2.remainingQuantity).toBe("0.000");
      expect(split2.isFullyAllocated).toBe(true);
    });

    it("throws an Error when requested allocation exceeds remaining", () => {
      const item: AllocationCandidateItem = {
        skuCode: "SKU-TECH-01",
        quantity: "100.000",
        allocatedQuantity: "90.000",
      };

      expect(() => calculateSplitAllocations(item, 20)).toThrow(
        "exceeds remaining unallocated quantity",
      );
    });
  });

  describe("Dimensional Weight and Volume Aggregation", () => {
    it("calculates total gross weight and volume for shipment load planning", () => {
      const lineItems = [
        {
          quantity: 100,
          grossWeightKg: "2.500",
          volumeCbm: "0.015",
        },
        {
          quantity: 50,
          grossWeightKg: "10.000",
          volumeCbm: "0.050",
        },
      ];

      const metrics = calculateTotalCbmAndWeight(lineItems);
      // 100 * 2.5 + 50 * 10 = 250 + 500 = 750 kg
      // 100 * 0.015 + 50 * 0.05 = 1.5 + 2.5 = 4.0 CBM
      expect(metrics.totalWeightKg).toBe(750);
      expect(metrics.totalVolumeCbm).toBe(4);
    });
  });

  describe("PO Status Derivation", () => {
    it("maintains CANCELLED and SHIPPED status overrides", () => {
      const items: AllocationCandidateItem[] = [
        { skuCode: "A", quantity: "100.000", allocatedQuantity: "0.000" },
      ];
      expect(derivePoStatus(items, [], "CANCELLED")).toBe("CANCELLED");
      expect(derivePoStatus(items, [], "SHIPPED")).toBe("SHIPPED");
    });

    it("derives ACKNOWLEDGED and IN_PRODUCTION from factory milestones", () => {
      const items: AllocationCandidateItem[] = [
        { skuCode: "A", quantity: "100.000", allocatedQuantity: "0.000" },
      ];

      expect(
        derivePoStatus(items, [
          { milestoneCode: "ORDER_RECEIVED", actualDate: "2026-11-01" },
        ]),
      ).toBe("ACKNOWLEDGED");

      expect(
        derivePoStatus(items, [
          { milestoneCode: "ORDER_RECEIVED", actualDate: "2026-11-01" },
          { milestoneCode: "RAW_MATERIALS_READY", actualDate: "2026-11-05" },
        ]),
      ).toBe("IN_PRODUCTION");
    });

    it("derives CARGO_READY when QC_PASSED or PACKED milestones are completed", () => {
      const items: AllocationCandidateItem[] = [
        { skuCode: "A", quantity: "100.000", allocatedQuantity: "0.000" },
      ];

      expect(
        derivePoStatus(items, [
          { milestoneCode: "QC_PASSED", actualDate: "2026-11-10" },
        ]),
      ).toBe("CARGO_READY");

      expect(
        derivePoStatus(items, [
          { milestoneCode: "PACKED", actualDate: "2026-11-12" },
        ]),
      ).toBe("CARGO_READY");
    });

    it("derives PARTIALLY_BOOKED when some SKUs are allocated", () => {
      const items: AllocationCandidateItem[] = [
        { skuCode: "A", quantity: "100.000", allocatedQuantity: "40.000" },
        { skuCode: "B", quantity: "200.000", allocatedQuantity: "0.000" },
      ];

      expect(
        derivePoStatus(items, [
          { milestoneCode: "PACKED", actualDate: "2026-11-12" },
        ]),
      ).toBe("PARTIALLY_BOOKED");
    });

    it("derives BOOKED when 100% of SKUs are allocated", () => {
      const items: AllocationCandidateItem[] = [
        { skuCode: "A", quantity: "100.000", allocatedQuantity: "100.000" },
        { skuCode: "B", quantity: "200.000", allocatedQuantity: "200.000" },
      ];

      expect(
        derivePoStatus(items, [
          { milestoneCode: "PACKED", actualDate: "2026-11-12" },
        ]),
      ).toBe("BOOKED");
    });
  });
});

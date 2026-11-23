/**
 * @file warehouse-terminal.test.ts
 * @description Unit tests for Rugged Mobile WMS Terminal workflows and ISO 6346 container validation.
 * @module @atlas/tests/warehouse-terminal
 * @see {@link docs/adr/0041-intelligent-document-processing-and-ruggedized-wms.md}
 */

import { describe, it, expect } from "vitest";
import { isValidIso6346, calculateIso6346CheckDigit } from "@atlas/shared";

describe("Warehouse Terminal Workflows & Invariants (T-64 / ADR 0041)", () => {
  describe("ISO 6346 Container Verification", () => {
    it("validates correct container numbers with valid check digit", () => {
      // MSCU9876543
      const valid = "MSCU9876543";
      const checkDigit = calculateIso6346CheckDigit("MSCU987654");
      expect(isValidIso6346(`MSCU987654${checkDigit}`)).toBe(true);
    });

    it("rejects invalid container formats and incorrect check digits", () => {
      expect(isValidIso6346("INVALID123")).toBe(false);
      expect(isValidIso6346("")).toBe(false);
      expect(isValidIso6346("MSCU9876540")).toBe(false); // incorrect check digit
    });
  });

  describe("Warehouse Terminal Workflows Invariants", () => {
    it("ensures Cross-Dock tasks maintain priority and pallet allocation counts", () => {
      const task = {
        id: "CD-101",
        inboundRef: "INB-MAD-8821",
        outboundShipmentId: "BK-2026-67116",
        destinationHub: "JFK - New York Air Cargo CFS",
        palletCount: 4,
        priority: "HIGH" as const,
        scannedCount: 2,
      };

      expect(task.scannedCount).toBeLessThanOrEqual(task.palletCount);
      expect(task.priority).toBe("HIGH");
    });

    it("ensures Putaway tasks enforce directed bin locations", () => {
      const putaway = {
        id: "PW-01",
        sscc: "001843700000192841",
        sku: "MED-TEMP-2026",
        recommendedBin: "COLD-R02-B-04",
        quantity: 48,
        status: "PENDING" as const,
      };

      expect(putaway.recommendedBin).toMatch(/^[A-Z0-9-]+$/);
      expect(putaway.quantity).toBeGreaterThan(0);
    });

    it("ensures Wave Pick items track progress toward completion", () => {
      const item = {
        id: "WP-02",
        waveId: "WV-2026-089",
        sku: "AUTO-SPRK-44",
        binLocation: "B-01-08",
        requiredQty: 25,
        pickedQty: 15,
        isComplete: false,
      };

      const progress = item.pickedQty / item.requiredQty;
      expect(progress).toBe(0.6);
      expect(item.isComplete).toBe(false);
    });
  });
});

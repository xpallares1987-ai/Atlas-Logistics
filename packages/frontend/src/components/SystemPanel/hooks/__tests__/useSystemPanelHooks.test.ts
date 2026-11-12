/**
 * @file useSystemPanelHooks.test.ts
 * @description Unit tests for System Panel domain helper functions and validators.
 * @module @atlas/frontend/components/SystemPanel/hooks/__tests__
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { describe, it, expect } from "vitest";
import {
  validateApiKeyFormat,
  formatLatency,
  calculateQuotaPercentage,
  calculateTotalSeedRecords,
  filterResolutionNotes,
} from "../systemPanelHelpers";
import type { SeedStatusStats } from "../../../../types/system-panel.types";

describe("systemPanelHelpers", () => {
  describe("validateApiKeyFormat", () => {
    it("returns error on empty or whitespace key", () => {
      expect(validateApiKeyFormat("").isValid).toBe(false);
      expect(validateApiKeyFormat("   ").error).toBe("API key cannot be empty");
    });

    it("rejects keys not starting with AIzaSy", () => {
      const res = validateApiKeyFormat("sk-ant-api03-abcdefghijklmnop");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("must start with 'AIzaSy'");
    });

    it("rejects keys that are too short", () => {
      const res = validateApiKeyFormat("AIzaSy12345");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("too short");
    });

    it("accepts valid Google AI Studio format keys", () => {
      const res = validateApiKeyFormat(
        "AIzaSyCG-xampleKeyWithSufficientLength39Chars",
      );
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe("formatLatency", () => {
    it("formats sub-second latencies in milliseconds", () => {
      expect(formatLatency(150)).toBe("150ms");
      expect(formatLatency(42.8)).toBe("43ms");
    });

    it("formats 1s or greater in seconds with one decimal point", () => {
      expect(formatLatency(1200)).toBe("1.2s");
      expect(formatLatency(5000)).toBe("5.0s");
    });

    it("handles zero or invalid values gracefully", () => {
      expect(formatLatency(0)).toBe("0ms");
      expect(formatLatency(-5)).toBe("0ms");
      expect(formatLatency(undefined)).toBe("0ms");
    });
  });

  describe("calculateQuotaPercentage", () => {
    it("calculates accurate percentage clamped between 0 and 100", () => {
      expect(calculateQuotaPercentage(6, 12)).toBe(50);
      expect(calculateQuotaPercentage(15, 12)).toBe(100);
      expect(calculateQuotaPercentage(-2, 10)).toBe(0);
    });

    it("returns 0 on division by zero or invalid inputs", () => {
      expect(calculateQuotaPercentage(5, 0)).toBe(0);
      expect(calculateQuotaPercentage(NaN, 10)).toBe(0);
    });
  });

  describe("calculateTotalSeedRecords", () => {
    it("returns 0 for null stats", () => {
      expect(calculateTotalSeedRecords(null)).toBe(0);
    });

    it("correctly sums records across all 5 operational phases", () => {
      const mockStats: SeedStatusStats = {
        phase1: { shipments: 7, incidents: 18, drayageOrders: 12 }, // 37
        phase2: {
          coldChainShipments: 4,
          temperatureReadings: 240,
          dangerousGoods: 6,
          cbamDeclarations: 8,
        }, // 258
        phase3: { invoices: 60, tradeCreditInstruments: 15 }, // 75
        phase4: {
          cartaPorteDeclarations: 10,
          efirmaAuditStamps: 25,
          smartEscrowContracts: 5,
          erpPurchaseOrders: 14,
        }, // 54
        phase5: {
          demurrageInvoices: 8,
          demurrageDisputes: 3,
          oceanBookings: 12,
          stowagePlans: 4,
        }, // 27
      };
      // 37 + 258 + 75 + 54 + 27 = 451
      expect(calculateTotalSeedRecords(mockStats)).toBe(451);
    });
  });

  describe("filterResolutionNotes", () => {
    const mockNotes = [
      {
        id: "1",
        label: "Customs Hold Cleared",
        category: "CUSTOMS",
        text: "Physical inspection completed.",
      },
      {
        id: "2",
        label: "Feeder Rollover",
        category: "ROUTING",
        text: "Transshipment delay accommodated.",
      },
      {
        id: "3",
        label: "Reefer Temperature Spike",
        category: "COLD_CHAIN",
        text: "Genset restarted within 15 min.",
      },
    ];

    it("returns all notes when query is empty", () => {
      expect(filterResolutionNotes(mockNotes, "")).toHaveLength(3);
      expect(filterResolutionNotes(mockNotes, "   ")).toHaveLength(3);
    });

    it("filters notes by case-insensitive category", () => {
      const results = filterResolutionNotes(mockNotes, "customs");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("1");
    });

    it("filters notes by case-insensitive text", () => {
      const results = filterResolutionNotes(mockNotes, "inspection");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("1");
    });
  });
});

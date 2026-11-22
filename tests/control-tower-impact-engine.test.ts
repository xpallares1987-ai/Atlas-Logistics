/**
 * @file control-tower-impact-engine.test.ts
 * @description Comprehensive unit test suite for Supply Chain Predictive Exceptions
 * and SLA Impact Engine (ADR 0033).
 */

import { describe, it, expect } from "vitest";
import {
  calculateHoursDifference,
  evaluateMilestoneDelay,
  evaluateCrdCutoffBreach,
  evaluateEtaRddBreach,
  evaluateTransshipmentDwell,
  analyzeSupplyChainExceptions,
} from "../src/scm/engines/predictive-exceptions.engine.js";

describe("Supply Chain Predictive Exceptions & SLA Impact Engine", () => {
  describe("Temporal Utilities", () => {
    it("calculates exact hours difference between ISO strings and Dates", () => {
      const dateA = "2026-11-25T12:00:00Z";
      const dateB = "2026-11-25T00:00:00Z";
      expect(calculateHoursDifference(dateA, dateB)).toBe(12);
      expect(calculateHoursDifference(dateB, dateA)).toBe(-12);
      expect(calculateHoursDifference(dateA, dateA)).toBe(0);
    });

    it("evaluates milestone delay based on actual and estimated timestamps", () => {
      const planned = "2026-11-20T10:00:00Z";
      const actualDelayed = "2026-11-20T16:00:00Z";
      const estimatedDelayed = "2026-11-20T14:30:00Z";

      // Actual overrides estimated
      expect(
        evaluateMilestoneDelay({
          plannedTimestamp: planned,
          actualTimestamp: actualDelayed,
          estimatedTimestamp: estimatedDelayed,
        }),
      ).toBe(6);

      // Estimated used when actual is null
      expect(
        evaluateMilestoneDelay({
          plannedTimestamp: planned,
          estimatedTimestamp: estimatedDelayed,
        }),
      ).toBe(4.5);

      // Zero when neither is provided
      expect(
        evaluateMilestoneDelay({
          plannedTimestamp: planned,
        }),
      ).toBe(0);
    });
  });

  describe("CRD vs Booking Cut-Off Breach Evaluator", () => {
    it("returns null when Cargo Ready Date is before or on booking cut-off", () => {
      const result = evaluateCrdCutoffBreach({
        crd: "2026-11-20T08:00:00Z",
        cutoffDate: "2026-11-20T12:00:00Z",
      });
      expect(result).toBeNull();
    });

    it("evaluates small breach with LOW severity", () => {
      const result = evaluateCrdCutoffBreach({
        crd: "2026-11-20T14:00:00Z",
        cutoffDate: "2026-11-20T10:00:00Z", // 4h delay
      });
      expect(result).not.toBeNull();
      expect(result?.code).toBe("EXC_CRD_AFTER_CUTOFF");
      expect(result?.severity).toBe("LOW");
      expect(result?.delayEstimateHours).toBe(4);
      expect(result?.suggestedMitigations[0].code).toBe(
        "EXPEDITE_SUPPLIER_OVERTIME",
      );
      expect(result?.suggestedMitigations[0].recommended).toBe(true);
    });

    it("evaluates medium and high breaches appropriately", () => {
      // 16 hours delay -> MEDIUM
      const med = evaluateCrdCutoffBreach({
        crd: "2026-11-21T02:00:00Z",
        cutoffDate: "2026-11-20T10:00:00Z",
      });
      expect(med?.severity).toBe("MEDIUM");

      // 36 hours delay -> HIGH
      const high = evaluateCrdCutoffBreach({
        crd: "2026-11-21T22:00:00Z",
        cutoffDate: "2026-11-20T10:00:00Z",
      });
      expect(high?.severity).toBe("HIGH");
    });

    it("evaluates CRITICAL breach when delay exceeds 72h or vessel departs soon", () => {
      // Severe delay > 72h
      const severe = evaluateCrdCutoffBreach({
        crd: "2026-11-24T12:00:00Z",
        cutoffDate: "2026-11-20T10:00:00Z", // 98h
        cargoValue: 120000,
        containerCount: 2,
      });
      expect(severe?.severity).toBe("CRITICAL");
      expect(parseFloat(severe!.financialRiskAmount)).toBeGreaterThan(1500);

      // 30h delay but vessel departs within 36h of cut-off
      const vesselImminent = evaluateCrdCutoffBreach({
        crd: "2026-11-21T16:00:00Z",
        cutoffDate: "2026-11-20T10:00:00Z", // 30h
        vesselDepartureDate: "2026-11-21T20:00:00Z", // 34h after cut-off
      });
      expect(vesselImminent?.severity).toBe("CRITICAL");
    });
  });

  describe("ETA vs Required Delivery Date (RDD) Breach Evaluator", () => {
    it("returns null when estimated arrival meets or precedes RDD", () => {
      const result = evaluateEtaRddBreach({
        estimatedArrival: "2026-12-05T10:00:00Z",
        requiredDeliveryDate: "2026-12-05T18:00:00Z",
      });
      expect(result).toBeNull();
    });

    it("detects ETA delay with accurate severity tiers and mitigation ranking", () => {
      // 20 hours -> MEDIUM
      const med = evaluateEtaRddBreach({
        estimatedArrival: "2026-12-06T08:00:00Z",
        requiredDeliveryDate: "2026-12-05T12:00:00Z",
        dailyPenaltyRate: 300,
        containerCount: 1,
      });
      expect(med?.code).toBe("EXC_ETA_PAST_RDD");
      expect(med?.severity).toBe("MEDIUM");
      expect(med?.delayEstimateHours).toBe(20);
      expect(med?.financialRiskAmount).toBe("300.00");
      expect(med?.suggestedMitigations[0].code).toBe(
        "PRIORITY_CUSTOMS_PRE_CLEARANCE",
      );
      expect(med?.suggestedMitigations[0].recommended).toBe(true);

      // 140 hours delay (> 5 days) -> CRITICAL
      const critical = evaluateEtaRddBreach({
        estimatedArrival: "2026-12-11T08:00:00Z",
        requiredDeliveryDate: "2026-12-05T12:00:00Z",
        cargoValue: 80000,
      });
      expect(critical?.severity).toBe("CRITICAL");
      expect(critical?.suggestedMitigations[2].code).toBe(
        "INTERMODAL_AIR_SEA_TRANSFER",
      );
      expect(critical?.suggestedMitigations[2].recommended).toBe(true);
    });
  });

  describe("Transshipment Dwell Anomaly Evaluator", () => {
    it("returns null when container dwell is within 72-hour threshold", () => {
      const discharged = "2026-11-20T00:00:00Z";
      const current = "2026-11-22T00:00:00Z"; // 48h dwell
      const result = evaluateTransshipmentDwell({
        dischargedDate: discharged,
        currentTime: current,
        thresholdHours: 72,
      });
      expect(result).toBeNull();
    });

    it("detects excessive transshipment dwell and computes demurrage exposure", () => {
      const discharged = "2026-11-20T00:00:00Z";
      const current = "2026-11-25T00:00:00Z"; // 120h dwell -> 48h excess (2 days)
      const result = evaluateTransshipmentDwell({
        dischargedDate: discharged,
        currentTime: current,
        thresholdHours: 72,
        dailyDemurrageRate: 200,
        containerCount: 3,
      });

      expect(result).not.toBeNull();
      expect(result?.code).toBe("EXC_TRANSSHIPMENT_DWELL");
      expect(result?.delayEstimateHours).toBe(48);
      // 3 containers * $200 * 2 days = $1200.00
      expect(result?.financialRiskAmount).toBe("1200.00");
      expect(result?.suggestedMitigations[0].code).toBe(
        "CARRIER_EXPEDITE_REQUEST",
      );
    });
  });

  describe("Comprehensive PO Context Exception Analysis", () => {
    it("returns zero exceptions for a clean, on-time PO", () => {
      const results = analyzeSupplyChainExceptions({
        poId: "po_test_01",
        poNumber: "PO-2026-CLEAN",
        expectedCargoReadyDate: "2026-11-20T10:00:00Z",
        requiredDeliveryDate: "2026-12-15T18:00:00Z",
        allocatedBookings: [
          {
            bookingId: "bkg_01",
            bookingNumber: "BK-2026-001",
            cargoCutOffDate: "2026-11-21T10:00:00Z", // CRD is before cut-off
            estimatedArrival: "2026-12-10T12:00:00Z", // ETA is before RDD
          },
        ],
      });
      expect(results).toHaveLength(0);
    });

    it("aggregates multiple exceptions across bookings and milestones", () => {
      const results = analyzeSupplyChainExceptions({
        poId: "po_test_02",
        poNumber: "PO-2026-RISK",
        expectedCargoReadyDate: "2026-11-22T12:00:00Z", // Late vs cut-off
        requiredDeliveryDate: "2026-12-05T00:00:00Z", // Late vs ETA
        totalCargoValue: 150000,
        allocatedBookings: [
          {
            bookingId: "bkg_02",
            bookingNumber: "BK-2026-002",
            cargoCutOffDate: "2026-11-21T12:00:00Z", // 24h breach
            estimatedArrival: "2026-12-08T00:00:00Z", // 72h breach
          },
        ],
        milestones: [
          {
            id: "ms_01",
            milestoneCode: "TRANSSHIPMENT_DISCHARGED",
            status: "ACTUAL",
            plannedTimestamp: "2026-11-10T00:00:00Z",
            actualTimestamp: new Date(
              Date.now() - 100 * 3600 * 1000,
            ).toISOString(), // > 72h dwell
          },
        ],
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      const codes = results.map((e) => e.code);
      expect(codes).toContain("EXC_CRD_AFTER_CUTOFF");
      expect(codes).toContain("EXC_ETA_PAST_RDD");
    });
  });
});

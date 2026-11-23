/**
 * @file autonomous-resolution.engine.test.ts
 * @description Unit test suite for the pure algorithmic disruption resolution engine (ADR 0036).
 * Tests multi-objective loss function, Pareto ranking, and hybrid autonomous policy bounds.
 * @module @atlas/scm/engines/autonomous-resolution.test
 */

import { describe, it, expect } from "vitest";
import {
  calculateMultiObjectiveLoss,
  evaluateAutonomousEligibility,
  compileResolutionPlan,
  type DisruptionContext,
  type CandidateMitigationInput,
  type EvaluationWeights,
} from "./autonomous-resolution.engine.js";

describe("Autonomous Disruption Resolution Engine (Pure Engine)", () => {
  const baseDisruption: DisruptionContext = {
    exceptionId: "exc-101",
    poId: "po-500",
    shipmentId: "sh_demo_01",
    bookingId: "bk-700",
    exceptionCode: "EXC_PORT_CONGESTION",
    exceptionCategory: "PORT_CONGESTION",
    severity: "HIGH",
    disruptionDelayHours: 72,
    financialRiskAmount: 12500,
    isHazardousCargo: false,
    isReeferCargo: false,
    originUnlocode: "CNSHA",
    destinationUnlocode: "ESBCN",
  };

  const nextSailingCandidate: CandidateMitigationInput = {
    id: "opt-next-sailing",
    strategy: "NEXT_SAILING",
    carrierCode: "MSK",
    carrierName: "Maersk Line",
    serviceMode: "OCEAN",
    transitTimeHours: 504,
    delayHoursRecovered: 48,
    costDeltaAmount: 450,
    costDeltaCurrency: "USD",
    co2DeltaKg: 120,
    carrierReliabilityScore: 92,
    reroutePayload: {
      newVoyage: "MSK-2026-N4",
      newEtd: "2026-12-05T08:00:00Z",
    },
  };

  const airModalShiftCandidate: CandidateMitigationInput = {
    id: "opt-modal-air",
    strategy: "MODAL_SHIFT",
    carrierCode: "LH",
    carrierName: "Lufthansa Cargo",
    serviceMode: "AIR",
    transitTimeHours: 48,
    delayHoursRecovered: 68,
    costDeltaAmount: 4800,
    costDeltaCurrency: "USD",
    co2DeltaKg: 3200,
    carrierReliabilityScore: 96,
    reroutePayload: { airWaybill: "020-89123841", flightNumber: "LH8200" },
  };

  const bufferAdjustmentCandidate: CandidateMitigationInput = {
    id: "opt-buffer",
    strategy: "BUFFER_ADJUSTMENT",
    carrierCode: "MSK",
    serviceMode: "OCEAN",
    transitTimeHours: 552,
    delayHoursRecovered: 24,
    costDeltaAmount: 0,
    costDeltaCurrency: "USD",
    co2DeltaKg: 0,
    carrierReliabilityScore: 88,
    reroutePayload: { compressedMilestone: "DC_INTAKE", daysCompacted: 1 },
  };

  describe("calculateMultiObjectiveLoss()", () => {
    it("calculates loss and composite fitness score accurately for ocean alternative", () => {
      const result = calculateMultiObjectiveLoss(
        nextSailingCandidate,
        baseDisruption,
      );
      expect(result.loss).toBeGreaterThan(0);
      expect(result.loss).toBeLessThan(1);
      expect(result.compositeScore).toBeGreaterThanOrEqual(80);
      expect(result.compositeScore).toBeLessThanOrEqual(99);
    });

    it("penalizes air modal shift for high freight cost and CO2 emissions", () => {
      const oceanResult = calculateMultiObjectiveLoss(
        nextSailingCandidate,
        baseDisruption,
      );
      const airResult = calculateMultiObjectiveLoss(
        airModalShiftCandidate,
        baseDisruption,
      );

      // Air recovers more delay, but cost ($4,800) and CO2 (3,200kg) give it a higher loss
      expect(airResult.loss).toBeGreaterThan(oceanResult.loss);
      expect(airResult.compositeScore).toBeLessThan(oceanResult.compositeScore);
    });

    it("supports custom evaluation weights prioritizing speed over cost", () => {
      const speedBiasedWeights: EvaluationWeights = {
        eta: 0.8,
        cost: 0.1,
        reliability: 0.05,
        co2: 0.05,
      };

      const airResult = calculateMultiObjectiveLoss(
        airModalShiftCandidate,
        baseDisruption,
        speedBiasedWeights,
      );
      const oceanResult = calculateMultiObjectiveLoss(
        nextSailingCandidate,
        baseDisruption,
        speedBiasedWeights,
      );

      // When speed is heavily weighted (80%), air shift should score higher than ocean
      expect(airResult.compositeScore).toBeGreaterThan(
        oceanResult.compositeScore,
      );
    });
  });

  describe("evaluateAutonomousEligibility()", () => {
    it("qualifies low-cost, high-reliability candidate for autonomous execution", () => {
      const { isEligible, reasons } = evaluateAutonomousEligibility(
        nextSailingCandidate,
        baseDisruption,
        89,
      );

      expect(isEligible).toBe(true);
      expect(reasons).toHaveLength(0);
    });

    it("rejects candidate when cost exceeds policy ceiling ($1,500)", () => {
      const { isEligible, reasons } = evaluateAutonomousEligibility(
        airModalShiftCandidate,
        baseDisruption,
        88,
      );

      expect(isEligible).toBe(false);
      expect(reasons.some((r) => r.includes("exceeds autonomous limit"))).toBe(
        true,
      );
    });

    it("rejects candidate when delay recovered is below policy minimum (24h)", () => {
      const smallRecovery: CandidateMitigationInput = {
        ...nextSailingCandidate,
        delayHoursRecovered: 12,
      };

      const { isEligible, reasons } = evaluateAutonomousEligibility(
        smallRecovery,
        baseDisruption,
        90,
      );

      expect(isEligible).toBe(false);
      expect(
        reasons.some((r) => r.includes("is below minimum threshold")),
      ).toBe(true);
    });

    it("rejects candidate when fitness score is below policy minimum (85)", () => {
      const { isEligible, reasons } = evaluateAutonomousEligibility(
        nextSailingCandidate,
        baseDisruption,
        78, // Below 85
      );

      expect(isEligible).toBe(false);
      expect(
        reasons.some((r) => r.includes("below minimum autonomous threshold")),
      ).toBe(true);
    });

    it("rejects autonomous execution for dangerous goods (hazardous cargo)", () => {
      const hazmatDisruption: DisruptionContext = {
        ...baseDisruption,
        isHazardousCargo: true,
      };

      const { isEligible, reasons } = evaluateAutonomousEligibility(
        nextSailingCandidate,
        hazmatDisruption,
        92,
      );

      expect(isEligible).toBe(false);
      expect(reasons.some((r) => r.includes("Dangerous/Hazardous goods"))).toBe(
        true,
      );
    });

    it("rejects autonomous execution for temperature-controlled reefer cargo", () => {
      const reeferDisruption: DisruptionContext = {
        ...baseDisruption,
        isReeferCargo: true,
      };

      const { isEligible, reasons } = evaluateAutonomousEligibility(
        nextSailingCandidate,
        reeferDisruption,
        92,
      );

      expect(isEligible).toBe(false);
      expect(reasons.some((r) => r.includes("Reefer"))).toBe(true);
    });
  });

  describe("compileResolutionPlan()", () => {
    it("handles empty candidate list gracefully", () => {
      const plan = compileResolutionPlan("plan-empty", baseDisruption, []);
      expect(plan.status).toBe("DRAFT");
      expect(plan.autoExecutionEligible).toBe(false);
      expect(plan.recommendedOptionId).toBeNull();
      expect(plan.options).toHaveLength(0);
    });

    it("ranks candidates in Pareto order and designates optimal recommendation", () => {
      const candidates = [
        airModalShiftCandidate,
        bufferAdjustmentCandidate,
        nextSailingCandidate,
      ];

      const plan = compileResolutionPlan(
        "plan-001",
        baseDisruption,
        candidates,
      );

      expect(plan.options).toHaveLength(3);
      expect(plan.options[0].rankOrder).toBe(1);
      expect(plan.options[1].rankOrder).toBe(2);
      expect(plan.options[2].rankOrder).toBe(3);

      // Verify descending order of composite fitness scores
      expect(plan.options[0].compositeScore).toBeGreaterThanOrEqual(
        plan.options[1].compositeScore,
      );
      expect(plan.options[1].compositeScore).toBeGreaterThanOrEqual(
        plan.options[2].compositeScore,
      );

      // Verify top recommended option is set on plan
      expect(plan.recommendedOptionId).toBe(plan.options[0].id);
      expect(plan.recommendedStrategy).toBe(plan.options[0].strategy);

      // Check auto-execution eligibility on plan
      expect(typeof plan.autoExecutionEligible).toBe("boolean");
    });
  });
});

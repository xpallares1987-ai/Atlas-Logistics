import { describe, it, expect } from "vitest";
import {
  CarrierReconciliationService,
  LineMatchInput,
} from "./carrier-reconciliation.service.js";

describe("CarrierReconciliationService (Deterministic 3-Way Match)", () => {
  it("should mark exact match lines as MATCHED within 0 variance", () => {
    const line: LineMatchInput = {
      chargeCode: "BASIC_FREIGHT",
      description: "Ocean FCL Freight Shanghai to Valencia",
      documentNumber: "MSK99482015",
      billedQuantity: 1,
      billedRate: 3200.0,
      billedAmount: 3200.0,
      expectedQuantity: 1,
      expectedRate: 3200.0,
      expectedAmount: 3200.0,
    };

    const result = CarrierReconciliationService.reconcileLine(line);
    expect(result.matchStatus).toBe("MATCHED");
    expect(result.varianceAmount).toBe(0);
    expect(result.isWithinTolerance).toBe(true);
  });

  it("should tolerate small variances within ±5.0 EUR/USD or ±1%", () => {
    const line: LineMatchInput = {
      chargeCode: "BAF_FUEL",
      description: "Bunker fuel surcharge",
      documentNumber: "MSK99482015",
      billedQuantity: 1,
      billedRate: 654.0, // variance = +$4.0 <= $5.0 threshold
      billedAmount: 654.0,
      expectedQuantity: 1,
      expectedRate: 650.0,
      expectedAmount: 650.0,
    };

    const result = CarrierReconciliationService.reconcileLine(line);
    expect(result.matchStatus).toBe("VARIANCE_TOLERATED");
    expect(result.isWithinTolerance).toBe(true);
  });

  it("should flag unauthorized charges where expectedAmount is 0", () => {
    const line: LineMatchInput = {
      chargeCode: "OTHER_SURCHARGE",
      description: "Uncontracted port congestion surcharge",
      documentNumber: "MSK99482015",
      billedQuantity: 1,
      billedRate: 450.0,
      billedAmount: 450.0,
      expectedQuantity: 0,
      expectedRate: 0,
      expectedAmount: 0,
    };

    const result = CarrierReconciliationService.reconcileLine(line);
    expect(result.matchStatus).toBe("UNAUTHORIZED_CHARGE");
    expect(result.isWithinTolerance).toBe(false);
    expect(result.disputeReason).toContain("Cargo no contratado");
  });

  it("should reconcile entire invoice and return AUTO_MATCHED when all lines are compliant", () => {
    const lines: LineMatchInput[] = [
      {
        chargeCode: "BASIC_FREIGHT",
        description: "Air freight",
        documentNumber: "075-84920153",
        billedQuantity: 480,
        billedRate: 4.5,
        billedAmount: 2160.0,
        expectedQuantity: 480,
        expectedRate: 4.5,
        expectedAmount: 2160.0,
      },
      {
        chargeCode: "SECURITY_FEE",
        description: "Security fee",
        documentNumber: "075-84920153",
        billedQuantity: 480,
        billedRate: 1.0,
        billedAmount: 480.0,
        expectedQuantity: 480,
        expectedRate: 1.0,
        expectedAmount: 480.0,
      },
    ];

    const summary = CarrierReconciliationService.reconcileInvoice(lines);
    expect(summary.reconciliationStatus).toBe("AUTO_MATCHED");
    expect(summary.discrepanciesCount).toBe(0);
    expect(summary.matchedAmount).toBe(2640.0);
    expect(summary.disputedAmount).toBe(0);
  });

  it("should compute disputed amount and return DISCREPANCY_FLAGGED when demurrage exceeds quote", () => {
    const lines: LineMatchInput[] = [
      {
        chargeCode: "BASIC_FREIGHT",
        description: "Ocean Freight",
        documentNumber: "MSK99482015",
        billedQuantity: 1,
        billedRate: 3200.0,
        billedAmount: 3200.0,
        expectedQuantity: 1,
        expectedRate: 3200.0,
        expectedAmount: 3200.0,
      },
      {
        chargeCode: "DEMURRAGE",
        description: "Demurrage fee",
        documentNumber: "MSK99482015",
        billedQuantity: 5,
        billedRate: 250.0,
        billedAmount: 1250.0,
        expectedQuantity: 3,
        expectedRate: 250.0,
        expectedAmount: 750.0,
      },
    ];

    const summary = CarrierReconciliationService.reconcileInvoice(lines);
    expect(summary.reconciliationStatus).toBe("DISCREPANCY_FLAGGED");
    expect(summary.discrepanciesCount).toBe(1);
    expect(summary.disputedAmount).toBe(500.0);
  });
});

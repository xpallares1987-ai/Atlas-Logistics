import { describe, it, expect } from "vitest";
import { TradeFinanceFeeService } from "./trade-finance-fee.service.js";

describe("TradeFinanceFeeService", () => {
  it("should calculate standard opening and confirmation fees for a 90-day sight credit", () => {
    const result = TradeFinanceFeeService.calculateFees({
      creditAmount: 200000.0,
      currency: "EUR",
      tenorDays: 90,
      openingFeeRatePct: 0.25, // 0.25% per quarter = 500 €
      confirmationFeeRatePct: 0.5, // 0.50% p.a. * (90/360) = 0.125% = 250 €
      discrepanciesCount: 0,
      paymentSettlementFeeAmount: 60.0,
    });

    expect(result.calculatedOpeningFeeEur).toBe(500.0);
    expect(result.calculatedConfirmationFeeEur).toBe(250.0);
    expect(result.calculatedDiscrepancyFeeEur).toBe(0.0);
    expect(result.calculatedPaymentFeeEur).toBe(60.0);
    expect(result.totalBankFeesEur).toBe(810.0);
    expect(result.effectiveBankCostPct).toBe(0.405);
  });

  it("should charge discrepancy fees when presentation contains infractions", () => {
    const result = TradeFinanceFeeService.calculateFees({
      creditAmount: 350000.0,
      currency: "USD",
      tenorDays: 60,
      discrepanciesCount: 2,
      discrepancyFeeAmount: 85.0, // 2 * 85 = 170 USD
      amendmentsCount: 1,
      amendmentFeeAmount: 50.0,
    });

    expect(result.calculatedDiscrepancyFeeEur).toBe(170.0);
    expect(result.calculatedAmendmentFeeEur).toBe(50.0);
    expect(result.totalBankFeesEur).toBeGreaterThan(170.0);
  });

  it("should scale opening fee periods for multi-quarter tenors (180 days = 2 quarters)", () => {
    const result = TradeFinanceFeeService.calculateFees({
      creditAmount: 100000.0,
      currency: "EUR",
      tenorDays: 180,
      openingFeeRatePct: 0.2, // 0.2% * 2 quarters = 0.4% = 400 €
    });

    expect(result.quarterPeriods).toBe(2);
    expect(result.calculatedOpeningFeeEur).toBe(400.0);
  });
});

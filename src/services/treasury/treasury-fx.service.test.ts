import { describe, it, expect } from "vitest";
import {
  TreasuryFxService,
  FxPositionInput,
  FxRateEntry,
} from "./treasury-fx.service.js";

describe("TreasuryFxService (Multi-Currency & FX Risk)", () => {
  it("should convert currencies accurately via EUR benchmark rates", () => {
    // 1000 USD to EUR (1.085 USD/EUR) -> 1000 / 1.085 = 921.66 EUR
    const eur = TreasuryFxService.convert(1000, "USD", "EUR");
    expect(eur).toBe(921.66);

    // 1000 EUR to USD -> 1000 * 1.085 = 1085.00 USD
    const usd = TreasuryFxService.convert(1000, "EUR", "USD");
    expect(usd).toBe(1085.0);
  });

  it("should evaluate net exposure and compute unrealized gain/loss", () => {
    const position: FxPositionInput = {
      currency: "USD",
      receivablesAmount: 185000.0,
      payablesAmount: 142000.0,
      averageBookRate: 1.078, // Originally booked at 1.078
      hedgedAmount: 25000.0,
    };

    // Spot rate moved to 1.085
    const evaluation = TreasuryFxService.evaluatePosition(position, 1.085);
    expect(evaluation.netExposure).toBe(43000.0);
    expect(evaluation.exposureDirection).toBe("LONG");
    expect(evaluation.unhedgedAmount).toBe(18000.0);
    // (43000 / 1.085) - (43000 / 1.078) = 39631.34 - 39888.68 = -257.34 EUR
    expect(evaluation.unrealizedGainLossEur).toBe(-257.35);
  });

  it("should generate 30, 60, and 90-day cash flow projections", () => {
    const positions: FxPositionInput[] = [
      {
        currency: "USD",
        receivablesAmount: 100000.0,
        payablesAmount: 60000.0,
        averageBookRate: 1.08,
      },
    ];

    const rates: FxRateEntry[] = [
      {
        fromCurrency: "EUR",
        toCurrency: "USD",
        spotRate: 1.085,
        forward30Rate: 1.0865,
        forward60Rate: 1.088,
        forward90Rate: 1.0895,
      },
    ];

    const projection = TreasuryFxService.projectCashFlow(positions, rates);
    expect(projection.forecasts.length).toBe(3);
    expect(projection.forecasts[0].periodDays).toBe(30);
    expect(projection.forecasts[0].forwardRate).toBe(1.0865);
    expect(projection.forecasts[0].netCashFlowEur).toBeGreaterThan(0);
    expect(projection.summary).toContain("Proyección de tesorería a 90 días");
  });
});

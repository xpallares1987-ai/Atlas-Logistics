/**
 * TreasuryFxService
 *
 * 100% Deterministic Multi-Currency Treasury and Foreign Exchange (FX) Risk Engine.
 * Calculates spot currency conversions, realized/unrealized gains & losses, and 30/60/90-day cash flow projections.
 */

export interface FxRateEntry {
  fromCurrency: string; // EUR
  toCurrency: string; // USD, GBP, JPY, CNY, CHF, AED
  spotRate: number;
  forward30Rate?: number | null;
  forward60Rate?: number | null;
  forward90Rate?: number | null;
}

export interface FxPositionInput {
  currency: string;
  receivablesAmount: number;
  payablesAmount: number;
  averageBookRate: number;
  hedgedAmount?: number;
}

export interface FxPositionEvaluation {
  currency: string;
  receivablesAmount: number;
  payablesAmount: number;
  netExposure: number; // receivables - payables
  exposureDirection: "LONG" | "SHORT" | "BALANCED";
  averageBookRate: number;
  currentSpotRate: number;
  unrealizedGainLossEur: number;
  hedgedAmount: number;
  unhedgedAmount: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

export interface CashFlowPeriodProjection {
  periodDays: 30 | 60 | 90;
  forwardRate: number;
  projectedReceivablesEur: number;
  projectedPayablesEur: number;
  netCashFlowEur: number;
}

export class TreasuryFxService {
  // Default benchmark fallback rates (EUR base)
  public static readonly BENCHMARK_RATES: Record<string, number> = {
    EUR: 1.0,
    USD: 1.085,
    GBP: 0.855,
    CNY: 7.82,
    JPY: 162.4,
    CHF: 0.955,
    AED: 3.985,
  };

  /**
   * Converts an amount between currencies using EUR as base.
   */
  public static convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    customRates?: Record<string, number>,
  ): number {
    const rates = customRates || this.BENCHMARK_RATES;
    const fromRate = rates[fromCurrency] ?? 1.0;
    const toRate = rates[toCurrency] ?? 1.0;

    if (fromCurrency === toCurrency) return Number(amount.toFixed(2));

    // Convert from -> EUR -> to
    const amountInEur = amount / fromRate;
    const result = amountInEur * toRate;
    return Number(result.toFixed(2));
  }

  /**
   * Evaluates unrealized currency exposure and risk level for a foreign currency balance.
   */
  public static evaluatePosition(
    input: FxPositionInput,
    spotRate: number,
  ): FxPositionEvaluation {
    const netExposure = Number(
      (input.receivablesAmount - input.payablesAmount).toFixed(2),
    );
    const hedged = input.hedgedAmount ?? 0;
    const unhedged = Number(
      Math.max(0, Math.abs(netExposure) - hedged).toFixed(2),
    );

    let exposureDirection: FxPositionEvaluation["exposureDirection"] =
      "BALANCED";
    if (netExposure > 0) exposureDirection = "LONG";
    else if (netExposure < 0) exposureDirection = "SHORT";

    // Unrealized Gain/Loss in EUR
    // If we have net USD receivables: (USD / spotRate) - (USD / averageBookRate)
    let unrealizedEur = 0;
    if (input.averageBookRate > 0 && spotRate > 0) {
      const currentEurValue = netExposure / spotRate;
      const originalEurValue = netExposure / input.averageBookRate;
      unrealizedEur = Number((currentEurValue - originalEurValue).toFixed(2));
    }

    // Risk level classification
    let riskLevel: FxPositionEvaluation["riskLevel"] = "LOW";
    const unhedgedEurEquivalent = unhedged / (spotRate > 0 ? spotRate : 1.0);

    if (unhedgedEurEquivalent > 100000) {
      riskLevel = "CRITICAL";
    } else if (unhedgedEurEquivalent > 40000) {
      riskLevel = "HIGH";
    } else if (unhedgedEurEquivalent > 10000) {
      riskLevel = "MODERATE";
    }

    return {
      currency: input.currency,
      receivablesAmount: input.receivablesAmount,
      payablesAmount: input.payablesAmount,
      netExposure,
      exposureDirection,
      averageBookRate: input.averageBookRate,
      currentSpotRate: spotRate,
      unrealizedGainLossEur: unrealizedEur,
      hedgedAmount: hedged,
      unhedgedAmount: unhedged,
      riskLevel,
    };
  }

  /**
   * Generates 30, 60, and 90-day cash flow projections applying forward exchange rates.
   */
  public static projectCashFlow(
    positions: FxPositionInput[],
    rates: FxRateEntry[],
  ): {
    forecasts: CashFlowPeriodProjection[];
    totalProjectedNetEur: number;
    summary: string;
  } {
    const periods: (30 | 60 | 90)[] = [30, 60, 90];
    const forecasts: CashFlowPeriodProjection[] = [];

    for (const period of periods) {
      let projectedRecEur = 0;
      let projectedPayEur = 0;
      let effectiveAvgForwardRate = 1.0;

      for (const pos of positions) {
        if (pos.currency === "EUR") {
          projectedRecEur += pos.receivablesAmount;
          projectedPayEur += pos.payablesAmount;
          continue;
        }

        const rateEntry = rates.find((r) => r.toCurrency === pos.currency);
        let forwardRate =
          rateEntry?.spotRate ?? this.BENCHMARK_RATES[pos.currency] ?? 1.0;
        if (period === 30 && rateEntry?.forward30Rate)
          forwardRate = rateEntry.forward30Rate;
        if (period === 60 && rateEntry?.forward60Rate)
          forwardRate = rateEntry.forward60Rate;
        if (period === 90 && rateEntry?.forward90Rate)
          forwardRate = rateEntry.forward90Rate;

        effectiveAvgForwardRate = forwardRate;
        projectedRecEur += pos.receivablesAmount / forwardRate;
        projectedPayEur += pos.payablesAmount / forwardRate;
      }

      projectedRecEur = Number(projectedRecEur.toFixed(2));
      projectedPayEur = Number(projectedPayEur.toFixed(2));
      const netCashFlowEur = Number(
        (projectedRecEur - projectedPayEur).toFixed(2),
      );

      forecasts.push({
        periodDays: period,
        forwardRate: Number(effectiveAvgForwardRate.toFixed(4)),
        projectedReceivablesEur: projectedRecEur,
        projectedPayablesEur: projectedPayEur,
        netCashFlowEur,
      });
    }

    const totalProjectedNetEur = forecasts.reduce(
      (acc, f) => acc + f.netCashFlowEur,
      0,
    );

    return {
      forecasts,
      totalProjectedNetEur: Number(totalProjectedNetEur.toFixed(2)),
      summary: `Proyección de tesorería a 90 días: Cobros previstos de ${forecasts[2].projectedReceivablesEur.toLocaleString()} € vs Pagos a porteadores de ${forecasts[2].projectedPayablesEur.toLocaleString()} €, saldo neto proyectado: ${forecasts[2].netCashFlowEur.toLocaleString()} €.`,
    };
  }
}

/**
 * CbamFinancialService
 *
 * 100% Deterministic CBAM Certificate Valuation & Foreign Carbon Price Deduction Engine (Art. 9 EU Reg. 2023/956).
 * Computes Gross & Net Carbon Financial Liabilities based on weekly EU ETS benchmark prices and third-country carbon credits.
 */

export interface CbamLiabilityInput {
  totalEmbeddedEmissionsTco2e: number;
  euEtsBenchmarkPriceEur?: number; // Default: 85.50 €/tCO2e
  foreignCarbonPricePaidEur?: number; // Art. 9 deduction (e.g. UK ETS, China ETS)
}

export interface CbamLiabilityResult {
  totalEmbeddedEmissionsTco2e: number;
  euEtsBenchmarkPriceEur: number;
  grossCarbonLiabilityEur: number;
  foreignCarbonPricePaidEur: number;
  netCarbonLiabilityEur: number;
  effectiveCarbonPricePerTco2e: number;
  hasForeignDeduction: boolean;
  notes: string;
}

export class CbamFinancialService {
  public static readonly DEFAULT_EU_ETS_PRICE_EUR = 85.5; // € / tCO2e

  /**
   * Calculates gross EU ETS liability, deducts verified foreign carbon prices paid, and outputs net payable liability.
   */
  public static calculateCarbonLiability(
    input: CbamLiabilityInput,
  ): CbamLiabilityResult {
    const emissions = Math.max(0, input.totalEmbeddedEmissionsTco2e);
    const etsPrice =
      input.euEtsBenchmarkPriceEur ?? this.DEFAULT_EU_ETS_PRICE_EUR;
    const foreignPaid = Math.max(0, input.foreignCarbonPricePaidEur ?? 0.0);

    const grossLiability = Number((emissions * etsPrice).toFixed(2));
    const netLiability = Number(
      Math.max(0, grossLiability - foreignPaid).toFixed(2),
    );

    const effectiveCarbonPricePerTco2e =
      emissions > 0 ? Number((netLiability / emissions).toFixed(2)) : 0.0;

    let notes = "";
    if (foreignPaid > 0) {
      if (foreignPaid >= grossLiability) {
        notes = `La obligación financiera CBAM está 100% cubierta por el precio del carbono satisfecho en origen (${foreignPaid.toFixed(
          2,
        )} € abonados vs ${grossLiability.toFixed(2)} € deuda bruta). Cuota neta: 0.00 €.`;
      } else {
        notes = `Se ha deducido un crédito de ${foreignPaid.toFixed(
          2,
        )} € por precio de carbono satisfecho en origen (Art. 9). Saldo neto liquidable: ${netLiability.toFixed(
          2,
        )} €.`;
      }
    } else {
      notes = `Obligación CBAM calculada al 100% de la cotización EU ETS (${etsPrice.toFixed(
        2,
      )} €/tCO2e). Sin deducciones de terceros países aplicadas.`;
    }

    return {
      totalEmbeddedEmissionsTco2e: emissions,
      euEtsBenchmarkPriceEur: etsPrice,
      grossCarbonLiabilityEur: grossLiability,
      foreignCarbonPricePaidEur: foreignPaid,
      netCarbonLiabilityEur: netLiability,
      effectiveCarbonPricePerTco2e,
      hasForeignDeduction: foreignPaid > 0,
      notes,
    };
  }
}

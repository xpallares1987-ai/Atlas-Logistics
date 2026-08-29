/**
 * ETS Maritime Service
 *
 * Implements deterministic calculations for the inclusion of maritime transport activities
 * in the European Union Emissions Trading System (EU ETS) pursuant to Directive (EU) 2023/959.
 *
 * Key Legal Rules & Multipliers:
 * 1. Geographic Scopes (Directive 2003/87/EC Art. 3gb):
 *    - INTRA_EU_100: 100% of emissions between two EU/EEA ports.
 *    - BERTH_PORT_EU_100: 100% of emissions while at berth in an EU port.
 *    - EXTRA_EU_50: 50% of emissions for incoming/outgoing voyages between an EU port and a third-country port.
 *
 * 2. Multi-Gas Global Warming Potential (GWP AR5):
 *    - CO2: 1.0
 *    - CH4 (Methane): 28.0
 *    - N2O (Nitrous Oxide): 265.0
 *
 * 3. Green Bunker Adjustment Factor (Green BAF / ETS Surcharge):
 *    Surcharge per TEU (€) = (FuelEU Compliance Impact + EU ETS Liability) / Total Carried TEUs
 */

export type MaritimeScope =
  "INTRA_EU_100" | "EXTRA_EU_50" | "BERTH_PORT_EU_100";

export interface EtsCalculationInput {
  co2EmissionsTonnes: number;
  ch4EmissionsTonnes?: number;
  n2oEmissionsTonnes?: number;
  scope: MaritimeScope;
  euaPriceEurPerTonne?: number; // Defaults to 75.00 €/EUA
}

export interface EtsCalculationResult {
  scope: MaritimeScope;
  scopeFactor: number;
  grossCo2Tonnes: number;
  grossCh4GwpTonnesCo2eq: number;
  grossN2oGwpTonnesCo2eq: number;
  totalGrossGhgTco2eq: number;
  applicableScopeEmissionsTco2eq: number;
  euaPriceEurPerTonne: number;
  totalEtsFinancialLiabilityEur: number;
}

export interface GreenBafInput {
  carriedTeus: number;
  fueleuPenaltyOrFuelPremiumEur: number;
  etsFinancialLiabilityEur: number;
}

export interface GreenBafResult {
  carriedTeus: number;
  fueleuImpactPerTeuEur: number;
  etsImpactPerTeuEur: number;
  totalGreenBafSurchargePerTeuEur: number;
  totalGreenSurchargeFor40FtContainerEur: number; // 2 TEUs
}

export class EtsMaritimeService {
  /**
   * Statutory Global Warming Potentials (IPCC 5th Assessment Report)
   */
  public static readonly GWP_CH4 = 28.0;
  public static readonly GWP_N2O = 265.0;

  /**
   * Reference EUA (European Union Allowance) carbon price
   */
  public static readonly DEFAULT_EUA_PRICE_EUR = 75.0;

  /**
   * Returns statutory geographical scope factor
   */
  public static getScopeFactor(scope: MaritimeScope): number {
    switch (scope) {
      case "INTRA_EU_100":
      case "BERTH_PORT_EU_100":
        return 1.0;
      case "EXTRA_EU_50":
        return 0.5;
      default:
        return 1.0;
    }
  }

  /**
   * Calculates total gross GHG emissions and applicable EU ETS compliance surrender obligation.
   */
  public static calculateEtsLiability(
    input: EtsCalculationInput,
  ): EtsCalculationResult {
    const scopeFactor = this.getScopeFactor(input.scope);
    const grossCo2Tonnes = Number((input.co2EmissionsTonnes || 0).toFixed(3));
    const ch4Tonnes = input.ch4EmissionsTonnes || 0;
    const n2oTonnes = input.n2oEmissionsTonnes || 0;

    const grossCh4GwpTonnesCo2eq = Number(
      (ch4Tonnes * this.GWP_CH4).toFixed(3),
    );
    const grossN2oGwpTonnesCo2eq = Number(
      (n2oTonnes * this.GWP_N2O).toFixed(3),
    );

    const totalGrossGhgTco2eq = Number(
      (
        grossCo2Tonnes +
        grossCh4GwpTonnesCo2eq +
        grossN2oGwpTonnesCo2eq
      ).toFixed(3),
    );

    const applicableScopeEmissionsTco2eq = Number(
      (totalGrossGhgTco2eq * scopeFactor).toFixed(3),
    );

    const euaPriceEurPerTonne =
      input.euaPriceEurPerTonne ?? this.DEFAULT_EUA_PRICE_EUR;

    const totalEtsFinancialLiabilityEur = Number(
      (applicableScopeEmissionsTco2eq * euaPriceEurPerTonne).toFixed(2),
    );

    return {
      scope: input.scope,
      scopeFactor,
      grossCo2Tonnes,
      grossCh4GwpTonnesCo2eq,
      grossN2oGwpTonnesCo2eq,
      totalGrossGhgTco2eq,
      applicableScopeEmissionsTco2eq,
      euaPriceEurPerTonne,
      totalEtsFinancialLiabilityEur,
    };
  }

  /**
   * Calculates Green BAF (Bunker Adjustment Factor) and ETS surcharge per TEU.
   */
  public static calculateGreenBaf(input: GreenBafInput): GreenBafResult {
    const carriedTeus = Math.max(1, input.carriedTeus);

    const fueleuImpactPerTeuEur = Number(
      (input.fueleuPenaltyOrFuelPremiumEur / carriedTeus).toFixed(2),
    );
    const etsImpactPerTeuEur = Number(
      (input.etsFinancialLiabilityEur / carriedTeus).toFixed(2),
    );

    const totalGreenBafSurchargePerTeuEur = Number(
      (fueleuImpactPerTeuEur + etsImpactPerTeuEur).toFixed(2),
    );

    // A standard 40ft (FEU) container equals 2 TEUs
    const totalGreenSurchargeFor40FtContainerEur = Number(
      (totalGreenBafSurchargePerTeuEur * 2.0).toFixed(2),
    );

    return {
      carriedTeus: input.carriedTeus,
      fueleuImpactPerTeuEur,
      etsImpactPerTeuEur,
      totalGreenBafSurchargePerTeuEur,
      totalGreenSurchargeFor40FtContainerEur,
    };
  }
}

/**
 * CbamCalculatorService
 *
 * 100% Deterministic Embedded Emissions & Precursor Calculator (EU Reg. 2023/956 & 2023/1773).
 * Calculates Direct (Scope 1), Indirect (Scope 2 electricity), and Precursor Emissions for CBAM goods.
 */

export interface PrecursorMaterial {
  cnCode: string;
  description: string;
  consumptionPerTonneProduct: number; // tonnes of precursor per tonne of final good
  embeddedDirectFactor: number; // tCO2e / tonne of precursor
  embeddedIndirectFactor: number; // tCO2e / tonne of precursor
}

export interface CbamEmissionInput {
  netWeightTonnes: number;
  directEmissionFactor: number; // tCO2e / tonne
  indirectEmissionFactor: number; // tCO2e / tonne
  precursors?: PrecursorMaterial[];
  euDefaultDirectFactor?: number;
  euDefaultIndirectFactor?: number;
}

export interface CbamEmissionResult {
  netWeightTonnes: number;
  specificDirectFactor: number;
  specificIndirectFactor: number;
  specificPrecursorFactor: number;
  totalSpecificFactor: number;
  directEmissionsTco2e: number;
  indirectEmissionsTco2e: number;
  precursorEmissionsTco2e: number;
  totalEmbeddedEmissionsTco2e: number;
  comparisonWithEuDefaults?: {
    euDefaultTotalTco2e: number;
    deltaTco2e: number;
    percentageSavingsVsDefault: number;
  };
}

export class CbamCalculatorService {
  /**
   * Calculates total embedded emissions with direct, indirect and complex precursor components.
   */
  public static calculateEmbeddedEmissions(
    input: CbamEmissionInput,
  ): CbamEmissionResult {
    const netWeight = Math.max(0, input.netWeightTonnes);
    const directFactor = Math.max(0, input.directEmissionFactor);
    const indirectFactor = Math.max(0, input.indirectEmissionFactor);

    // Calculate precursor specific emissions (if complex good)
    let specificPrecursorFactor = 0;
    if (input.precursors && input.precursors.length > 0) {
      for (const prec of input.precursors) {
        const precTotalFactor =
          prec.embeddedDirectFactor + prec.embeddedIndirectFactor;
        specificPrecursorFactor +=
          prec.consumptionPerTonneProduct * precTotalFactor;
      }
    }

    const totalSpecificFactor = Number(
      (directFactor + indirectFactor + specificPrecursorFactor).toFixed(4),
    );

    const directEmissionsTco2e = Number((netWeight * directFactor).toFixed(2));
    const indirectEmissionsTco2e = Number(
      (netWeight * indirectFactor).toFixed(2),
    );
    const precursorEmissionsTco2e = Number(
      (netWeight * specificPrecursorFactor).toFixed(2),
    );

    const totalEmbeddedEmissionsTco2e = Number(
      (
        directEmissionsTco2e +
        indirectEmissionsTco2e +
        precursorEmissionsTco2e
      ).toFixed(2),
    );

    // Compare with EU Default values if provided
    let comparisonWithEuDefaults: CbamEmissionResult["comparisonWithEuDefaults"];
    if (
      input.euDefaultDirectFactor !== undefined &&
      input.euDefaultIndirectFactor !== undefined
    ) {
      const defaultTotalFactor =
        input.euDefaultDirectFactor + input.euDefaultIndirectFactor;
      const euDefaultTotalTco2e = Number(
        (netWeight * defaultTotalFactor).toFixed(2),
      );
      const deltaTco2e = Number(
        (totalEmbeddedEmissionsTco2e - euDefaultTotalTco2e).toFixed(2),
      );
      const percentageSavingsVsDefault =
        euDefaultTotalTco2e > 0
          ? Number(
              (
                ((euDefaultTotalTco2e - totalEmbeddedEmissionsTco2e) /
                  euDefaultTotalTco2e) *
                100
              ).toFixed(2),
            )
          : 0;

      comparisonWithEuDefaults = {
        euDefaultTotalTco2e,
        deltaTco2e,
        percentageSavingsVsDefault,
      };
    }

    return {
      netWeightTonnes: netWeight,
      specificDirectFactor: directFactor,
      specificIndirectFactor: indirectFactor,
      specificPrecursorFactor: Number(specificPrecursorFactor.toFixed(4)),
      totalSpecificFactor,
      directEmissionsTco2e,
      indirectEmissionsTco2e,
      precursorEmissionsTco2e,
      totalEmbeddedEmissionsTco2e,
      comparisonWithEuDefaults,
    };
  }
}

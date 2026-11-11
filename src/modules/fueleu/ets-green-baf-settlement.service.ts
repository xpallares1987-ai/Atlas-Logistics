/**
 * @file ets-green-baf-settlement.service.ts
 * @description EU ETS Maritime Settlement & Green Bunker Adjustment Factor (Green BAF)
 * pursuant to Directive (EU) 2023/959 and Directive 2003/87/EC (ETS Phase-In Schedule).
 */

import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { EtsMaritimeService, MaritimeScope } from "./ets-maritime.service.js";

export interface EtsPhaseInSettlementParams {
  reportingYear?: number;
  scope: MaritimeScope;
  co2EmissionsTonnes: number;
  ch4EmissionsTonnes?: number;
  n2oEmissionsTonnes?: number;
  euaPriceEurPerTonne?: number;
  carriedTeus?: number;
  fueleuPenaltyOrPremiumEur?: number;
}

export interface EtsSettlementResult {
  reportingYear: number;
  phaseInRate: number; // e.g. 0.70 for 2025, 1.00 for 2026
  scope: MaritimeScope;
  scopeFactor: number; // 1.0 for intra-EU / berth, 0.5 for extra-EU
  grossGhgTco2eq: number;
  scopeSubjectGhgTco2eq: number;
  statutorySurrenderObligationEuaTonnes: number;
  euaPriceEurPerTonne: number;
  totalEtsFinancialLiabilityEur: number;
  carriedTeus: number;
  fueleuImpactPerTeuEur: number;
  etsImpactPerTeuEur: number;
  totalGreenBafSurchargePerTeuEur: number;
  totalGreenBaf40FtContainerEur: number;
}

export class EtsGreenBafSettlementService {
  public static readonly DEFAULT_EUA_PRICE = 75.0; // 75 €/tonne EUA allowance

  /**
   * Directive (EU) 2023/959 phase-in schedule:
   * 2024: 40% surrender obligation
   * 2025: 70% surrender obligation
   * 2026 onwards: 100% surrender obligation
   */
  public static getPhaseInRate(year: number): number {
    if (year <= 2024) return 0.4;
    if (year === 2025) return 0.7;
    return 1.0;
  }

  /**
   * Computes statutory EU ETS compliance obligation with exact phase-in rate and Green BAF per TEU
   */
  public static calculateEtsAndGreenBaf(
    params: EtsPhaseInSettlementParams,
  ): EtsSettlementResult {
    const year = params.reportingYear || 2026;
    const phaseInRate = this.getPhaseInRate(year);
    const scopeFactor = EtsMaritimeService.getScopeFactor(params.scope);

    const grossCo2 = params.co2EmissionsTonnes || 0;
    const ch4 = params.ch4EmissionsTonnes || 0;
    const n2o = params.n2oEmissionsTonnes || 0;

    const grossGhgTco2eq = Number(
      (
        grossCo2 +
        ch4 * EtsMaritimeService.GWP_CH4 +
        n2o * EtsMaritimeService.GWP_N2O
      ).toFixed(3),
    );

    const scopeSubjectGhgTco2eq = Number(
      (grossGhgTco2eq * scopeFactor).toFixed(3),
    );

    // Apply statutory phase-in percentage (40% / 70% / 100%)
    const statutorySurrenderObligationEuaTonnes = Number(
      (scopeSubjectGhgTco2eq * phaseInRate).toFixed(3),
    );

    const euaPrice = params.euaPriceEurPerTonne ?? this.DEFAULT_EUA_PRICE;
    const totalEtsFinancialLiabilityEur = Number(
      (statutorySurrenderObligationEuaTonnes * euaPrice).toFixed(2),
    );

    // Green BAF per carried container
    const carriedTeus = Math.max(1, params.carriedTeus || 1);
    const fueleuImpactEur = params.fueleuPenaltyOrPremiumEur || 0;

    const fueleuImpactPerTeuEur = Number(
      (fueleuImpactEur / carriedTeus).toFixed(2),
    );
    const etsImpactPerTeuEur = Number(
      (totalEtsFinancialLiabilityEur / carriedTeus).toFixed(2),
    );
    const totalGreenBafSurchargePerTeuEur = Number(
      (fueleuImpactPerTeuEur + etsImpactPerTeuEur).toFixed(2),
    );
    const totalGreenBaf40FtContainerEur = Number(
      (totalGreenBafSurchargePerTeuEur * 2.0).toFixed(2),
    );

    return {
      reportingYear: year,
      phaseInRate,
      scope: params.scope,
      scopeFactor,
      grossGhgTco2eq,
      scopeSubjectGhgTco2eq,
      statutorySurrenderObligationEuaTonnes,
      euaPriceEurPerTonne: euaPrice,
      totalEtsFinancialLiabilityEur,
      carriedTeus,
      fueleuImpactPerTeuEur,
      etsImpactPerTeuEur,
      totalGreenBafSurchargePerTeuEur,
      totalGreenBaf40FtContainerEur,
    };
  }

  /**
   * Settles Green BAF and ETS liability for a voyage from the database
   */
  public static async settleVoyageGreenBaf(
    voyageId: string,
    customEuaPrice?: number,
  ) {
    const [voyage] = await db
      .select()
      .from(schema.marineVoyages)
      .where(eq(schema.marineVoyages.id, voyageId));

    if (!voyage) {
      throw new Error(`Voyage '${voyageId}' not found`);
    }

    const voyageYear = new Date(voyage.departureDate).getFullYear() || 2026;

    return this.calculateEtsAndGreenBaf({
      reportingYear: voyageYear,
      scope: (voyage.geographicScope as MaritimeScope) || "INTRA_EU_100",
      co2EmissionsTonnes: voyage.co2EmissionsTonnes,
      ch4EmissionsTonnes: voyage.ch4EmissionsTonnes,
      n2oEmissionsTonnes: voyage.n2oEmissionsTonnes,
      euaPriceEurPerTonne: customEuaPrice,
      carriedTeus: voyage.carriedTeuCount,
    });
  }

  /**
   * Settle and attribute Green BAF specifically to a shipment (e.g. sh_demo_01)
   */
  public static async settleGreenBafForShipment(params: {
    shipmentId: string;
    voyageId: string;
    teuCount: number;
    customEuaPrice?: number;
  }) {
    const voyageSettlement = await this.settleVoyageGreenBaf(
      params.voyageId,
      params.customEuaPrice,
    );

    const shipmentTotalGreenBafEur = Number(
      (
        voyageSettlement.totalGreenBafSurchargePerTeuEur * params.teuCount
      ).toFixed(2),
    );

    return {
      shipmentId: params.shipmentId,
      voyageId: params.voyageId,
      teuCount: params.teuCount,
      greenBafPerTeuEur: voyageSettlement.totalGreenBafSurchargePerTeuEur,
      shipmentTotalGreenBafEur,
      breakdown: {
        fueleuShareEur: Number(
          (voyageSettlement.fueleuImpactPerTeuEur * params.teuCount).toFixed(2),
        ),
        etsShareEur: Number(
          (voyageSettlement.etsImpactPerTeuEur * params.teuCount).toFixed(2),
        ),
      },
      auditReference: `ETS-SETTLE-${new Date().getFullYear()}-${params.shipmentId.slice(-6).toUpperCase()}`,
      settledAt: new Date().toISOString(),
    };
  }
}

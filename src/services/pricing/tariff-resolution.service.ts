/**
 * @file tariff-resolution.service.ts
 * @description Operational freight tariff resolution, temporal validity filtering, and dynamic formula surcharge calculation service.
 * @module @atlas/services/pricing/tariff-resolution
 * @see {@link docs/architecture/tariff-engine.md}
 */

import { v4 as uuidv4 } from "uuid";
import { db } from "../../db/index.js";
import {
  rates,
  lanes,
  addresses,
  locations,
  surcharges,
  quotes,
} from "../../db/schema/index.js";
import { eq, and, sql, lte, gte } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import {
  RatingContext,
  RatedFreightQuote,
  CommercialContractRate,
  SurchargeDefinition,
  evaluateSurcharge,
  getCategoryPrecedence,
  validateProfitMargin,
  MarginValidationResult,
} from "@atlas/shared";
import { logger } from "../../config/logger.js";

// ============================================================================
// 1. INTERFACES
// ============================================================================

export interface TariffResolutionQuery {
  originLocode: string;
  destinationLocode: string;
  containerType: string;
  etd: string | Date;
  carrierId?: string;
  containerCount?: number;
  targetCurrency?: string;
  currentBunkerPrice?: number;
}

export interface InvalidateRateResult {
  rateId: string;
  invalidatedAt: string;
  previousValidTo: string | null;
  status: "INVALIDATED";
}

// ============================================================================
// 2. TARIFF RESOLUTION SERVICE
// ============================================================================

export class TariffResolutionService {
  /**
   * Resolves valid commercial rates based on Lane and ETD temporality.
   * Enforces: effectiveDate (validFrom) <= ETD <= expirationDate (validTo)
   */
  public static async resolveRatesForETD(
    query: TariffResolutionQuery,
  ): Promise<RatedFreightQuote[]> {
    const etdDate = new Date(query.etd);
    const etdTimestamp = etdDate.getTime();

    const originAlias = alias(locations, "origin_loc");
    const destinationAlias = alias(locations, "dest_loc");

    const matchedRateRows = await db
      .select({
        id: rates.id,
        carrierId: rates.carrierId,
        carrierName: sql<string>`COALESCE(${addresses.tradeName}, ${addresses.companyName})`,
        containerType: rates.containerType,
        baseRate: rates.baseRate,
        baf: rates.baf,
        pss: rates.pss,
        thc: rates.thc,
        serviceLine: rates.serviceLine,
        transitDays: rates.transitDays,
        validFrom: rates.validFrom,
        validTo: rates.validTo,
        originLocode: originAlias.id,
        destinationLocode: destinationAlias.id,
      })
      .from(rates)
      .leftJoin(addresses, eq(rates.carrierId, addresses.id))
      .innerJoin(lanes, eq(rates.laneId, lanes.id))
      .innerJoin(originAlias, eq(lanes.originLocationId, originAlias.id))
      .innerJoin(
        destinationAlias,
        eq(lanes.destinationLocationId, destinationAlias.id),
      )
      .where(
        and(
          eq(originAlias.id, query.originLocode),
          eq(destinationAlias.id, query.destinationLocode),
          eq(rates.containerType, query.containerType),
          query.carrierId ? eq(rates.carrierId, query.carrierId) : undefined,
          // Temporal validity filter
          lte(rates.validFrom, etdDate),
          gte(rates.validTo, etdDate),
        ),
      );

    if (matchedRateRows.length === 0) {
      return [];
    }

    const ratedQuotes: RatedFreightQuote[] = [];

    for (const r of matchedRateRows) {
      // Fetch surcharges attached to this rate
      const attachedSurcharges = await db
        .select()
        .from(surcharges)
        .where(eq(surcharges.rateId, r.id));

      const surchargeDefs: SurchargeDefinition[] = [];

      // Add base legacy surcharges from rate row if present
      if (r.baf > 0) {
        surchargeDefs.push({
          id: `baf_${r.id}`,
          chargeCode: "BAF",
          chargeName: "Bunker Adjustment Factor",
          category: "FREIGHT",
          calculationMethod: "DYNAMIC_JSON",
          originalAmount: r.baf,
          originalCurrency: "USD",
          dynamicRules: {
            ruleType: "BAF_FUEL_INDEX",
            baselineBunkerPrice: 600,
            currentBunkerPrice: query.currentBunkerPrice || 645,
          },
        });
      }
      if (r.pss > 0) {
        surchargeDefs.push({
          id: `pss_${r.id}`,
          chargeCode: "PSS",
          chargeName: "Peak Season Surcharge",
          category: "FREIGHT",
          calculationMethod: "DYNAMIC_JSON",
          originalAmount: r.pss,
          originalCurrency: "USD",
          dynamicRules: {
            ruleType: "PEAK_SEASON_SURGE",
            peakSeasonStart: "2026-07-01",
            peakSeasonEnd: "2026-10-31",
            peakSeasonSurgeAmount: 300,
          },
        });
      }
      if (r.thc > 0) {
        surchargeDefs.push({
          id: `thc_${r.id}`,
          chargeCode: "THC",
          chargeName: "Terminal Handling Charge (Origin/Dest)",
          category: "ORIGIN_LOCAL",
          calculationMethod: "PER_CONTAINER",
          originalAmount: r.thc,
          originalCurrency: "USD",
        });
      }

      // Add dynamic ETS Maritime surcharge for EU routes
      if (
        query.destinationLocode.startsWith("ES") ||
        query.destinationLocode.startsWith("NL")
      ) {
        surchargeDefs.push({
          id: `ets_${r.id}`,
          chargeCode: "ETS",
          chargeName: "EU ETS Maritime Decarbonization Surcharge",
          category: "ADMIN",
          calculationMethod: "DYNAMIC_JSON",
          originalAmount: 35.0,
          originalCurrency: "EUR",
          exchangeRate: 1.08,
          dynamicRules: {
            ruleType: "EU_ETS_MARITIME",
            co2FactorPerTeu: 0.42,
            carbonPriceEurPerTon: 68.0,
          },
        });
      }

      // Append DB surcharges
      for (const s of attachedSurcharges) {
        surchargeDefs.push({
          id: s.id,
          chargeCode: s.name,
          chargeName: s.name,
          category: "ORIGIN_LOCAL",
          calculationMethod: "PER_CONTAINER",
          originalAmount: s.amount,
          originalCurrency: s.currency,
        });
      }

      const ratingContext: RatingContext = {
        etd: query.etd,
        containerType: query.containerType,
        containerCount: query.containerCount ?? 1,
        targetCurrency: query.targetCurrency || "USD",
        currentBunkerPrice: query.currentBunkerPrice || 645,
      };

      const baseFreightAmount = r.baseRate * (query.containerCount ?? 1);

      // Evaluate surcharges in strict order
      const sortedSurcharges = [...surchargeDefs].sort(
        (a, b) =>
          getCategoryPrecedence(a.category) - getCategoryPrecedence(b.category),
      );

      const evaluatedLines = sortedSurcharges.map((s) =>
        evaluateSurcharge(s, baseFreightAmount, ratingContext),
      );

      const totalSurchargesAmount =
        Math.round(
          evaluatedLines.reduce((sum, l) => sum + l.calculatedAmount, 0) * 100,
        ) / 100;

      const totalFreightAmount =
        Math.round((baseFreightAmount + totalSurchargesAmount) * 100) / 100;

      ratedQuotes.push({
        rateId: r.id,
        contractReference: `CTR-${r.carrierName.replace(/\s+/g, "").toUpperCase()}-2026`,
        carrierName: r.carrierName,
        originLocationId: r.originLocode,
        destinationLocationId: r.destinationLocode,
        containerType: r.containerType,
        etd: etdDate.toISOString().split("T")[0],
        baseFreightAmount,
        totalSurchargesAmount,
        totalFreightAmount,
        currency: query.targetCurrency || "USD",
        evaluatedLines,
        effectiveDate: r.validFrom
          ? r.validFrom.toISOString().split("T")[0]
          : "2026-01-01",
        expirationDate: r.validTo
          ? r.validTo.toISOString().split("T")[0]
          : "2026-12-31",
      });
    }

    return ratedQuotes;
  }

  /**
   * Enforces Append-Only rate lifecycle: never DELETE a rate row.
   * To invalidate early, update validTo to the current timestamp.
   */
  public static async invalidateRateEarly(
    rateId: string,
  ): Promise<InvalidateRateResult> {
    const existing = await db
      .select({
        id: rates.id,
        validTo: rates.validTo,
      })
      .from(rates)
      .where(eq(rates.id, rateId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error(`Rate with ID '${rateId}' not found`);
    }

    const now = new Date();
    await db
      .update(rates)
      .set({
        validTo: now,
        updatedAt: now,
      })
      .where(eq(rates.id, rateId));

    logger.info(
      { rateId, invalidatedAt: now.toISOString() },
      "Commercial rate invalidated early (append-only policy)",
    );

    return {
      rateId,
      invalidatedAt: now.toISOString(),
      previousValidTo: existing[0].validTo
        ? existing[0].validTo.toISOString()
        : null,
      status: "INVALIDATED",
    };
  }

  /**
   * Evaluates profit margin for a potential quote against corporate guidelines.
   */
  public static evaluateQuoteMargin(
    buyRateTotal: number,
    sellRateTotal: number,
    minMarginPercent = 15.0,
    currency = "USD",
  ): MarginValidationResult {
    return validateProfitMargin(
      buyRateTotal,
      sellRateTotal,
      minMarginPercent,
      currency,
    );
  }
}

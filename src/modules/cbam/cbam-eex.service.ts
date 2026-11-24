/**
 * @file cbam-eex.service.ts
 * @description Service for fetching, recording, and resolving official weekly European Energy Exchange (EEX) EUA carbon auction benchmark quotes under Regulation (EU) 2023/956.
 * @module @atlas/api/modules/cbam/services/cbam-eex
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { db } from "../../db/index.js";
import { cbamEexQuotes } from "../../db/schema/cbam.js";
import { eq, desc, lte, gte, and } from "drizzle-orm";

export interface RecordEexQuoteInput {
  quoteWeek: string; // e.g. "2026-W42"
  validFrom: string; // ISO date string YYYY-MM-DD
  validUntil: string; // ISO date string YYYY-MM-DD
  auctionAveragePriceEur: number;
  source?: "EEX_AUCTION" | "COMMISSION_PUBLICATION" | "CONFIGURED_FALLBACK";
}

export interface ResolvedEexQuote {
  quoteWeek: string;
  auctionAveragePriceEur: number;
  scaledPrice: number;
  source: string;
  isFallback: boolean;
}

export class CbamEexService {
  public static readonly DEFAULT_BENCHMARK_PRICE_EUR = 85.5;

  /**
   * Records or updates a weekly EEX carbon auction price benchmark.
   */
  public static async recordQuote(
    input: RecordEexQuoteInput,
  ): Promise<typeof cbamEexQuotes.$inferSelect> {
    const id = `eex-${input.quoteWeek}`;
    const scaledPrice = Math.round(input.auctionAveragePriceEur * 1_000_000);
    const publishedAt = new Date().toISOString();
    const source = input.source ?? "EEX_AUCTION";

    const existing = await db
      .select()
      .from(cbamEexQuotes)
      .where(eq(cbamEexQuotes.quoteWeek, input.quoteWeek))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(cbamEexQuotes)
        .set({
          validFrom: input.validFrom,
          validUntil: input.validUntil,
          auctionAveragePriceEur: input.auctionAveragePriceEur,
          scaledPrice,
          publishedAt,
          source,
        })
        .where(eq(cbamEexQuotes.id, existing[0].id));

      const updated = await db
        .select()
        .from(cbamEexQuotes)
        .where(eq(cbamEexQuotes.id, existing[0].id))
        .limit(1);
      return updated[0];
    }

    const newRecord = {
      id,
      quoteWeek: input.quoteWeek,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      auctionAveragePriceEur: input.auctionAveragePriceEur,
      scaledPrice,
      publishedAt,
      source,
    };

    await db.insert(cbamEexQuotes).values(newRecord);
    return newRecord as typeof cbamEexQuotes.$inferSelect;
  }

  /**
   * Retrieves all recorded EEX quotes, ordered chronologically descending.
   */
  public static async listQuotes(
    limit = 52,
  ): Promise<Array<typeof cbamEexQuotes.$inferSelect>> {
    return db
      .select()
      .from(cbamEexQuotes)
      .orderBy(desc(cbamEexQuotes.validFrom))
      .limit(limit);
  }

  /**
   * Resolves the active EEX quote for a specific date or reporting week.
   * Falls back to the official default benchmark if no published quote covers the date.
   */
  public static async resolveActiveQuote(
    targetDate = new Date(),
  ): Promise<ResolvedEexQuote> {
    const dateStr = targetDate.toISOString().slice(0, 10);

    const matches = await db
      .select()
      .from(cbamEexQuotes)
      .where(
        and(
          lte(cbamEexQuotes.validFrom, dateStr),
          gte(cbamEexQuotes.validUntil, dateStr),
        ),
      )
      .limit(1);

    if (matches.length > 0) {
      const match = matches[0];
      return {
        quoteWeek: match.quoteWeek,
        auctionAveragePriceEur: match.auctionAveragePriceEur,
        scaledPrice: match.scaledPrice,
        source: match.source,
        isFallback: false,
      };
    }

    // Try finding the most recent published quote
    const latest = await db
      .select()
      .from(cbamEexQuotes)
      .orderBy(desc(cbamEexQuotes.validUntil))
      .limit(1);

    if (latest.length > 0) {
      return {
        quoteWeek: latest[0].quoteWeek,
        auctionAveragePriceEur: latest[0].auctionAveragePriceEur,
        scaledPrice: latest[0].scaledPrice,
        source: latest[0].source,
        isFallback: false,
      };
    }

    // Fallback to configured default
    return {
      quoteWeek: "DEFAULT-BENCHMARK",
      auctionAveragePriceEur: this.DEFAULT_BENCHMARK_PRICE_EUR,
      scaledPrice: Math.round(this.DEFAULT_BENCHMARK_PRICE_EUR * 1_000_000),
      source: "CONFIGURED_FALLBACK",
      isFallback: true,
    };
  }
}

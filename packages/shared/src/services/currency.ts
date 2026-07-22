import { z } from "zod";

// Frankfurter API Response Schema
const CurrencyResponseSchema = z.object({
  amount: z.number(),
  base: z.string(),
  date: z.string(),
  rates: z.record(z.string(), z.number()),
});

export type CurrencyResponse = z.infer<typeof CurrencyResponseSchema>;

interface CacheEntry {
  data: number;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Fetches the exchange rate between a base currency and a target currency using Frankfurter API.
 * Uses an in-memory map to cache rates for 12 hours to prevent rate limits and ensure resilience.
 *
 * @param baseCurrency 3-letter currency code (e.g. USD)
 * @param targetCurrency 3-letter currency code (e.g. EUR)
 * @returns The exchange rate as a float, or a fallback of 1.0 if the API fails entirely.
 */
export async function getExchangeRate(
  baseCurrency: string,
  targetCurrency: string,
): Promise<number> {
  const cacheKey = `${baseCurrency}_${targetCurrency}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Same currency fast return
  if (baseCurrency === targetCurrency) {
    return 1.0;
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${targetCurrency}`,
    );

    if (!response.ok) {
      throw new Error(`Frankfurter API returned status: ${response.status}`);
    }

    const json = await response.json();
    const validatedData = CurrencyResponseSchema.parse(json);

    const rate = validatedData.rates[targetCurrency];
    if (typeof rate !== "number") {
      throw new Error("Invalid rate returned by API");
    }

    cache.set(cacheKey, { data: rate, timestamp: Date.now() });
    return rate;
  } catch (error) {
    console.error(`Failed to fetch exchange rate for ${cacheKey}:`, error);
    // If we have a stale cache, return it as a fallback instead of failing
    if (cached) {
      console.warn(`Using stale cache for exchange rate ${cacheKey}`);
      return cached.data;
    }
    // Final fallback so the system doesn't crash on completely new requests
    return 1.0;
  }
}

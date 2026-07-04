/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

/**
 * Industrialization Phase 4: Multi-currency support.
 * Provides real-time currency conversion for freight rates.
 */
export const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  CNY: 7.24,
  JPY: 156.4
};

const CACHE_KEY = "control_tower_exchange_rates";
const CACHE_EXPIRY_KEY = "control_tower_exchange_rates_expiry";
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Initializes currency rates by loading from local storage cache or fetching live data.
 */
export async function initializeCurrencyRates(): Promise<void> {
  try {
    const cachedRates = localStorage.getItem(CACHE_KEY);
    const cachedExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    const now = Date.now();

    if (cachedRates && cachedExpiry && now < Number(cachedExpiry)) {
      const parsed = JSON.parse(cachedRates);
      Object.assign(CURRENCY_RATES, parsed);
      console.log("[CurrencyService] Loaded cached exchange rates:", CURRENCY_RATES);
      return;
    }

    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) throw new Error("Exchange rate API request failed");
    const data = await response.json();
    
    if (data && data.rates) {
      const newRates: Record<string, number> = {};
      Object.keys(CURRENCY_RATES).forEach(currency => {
        if (data.rates[currency]) {
          newRates[currency] = data.rates[currency];
        }
      });
      Object.assign(CURRENCY_RATES, newRates);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newRates));
      localStorage.setItem(CACHE_EXPIRY_KEY, (now + CACHE_DURATION).toString());
      console.log("[CurrencyService] Fetched and updated live exchange rates:", CURRENCY_RATES);
    }
  } catch (error) {
    console.error("[CurrencyService] Failed to fetch live exchange rates, using defaults:", error);
  }
}

/**
 * Converts an amount from one currency to another.
 */
export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const fromRate = CURRENCY_RATES[from] || 1.0;
  const toRate = CURRENCY_RATES[to] || 1.0;
  
  // amount in base (USD) = amount / fromRate
  // amount in target = (amount / fromRate) * toRate
  return (amount / fromRate) * toRate;
}

/**
 * Formats currency based on locale.
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

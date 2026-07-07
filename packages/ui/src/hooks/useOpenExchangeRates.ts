import { useState, useEffect } from 'react';

interface ExchangeRates {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export function useOpenExchangeRates(baseCurrency: string = 'USD') {
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1, EUR: 0.9, GBP: 0.75 }); // fallbacks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRates() {
      try {
        setLoading(true);
        // Frankfurter API is a free, open-source API for current and historical foreign exchange rates published by the ECB.
        // It does not require an API key or registration.
        const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
        if (!response.ok) {
          throw new Error('Failed to fetch exchange rates');
        }
        const data: ExchangeRates = await response.json();
        setRates({
          [baseCurrency]: 1,
          ...data.rates,
        });
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
        setError('Could not load live rates, using fallback values.');
      } finally {
        setLoading(false);
      }
    }

    fetchRates();
  }, [baseCurrency]);

  return { rates, loading, error };
}

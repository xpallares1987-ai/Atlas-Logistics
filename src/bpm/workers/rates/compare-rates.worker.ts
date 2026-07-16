import { AtlasWorker } from '../../utils/worker-base.js';

interface CompareRatesInput {
  rates: Array<{
    id: string;
    carrier: string;
    totalCost: number;
    transitTime: number;
    baseOceanFreight: number;
    baf: number;
    pss: number;
    thc: number;
  }>;
  preferCost?: boolean;
  preferSpeed?: boolean;
}

interface RankedRate {
  rank: number;
  id: string;
  carrier: string;
  totalCost: number;
  transitTime: number;
  score: number;
  recommendation: string;
}

interface CompareRatesOutput {
  rankedRates: RankedRate[];
  bestValue: RankedRate;
  cheapest: RankedRate;
  fastest: RankedRate;
  comparisonSummary: string;
}

/**
 * Ranks and scores carrier rates based on cost, transit time,
 * and a weighted scoring algorithm.
 */
class CompareRatesWorker extends AtlasWorker<CompareRatesInput, CompareRatesOutput> {
  readonly taskType = 'atlas.rates.compare';

  async execute(job: any): Promise<CompareRatesOutput> {
    const { rates, preferCost = false, preferSpeed = false } = job.variables;

    if (!rates?.length) {
      return {
        rankedRates: [],
        bestValue: null as any,
        cheapest: null as any,
        fastest: null as any,
        comparisonSummary: 'No rates available for comparison',
      };
    }

    // Scoring weights
    const costWeight = preferCost ? 0.7 : preferSpeed ? 0.3 : 0.5;
    const speedWeight = preferSpeed ? 0.7 : preferCost ? 0.3 : 0.5;

    // Normalise values for scoring
    const costs = rates.map((r: any) => r.totalCost);
    const times = rates.map((r: any) => r.transitTime);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const costRange = maxCost - minCost || 1;
    const timeRange = maxTime - minTime || 1;

    const scored: RankedRate[] = rates.map((rate: any) => {
      const costScore = 1 - (rate.totalCost - minCost) / costRange; // Lower cost = higher score
      const speedScore = 1 - (rate.transitTime - minTime) / timeRange; // Shorter time = higher score
      const score = Math.round((costScore * costWeight + speedScore * speedWeight) * 100);

      let recommendation = 'Standard Option';
      if (rate.totalCost === minCost && rate.transitTime === minTime) {
        recommendation = '⭐ Best Overall';
      } else if (rate.totalCost === minCost) {
        recommendation = '💰 Most Economical';
      } else if (rate.transitTime === minTime) {
        recommendation = '🚀 Fastest';
      } else if (score >= 70) {
        recommendation = '✅ Good Value';
      }

      return {
        rank: 0,
        id: rate.id,
        carrier: rate.carrier,
        totalCost: rate.totalCost,
        transitTime: rate.transitTime,
        score,
        recommendation,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    scored.forEach((r, i) => (r.rank = i + 1));

    const cheapest = [...scored].sort((a, b) => a.totalCost - b.totalCost)[0];
    const fastest = [...scored].sort((a, b) => a.transitTime - b.transitTime)[0];

    const summary = `Compared ${scored.length} carriers. Best value: ${scored[0].carrier} (score: ${scored[0].score}). Cheapest: ${cheapest.carrier} ($${cheapest.totalCost}). Fastest: ${fastest.carrier} (${fastest.transitTime}d).`;

    console.log(`[CompareRates] ${summary}`);

    return {
      rankedRates: scored,
      bestValue: scored[0],
      cheapest,
      fastest,
      comparisonSummary: summary,
    };
  }
}

export const compareRatesWorker = new CompareRatesWorker();

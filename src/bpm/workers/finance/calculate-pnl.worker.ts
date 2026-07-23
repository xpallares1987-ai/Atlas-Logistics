import { AtlasWorker } from "../../utils/worker-base.js";

interface CalculatePnLInput {
  shipmentId: string;
  expectedCost: number;
}

interface CalculatePnLOutput {
  estimatedRevenue: number;
  estimatedProfit: number;
  profitable: boolean;
}

/**
 * Calculates Profit & Loss estimates.
 */
class CalculatePnLWorker extends AtlasWorker<CalculatePnLInput, CalculatePnLOutput> {
  readonly taskType = "atlas.invoice.calculate-pnl";

  async execute(job: any): Promise<CalculatePnLOutput> {
    const { shipmentId, expectedCost = 1000 } = job.variables;

    console.log(`[CalculatePnLWorker] Calculating P&L for shipment ${shipmentId}...`);

    // Mocking Revenue
    const estimatedRevenue = expectedCost * 1.30; // 30% margin
    const estimatedProfit = estimatedRevenue - expectedCost;
    const profitable = estimatedProfit > 0;

    console.log(`[CalculatePnLWorker] P&L result: Revenue=$${estimatedRevenue.toFixed(2)}, Profit=$${estimatedProfit.toFixed(2)}, Profitable=${profitable}`);

    return {
      estimatedRevenue,
      estimatedProfit,
      profitable,
    };
  }
}

export const calculatePnLWorker = new CalculatePnLWorker();

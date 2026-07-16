import { AtlasWorker, AtlasBpmnError } from '../../utils/worker-base.js';
import { INVOICE_MISMATCH } from '../../utils/error-codes.js';

interface ReconcileCostsInput {
  shipmentId: string;
  referenceNumber: string;
  expectedCosts: Array<{
    category: string;
    expectedAmount: number;
    actualAmount: number;
    currency: string;
  }>;
}

interface ReconcileCostsOutput {
  reconciled: boolean;
  totalExpected: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  discrepancies: Array<{
    category: string;
    expected: number;
    actual: number;
    diff: number;
  }>;
  profitLoss: number;
}

/**
 * Reconciles expected vs actual costs for a shipment.
 * Identifies discrepancies between quoted rates and final invoiced amounts.
 */
class ReconcileCostsWorker extends AtlasWorker<ReconcileCostsInput, ReconcileCostsOutput> {
  readonly taskType = 'atlas.invoice.reconcile-costs';

  async execute(job: any): Promise<ReconcileCostsOutput> {
    const { referenceNumber, expectedCosts = [] } = job.variables;

    console.log(`[ReconcileCosts] Reconciling costs for ${referenceNumber}`);

    // If no cost data provided, generate mock reconciliation
    const costs = expectedCosts.length > 0
      ? expectedCosts
      : this.getMockCosts();

    const discrepancies: ReconcileCostsOutput['discrepancies'] = [];
    let totalExpected = 0;
    let totalActual = 0;

    for (const cost of costs) {
      totalExpected += cost.expectedAmount;
      totalActual += cost.actualAmount;
      const diff = cost.actualAmount - cost.expectedAmount;

      if (Math.abs(diff) > 0.01) {
        discrepancies.push({
          category: cost.category,
          expected: cost.expectedAmount,
          actual: cost.actualAmount,
          diff: Math.round(diff * 100) / 100,
        });
      }
    }

    const variance = Math.round((totalActual - totalExpected) * 100) / 100;
    const variancePercent = totalExpected > 0
      ? Math.round((variance / totalExpected) * 10000) / 100
      : 0;

    // Flag if variance exceeds 5%
    const reconciled = Math.abs(variancePercent) <= 5;

    if (!reconciled) {
      console.warn(`[ReconcileCosts] ⚠ High variance for ${referenceNumber}: ${variancePercent}%`);
    }

    console.log(`[ReconcileCosts] Expected: $${totalExpected} | Actual: $${totalActual} | Variance: ${variancePercent}% | Discrepancies: ${discrepancies.length}`);

    return {
      reconciled,
      totalExpected: Math.round(totalExpected * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      variance,
      variancePercent,
      discrepancies,
      profitLoss: Math.round((totalExpected - totalActual) * 100) / 100,
    };
  }

  private getMockCosts() {
    return [
      { category: 'Ocean Freight', expectedAmount: 1200, actualAmount: 1200, currency: 'USD' },
      { category: 'BAF', expectedAmount: 85, actualAmount: 90, currency: 'USD' },
      { category: 'THC Origin', expectedAmount: 120, actualAmount: 120, currency: 'USD' },
      { category: 'THC Dest', expectedAmount: 150, actualAmount: 155, currency: 'USD' },
      { category: 'Documentation', expectedAmount: 45, actualAmount: 45, currency: 'USD' },
      { category: 'Customs Clearance', expectedAmount: 75, actualAmount: 80, currency: 'USD' },
    ];
  }
}

export const reconcileCostsWorker = new ReconcileCostsWorker();

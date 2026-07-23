import { AtlasWorker } from "../../utils/worker-base.js";

interface CollectCostsInput {
  shipmentId: string;
}

interface CollectCostsOutput {
  expectedCost: number;
}

/**
 * Collects all estimated costs for a shipment.
 */
class CollectCostsWorker extends AtlasWorker<CollectCostsInput, CollectCostsOutput> {
  readonly taskType = "atlas.invoice.collect-costs";

  async execute(job: any): Promise<CollectCostsOutput> {
    const { shipmentId } = job.variables;

    console.log(`[CollectCostsWorker] Collecting costs for shipment ${shipmentId}...`);

    // Mocking the cost collection
    const expectedCost = 1250.00; // Simulated aggregated cost

    console.log(`[CollectCostsWorker] Total expected cost for shipment ${shipmentId} is $${expectedCost}.`);

    return {
      expectedCost,
    };
  }
}

export const collectCostsWorker = new CollectCostsWorker();

import { AtlasWorker } from "../../utils/worker-base.js";

class FlagReviewWorker extends AtlasWorker<any, any> {
  readonly taskType = "atlas.invoice.flag-review";
  async execute(job: any): Promise<any> {
    console.log(`[FlagReviewWorker] Flagging shipment ${job.variables.shipmentId} for management review (unprofitable).`);
    return {};
  }
}
export const flagReviewWorker = new FlagReviewWorker();

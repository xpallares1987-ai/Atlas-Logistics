import { AtlasWorker, AtlasWorkerJob } from "../../utils/worker-base.js";

interface FlagReviewInput {
  shipmentId?: string;
}

class FlagReviewWorker extends AtlasWorker<
  FlagReviewInput,
  Record<string, never>
> {
  readonly taskType = "atlas.invoice.flag-review";
  async execute(
    job: AtlasWorkerJob<FlagReviewInput>,
  ): Promise<Record<string, never>> {
    console.log(
      `[FlagReviewWorker] Flagging shipment ${job.variables.shipmentId} for management review (unprofitable).`,
    );
    return {};
  }
}
export const flagReviewWorker = new FlagReviewWorker();

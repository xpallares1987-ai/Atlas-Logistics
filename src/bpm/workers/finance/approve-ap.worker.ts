import { AtlasWorker, AtlasWorkerJob } from "../../utils/worker-base.js";

interface ApproveAPInput {
  shipmentId?: string;
}

class ApproveAPWorker extends AtlasWorker<
  ApproveAPInput,
  Record<string, never>
> {
  readonly taskType = "atlas.invoice.approve-ap";
  async execute(
    job: AtlasWorkerJob<ApproveAPInput>,
  ): Promise<Record<string, never>> {
    console.log(
      `[ApproveAPWorker] Approving AP payments for shipment ${job.variables.shipmentId}`,
    );
    return {};
  }
}
export const approveAPWorker = new ApproveAPWorker();

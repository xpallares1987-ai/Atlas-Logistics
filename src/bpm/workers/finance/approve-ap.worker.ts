import { AtlasWorker } from "../../utils/worker-base.js";

class ApproveAPWorker extends AtlasWorker<any, any> {
  readonly taskType = "atlas.invoice.approve-ap";
  async execute(job: any): Promise<any> {
    console.log(`[ApproveAPWorker] Approving AP payments for shipment ${job.variables.shipmentId}`);
    return {};
  }
}
export const approveAPWorker = new ApproveAPWorker();

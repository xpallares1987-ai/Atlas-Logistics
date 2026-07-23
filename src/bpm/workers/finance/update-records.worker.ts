import { AtlasWorker } from "../../utils/worker-base.js";

class UpdateRecordsWorker extends AtlasWorker<any, any> {
  readonly taskType = "atlas.invoice.update-records";
  async execute(job: any): Promise<any> {
    console.log(`[UpdateRecordsWorker] Updating financial records for shipment ${job.variables.shipmentId}`);
    return {};
  }
}
export const updateRecordsWorker = new UpdateRecordsWorker();

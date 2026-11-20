import { AtlasWorker, AtlasWorkerJob } from "../../utils/worker-base.js";

interface UpdateRecordsInput {
  shipmentId?: string;
}

class UpdateRecordsWorker extends AtlasWorker<
  UpdateRecordsInput,
  Record<string, never>
> {
  readonly taskType = "atlas.invoice.update-records";
  async execute(
    job: AtlasWorkerJob<UpdateRecordsInput>,
  ): Promise<Record<string, never>> {
    console.log(
      `[UpdateRecordsWorker] Updating financial records for shipment ${job.variables.shipmentId}`,
    );
    return {};
  }
}
export const updateRecordsWorker = new UpdateRecordsWorker();

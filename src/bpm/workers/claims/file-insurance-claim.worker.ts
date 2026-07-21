import { AtlasWorker } from "../../utils/worker-base.js";

interface FileInsuranceClaimInput {
  claimId: string;
  shipmentId: string;
  claimAmount: number;
  currency: string;
  reason: string;
}

interface FileInsuranceClaimOutput {
  insuranceClaimId: string;
  claimReference: string;
  filedAt: string;
  status: string;
}

/**
 * Worker handling "file-insurance-claim" task type for cargo claims workflow.
 */
class FileInsuranceClaimWorker extends AtlasWorker<
  FileInsuranceClaimInput,
  FileInsuranceClaimOutput
> {
  readonly taskType = "file-insurance-claim";

  async execute(job: any): Promise<FileInsuranceClaimOutput> {
    const {
      claimId,
      shipmentId,
      claimAmount = 0,
      currency = "USD",
      reason = "Cargo Damage",
    } = job.variables;

    const claimReference = `INS-${Date.now().toString(36).toUpperCase()}`;
    const filedAt = new Date().toISOString();

    console.log(
      `[FileInsuranceClaimWorker] Filed claim ${claimReference} for shipment ${shipmentId}. Amount: ${claimAmount} ${currency}. Reason: ${reason}`
    );

    return {
      insuranceClaimId: `ic_${Date.now()}`,
      claimReference,
      filedAt,
      status: "SUBMITTED_TO_INSURER",
    };
  }
}

export const fileInsuranceClaimWorker = new FileInsuranceClaimWorker();

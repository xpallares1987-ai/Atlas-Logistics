import { AtlasWorker, AtlasBpmnError } from '../../utils/worker-base.js';
import { AIS_UNAVAILABLE } from '../../utils/error-codes.js';
import { shipments } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

interface UpdateStatusInput {
  shipmentId: string;
  referenceNumber: string;
  status: string;
  milestone: string;
  location?: string;
  vessel?: string;
}

interface UpdateStatusOutput {
  statusUpdated: boolean;
  previousStatus: string;
  newStatus: string;
  updatedAt: string;
}

/**
 * Updates shipment tracking status in the database.
 */
class UpdateStatusWorker extends AtlasWorker<UpdateStatusInput, UpdateStatusOutput> {
  readonly taskType = 'atlas.tracking.update-status';

  async execute(job: any): Promise<UpdateStatusOutput> {
    const { shipmentId, referenceNumber, status, milestone } = job.variables;

    console.log(`[UpdateStatus] ${referenceNumber}: ${milestone} → ${status}`);

    // Get current status
    const [current] = await this.db
      .select({ status: shipments.status })
      .from(shipments)
      .where(eq(shipments.id, shipmentId))
      .limit(1);

    const previousStatus = current?.status || 'UNKNOWN';

    // Update status
    await this.db
      .update(shipments)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));

    return {
      statusUpdated: true,
      previousStatus,
      newStatus: status,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const updateStatusWorker = new UpdateStatusWorker();

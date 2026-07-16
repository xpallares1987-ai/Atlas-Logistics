import { AtlasWorker } from '../../utils/worker-base.js';

interface ReceiveCargoInput {
  referenceNumber: string;
  shipmentId: string;
  truckPlate?: string;
  containerNumber?: string;
  sealNumber?: string;
  expectedPieces: number;
}

interface ReceiveCargoOutput {
  gateInId: string;
  receivedAt: string;
  truckPlate: string;
  containerNumber: string;
  warehouseLocation: string;
}

/**
 * Registers cargo gate-in at the warehouse.
 */
class ReceiveCargoWorker extends AtlasWorker<ReceiveCargoInput, ReceiveCargoOutput> {
  readonly taskType = 'atlas.warehouse.gate-in';

  async execute(job: any): Promise<ReceiveCargoOutput> {
    const { referenceNumber, containerNumber, truckPlate } = job.variables;

    const gateInId = `GI-${Date.now().toString(36).toUpperCase()}`;
    const location = `WH-${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(1 + Math.random() * 20).toString().padStart(2, '0')}`;

    console.log(`[ReceiveCargo] Gate-in ${gateInId}: ${containerNumber || 'loose cargo'} from truck ${truckPlate || 'N/A'}`);
    console.log(`[ReceiveCargo] Assigned location: ${location}`);

    return {
      gateInId,
      receivedAt: new Date().toISOString(),
      truckPlate: truckPlate || 'UNKNOWN',
      containerNumber: containerNumber || 'LOOSE',
      warehouseLocation: location,
    };
  }
}

export const receiveCargoWorker = new ReceiveCargoWorker();

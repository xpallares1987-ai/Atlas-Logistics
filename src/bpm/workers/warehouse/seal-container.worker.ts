import { AtlasWorker } from '../../utils/worker-base.js';

interface SealContainerInput {
  containerId: string;
  containerType: string;
  shipmentCount: number;
  totalWeight: number;
  totalVolume: number;
}

interface SealContainerOutput {
  sealed: boolean;
  sealNumber: string;
  sealedAt: string;
  vgmWeight: number;
  vgmCertified: boolean;
}

/**
 * Seals a consolidated container and generates VGM (Verified Gross Mass).
 * VGM is mandatory under SOLAS regulations for export containers.
 */
class SealContainerWorker extends AtlasWorker<SealContainerInput, SealContainerOutput> {
  readonly taskType = 'atlas.lcl.seal-container';

  async execute(job: any): Promise<SealContainerOutput> {
    const { containerId, totalWeight, containerType } = job.variables;

    // Tare weights for VGM calculation
    const tareWeights: Record<string, number> = {
      '20DC': 2300, '40DC': 3800, '40HC': 3900, '20RF': 3100, '40RF': 4800,
    };

    const tare = tareWeights[containerType] || 2300;
    const vgmWeight = totalWeight + tare;
    const sealNumber = `SEAL-${Date.now().toString(36).toUpperCase()}`;

    console.log(`[SealContainer] ${containerId}: Seal ${sealNumber} | VGM: ${vgmWeight}kg (cargo: ${totalWeight}kg + tare: ${tare}kg)`);

    return {
      sealed: true,
      sealNumber,
      sealedAt: new Date().toISOString(),
      vgmWeight,
      vgmCertified: true,
    };
  }
}

export const sealContainerWorker = new SealContainerWorker();

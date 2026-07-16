import { AtlasWorker } from '../../utils/worker-base.js';

interface GenerateManifestInput {
  shipmentId: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  vessel: string;
  voyage: string;
  hblNumber: string;
  mblNumber: string;
  commodity: string;
  grossWeightKg: number;
  volumeCbm: number;
  packageCount: number;
  equipment: string;
}

interface GenerateManifestOutput {
  manifestNumber: string;
  manifestDocumentUrl: string;
  generatedAt: string;
}

/**
 * Generates a Cargo Manifest document.
 * Lists all cargo aboard a vessel for a specific voyage.
 */
class GenerateManifestWorker extends AtlasWorker<GenerateManifestInput, GenerateManifestOutput> {
  readonly taskType = 'atlas.docs.generate-manifest';

  async execute(job: any): Promise<GenerateManifestOutput> {
    const { referenceNumber, vessel, voyage, hblNumber, mblNumber } = job.variables;

    const manifestNumber = `MNF-${referenceNumber.replace('SHP-', '')}`;

    console.log(`[GenerateManifest] Creating manifest ${manifestNumber}`);
    console.log(`  Vessel: ${vessel} / ${voyage}`);
    console.log(`  HBL: ${hblNumber} | MBL: ${mblNumber}`);

    // Simulate PDF generation
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      manifestNumber,
      manifestDocumentUrl: `/documents/${manifestNumber}.pdf`,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const generateManifestWorker = new GenerateManifestWorker();

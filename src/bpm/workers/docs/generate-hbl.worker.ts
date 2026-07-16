import { AtlasWorker } from '../../utils/worker-base.js';

interface GenerateHblInput {
  shipmentId: string;
  referenceNumber: string;
  shipperName: string;
  consigneeName: string;
  notifyParty?: string;
  origin: string;
  destination: string;
  vessel: string;
  voyage: string;
  equipment: string;
  commodity: string;
  grossWeightKg: number;
  volumeCbm: number;
  packageCount: number;
}

interface GenerateHblOutput {
  hblNumber: string;
  hblDocumentUrl: string;
  generatedAt: string;
}

/**
 * Generates a House Bill of Lading (HBL) document.
 * In production: renders a PDF from template with real data.
 */
class GenerateHblWorker extends AtlasWorker<GenerateHblInput, GenerateHblOutput> {
  readonly taskType = 'atlas.docs.generate-hbl';

  async execute(job: any): Promise<GenerateHblOutput> {
    const { referenceNumber, shipperName, consigneeName, origin, destination, vessel } = job.variables;

    const hblNumber = `HBL-${referenceNumber.replace('SHP-', '')}`;

    console.log(`[GenerateHBL] Creating HBL ${hblNumber} for ${referenceNumber}`);
    console.log(`  Shipper: ${shipperName} → Consignee: ${consigneeName}`);
    console.log(`  Route: ${origin} → ${destination} on ${vessel}`);

    // Simulate PDF generation
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      hblNumber,
      hblDocumentUrl: `/documents/${hblNumber}.pdf`,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const generateHblWorker = new GenerateHblWorker();

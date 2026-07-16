import { AtlasWorker } from '../../utils/worker-base.js';

interface GenerateMblInput {
  shipmentId: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  vessel: string;
  voyage: string;
  selectedCarrier: string;
  bookingReference: string;
  equipment: string;
  grossWeightKg: number;
  volumeCbm: number;
  packageCount: number;
}

interface GenerateMblOutput {
  mblNumber: string;
  mblDocumentUrl: string;
  generatedAt: string;
}

/**
 * Generates a Master Bill of Lading (MBL) document.
 * Issued by the shipping line / carrier.
 */
class GenerateMblWorker extends AtlasWorker<GenerateMblInput, GenerateMblOutput> {
  readonly taskType = 'atlas.docs.generate-mbl';

  async execute(job: any): Promise<GenerateMblOutput> {
    const { referenceNumber, selectedCarrier, vessel, voyage, bookingReference } = job.variables;

    const carrierPrefix = (selectedCarrier || 'GEN').substring(0, 3).toUpperCase();
    const mblNumber = `MBL-${carrierPrefix}-${Date.now().toString(36).toUpperCase()}`;

    console.log(`[GenerateMBL] Creating MBL ${mblNumber} for booking ${bookingReference}`);
    console.log(`  Carrier: ${selectedCarrier} | Vessel: ${vessel} / ${voyage}`);

    // Simulate PDF generation
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      mblNumber,
      mblDocumentUrl: `/documents/${mblNumber}.pdf`,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const generateMblWorker = new GenerateMblWorker();

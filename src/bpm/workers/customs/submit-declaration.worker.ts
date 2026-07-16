import { AtlasWorker } from '../../utils/worker-base.js';

interface SubmitDeclarationInput {
  referenceNumber: string;
  shipmentId: string;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  productDescription: string;
  grossWeightKg: number;
  declaredValue: number;
  currency: string;
}

interface SubmitDeclarationOutput {
  declarationId: string;
  declarationNumber: string;
  submittedAt: string;
  estimatedProcessingTime: string;
  status: string;
}

/**
 * Submits customs declaration to the authority.
 * In production: connects to AEAT (Spain), EU ICS2, or local customs API.
 * Currently returns simulated response.
 */
class SubmitDeclarationWorker extends AtlasWorker<SubmitDeclarationInput, SubmitDeclarationOutput> {
  readonly taskType = 'atlas.customs.submit-declaration';

  async execute(job: any): Promise<SubmitDeclarationOutput> {
    const { referenceNumber, hsCode, originCountry, destinationCountry } = job.variables;

    console.log(`[SubmitDeclaration] Filing declaration for ${referenceNumber}: HS ${hsCode} (${originCountry} → ${destinationCountry})`);

    // Simulate API call to customs authority
    await new Promise((resolve) => setTimeout(resolve, 500));

    const declarationId = `DEC-${Date.now().toString(36).toUpperCase()}`;
    const declarationNumber = `ES${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 90000000)}`;

    console.log(`[SubmitDeclaration] ✓ Declaration ${declarationNumber} submitted successfully`);

    return {
      declarationId,
      declarationNumber,
      submittedAt: new Date().toISOString(),
      estimatedProcessingTime: 'PT4H',
      status: 'SUBMITTED',
    };
  }
}

export const submitDeclarationWorker = new SubmitDeclarationWorker();

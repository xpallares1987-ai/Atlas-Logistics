import { AtlasWorker, AtlasBpmnError } from '../../utils/worker-base.js';
import { HS_CODE_INVALID } from '../../utils/error-codes.js';

interface ValidateHsCodeInput {
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  productDescription?: string;
}

interface ValidateHsCodeOutput {
  hsCodeValid: boolean;
  restrictionLevel: string;
  requiredAction: string;
  reason: string;
  requiresReview: boolean;
}

/**
 * Validates HS codes against restriction rules.
 * This worker performs a programmatic pre-check before the DMN decision.
 */
class ValidateHsCodeWorker extends AtlasWorker<ValidateHsCodeInput, ValidateHsCodeOutput> {
  readonly taskType = 'atlas.customs.validate-hs';

  async execute(job: any): Promise<ValidateHsCodeOutput> {
    const { hsCode, originCountry, destinationCountry } = job.variables;

    console.log(`[ValidateHsCode] Checking: ${hsCode} from ${originCountry} to ${destinationCountry}`);

    // Basic format validation
    if (!hsCode || !/^\d{4,10}$/.test(hsCode)) {
      throw new AtlasBpmnError(HS_CODE_INVALID, `Invalid HS code format: ${hsCode}`);
    }

    // Check HS code structure (first 2 digits = chapter)
    const chapter = parseInt(hsCode.substring(0, 2), 10);

    // Quick programmatic checks for common restrictions
    const embargoed = ['KP', 'IR', 'SY', 'CU'];
    if (embargoed.includes(destinationCountry)) {
      return {
        hsCodeValid: true,
        restrictionLevel: 'EMBARGO',
        requiredAction: 'BLOCK_AND_ALERT',
        reason: `Destination ${destinationCountry} is under trade embargo`,
        requiresReview: true,
      };
    }

    // Chapter 93: Arms and ammunition
    if (chapter === 93) {
      return {
        hsCodeValid: true,
        restrictionLevel: 'PROHIBITED',
        requiredAction: 'BLOCK',
        reason: 'Arms and ammunition are prohibited goods',
        requiresReview: true,
      };
    }

    // Chapter 22.08: Spirits
    if (hsCode.startsWith('2208')) {
      return {
        hsCodeValid: true,
        restrictionLevel: 'CONTROLLED',
        requiredAction: 'REQUIRE_LICENSE',
        reason: 'Alcoholic beverages require import license',
        requiresReview: true,
      };
    }

    // No restrictions
    console.log(`[ValidateHsCode] ✓ No restrictions for HS ${hsCode}`);
    return {
      hsCodeValid: true,
      restrictionLevel: 'NONE',
      requiredAction: 'PROCEED',
      reason: 'No restrictions found',
      requiresReview: false,
    };
  }
}

export const validateHsCodeWorker = new ValidateHsCodeWorker();

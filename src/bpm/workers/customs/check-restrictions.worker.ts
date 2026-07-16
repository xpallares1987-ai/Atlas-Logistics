import { AtlasWorker } from '../../utils/worker-base.js';

interface CheckRestrictionsInput {
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  cargoType?: string;
}

interface CheckRestrictionsOutput {
  restrictionsFound: boolean;
  restrictions: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    regulation: string;
  }>;
  overallSeverity: string;
}

/**
 * Checks for trade restrictions, sanctions, and compliance requirements.
 */
class CheckRestrictionsWorker extends AtlasWorker<CheckRestrictionsInput, CheckRestrictionsOutput> {
  readonly taskType = 'atlas.customs.check-restrictions';

  async execute(job: any): Promise<CheckRestrictionsOutput> {
    const { hsCode, originCountry, destinationCountry, cargoType } = job.variables;
    const restrictions: CheckRestrictionsOutput['restrictions'] = [];

    console.log(`[CheckRestrictions] Scanning: HS ${hsCode} (${originCountry} → ${destinationCountry})`);

    // Sanctioned/embargoed destinations
    const sanctioned = ['KP', 'IR', 'SY', 'CU', 'VE'];
    if (sanctioned.includes(destinationCountry)) {
      restrictions.push({
        type: 'SANCTIONS',
        severity: 'CRITICAL',
        description: `Trade embargo in effect for ${destinationCountry}`,
        regulation: 'EU Council Regulation (EU) No 267/2012',
      });
    }

    // Dual-use technology
    const dualUseChapters = ['8471', '8542', '8543', '8525'];
    if (dualUseChapters.some((ch) => hsCode.startsWith(ch))) {
      restrictions.push({
        type: 'DUAL_USE',
        severity: 'HIGH',
        description: 'Dual-use technology — export license may be required',
        regulation: 'EU Regulation 2021/821 (Dual-Use)',
      });
    }

    // Dangerous goods
    if (cargoType === 'DANGEROUS_GOODS') {
      restrictions.push({
        type: 'DANGEROUS_GOODS',
        severity: 'MEDIUM',
        description: 'Requires IMDG/DG declaration and special handling',
        regulation: 'IMDG Code / ADR',
      });
    }

    // Anti-dumping duties (example: Chinese steel to EU)
    if (hsCode.startsWith('72') && originCountry === 'CN' && ['ES', 'DE', 'FR', 'IT', 'NL'].includes(destinationCountry)) {
      restrictions.push({
        type: 'ANTI_DUMPING',
        severity: 'MEDIUM',
        description: 'Anti-dumping duties apply to Chinese steel imports',
        regulation: 'EU Commission Implementing Regulation 2024/1321',
      });
    }

    const overallSeverity = restrictions.length === 0
      ? 'NONE'
      : restrictions.some((r) => r.severity === 'CRITICAL')
        ? 'CRITICAL'
        : restrictions.some((r) => r.severity === 'HIGH')
          ? 'HIGH'
          : 'MEDIUM';

    console.log(`[CheckRestrictions] Found ${restrictions.length} restrictions (severity: ${overallSeverity})`);

    return {
      restrictionsFound: restrictions.length > 0,
      restrictions,
      overallSeverity,
    };
  }
}

export const checkRestrictionsWorker = new CheckRestrictionsWorker();

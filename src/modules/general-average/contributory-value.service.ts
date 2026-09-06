/**
 * Contributory Value Service (York-Antwerp Rules 2016 / 1994)
 * Deterministic assessment of net contributory values at destination for:
 * 1. Vessel (Sound destination value - particular damage + general average made good)
 * 2. Freight at risk (Gross freight - subsequent expenses + made good)
 * 3. Cargo (CIF commercial invoice value - particular damage + made good)
 * 4. Containers & Equipment (Depreciated sound value - damage)
 */

export interface ContributoryInterestInput {
  interestCategory:
    "VESSEL" | "FREIGHT_AT_RISK" | "CARGO" | "CONTAINERS_EQUIPMENT";
  blReference?: string;
  containerNumber?: string;
  ownerOrReceiverName: string;
  cargoDescription?: string;
  weightOrTeu?: number;
  soundValueDestinationUsd: number;
  particularDamageDeductionUsd?: number;
  madeGoodAllowanceUsd?: number;
}

export interface AssessedContributoryInterest {
  interestCategory:
    "VESSEL" | "FREIGHT_AT_RISK" | "CARGO" | "CONTAINERS_EQUIPMENT";
  blReference?: string;
  containerNumber?: string;
  ownerOrReceiverName: string;
  cargoDescription?: string;
  weightOrTeu?: number;
  soundValueDestinationUsd: number;
  particularDamageDeductionUsd: number;
  madeGoodAllowanceUsd: number;
  contributoryValueUsd: number;
}

export interface ContributoryValuesSummary {
  vesselContributoryValueUsd: number;
  freightContributoryValueUsd: number;
  cargoContributoryValueUsd: number;
  containersContributoryValueUsd: number;
  totalContributoryValueUsd: number;
  interests: AssessedContributoryInterest[];
}

export class ContributoryValueService {
  /**
   * Assesses and computes contributory values for all interests in the maritime adventure.
   */
  public static assessContributoryValues(
    interests: ContributoryInterestInput[],
  ): ContributoryValuesSummary {
    let vesselCv = 0;
    let freightCv = 0;
    let cargoCv = 0;
    let containersCv = 0;

    const assessedList: AssessedContributoryInterest[] = [];

    for (const item of interests) {
      const soundVal = Math.max(0, item.soundValueDestinationUsd);
      const partDmg = Math.max(0, item.particularDamageDeductionUsd ?? 0);
      const madeGood = Math.max(0, item.madeGoodAllowanceUsd ?? 0);

      // YAR Formula: Sound Value - Particular Damage + Made Good
      const cv = Math.max(
        0,
        Math.round((soundVal - partDmg + madeGood) * 100) / 100,
      );

      switch (item.interestCategory) {
        case "VESSEL":
          vesselCv += cv;
          break;
        case "FREIGHT_AT_RISK":
          freightCv += cv;
          break;
        case "CARGO":
          cargoCv += cv;
          break;
        case "CONTAINERS_EQUIPMENT":
          containersCv += cv;
          break;
      }

      assessedList.push({
        interestCategory: item.interestCategory,
        blReference: item.blReference,
        containerNumber: item.containerNumber,
        ownerOrReceiverName: item.ownerOrReceiverName,
        cargoDescription: item.cargoDescription,
        weightOrTeu: item.weightOrTeu,
        soundValueDestinationUsd: soundVal,
        particularDamageDeductionUsd: partDmg,
        madeGoodAllowanceUsd: madeGood,
        contributoryValueUsd: cv,
      });
    }

    const totalCv = vesselCv + freightCv + cargoCv + containersCv;

    return {
      vesselContributoryValueUsd: Math.round(vesselCv * 100) / 100,
      freightContributoryValueUsd: Math.round(freightCv * 100) / 100,
      cargoContributoryValueUsd: Math.round(cargoCv * 100) / 100,
      containersContributoryValueUsd: Math.round(containersCv * 100) / 100,
      totalContributoryValueUsd: Math.round(totalCv * 100) / 100,
      interests: assessedList,
    };
  }
}

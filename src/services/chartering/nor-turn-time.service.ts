export interface NorValidationInput {
  norTenderedTimestamp: string; // ISO string
  turnTimeHours: number; // e.g. 12 or 6
  norOfficeHoursOnly?: boolean; // If true, only Mon-Fri 08:00-17:00 or Sat 08:00-12:00
  norClauses?: string[]; // e.g. ["WIPON", "WIBON", "WIFPON", "WCCON"]
  isAtBerth?: boolean;
  isInPortLimits?: boolean;
  isFreePratiqueGranted?: boolean;
  isCustomsCleared?: boolean;
  actualOperationsCommencedTimestamp?: string;
  countTurnTimeIfUsedEarlier?: boolean; // If true, if work starts before turn time expires, laytime starts upon commencement
}

export interface NorValidationResult {
  isValidNorTendered: boolean;
  effectiveNorTimestamp: string;
  turnTimeExpiryTimestamp: string;
  officialLaytimeCommencementTimestamp: string;
  appliedTurnTimeHours: number;
  clausesSatisfied: {
    wiponSatisfied: boolean;
    wibonSatisfied: boolean;
    wifponSatisfied: boolean;
    wcconSatisfied: boolean;
  };
  validationFlags: string[];
  laytimeCommencementReason: string;
}

export class NorTurnTimeService {
  /**
   * Evaluates Notice of Readiness (NOR) validity, turn-time expiration and official laytime inception.
   */
  public static validateAndComputeNor(
    input: NorValidationInput,
  ): NorValidationResult {
    const tenderedDate = new Date(input.norTenderedTimestamp);
    const flags: string[] = [];
    const clauses = input.norClauses || ["WIPON", "WIBON", "WIFPON", "WCCON"];

    // 1. Clause verification
    const inPort = input.isInPortLimits !== false;
    const atBerth = Boolean(input.isAtBerth);
    const freePratique = input.isFreePratiqueGranted !== false;
    const customsCleared = input.isCustomsCleared !== false;

    const wiponSatisfied = inPort || clauses.includes("WIPON");
    const wibonSatisfied = atBerth || clauses.includes("WIBON");
    const wifponSatisfied = freePratique || clauses.includes("WIFPON");
    const wcconSatisfied = customsCleared || clauses.includes("WCCON");

    let isValidNor = true;
    if (!wiponSatisfied) {
      isValidNor = false;
      flags.push(
        "NOR invalid: Vessel not within port limits and WIPON clause not granted.",
      );
    }
    if (!wibonSatisfied) {
      isValidNor = false;
      flags.push(
        "NOR invalid: Vessel not at berth and WIBON clause not included.",
      );
    }
    if (!wifponSatisfied) {
      isValidNor = false;
      flags.push(
        "NOR invalid: Free Pratique not granted and WIFPON clause absent.",
      );
    }
    if (!wcconSatisfied) {
      isValidNor = false;
      flags.push(
        "NOR invalid: Customs clearance not obtained and WCCON clause absent.",
      );
    }

    // 2. Office hours check (if applicable)
    const effectiveDate = new Date(tenderedDate.getTime());
    if (input.norOfficeHoursOnly) {
      const dayOfWeek = effectiveDate.getUTCDay(); // 0 = Sun, 6 = Sat
      const hour = effectiveDate.getUTCHours();

      // If Sunday (0) or Saturday afternoon (> 12), advance to Monday 08:00
      if (dayOfWeek === 0) {
        effectiveDate.setUTCDate(effectiveDate.getUTCDate() + 1);
        effectiveDate.setUTCHours(8, 0, 0, 0);
        flags.push(
          "NOR tendered on Sunday: Effective tendering shifted to Monday 08:00 UTC.",
        );
      } else if (dayOfWeek === 6 && hour >= 12) {
        effectiveDate.setUTCDate(effectiveDate.getUTCDate() + 2);
        effectiveDate.setUTCHours(8, 0, 0, 0);
        flags.push(
          "NOR tendered on Saturday afternoon: Effective tendering shifted to Monday 08:00 UTC.",
        );
      } else if (hour < 8) {
        effectiveDate.setUTCHours(8, 0, 0, 0);
        flags.push(
          "NOR tendered before office hours: Effective tendering shifted to 08:00 UTC.",
        );
      } else if (hour >= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
        effectiveDate.setUTCDate(
          effectiveDate.getUTCDate() + (dayOfWeek === 5 ? 3 : 1),
        );
        effectiveDate.setUTCHours(8, 0, 0, 0);
        flags.push(
          "NOR tendered after office hours: Effective tendering shifted to next business day 08:00 UTC.",
        );
      }
    }

    // 3. Compute Turn Time Expiration
    const turnTimeHours = Math.max(0, input.turnTimeHours ?? 12);
    const turnTimeExpiryDate = new Date(
      effectiveDate.getTime() + turnTimeHours * 3600 * 1000,
    );

    // 4. Laytime Commencement (earlier of turn time expiry or operations started if used)
    let laytimeCommenced = turnTimeExpiryDate;
    let reason = `Laytime commenced upon turn time expiry (+${turnTimeHours}h) at ${turnTimeExpiryDate.toISOString()}.`;

    if (input.actualOperationsCommencedTimestamp) {
      const actualOps = new Date(input.actualOperationsCommencedTimestamp);
      if (
        actualOps < turnTimeExpiryDate &&
        input.countTurnTimeIfUsedEarlier !== false
      ) {
        laytimeCommenced = actualOps;
        reason = `Cargo operations commenced prior to turn time expiry; laytime commenced immediately at ${actualOps.toISOString()} (actual work used).`;
      }
    }

    return {
      isValidNorTendered: isValidNor,
      effectiveNorTimestamp: effectiveDate.toISOString(),
      turnTimeExpiryTimestamp: turnTimeExpiryDate.toISOString(),
      officialLaytimeCommencementTimestamp: laytimeCommenced.toISOString(),
      appliedTurnTimeHours: turnTimeHours,
      clausesSatisfied: {
        wiponSatisfied,
        wibonSatisfied,
        wifponSatisfied,
        wcconSatisfied,
      },
      validationFlags: flags,
      laytimeCommencementReason: reason,
    };
  }
}

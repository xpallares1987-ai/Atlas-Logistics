/**
 * Hydrostatic Draft Survey Calculator Service
 * Deterministic displacement and net cargo calculation from 6-point drafts, trim corrections, density, and deductibles.
 */

export interface DraftSurveyInput {
  forwardDraftPort: number;
  forwardDraftStarboard: number;
  aftDraftPort: number;
  aftDraftStarboard: number;
  midDraftPort: number;
  midDraftStarboard: number;
  lengthBetweenPerpendiculars: number; // LBP (m)
  longitudinalCenterOfFlotation: number; // LCF (m from midships, positive forward or aft)
  tonnesPerCmImmersion: number; // TPC (t/cm)
  momentToChangeTrim1Cm: number; // MTC (t*m/cm)
  measuredWaterDensity?: number; // default 1.025 t/m3 (sea water)
  hydrostaticDisplacement: number; // raw table displacement (t)
  dMtcDz?: number; // rate of change of MTC with draft (default 0.05)
  ballastWaterDeductible?: number;
  fuelOilDeductible?: number;
  dieselOilDeductible?: number;
  freshWaterDeductible?: number;
  sludgeBilgeDeductible?: number;
  initialNetDisplacement?: number; // if computing cargo loaded/discharged
}

export interface DraftSurveyResult {
  forwardMeanDraft: number;
  aftMeanDraft: number;
  midMeanDraft: number;
  apparentTrim: number;
  meanOfMeansDraft: number;
  quarterMeanDraft: number; // DQM
  firstTrimCorrection: number; // C1 (t)
  secondTrimCorrection: number; // C2 (t)
  densityCorrectionFactor: number;
  correctedDisplacement: number; // tonnes
  totalDeductibles: number; // tonnes
  netDisplacement: number; // tonnes (Vessel Lightship + Cargo)
  calculatedCargoTonnage?: number; // Final Net Disp - Initial Net Disp
  deflectionType: "HOGGING" | "SAGGING" | "NEUTRAL";
  deflectionValueMeters: number;
}

export class DraftSurveyCalculatorService {
  /**
   * Deterministically calculates draft survey corrections, displacement, and net cargo.
   */
  public static calculateDraftSurvey(
    input: DraftSurveyInput,
  ): DraftSurveyResult {
    const fm = (input.forwardDraftPort + input.forwardDraftStarboard) / 2;
    const am = (input.aftDraftPort + input.aftDraftStarboard) / 2;
    const mm = (input.midDraftPort + input.midDraftStarboard) / 2;

    const trim = am - fm; // positive by stern (normal)
    const lbp = Math.max(1, input.lengthBetweenPerpendiculars || 100);
    const density =
      input.measuredWaterDensity && input.measuredWaterDensity > 0
        ? input.measuredWaterDensity
        : 1.025;

    // Mean of Means & Quarter Mean Draft (DQM)
    const meanForwardAft = (fm + am) / 2;
    const mom = (meanForwardAft + mm) / 2;
    const dqm = (fm + 6 * mm + am) / 8;

    // Hogging / Sagging deflection
    const deflection = mm - meanForwardAft;
    let deflectionType: "HOGGING" | "SAGGING" | "NEUTRAL" = "NEUTRAL";
    if (deflection > 0.005) {
      deflectionType = "SAGGING";
    } else if (deflection < -0.005) {
      deflectionType = "HOGGING";
    }

    // 1st Trim Correction: C1 = (Trim * LCF * TPC * 100) / LBP
    const c1 =
      (trim *
        input.longitudinalCenterOfFlotation *
        input.tonnesPerCmImmersion *
        100) /
      lbp;

    // 2nd Trim Correction (Nemoto's formula): C2 = (50 * Trim^2 * dMTC/dz) / LBP
    const dMtc = input.dMtcDz !== undefined ? input.dMtcDz : 0.05;
    const c2 = (50 * Math.pow(trim, 2) * dMtc) / lbp;

    // Hydrostatic displacement with trim corrections
    const dispTrimCorrected = input.hydrostaticDisplacement + c1 + c2;

    // Density correction: Corrected Disp = DispTrimCorrected * (Measured Density / 1.025)
    const densityFactor = density / 1.025;
    const correctedDisp =
      Math.round(dispTrimCorrected * densityFactor * 100) / 100;

    // Deductibles
    const ballast = input.ballastWaterDeductible || 0;
    const fuel = input.fuelOilDeductible || 0;
    const diesel = input.dieselOilDeductible || 0;
    const fw = input.freshWaterDeductible || 0;
    const sludge = input.sludgeBilgeDeductible || 0;
    const totalDeductibles =
      Math.round((ballast + fuel + diesel + fw + sludge) * 100) / 100;

    // Net Displacement (Constant Lightship + Cargo on board)
    const netDisp = Math.round((correctedDisp - totalDeductibles) * 100) / 100;

    let cargoTonnes: number | undefined;
    if (input.initialNetDisplacement !== undefined) {
      cargoTonnes =
        Math.round(Math.max(0, netDisp - input.initialNetDisplacement) * 100) /
        100;
    }

    return {
      forwardMeanDraft: Math.round(fm * 1000) / 1000,
      aftMeanDraft: Math.round(am * 1000) / 1000,
      midMeanDraft: Math.round(mm * 1000) / 1000,
      apparentTrim: Math.round(trim * 1000) / 1000,
      meanOfMeansDraft: Math.round(mom * 1000) / 1000,
      quarterMeanDraft: Math.round(dqm * 1000) / 1000,
      firstTrimCorrection: Math.round(c1 * 100) / 100,
      secondTrimCorrection: Math.round(c2 * 100) / 100,
      densityCorrectionFactor: Math.round(densityFactor * 10000) / 10000,
      correctedDisplacement: correctedDisp,
      totalDeductibles,
      netDisplacement: netDisp,
      calculatedCargoTonnage: cargoTonnes,
      deflectionType,
      deflectionValueMeters: Math.round(deflection * 1000) / 1000,
    };
  }
}

/**
 * Dangerous Goods Packaging Exemption & Classification Service
 * Deterministic calculation of:
 * 1. Limited Quantities (LQ) & Excepted Quantities (EQ)
 * 2. UNECE ADR 1.1.3.6 (1,000 Points Exemption per Transport Unit)
 * 3. IATA DGR Lithium Battery Classifier (Sections IA, IB, II, CAO & SoC <= 30%)
 */

export interface LqEvaluationInput {
  unNumber: string;
  innerReceptacleQuantityKgOrL: number;
  packageGrossMassKg: number;
  isShrinkWrappedTray?: boolean;
}

export interface AdrItemInput {
  unNumber: string;
  transportCategory: number; // 0, 1, 2, 3, 4
  netQuantityKgOrL: number;
  isExplosive?: boolean;
}

export interface AdrPointsCalculationResult {
  totalPoints: number;
  isExempt1136: boolean;
  status: "EXEMPT_UNDER_1000_POINTS" | "FULL_ADR_MANDATORY";
  orangePlatesRequired: boolean;
  driverAdrCertificateRequired: boolean;
  minExtinguisherCapacityKg: number; // 2 kg for exempt, 12 kg for full ADR (>7.5t vehicle)
  breakdown: {
    unNumber: string;
    category: number;
    multiplier: number;
    quantity: number;
    calculatedPoints: number;
  }[];
}

export interface LithiumBatteryClassificationInput {
  unNumber: "UN 3480" | "UN 3481" | "UN 3090" | "UN 3091";
  batteryWattHours?: number; // For Ion: <= 20Wh cell / <= 100Wh battery
  lithiumMetalGrams?: number; // For Metal: <= 1g cell / <= 2g battery
  packageCount: number;
  stateOfChargePercentage?: number; // Must be <= 30% for UN 3480
}

export interface LithiumBatteryClassificationResult {
  section: "SECTION_IA" | "SECTION_IB" | "SECTION_II";
  isCaoMandatory: boolean;
  isDgdRequired: boolean;
  isClass9LabelRequired: boolean;
  isLithiumMarkRequired: boolean;
  isSocCompliant: boolean;
  packingInstruction: string;
  summaryText: string;
}

export class DgPackagingExemptionService {
  /**
   * Evaluates if a package qualifies for the Limited Quantity (LQ) exemption (Chapter 3.4).
   */
  public static evaluateLimitedQuantity(
    params: LqEvaluationInput,
    lqInnerLimit: number,
  ): {
    isEligible: boolean;
    reason: string;
  } {
    const maxGrossAllowed = params.isShrinkWrappedTray ? 20.0 : 30.0;

    if (lqInnerLimit <= 0) {
      return {
        isEligible: false,
        reason: `La sustancia ${params.unNumber} no permite la expedición en Cantidades Limitadas (LQ = 0).`,
      };
    }

    if (params.innerReceptacleQuantityKgOrL > lqInnerLimit) {
      return {
        isEligible: false,
        reason: `El envase interior (${params.innerReceptacleQuantityKgOrL} kg/L) supera el límite máximo LQ de ${lqInnerLimit} kg/L.`,
      };
    }

    if (params.packageGrossMassKg > maxGrossAllowed) {
      return {
        isEligible: false,
        reason: `La masa bruta del bulto (${params.packageGrossMassKg} kg) excede el tope de ${maxGrossAllowed} kg.`,
      };
    }

    return {
      isEligible: true,
      reason: `Bulto apto para Cantidades Limitadas (LQ). Marcado con rombo blanco/negro LQ. Exento de DGD y panel naranja.`,
    };
  }

  /**
   * Computes UNECE ADR 1.1.3.6 total points and determines exemption status.
   */
  public static calculateAdrPoints(
    items: AdrItemInput[],
  ): AdrPointsCalculationResult {
    let totalPoints = 0;
    const breakdown: AdrPointsCalculationResult["breakdown"] = [];

    for (const item of items) {
      let multiplier = 1;
      let points = 0;

      switch (item.transportCategory) {
        case 0:
          multiplier = 999999; // Category 0 is always full ADR
          points = 999999;
          break;
        case 1:
          multiplier = item.isExplosive ? 20 : 50;
          points = item.netQuantityKgOrL * multiplier;
          break;
        case 2:
          multiplier = 3;
          points = item.netQuantityKgOrL * multiplier;
          break;
        case 3:
          multiplier = 1;
          points = item.netQuantityKgOrL * multiplier;
          break;
        case 4:
          multiplier = 0;
          points = 0;
          break;
        default:
          multiplier = 1;
          points = item.netQuantityKgOrL;
      }

      totalPoints += points;
      breakdown.push({
        unNumber: item.unNumber,
        category: item.transportCategory,
        multiplier,
        quantity: item.netQuantityKgOrL,
        calculatedPoints: Math.round(points * 100) / 100,
      });
    }

    const roundedTotal = Math.round(totalPoints * 100) / 100;
    const isExempt = roundedTotal <= 1000;

    return {
      totalPoints: roundedTotal,
      isExempt1136: isExempt,
      status: isExempt ? "EXEMPT_UNDER_1000_POINTS" : "FULL_ADR_MANDATORY",
      orangePlatesRequired: !isExempt,
      driverAdrCertificateRequired: !isExempt,
      minExtinguisherCapacityKg: isExempt ? 2 : 12,
      breakdown,
    };
  }

  /**
   * Classifies Lithium Batteries under IATA DGR (UN 3480/3481/3090/3091).
   */
  public static classifyLithiumBattery(
    input: LithiumBatteryClassificationInput,
  ): LithiumBatteryClassificationResult {
    const isIon = input.unNumber === "UN 3480" || input.unNumber === "UN 3481";
    const isStandalone =
      input.unNumber === "UN 3480" || input.unNumber === "UN 3090";

    // UN 3480 standalone ion batteries must strictly be Cargo Aircraft Only (CAO) and SoC <= 30%
    const isCao = isStandalone;
    const soc = input.stateOfChargePercentage ?? 30;
    const isSocOk = !isIon || !isStandalone || soc <= 30.0;

    // Evaluate Section IA vs IB vs II
    const wh = input.batteryWattHours ?? 100;
    const g = input.lithiumMetalGrams ?? 2.0;

    let section: "SECTION_IA" | "SECTION_IB" | "SECTION_II" = "SECTION_II";

    if (isIon) {
      if (wh > 100) {
        section = "SECTION_IA"; // Fully regulated Class 9
      } else if (input.packageCount > 2) {
        section = "SECTION_IB"; // Small batteries in commercial volume
      } else {
        section = "SECTION_II"; // Exception threshold
      }
    } else {
      if (g > 2.0) {
        section = "SECTION_IA";
      } else if (input.packageCount > 2) {
        section = "SECTION_IB";
      } else {
        section = "SECTION_II";
      }
    }

    const pi = isIon
      ? isStandalone
        ? "965"
        : "966"
      : isStandalone
        ? "968"
        : "969";

    return {
      section,
      isCaoMandatory: isCao,
      isDgdRequired: section === "SECTION_IA" || section === "SECTION_IB",
      isClass9LabelRequired:
        section === "SECTION_IA" || section === "SECTION_IB",
      isLithiumMarkRequired:
        section === "SECTION_IB" || section === "SECTION_II",
      isSocCompliant: isSocOk,
      packingInstruction: `PI ${pi} (Sec. ${section.replace("SECTION_", "")})`,
      summaryText:
        `${input.unNumber} clasificada bajo IATA DGR ${section.replace("_", " ")} (${pi}). ` +
        (isCao
          ? "AVIÓN EXCLUSIVO DE CARGA (CAO) OBLIGATORIO. "
          : "Apta pasajeros. ") +
        (isSocOk
          ? `Estado de carga SoC (${soc}%) conforme.`
          : `ALERTA SoC (${soc}%): Debe ser <= 30%.`),
    };
  }
}

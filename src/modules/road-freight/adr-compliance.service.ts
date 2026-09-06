export interface AdrItemInput {
  unCode: string; // e.g. "UN 1263"
  properShippingName: string;
  adrClass: string; // e.g. "3", "8", "5.1"
  packingGroup?: "I" | "II" | "III" | null;
  transportCategory: 0 | 1 | 2 | 3 | 4;
  quantityUnits: number; // in kg for solids/articles or liters for liquids/gases
  tunnelRestrictionCode?: string; // e.g. "(D/E)", "(C/E)", "(B/D)"
}

export interface AdrCalculationResult {
  isHazardous: boolean;
  totalPoints: number;
  maxExemptionLimit: number; // 1,000 points
  isExempt1136: boolean;
  orangePlatesRequired: boolean;
  driverAdrCertificateRequired: boolean;
  fireExtinguisherRequirement: string;
  hasCategoryZeroItem: boolean;
  tunnelRestrictionCodes: string[];
  complianceSummary: string;
  itemBreakdown: Array<{
    unCode: string;
    description: string;
    adrClass: string;
    transportCategory: number;
    multiplier: number;
    quantity: number;
    calculatedPoints: number;
  }>;
}

export class AdrComplianceService {
  public static readonly EXEMPTION_LIMIT_POINTS = 1000;

  /**
   * Deterministically calculates ADR 1.1.3.6 points and determines exemption status
   */
  public static calculateAdrExemption(
    items: AdrItemInput[],
  ): AdrCalculationResult {
    if (!items || items.length === 0) {
      return {
        isHazardous: false,
        totalPoints: 0,
        maxExemptionLimit: this.EXEMPTION_LIMIT_POINTS,
        isExempt1136: true,
        orangePlatesRequired: false,
        driverAdrCertificateRequired: false,
        fireExtinguisherRequirement: "Extintor estándar de cabina 2 kg",
        hasCategoryZeroItem: false,
        tunnelRestrictionCodes: [],
        complianceSummary: "Carga general no peligrosa. Sin requisitos ADR.",
        itemBreakdown: [],
      };
    }

    let totalPoints = 0;
    let hasCategoryZero = false;
    const tunnelCodes = new Set<string>();

    const itemBreakdown = items.map((item) => {
      let multiplier = 1;
      let calculatedPoints = 0;

      switch (item.transportCategory) {
        case 0:
          multiplier = Infinity;
          hasCategoryZero = true;
          calculatedPoints = Infinity;
          break;
        case 1:
          multiplier = 50;
          calculatedPoints = item.quantityUnits * multiplier;
          break;
        case 2:
          multiplier = 3;
          calculatedPoints = item.quantityUnits * multiplier;
          break;
        case 3:
          multiplier = 1;
          calculatedPoints = item.quantityUnits * multiplier;
          break;
        case 4:
          multiplier = 0;
          calculatedPoints = 0;
          break;
        default:
          multiplier = 1;
          calculatedPoints = item.quantityUnits;
      }

      if (item.transportCategory !== 0) {
        totalPoints += calculatedPoints;
      }

      if (item.tunnelRestrictionCode) {
        tunnelCodes.add(item.tunnelRestrictionCode);
      }

      return {
        unCode: item.unCode,
        description: item.properShippingName,
        adrClass: item.adrClass,
        transportCategory: item.transportCategory,
        multiplier: multiplier === Infinity ? 999999 : multiplier,
        quantity: item.quantityUnits,
        calculatedPoints:
          calculatedPoints === Infinity ? 999999 : calculatedPoints,
      };
    });

    const isExempt =
      !hasCategoryZero && totalPoints <= this.EXEMPTION_LIMIT_POINTS;
    const orangePlatesRequired = !isExempt;
    const driverAdrCertificateRequired = !isExempt;
    const fireExtinguisherRequirement = isExempt
      ? "Extintor de polvo 2 kg (Aparato de cabina, ADR 8.1.4.2)"
      : "Juego reglamentario completo ADR: Mínimo 12 kg (ej. 2x6 kg o 1x6 kg + 1x2 kg en cabina)";

    let complianceSummary = "";
    if (hasCategoryZero) {
      complianceSummary =
        "ADR TOTAL OBLIGATORIO: Contiene materias de Categoría 0 (no admitidas bajo exención 1.1.3.6). Placas naranja, carné ADR y equipo obligatorio.";
    } else if (isExempt) {
      complianceSummary = `EXENCIÓN 1.1.3.6 APLICABLE: ${totalPoints.toFixed(
        0,
      )} puntos totales (≤ 1.000 puntos). No requiere placas naranja ni carné ADR de conductor. Carta de porte con mención 'Carga que no supera los límites prescritos en 1.1.3.6'.`;
    } else {
      complianceSummary = `ADR COMPLETO OBLIGATORIO: ${totalPoints.toFixed(
        0,
      )} puntos superan el límite de 1.000 puntos. Exige paneles naranja reglamentarios, conductor con certificado ADR y equipo de emergencia.`;
    }

    return {
      isHazardous: true,
      totalPoints: hasCategoryZero ? 999999 : totalPoints,
      maxExemptionLimit: this.EXEMPTION_LIMIT_POINTS,
      isExempt1136: isExempt,
      orangePlatesRequired,
      driverAdrCertificateRequired,
      fireExtinguisherRequirement,
      hasCategoryZeroItem: hasCategoryZero,
      tunnelRestrictionCodes: Array.from(tunnelCodes),
      complianceSummary,
      itemBreakdown,
    };
  }
}

/**
 * Customs Warehouse Finance & Guarantee Engine
 *
 * Deterministic calculation of:
 * 1. Suspended Customs Debt (Tariff Duty + Import VAT) under Special Regimes (CAU Arts. 210-242).
 * 2. Real-time Customs Guarantee & Bank Bond (GRN) credit consumption and availability (CAU Arts. 89-98).
 * 3. Tax settlement on discharge: Free Circulation (Regime 4071) vs Third Country Re-exportation (Regime 3171).
 * 4. Temporary Storage (ADT) stay limits and deadline warnings (CAU Art. 149 - 90 days limit).
 */

export interface SuspendedDebtCalculationInput {
  customsValueEur: number;
  tariffRatePercent: number;
  importVatRatePercent?: number; // default 21%
}

export interface SuspendedDebtResult {
  customsValueEur: number;
  tariffRatePercent: number;
  importVatRatePercent: number;
  suspendedDutyAmountEur: number;
  suspendedVatAmountEur: number;
  totalSuspendedDebtEur: number;
  taxableVatBaseEur: number;
}

export interface GuaranteeAvailabilityInput {
  totalGuaranteeAmountEur: number;
  activeLots: Array<{
    lotNumber: string;
    totalSuspendedDebtEur: number;
  }>;
}

export interface GuaranteeAvailabilityResult {
  totalGuaranteeAmountEur: number;
  committedSuspendedDebtEur: number;
  availableCreditEur: number;
  utilizationRatePercent: number;
  isCreditDepleted: boolean;
  status: "OPTIMAL" | "HIGH_UTILIZATION" | "DEPLETED";
  notes: string;
}

export interface DischargeTaxSettlementInput {
  totalLotCustomsValueEur: number;
  totalLotDutyAmountEur: number;
  totalLotVatAmountEur: number;
  initialPackagesCount: number;
  dischargedPackagesCount: number;
  dischargeRegimeCode:
    "4071" | "3171" | "7171" | "5171" | "DOMESTIC_COMMERCE_DDA";
}

export interface DischargeTaxSettlementResult {
  dischargeRegimeCode: string;
  dischargedPackagesRatio: number;
  dischargedCustomsValueEur: number;
  settledDutyAmountEur: number;
  settledVatAmountEur: number;
  totalSettledTaxesEur: number;
  releasedGuaranteeCreditEur: number;
  taxExemptionRationale: string;
}

export interface AdtStayEvaluationResult {
  inclusionDateIso: string;
  maxStayDaysLimit: number;
  daysElapsed: number;
  daysRemaining: number;
  deadlineDateIso: string;
  isExpired: boolean;
  isWarningNearExpiry: boolean; // <= 15 days remaining
  complianceStatus: "COMPLIANT" | "WARNING_NEAR_EXPIRY" | "EXPIRED_INFRACTION";
  notes: string;
}

export class CustomsWarehouseFinanceService {
  /**
   * Calculates suspended tariff duties and import VAT under bonded customs storage.
   */
  static calculateSuspendedDebt(
    input: SuspendedDebtCalculationInput,
  ): SuspendedDebtResult {
    const customsVal = Math.max(0, Number(input.customsValueEur) || 0);
    const tariffRate = Math.max(0, Number(input.tariffRatePercent) || 0);
    const vatRate =
      input.importVatRatePercent !== undefined
        ? Math.max(0, Number(input.importVatRatePercent))
        : 21.0;

    // Arancel Suspendido = Valor en Aduana * (Tipo Arancel / 100)
    const suspendedDuty =
      Math.round(customsVal * (tariffRate / 100) * 100) / 100;

    // Base imponible del IVA a la Importación = Valor en Aduana + Arancel Suspendido (Art. 83 Ley 37/1992)
    const taxableVatBase = Math.round((customsVal + suspendedDuty) * 100) / 100;

    // IVA Suspendido = Base IVA * (Tipo IVA / 100)
    const suspendedVat =
      Math.round(taxableVatBase * (vatRate / 100) * 100) / 100;

    const totalSuspendedDebt =
      Math.round((suspendedDuty + suspendedVat) * 100) / 100;

    return {
      customsValueEur: customsVal,
      tariffRatePercent: tariffRate,
      importVatRatePercent: vatRate,
      suspendedDutyAmountEur: suspendedDuty,
      suspendedVatAmountEur: suspendedVat,
      totalSuspendedDebtEur: totalSuspendedDebt,
      taxableVatBaseEur: taxableVatBase,
    };
  }

  /**
   * Computes available credit on the Comprehensive Guarantee (Aval Global AEAT) and its utilization.
   */
  static calculateGuaranteeAvailability(
    input: GuaranteeAvailabilityInput,
  ): GuaranteeAvailabilityResult {
    const totalGuar = Math.max(0, Number(input.totalGuaranteeAmountEur) || 0);
    const committedDebt = (input.activeLots || []).reduce(
      (sum, lot) => sum + (Number(lot.totalSuspendedDebtEur) || 0),
      0,
    );
    const roundedCommitted = Math.round(committedDebt * 100) / 100;
    const availableCredit = Math.max(
      0,
      Math.round((totalGuar - roundedCommitted) * 100) / 100,
    );
    const utilRate =
      totalGuar > 0
        ? Math.round((roundedCommitted / totalGuar) * 10000) / 100
        : 0;

    const isDepleted = roundedCommitted >= totalGuar;
    let status: "OPTIMAL" | "HIGH_UTILIZATION" | "DEPLETED" = "OPTIMAL";
    let notes =
      "Saldo de aval aduanero dentro de parámetros óptimos de solvencia garantizada.";

    if (isDepleted) {
      status = "DEPLETED";
      notes =
        "ALERTA: Aval global aduanero agotado. Riesgo de bloqueo de despachos por la AEAT.";
    } else if (utilRate >= 85.0) {
      status = "HIGH_UTILIZATION";
      notes =
        "ADVERTENCIA: Consumo de aval superior al 85%. Se aconseja solicitar ampliación de garantía bancaria.";
    }

    return {
      totalGuaranteeAmountEur: totalGuar,
      committedSuspendedDebtEur: roundedCommitted,
      availableCreditEur: availableCredit,
      utilizationRatePercent: utilRate,
      isCreditDepleted: isDepleted,
      status,
      notes,
    };
  }

  /**
   * Calculates payable taxes and released guarantee credit on discharge from warehouse.
   */
  static calculateDischargeSettlement(
    input: DischargeTaxSettlementInput,
  ): DischargeTaxSettlementResult {
    const initialPkgs = Math.max(1, Number(input.initialPackagesCount) || 1);
    const dischargedPkgs = Math.min(
      initialPkgs,
      Math.max(1, Number(input.dischargedPackagesCount) || 1),
    );
    const ratio = Math.round((dischargedPkgs / initialPkgs) * 10000) / 10000;

    const totalVal = Math.max(0, Number(input.totalLotCustomsValueEur) || 0);
    const totalDuty = Math.max(0, Number(input.totalLotDutyAmountEur) || 0);
    const totalVat = Math.max(0, Number(input.totalLotVatAmountEur) || 0);

    const dischargedVal = Math.round(totalVal * ratio * 100) / 100;
    const propDuty = Math.round(totalDuty * ratio * 100) / 100;
    const propVat = Math.round(totalVat * ratio * 100) / 100;
    const releasedCredit = Math.round((propDuty + propVat) * 100) / 100;

    let settledDuty = 0.0;
    let settledVat = 0.0;
    let rationale = "";

    switch (input.dischargeRegimeCode) {
      case "4071":
        // Despacho a Libre Práctica e Importación para el consumo desde Depósito Aduanero
        settledDuty = propDuty;
        settledVat = propVat;
        rationale =
          "Devengo y liquidación efectiva de Arancel e IVA a la Importación por entrada a consumo comunitario.";
        break;

      case "3171":
        // Reexportación directa de mercancía no comunitaria a tercer país desde Depósito Aduanero
        settledDuty = 0.0;
        settledVat = 0.0;
        rationale =
          "Exención plena de derechos de importación e IVA por reexportación fuera del territorio aduanero de la UE (Art. 270 CAU).";
        break;

      case "7171":
        // Transferencia entre depósitos aduaneros autorizados (permanece suspendido)
        settledDuty = 0.0;
        settledVat = 0.0;
        rationale =
          "Traslado en régimen de tránsito / suspensión hacia otra instalación autorizada.";
        break;

      case "5171":
        // Inclusión en Perfeccionamiento Activo desde Depósito
        settledDuty = 0.0;
        settledVat = 0.0;
        rationale =
          "Suspensión de derechos por transferencia a régimen de transformación y perfeccionamiento activo.";
        break;

      case "DOMESTIC_COMMERCE_DDA":
        // Entrega asimilada a importación en DDA con exención de IVA en compras sucesivas
        settledDuty = propDuty;
        settledVat = 0.0; // Inversión del sujeto pasivo / exención DDA Ley IVA
        rationale =
          "Salida de DDA para entrega interior con exención técnica de IVA (asimilada a la importación).";
        break;

      default:
        settledDuty = propDuty;
        settledVat = propVat;
        rationale = "Liquidación ordinaria de tributos aduaneros.";
    }

    const totalSettled = Math.round((settledDuty + settledVat) * 100) / 100;

    return {
      dischargeRegimeCode: input.dischargeRegimeCode,
      dischargedPackagesRatio: ratio,
      dischargedCustomsValueEur: dischargedVal,
      settledDutyAmountEur: settledDuty,
      settledVatAmountEur: settledVat,
      totalSettledTaxesEur: totalSettled,
      releasedGuaranteeCreditEur: releasedCredit,
      taxExemptionRationale: rationale,
    };
  }

  /**
   * Evaluates the stay duration for Temporary Storage (ADT) according to Article 149 UCC (90 days limit).
   */
  static evaluateAdtStayDeadline(
    inclusionDateIso: string,
    currentDateIso?: string,
    maxStayDaysLimit: number = 90,
  ): AdtStayEvaluationResult {
    const inclusionTime = new Date(inclusionDateIso).getTime();
    const currentTime = currentDateIso
      ? new Date(currentDateIso).getTime()
      : Date.now();
    const diffMs = currentTime - inclusionTime;
    const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const daysRemaining = maxStayDaysLimit - daysElapsed;

    const deadlineDate = new Date(
      inclusionTime + maxStayDaysLimit * 24 * 60 * 60 * 1000,
    );
    const deadlineDateIso = deadlineDate.toISOString();

    const isExpired = daysRemaining < 0;
    const isWarning = !isExpired && daysRemaining <= 15;

    let complianceStatus:
      "COMPLIANT" | "WARNING_NEAR_EXPIRY" | "EXPIRED_INFRACTION" = "COMPLIANT";
    let notes = `Plazo reglamentario de ADT en vigor. Quedan ${daysRemaining} días para asignar régimen aduanero definitivo.`;

    if (isExpired) {
      complianceStatus = "EXPIRED_INFRACTION";
      notes = `INFRACCIÓN ADUANERA: Plazo máximo de 90 días excedido por ${Math.abs(daysRemaining)} días (Art. 149 CAU). Mercancía sujeta a venta pública o decomiso.`;
    } else if (isWarning) {
      complianceStatus = "WARNING_NEAR_EXPIRY";
      notes = `ATENCIÓN URGENTE: Quedan únicamente ${daysRemaining} días de estancia en ADT. Proceda al despacho antes del vencimiento.`;
    }

    return {
      inclusionDateIso,
      maxStayDaysLimit,
      daysElapsed,
      daysRemaining,
      deadlineDateIso,
      isExpired,
      isWarningNearExpiry: isWarning,
      complianceStatus,
      notes,
    };
  }
}

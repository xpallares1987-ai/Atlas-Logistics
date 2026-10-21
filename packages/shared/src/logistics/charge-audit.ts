/**
 * @file charge-audit.ts
 * @description Shipping Carrier Charge Audit, D&D Rate Verification, and Commercial Margin Leakage Engine.
 */

export type OceanCarrierCode =
  | "MSC"
  | "MAERSK"
  | "CMACGM"
  | "HAPAG"
  | "COSCO"
  | "ONE"
  | "ZIM"
  | "EVERGREEN"
  | "OTHER";

export interface BilledChargeItem {
  id: string;
  shipmentRef: string;
  carrierCode: OceanCarrierCode;
  carrierRawName: string;
  chargeCode: string; // e.g. 'DEMURRAGE', 'DETENTION', 'STORAGE', 'OCEAN_FREIGHT', 'BAF', 'THC'
  equipmentType: "20DRY" | "40DRY" | "40HC" | "REEFER";
  quantityUnits: number;
  unitRateBilledEur: number;
  totalBilledEur: number;
  agreedContractRateEur?: number;
  freeDaysContracted?: number;
  actualDaysPortStay?: number;
  reimbursedToClientEur?: number;
}

export interface DiscrepancyAuditFinding {
  chargeId: string;
  shipmentRef: string;
  carrierCode: OceanCarrierCode;
  type:
    | "CARRIER_OVERBILLING"
    | "MARGIN_LEAKAGE_UNBILLED"
    | "FREE_TIME_DISPUTE"
    | "COMPLIANT";
  severity: "INFO" | "WARNING" | "CRITICAL";
  billedAmountEur: number;
  justifiedAmountEur: number;
  discrepancyEur: number;
  explanation: string;
  suggestedAction: string;
}

export const OFFICIAL_CARRIER_FREE_DAYS_DEFAULTS: Record<
  OceanCarrierCode,
  { dry40FreeDays: number; dailyTier1Eur: number; dailyTier2Eur: number }
> = {
  MSC: { dry40FreeDays: 7, dailyTier1Eur: 80, dailyTier2Eur: 135 },
  MAERSK: { dry40FreeDays: 7, dailyTier1Eur: 85, dailyTier2Eur: 140 },
  CMACGM: { dry40FreeDays: 7, dailyTier1Eur: 75, dailyTier2Eur: 130 },
  HAPAG: { dry40FreeDays: 8, dailyTier1Eur: 80, dailyTier2Eur: 135 },
  COSCO: { dry40FreeDays: 10, dailyTier1Eur: 70, dailyTier2Eur: 125 },
  ONE: { dry40FreeDays: 7, dailyTier1Eur: 75, dailyTier2Eur: 130 },
  ZIM: { dry40FreeDays: 7, dailyTier1Eur: 75, dailyTier2Eur: 130 },
  EVERGREEN: { dry40FreeDays: 7, dailyTier1Eur: 70, dailyTier2Eur: 125 },
  OTHER: { dry40FreeDays: 7, dailyTier1Eur: 75, dailyTier2Eur: 130 },
};

/**
 * Normalizes raw carrier text to a standard catalog code.
 */
export function normalizeCarrierCode(rawName: string): OceanCarrierCode {
  if (!rawName) return "OTHER";
  const s = rawName.trim().toUpperCase();
  if (s.includes("MSC") || s.includes("MEDITERRANEAN")) return "MSC";
  if (s.includes("MAERSK") || s.includes("MOLLER") || s.includes("APM"))
    return "MAERSK";
  if (s.includes("CMA") || s.includes("CGM")) return "CMACGM";
  if (s.includes("HAPAG") || s.includes("LLOYD")) return "HAPAG";
  if (s.includes("COSCO")) return "COSCO";
  if (s.includes("ONE") || s.includes("OCEAN NETWORK")) return "ONE";
  if (s.includes("ZIM")) return "ZIM";
  if (s.includes("EVERGREEN")) return "EVERGREEN";
  return "OTHER";
}

/**
 * Audits a billed charge item against contractual agreed benchmarks and sales re-invoicing.
 */
export function auditChargeItem(
  charge: BilledChargeItem,
): DiscrepancyAuditFinding {
  const normCarrier =
    charge.carrierCode || normalizeCarrierCode(charge.carrierRawName);
  const defaults =
    OFFICIAL_CARRIER_FREE_DAYS_DEFAULTS[normCarrier] ||
    OFFICIAL_CARRIER_FREE_DAYS_DEFAULTS.OTHER;

  // 1. Check Demurrage / Detention Overbilling
  if (charge.chargeCode === "DEMURRAGE" || charge.chargeCode === "DETENTION") {
    const contractedFree =
      charge.freeDaysContracted !== undefined
        ? charge.freeDaysContracted
        : defaults.dry40FreeDays;
    const actualDays = charge.actualDaysPortStay || 0;

    if (actualDays <= contractedFree && charge.totalBilledEur > 0) {
      return {
        chargeId: charge.id,
        shipmentRef: charge.shipmentRef,
        carrierCode: normCarrier,
        type: "FREE_TIME_DISPUTE",
        severity: "CRITICAL",
        billedAmountEur: charge.totalBilledEur,
        justifiedAmountEur: 0,
        discrepancyEur: charge.totalBilledEur,
        explanation: `La naviera ${normCarrier} facturó ${charge.totalBilledEur} € en días libres pactados (${actualDays} días reales vs ${contractedFree} días libres de contrato).`,
        suggestedAction: `Emitir carta de protesta y disputa formal ante ${normCarrier} reclamando abono total de ${charge.totalBilledEur} €.`,
      };
    }

    if (
      charge.agreedContractRateEur &&
      charge.unitRateBilledEur > charge.agreedContractRateEur
    ) {
      const extraPerDay =
        charge.unitRateBilledEur - charge.agreedContractRateEur;
      const totalOvercharge = extraPerDay * (charge.quantityUnits || 1);
      return {
        chargeId: charge.id,
        shipmentRef: charge.shipmentRef,
        carrierCode: normCarrier,
        type: "CARRIER_OVERBILLING",
        severity: "HIGH" as any,
        billedAmountEur: charge.totalBilledEur,
        justifiedAmountEur: charge.totalBilledEur - totalOvercharge,
        discrepancyEur: totalOvercharge,
        explanation: `Tarifa diaria facturada (${charge.unitRateBilledEur} €/día) superior a la tarifa contractual pactada (${charge.agreedContractRateEur} €/día).`,
        suggestedAction: `Reclamar abono de sobrecoste de ${totalOvercharge} € a la naviera ${normCarrier}.`,
      };
    }
  }

  // 2. Check Margin Leakage (AP cost paid to carrier not re-invoiced to customer)
  if (
    charge.reimbursedToClientEur !== undefined &&
    charge.reimbursedToClientEur < charge.totalBilledEur
  ) {
    const leakageEur = Number(
      (charge.totalBilledEur - charge.reimbursedToClientEur).toFixed(2),
    );
    if (leakageEur > 10) {
      return {
        chargeId: charge.id,
        shipmentRef: charge.shipmentRef,
        carrierCode: normCarrier,
        type: "MARGIN_LEAKAGE_UNBILLED",
        severity: "CRITICAL",
        billedAmountEur: charge.totalBilledEur,
        justifiedAmountEur: charge.totalBilledEur,
        discrepancyEur: leakageEur,
        explanation: `Gasto de naviera pagado (${charge.totalBilledEur} €) no repercutido en venta al cliente (facturado al cliente: ${charge.reimbursedToClientEur} €). Fuga neta de margen.`,
        suggestedAction: `Emitir factura rectificativa o de suplidos al cliente por ${leakageEur} €.`,
      };
    }
  }

  return {
    chargeId: charge.id,
    shipmentRef: charge.shipmentRef,
    carrierCode: normCarrier,
    type: "COMPLIANT",
    severity: "INFO",
    billedAmountEur: charge.totalBilledEur,
    justifiedAmountEur: charge.totalBilledEur,
    discrepancyEur: 0,
    explanation:
      "Cargo conforme con los términos del contrato marítimo y ventas repercutidas.",
    suggestedAction: "Aprobar para pago contable.",
  };
}

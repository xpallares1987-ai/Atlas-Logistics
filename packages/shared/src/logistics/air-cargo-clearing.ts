/**
 * @file air-cargo-clearing.ts
 * @description Pure domain algorithms for IATA Air Cargo Messaging (AWB check-digit, Cargo-IMP FWB/FHL/FSU), CASS billing reconciliation, and Agent Network clearing & profit-share netting.
 * @module @atlas/shared/logistics/air-cargo-clearing
 * @see {@link docs/adr/0029-air-cargo-messaging-cass-and-agent-network-clearing.md}
 */

// ============================================================================
// 1. DATA CONTRACTS & INTERFACES
// ============================================================================

export interface AwbValidationResult {
  isValid: boolean;
  prefix?: string;
  serial7?: string;
  checkDigit?: number;
  formattedAwb?: string;
  error?: string;
}

export interface AirChargeableWeightResult {
  grossWeightKg: number;
  volumeCbm: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  billedBasis: "GROSS_WEIGHT" | "VOLUMETRIC_WEIGHT";
}

export interface CargoImpFwbInput {
  airlinePrefix: string;
  awbSerial7: string;
  originAirport: string; // 3-letter IATA e.g. MAD
  destinationAirport: string; // 3-letter IATA e.g. JFK
  flightNumber: string; // e.g. IB6253
  flightDayMonth: string; // e.g. 25MAY
  shipperName: string;
  shipperAddress: string;
  shipperCity: string;
  shipperCountry: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeCity: string;
  consigneeCountry: string;
  pieces: number;
  grossWeightKg: number;
  volumeCbm?: number;
  chargeableWeightKg?: number;
  ratePerKg: number;
  currency?: string;
  natureOfGoods: string;
  specialHandlingCodes?: string[];
  fuelSurcharge?: number;
  securitySurcharge?: number;
  issuingAgentName?: string;
}

export interface CargoImpFhlItem {
  hawbNumber: string;
  originAirport: string;
  destinationAirport: string;
  pieces: number;
  grossWeightKg: number;
  natureOfGoods: string;
  shipperName: string;
  shipperCity: string;
  shipperCountry: string;
  consigneeName: string;
  consigneeCity: string;
  consigneeCountry: string;
}

export interface CargoImpFhlInput {
  airlinePrefix: string;
  mawbSerial7: string;
  originAirport: string;
  destinationAirport: string;
  totalPieces: number;
  totalGrossWeightKg: number;
  items: CargoImpFhlItem[];
}

export interface CargoImpFsuInput {
  airlinePrefix: string;
  awbSerial7: string;
  originAirport: string;
  destinationAirport: string;
  milestoneCode: "RCS" | "DEP" | "ARR" | "RCF" | "NFD" | "AWD" | "DLV" | "DIS";
  eventAirport: string;
  eventDateUtc: string; // YYYY-MM-DDTHH:mm:ssZ or DDMMMHHMM
  pieces: number;
  grossWeightKg: number;
  flightNumber?: string;
}

export interface CassReconciliationItem {
  awbNumber: string;
  billedGrossWeightKg: number;
  billedChargeableWeightKg: number;
  billedFreightRate: number;
  billedFreightAmount: number;
  billedFuelSurcharge: number;
  billedSecuritySurcharge: number;
  billedIataCommission: number;
  billedNetAmount: number;
  expectedChargeableWeightKg: number;
  expectedFreightRate: number;
  expectedFreightAmount: number;
  expectedFuelSurcharge: number;
  expectedSecuritySurcharge: number;
  expectedIataCommission: number;
  expectedNetAmount: number;
}

export interface CassReconciliationResult {
  awbNumber: string;
  weightVarianceKg: number;
  rateVariance: number;
  amountVarianceEur: number;
  isMatched: boolean;
  varianceStatus: "MATCHED" | "DISCREPANCY_FLAGGED" | "CRITICAL_VARIANCE";
  discrepancyReasons: string[];
}

export interface AgentProfitShareInput {
  shipmentId: string;
  hblOrHawbNumber: string;
  clientGrossRevenueEur: number;
  carrierFreightCostEur: number;
  originTerminalFeesEur: number;
  destinationTerminalFeesEur: number;
  splitPercentageAgent?: number; // Default 50.0%
}

export interface AgentProfitShareResult {
  shipmentId: string;
  hblOrHawbNumber: string;
  clientGrossRevenueEur: number;
  totalDirectCostsEur: number;
  verifiedGrossProfitEur: number;
  agentProfitSharePercent: number;
  agentShareAmountEur: number;
  originForwarderShareAmountEur: number;
  isProfitable: boolean;
}

export interface AgentNettingItem {
  entryNumber: string;
  noteType: "DEBIT_NOTE" | "CREDIT_NOTE";
  hblOrHawbNumber: string;
  amount: number;
  currency: string;
  exchangeRateToTarget: number;
  amountInTargetCurrency: number;
}

export interface AgentPeriodNettingSummary {
  agentCompanyId: string;
  targetCurrency: string;
  periodStart: string;
  periodEnd: string;
  totalDebitNotesTarget: number; // Origin owes Agent
  totalCreditNotesTarget: number; // Agent owes Origin
  netSettlementBalanceTarget: number; // Positive: Agent pays Origin; Negative: Origin pays Agent
  settlementAction: "COLLECT_FROM_AGENT" | "PAY_TO_AGENT" | "BALANCED_ZERO";
  itemsCount: number;
}

// ============================================================================
// 2. IATA AIR WAYBILL (AWB) CHECK-DIGIT VALIDATION (RESOLUTION 600A)
// ============================================================================

/**
 * Calculates the IATA standard modulus-7 check digit for a 7-digit serial number.
 */
export function calculateIataAwbCheckDigit(serial7: string | number): number {
  const clean = String(serial7).replace(/[^0-9]/g, "");
  if (clean.length < 7) {
    throw new Error(
      `Serial number must be at least 7 digits, got '${serial7}'`,
    );
  }
  const numericVal = parseInt(clean.slice(0, 7), 10);
  return numericVal % 7;
}

/**
 * Validates an IATA Air Waybill number (PPP-NNNNNNNC) using Resolution 600a modulus-7 checksum.
 */
export function validateIataAwbNumber(awb: string): AwbValidationResult {
  if (!awb || typeof awb !== "string") {
    return { isValid: false, error: "AWB number must be a non-empty string" };
  }

  const clean = awb.replace(/[^0-9]/g, "");

  // An AWB has either 8 digits (serial + check digit) or 11 digits (3-digit airline prefix + 8 digits)
  if (clean.length === 8) {
    const serial7 = clean.slice(0, 7);
    const checkDigit = parseInt(clean[7], 10);
    const expected = calculateIataAwbCheckDigit(serial7);

    if (checkDigit !== expected) {
      return {
        isValid: false,
        serial7,
        checkDigit,
        error: `IATA Modulus-7 checksum mismatch: got ${checkDigit}, expected ${expected}`,
      };
    }

    return {
      isValid: true,
      serial7,
      checkDigit,
      formattedAwb: clean,
    };
  }

  if (clean.length === 11) {
    const prefix = clean.slice(0, 3);
    const serial7 = clean.slice(3, 10);
    const checkDigit = parseInt(clean[10], 10);
    const expected = calculateIataAwbCheckDigit(serial7);

    if (checkDigit !== expected) {
      return {
        isValid: false,
        prefix,
        serial7,
        checkDigit,
        error: `IATA Modulus-7 checksum mismatch for airline prefix ${prefix}: got ${checkDigit}, expected ${expected}`,
      };
    }

    return {
      isValid: true,
      prefix,
      serial7,
      checkDigit,
      formattedAwb: `${prefix}-${serial7}${checkDigit}`,
    };
  }

  return {
    isValid: false,
    error: `Invalid AWB length: '${awb}' must be either 8 digits (NNNNNNNC) or 11 digits (PPP-NNNNNNNC)`,
  };
}

// ============================================================================
// 3. IATA CHARGEABLE WEIGHT (TACT RATIO 1:6000 / 1 CBM = 166.67 KG)
// ============================================================================

/**
 * Computes IATA Air Freight Chargeable Weight based on TACT 1:6000 ratio (1 CBM = 166.667 kg).
 */
export function calculateAirChargeableWeight(
  grossWeightKg: number,
  volumeCbm: number,
): AirChargeableWeightResult {
  const gross = Math.max(0, Math.round(grossWeightKg * 100) / 100);
  const volume = Math.max(0, Math.round(volumeCbm * 10000) / 10000);

  // 1 CBM = 166.6667 kg (TACT Volumetric Weight)
  const volumetricWeightKg = Math.round(volume * 166.6667 * 10) / 10;
  const chargeableWeightKg = Math.max(gross, volumetricWeightKg);
  const billedBasis =
    volumetricWeightKg > gross ? "VOLUMETRIC_WEIGHT" : "GROSS_WEIGHT";

  return {
    grossWeightKg: gross,
    volumeCbm: volume,
    volumetricWeightKg,
    chargeableWeightKg,
    billedBasis,
  };
}

// ============================================================================
// 4. CARGO-IMP TELETYPE BUILDERS & PARSERS (FWB, FHL, FSU)
// ============================================================================

/**
 * Builds an official IATA Cargo-IMP FWB (Freight Waybill) v16 teletype payload.
 */
export function buildCargoImpFwb(input: CargoImpFwbInput): string {
  const checkDigit = calculateIataAwbCheckDigit(input.awbSerial7);
  const fullAwb = `${input.airlinePrefix}-${input.awbSerial7}${checkDigit}`;
  const grossFormatted = input.grossWeightKg.toFixed(1);
  const chargeable = (input.chargeableWeightKg ?? input.grossWeightKg).toFixed(
    1,
  );
  const totalFreight = (input.grossWeightKg * input.ratePerKg).toFixed(2);
  const currency = input.currency || "EUR";

  const lines = [
    "FWB/16",
    `${fullAwb}${input.originAirport}${input.destinationAirport}/T${input.pieces}K${grossFormatted}`,
    `FLT/${input.flightNumber}/${input.flightDayMonth}`,
    `RTG/${input.originAirport}${input.airlinePrefix.slice(0, 2)}${input.destinationAirport}`,
    "SHP",
    `/${input.shipperName.toUpperCase().slice(0, 35)}`,
    `/${input.shipperAddress.toUpperCase().slice(0, 35)}`,
    `/${input.shipperCity.toUpperCase()}/${input.shipperCountry.toUpperCase().slice(0, 2)}`,
    "CNE",
    `/${input.consigneeName.toUpperCase().slice(0, 35)}`,
    `/${input.consigneeAddress.toUpperCase().slice(0, 35)}`,
    `/${input.consigneeCity.toUpperCase()}/${input.consigneeCountry.toUpperCase().slice(0, 2)}`,
    `CVD/${currency}/PP/NVD/NCV/XXX`,
    `RTD/1/P${input.pieces}/K${grossFormatted}/CQ/W${chargeable}/R${input.ratePerKg.toFixed(2)}/T${totalFreight}`,
    `/NG/${input.natureOfGoods.toUpperCase().slice(0, 20)}`,
  ];

  if (input.fuelSurcharge || input.securitySurcharge) {
    const myc = input.fuelSurcharge
      ? `/P/MYC${input.fuelSurcharge.toFixed(2)}`
      : "";
    const scc = input.securitySurcharge
      ? `/P/SCC${input.securitySurcharge.toFixed(2)}`
      : "";
    lines.push(`OTH${myc}${scc}`);
  }

  if (input.specialHandlingCodes && input.specialHandlingCodes.length > 0) {
    lines.push(`SPH/${input.specialHandlingCodes.join("/")}`);
  }

  lines.push(
    `CER/${(input.issuingAgentName || "ATLAS LOGISTICS").toUpperCase().slice(0, 35)}`,
  );

  return lines.join("\r\n");
}

/**
 * Builds an official IATA Cargo-IMP FHL (Consolidation List) v4 teletype payload.
 */
export function buildCargoImpFhl(input: CargoImpFhlInput): string {
  const checkDigit = calculateIataAwbCheckDigit(input.mawbSerial7);
  const mawbFormatted = `${input.airlinePrefix}-${input.mawbSerial7}${checkDigit}`;

  const lines = [
    "FHL/4",
    `MBI/${mawbFormatted}${input.originAirport}${input.destinationAirport}/T${input.totalPieces}K${input.totalGrossWeightKg.toFixed(1)}`,
  ];

  for (const item of input.items) {
    lines.push(
      `HBS/${item.hawbNumber}/${item.originAirport}${item.destinationAirport}/${item.pieces}/K${item.grossWeightKg.toFixed(1)}/${item.natureOfGoods.toUpperCase().slice(0, 18)}`,
    );
    lines.push(
      `SHP/${item.shipperName.toUpperCase().slice(0, 35)}/${item.shipperCity.toUpperCase()}/${item.shipperCountry.toUpperCase().slice(0, 2)}`,
    );
    lines.push(
      `CNE/${item.consigneeName.toUpperCase().slice(0, 35)}/${item.consigneeCity.toUpperCase()}/${item.consigneeCountry.toUpperCase().slice(0, 2)}`,
    );
  }

  return lines.join("\r\n");
}

/**
 * Builds an official IATA Cargo-IMP FSU (Freight Status Update) teletype tracking payload.
 */
export function buildCargoImpFsu(input: CargoImpFsuInput): string {
  const checkDigit = calculateIataAwbCheckDigit(input.awbSerial7);
  const awbFormatted = `${input.airlinePrefix}-${input.awbSerial7}${checkDigit}`;
  const gross = input.grossWeightKg.toFixed(1);

  // Format timestamp (e.g. 25MAY0830)
  const d = new Date(input.eventDateUtc);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const mon = months[d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const eventStamp = `${day}${mon}${hh}${mm}`;

  const flightPart = input.flightNumber ? `/${input.flightNumber}` : "";

  return [
    "FSU/16",
    `${awbFormatted}${input.originAirport}${input.destinationAirport}/T${input.pieces}K${gross}`,
    `${input.milestoneCode}/${input.eventAirport}/${eventStamp}/T${input.pieces}K${gross}${flightPart}`,
  ].join("\r\n");
}

/**
 * Parses an incoming airline Status Update (FSU) teletype message.
 */
export function parseCargoImpFsu(teletype: string): {
  isValid: boolean;
  awbNumber?: string;
  milestoneCode?: "RCS" | "DEP" | "ARR" | "RCF" | "NFD" | "AWD" | "DLV" | "DIS";
  eventAirport?: string;
  pieces?: number;
  grossWeightKg?: number;
  flightNumber?: string;
  error?: string;
} {
  if (!teletype || !teletype.includes("FSU")) {
    return { isValid: false, error: "Not a valid FSU message" };
  }

  const lines = teletype
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 3) {
    return { isValid: false, error: "FSU message missing required segments" };
  }

  // Line 2: AWB & Corridor (e.g. 074-12345675MADJFK/T1K250.0)
  const awbMatch = lines[1].match(/^([0-9]{3}-[0-9]{8})/);
  const awbNumber = awbMatch ? awbMatch[1] : undefined;

  // Line 3: Milestone Segment (e.g. DEP/MAD/25MAY0830/T1K250.0/IB6253)
  const parts = lines[2].split("/");
  const milestoneCode = parts[0] as any;
  const eventAirport = parts[1];
  const weightPart = parts[3];
  const flightNumber = parts[4];

  let pieces: number | undefined;
  let grossWeightKg: number | undefined;

  if (weightPart) {
    const wm = weightPart.match(/T([0-9]+)K([0-9.]+)/);
    if (wm) {
      pieces = parseInt(wm[1], 10);
      grossWeightKg = parseFloat(wm[2]);
    }
  }

  return {
    isValid: true,
    awbNumber,
    milestoneCode,
    eventAirport,
    pieces,
    grossWeightKg,
    flightNumber,
  };
}

// ============================================================================
// 5. CASS BILLING RECONCILIATION & VARIANCE ENGINE
// ============================================================================

/**
 * Compares an airline CASS statement line against internal accrued freight tariffs.
 */
export function reconcileCassBillingItem(
  item: CassReconciliationItem,
  toleranceEur = 5.0,
): CassReconciliationResult {
  const weightVarianceKg =
    Math.round(
      (item.billedChargeableWeightKg - item.expectedChargeableWeightKg) * 10,
    ) / 10;
  const rateVariance =
    Math.round((item.billedFreightRate - item.expectedFreightRate) * 100) / 100;
  const amountVarianceEur =
    Math.round((item.billedNetAmount - item.expectedNetAmount) * 100) / 100;

  const discrepancies: string[] = [];

  if (Math.abs(weightVarianceKg) > 0.5) {
    discrepancies.push(
      `Chargeable weight mismatch: billed ${item.billedChargeableWeightKg}kg vs expected ${item.expectedChargeableWeightKg}kg (${weightVarianceKg > 0 ? "+" : ""}${weightVarianceKg}kg)`,
    );
  }

  if (Math.abs(rateVariance) > 0.01) {
    discrepancies.push(
      `Freight rate mismatch: billed €${item.billedFreightRate}/kg vs expected €${item.expectedFreightRate}/kg`,
    );
  }

  if (Math.abs(amountVarianceEur) > toleranceEur) {
    discrepancies.push(
      `Net amount discrepancy of €${amountVarianceEur.toFixed(2)} exceeds €${toleranceEur.toFixed(2)} tolerance threshold`,
    );
  }

  const isMatched = discrepancies.length === 0;
  let varianceStatus: "MATCHED" | "DISCREPANCY_FLAGGED" | "CRITICAL_VARIANCE" =
    "MATCHED";

  if (!isMatched) {
    varianceStatus =
      Math.abs(amountVarianceEur) > 100.0
        ? "CRITICAL_VARIANCE"
        : "DISCREPANCY_FLAGGED";
  }

  return {
    awbNumber: item.awbNumber,
    weightVarianceKg,
    rateVariance,
    amountVarianceEur,
    isMatched,
    varianceStatus,
    discrepancyReasons: discrepancies,
  };
}

// ============================================================================
// 6. AGENT NETWORK CLEARING & PROFIT-SHARE SPLIT
// ============================================================================

/**
 * Dynamically computes net profit-share splits for joint-venture or nominated agency shipments.
 */
export function calculateAgentProfitShare(
  input: AgentProfitShareInput,
): AgentProfitShareResult {
  const revenue = Math.max(0, input.clientGrossRevenueEur);
  const carrierCost = Math.max(0, input.carrierFreightCostEur);
  const origTerminal = Math.max(0, input.originTerminalFeesEur);
  const destTerminal = Math.max(0, input.destinationTerminalFeesEur);
  const totalDirectCostsEur =
    Math.round((carrierCost + origTerminal + destTerminal) * 100) / 100;

  const verifiedGrossProfitEur =
    Math.round((revenue - totalDirectCostsEur) * 100) / 100;
  const splitPercent = input.splitPercentageAgent ?? 50.0;
  const isProfitable = verifiedGrossProfitEur > 0;

  let agentShareAmountEur = 0;
  let originForwarderShareAmountEur = 0;

  if (isProfitable) {
    agentShareAmountEur =
      Math.round(verifiedGrossProfitEur * (splitPercent / 100) * 100) / 100;
    originForwarderShareAmountEur =
      Math.round((verifiedGrossProfitEur - agentShareAmountEur) * 100) / 100;
  } else {
    // Shared loss on deficit shipments according to split ratio
    agentShareAmountEur =
      Math.round(verifiedGrossProfitEur * (splitPercent / 100) * 100) / 100;
    originForwarderShareAmountEur =
      Math.round((verifiedGrossProfitEur - agentShareAmountEur) * 100) / 100;
  }

  return {
    shipmentId: input.shipmentId,
    hblOrHawbNumber: input.hblOrHawbNumber,
    clientGrossRevenueEur: revenue,
    totalDirectCostsEur,
    verifiedGrossProfitEur,
    agentProfitSharePercent: splitPercent,
    agentShareAmountEur,
    originForwarderShareAmountEur,
    isProfitable,
  };
}

/**
 * Consolidates bilateral Debit Notes and Credit Notes across a clearing period, executing balance netting.
 */
export function calculateAgentPeriodNetting(
  agentCompanyId: string,
  targetCurrency: string,
  periodStart: string,
  periodEnd: string,
  entries: AgentNettingItem[],
): AgentPeriodNettingSummary {
  let totalDebitNotes = 0; // Origin owes Agent
  let totalCreditNotes = 0; // Agent owes Origin

  for (const entry of entries) {
    const convertedAmount =
      Math.round(entry.amount * entry.exchangeRateToTarget * 100) / 100;

    if (entry.noteType === "DEBIT_NOTE") {
      totalDebitNotes =
        Math.round((totalDebitNotes + convertedAmount) * 100) / 100;
    } else {
      totalCreditNotes =
        Math.round((totalCreditNotes + convertedAmount) * 100) / 100;
    }
  }

  // Net Balance: Credit Notes (Agent owes us) minus Debit Notes (We owe Agent)
  const netSettlementBalanceTarget =
    Math.round((totalCreditNotes - totalDebitNotes) * 100) / 100;

  let settlementAction:
    "COLLECT_FROM_AGENT" | "PAY_TO_AGENT" | "BALANCED_ZERO" = "BALANCED_ZERO";

  if (netSettlementBalanceTarget > 0.01) {
    settlementAction = "COLLECT_FROM_AGENT";
  } else if (netSettlementBalanceTarget < -0.01) {
    settlementAction = "PAY_TO_AGENT";
  }

  return {
    agentCompanyId,
    targetCurrency: targetCurrency.toUpperCase(),
    periodStart,
    periodEnd,
    totalDebitNotesTarget: totalDebitNotes,
    totalCreditNotesTarget: totalCreditNotes,
    netSettlementBalanceTarget,
    settlementAction,
    itemsCount: entries.length,
  };
}

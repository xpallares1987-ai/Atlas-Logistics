/**
 * @file customs-cbam.ts
 * @description Pure domain algorithms for Customs Brokerage (MRN validation, zero-markup disbursements, 1:N tax prorating) and EU CBAM / GLEC Scope 3 compliance.
 * @module @atlas/shared/logistics/customs-cbam
 * @see {@link docs/adr/0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md}
 */

// ============================================================================
// 1. DATA CONTRACTS & TYPES
// ============================================================================

export interface MrnValidationResult {
  isValid: boolean;
  year?: number;
  countryCode?: string;
  customsOfficeCode?: string;
  procedureCode?: string;
  sequence?: string;
  error?: string;
}

export interface ShipmentAllocationItem {
  shipmentId: string;
  netMassKg: number;
}

export interface ProratedTaxAllocation {
  shipmentId: string;
  allocatedNetMassKg: number;
  proratedDutyEur: number;
  proratedVatEur: number;
  proratedTotalDisbursementEur: number;
}

export interface ZeroMarkupDisbursementCheck {
  isCompliant: boolean;
  incurredCostAmountEur: number;
  billedRevenueAmountEur: number;
  markupAmountEur: number;
  error?: string;
}

export interface T1GuaranteeAssessment {
  customsValueEur: number;
  dutyTariffRatePercent: number;
  importVatRatePercent: number;
  estimatedDutyEur: number;
  estimatedVatEur: number;
  totalCommittedDebtEur: number;
}

export interface CbamClassificationResult {
  isCovered: boolean;
  sector?:
    | "IRON_STEEL"
    | "ALUMINIUM"
    | "CEMENT"
    | "FERTILIZERS"
    | "HYDROGEN"
    | "ELECTRICITY";
  defaultDirectEmissionFactor?: number;
  defaultIndirectEmissionFactor?: number;
  matchedPrefix?: string;
}

export interface CbamCalculationInput {
  cnCode: string;
  netMassTonnes: number;
  directEmissionFactor?: number;
  indirectEmissionFactor?: number;
  precursorTonnes?: number;
  precursorEmissionFactor?: number;
  euEtsBenchmarkPriceEur?: number;
  foreignCarbonPricePaidEur?: number;
}

export interface CbamCalculationResult {
  cnCode: string;
  netMassTonnes: number;
  directEmissionsTco2e: number;
  indirectEmissionsTco2e: number;
  precursorEmissionsTco2e: number;
  totalEmbeddedEmissionsTco2e: number;
  euEtsBenchmarkPriceEur: number;
  grossCarbonLiabilityEur: number;
  foreignCarbonPricePaidEur: number;
  netCarbonLiabilityEur: number;
}

export interface CbamTransitionalXmlInput {
  declarationNumber: string;
  reportingPeriod: string;
  declarantVat: string;
  declarantName: string;
  importerVat: string;
  importerName: string;
  items: Array<{
    itemNumber: number;
    cnCode: string;
    goodsDescription: string;
    originCountry: string;
    installationName?: string;
    netMassTonnes: number;
    directEmissionsTco2e: number;
    indirectEmissionsTco2e: number;
    totalEmbeddedEmissionsTco2e: number;
    foreignCarbonPricePaidEur: number;
  }>;
}

export interface GlecTransportLegInput {
  legOrder: number;
  origin: string;
  destination: string;
  mode: "OCEAN_CONTAINER" | "AIR_FREIGHT" | "ROAD_DIESEL" | "RAIL_ELECTRIC";
  distanceKm: number;
  cargoWeightTonnes: number;
}

export interface GlecLegResult {
  legOrder: number;
  origin: string;
  destination: string;
  mode: string;
  distanceKm: number;
  cargoWeightTonnes: number;
  tonneKm: number;
  wtwFactorGco2ePerTkm: number;
  ttwFactorGco2ePerTkm: number;
  wttFactorGco2ePerTkm: number;
  legTco2eWtw: number;
  legTco2eTtw: number;
  legTco2eWtt: number;
}

export interface GlecCalculationSummary {
  totalDistanceKm: number;
  totalTonneKm: number;
  totalTco2eWtw: number;
  totalTco2eTtw: number;
  totalTco2eWtt: number;
  averageCarbonIntensityGco2ePerTkm: number;
  legs: GlecLegResult[];
}

// ============================================================================
// 2. MRN (MOVEMENT REFERENCE NUMBER) VALIDATION
// ============================================================================

/**
 * Validates a Movement Reference Number (MRN) according to UCC / EU Common Data Model specifications.
 * Format: 18 alphanumeric characters:
 * - 2 digits: Year (e.g., 26 for 2026)
 * - 2 chars: Country ISO 3166-1 alpha-2 (e.g., ES, DE, FR, NL)
 * - 6 chars: Customs Office Code (e.g., 000801 for Barcelona Port)
 * - 1 char: Procedure Identifier (e.g., J, K, A, T)
 * - 7 chars: Sequential reference and check digits
 */
export function validateCustomsMrn(mrn: string): MrnValidationResult {
  if (!mrn || typeof mrn !== "string") {
    return { isValid: false, error: "MRN must be a non-empty string" };
  }

  const cleanMrn = mrn.trim().toUpperCase();
  const mrnRegex = /^([0-9]{2})([A-Z]{2})([A-Z0-9]{6})([A-Z0-9])([A-Z0-9]{7})$/;
  const match = cleanMrn.match(mrnRegex);

  if (!match) {
    return {
      isValid: false,
      error: `MRN '${cleanMrn}' does not conform to the 18-character EU UCC specification (YYCCUUUUUUPXXXXXXX)`,
    };
  }

  const [, yearStr, countryCode, customsOfficeCode, procedureCode, sequence] =
    match;
  const year = 2000 + parseInt(yearStr, 10);

  return {
    isValid: true,
    year,
    countryCode,
    customsOfficeCode,
    procedureCode,
    sequence,
  };
}

// ============================================================================
// 3. ZERO-MARKUP DISBURSEMENTS (SUPLIDOS) & 1:N PRORATING
// ============================================================================

/**
 * Enforces strict legal zero-markup parity between incurred AP disbursement and billed AR receivable.
 */
export function validateZeroMarkupDisbursement(
  incurredCostEur: number,
  billedRevenueEur: number,
): ZeroMarkupDisbursementCheck {
  const cost = Math.round(incurredCostEur * 100) / 100;
  const revenue = Math.round(billedRevenueEur * 100) / 100;
  const markup = Math.round((revenue - cost) * 100) / 100;

  if (Math.abs(markup) > 0.001) {
    return {
      isCompliant: false,
      incurredCostAmountEur: cost,
      billedRevenueAmountEur: revenue,
      markupAmountEur: markup,
      error: `Zero-markup violation: Billed revenue (€${revenue.toFixed(2)}) differs from incurred cost (€${cost.toFixed(2)}) by €${markup.toFixed(2)}. Suplidos must have exactly €0.00 markup.`,
    };
  }

  return {
    isCompliant: true,
    incurredCostAmountEur: cost,
    billedRevenueAmountEur: revenue,
    markupAmountEur: 0.0,
  };
}

/**
 * Prorates total customs duty and import VAT across 1:N underlying shipments by net mass,
 * guaranteeing zero cent leakage via remainder adjustment on the final line.
 */
export function prorateCustomsTaxesAcrossShipments(
  shipments: ShipmentAllocationItem[],
  totalDutyEur: number,
  totalVatEur: number,
): ProratedTaxAllocation[] {
  if (shipments.length === 0) {
    return [];
  }

  const roundedDuty = Math.round(totalDutyEur * 100) / 100;
  const roundedVat = Math.round(totalVatEur * 100) / 100;
  const totalMassKg = shipments.reduce((sum, s) => sum + s.netMassKg, 0);

  if (totalMassKg <= 0) {
    throw new Error(
      "Total net mass across allocated shipments must be greater than zero",
    );
  }

  let accumulatedDuty = 0;
  let accumulatedVat = 0;

  const allocations: ProratedTaxAllocation[] = shipments.map((s, index) => {
    const isLast = index === shipments.length - 1;
    const share = s.netMassKg / totalMassKg;

    let duty: number;
    let vat: number;

    if (isLast) {
      duty = Math.round((roundedDuty - accumulatedDuty) * 100) / 100;
      vat = Math.round((roundedVat - accumulatedVat) * 100) / 100;
    } else {
      duty = Math.round(roundedDuty * share * 100) / 100;
      vat = Math.round(roundedVat * share * 100) / 100;
      accumulatedDuty = Math.round((accumulatedDuty + duty) * 100) / 100;
      accumulatedVat = Math.round((accumulatedVat + vat) * 100) / 100;
    }

    const totalDisbursement = Math.round((duty + vat) * 100) / 100;

    return {
      shipmentId: s.shipmentId,
      allocatedNetMassKg: s.netMassKg,
      proratedDutyEur: duty,
      proratedVatEur: vat,
      proratedTotalDisbursementEur: totalDisbursement,
    };
  });

  return allocations;
}

// ============================================================================
// 4. T1 TRANSIT GUARANTEE POTENTIAL DEBT ASSESSMENT
// ============================================================================

/**
 * Evaluates the required customs debt commitment against a transit guarantee line for bonded cargo.
 */
export function calculateT1GuaranteeRequiredDebt(
  customsValueEur: number,
  dutyTariffRatePercent: number,
  importVatRatePercent: number,
): T1GuaranteeAssessment {
  const value = Math.max(0, customsValueEur);
  const dutyRate = Math.max(0, dutyTariffRatePercent) / 100;
  const vatRate = Math.max(0, importVatRatePercent) / 100;

  const estimatedDutyEur = Math.round(value * dutyRate * 100) / 100;
  const taxableBaseVat = value + estimatedDutyEur;
  const estimatedVatEur = Math.round(taxableBaseVat * vatRate * 100) / 100;
  const totalCommittedDebtEur =
    Math.round((estimatedDutyEur + estimatedVatEur) * 100) / 100;

  return {
    customsValueEur: value,
    dutyTariffRatePercent,
    importVatRatePercent,
    estimatedDutyEur,
    estimatedVatEur,
    totalCommittedDebtEur,
  };
}

// ============================================================================
// 5. EU CBAM CLASSIFICATION & EMBEDDED EMISSIONS ENGINE
// ============================================================================

const CBAM_CN_REGISTRY: Array<{
  prefix: string;
  sector:
    | "IRON_STEEL"
    | "ALUMINIUM"
    | "CEMENT"
    | "FERTILIZERS"
    | "HYDROGEN"
    | "ELECTRICITY";
  defaultDirect: number;
  defaultIndirect: number;
}> = [
  // Iron & Steel (CN chapters 72 & 73)
  {
    prefix: "72",
    sector: "IRON_STEEL",
    defaultDirect: 1.85,
    defaultIndirect: 0.35,
  },
  {
    prefix: "73",
    sector: "IRON_STEEL",
    defaultDirect: 2.1,
    defaultIndirect: 0.45,
  },
  // Aluminium (CN chapter 76)
  {
    prefix: "76",
    sector: "ALUMINIUM",
    defaultDirect: 4.5,
    defaultIndirect: 7.2,
  },
  // Cement (CN 2523)
  {
    prefix: "2523",
    sector: "CEMENT",
    defaultDirect: 0.72,
    defaultIndirect: 0.08,
  },
  // Fertilizers (Nitrates, ammonia, urea: 2808, 2814, 2834, 3102, 3105)
  {
    prefix: "2808",
    sector: "FERTILIZERS",
    defaultDirect: 1.6,
    defaultIndirect: 0.15,
  },
  {
    prefix: "2814",
    sector: "FERTILIZERS",
    defaultDirect: 2.1,
    defaultIndirect: 0.2,
  },
  {
    prefix: "2834",
    sector: "FERTILIZERS",
    defaultDirect: 1.4,
    defaultIndirect: 0.15,
  },
  {
    prefix: "3102",
    sector: "FERTILIZERS",
    defaultDirect: 1.8,
    defaultIndirect: 0.25,
  },
  {
    prefix: "3105",
    sector: "FERTILIZERS",
    defaultDirect: 1.5,
    defaultIndirect: 0.2,
  },
  // Hydrogen (CN 2804 10)
  {
    prefix: "280410",
    sector: "HYDROGEN",
    defaultDirect: 9.3,
    defaultIndirect: 1.2,
  },
  // Electricity (CN 2716)
  {
    prefix: "2716",
    sector: "ELECTRICITY",
    defaultDirect: 0.42,
    defaultIndirect: 0.0,
  },
];

/**
 * Classifies an incoming Combined Nomenclature (CN / TARIC) code against the EU CBAM regulated commodity list.
 */
export function classifyCbamCommodity(
  cnCode: string,
): CbamClassificationResult {
  if (!cnCode || typeof cnCode !== "string") {
    return { isCovered: false };
  }

  const normalized = cnCode.replace(/[^0-9]/g, "");

  // Match most specific prefix first
  const sorted = [...CBAM_CN_REGISTRY].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );

  for (const entry of sorted) {
    if (normalized.startsWith(entry.prefix)) {
      return {
        isCovered: true,
        sector: entry.sector,
        defaultDirectEmissionFactor: entry.defaultDirect,
        defaultIndirectEmissionFactor: entry.defaultIndirect,
        matchedPrefix: entry.prefix,
      };
    }
  }

  return { isCovered: false };
}

/**
 * Calculates embedded greenhouse gas emissions and financial carbon liability according to EU Reg. 2023/956.
 */
export function calculateCbamEmissions(
  input: CbamCalculationInput,
): CbamCalculationResult {
  const classification = classifyCbamCommodity(input.cnCode);

  const directFactor =
    input.directEmissionFactor ??
    classification.defaultDirectEmissionFactor ??
    0.0;
  const indirectFactor =
    input.indirectEmissionFactor ??
    classification.defaultIndirectEmissionFactor ??
    0.0;
  const precursorTonnes = Math.max(0, input.precursorTonnes ?? 0.0);
  const precursorFactor = Math.max(0, input.precursorEmissionFactor ?? 0.0);
  const massTonnes = Math.max(0, input.netMassTonnes);
  const etsPrice = Math.max(0, input.euEtsBenchmarkPriceEur ?? 85.5);
  const foreignCarbonPaid = Math.max(0, input.foreignCarbonPricePaidEur ?? 0.0);

  const directEmissionsTco2e =
    Math.round(massTonnes * directFactor * 10000) / 10000;
  const indirectEmissionsTco2e =
    Math.round(massTonnes * indirectFactor * 10000) / 10000;
  const precursorEmissionsTco2e =
    Math.round(precursorTonnes * precursorFactor * 10000) / 10000;

  const totalEmbeddedEmissionsTco2e =
    Math.round(
      (directEmissionsTco2e +
        indirectEmissionsTco2e +
        precursorEmissionsTco2e) *
        10000,
    ) / 10000;

  const grossCarbonLiabilityEur =
    Math.round(totalEmbeddedEmissionsTco2e * etsPrice * 100) / 100;

  const netCarbonLiabilityEur = Math.max(
    0,
    Math.round((grossCarbonLiabilityEur - foreignCarbonPaid) * 100) / 100,
  );

  return {
    cnCode: input.cnCode,
    netMassTonnes: massTonnes,
    directEmissionsTco2e,
    indirectEmissionsTco2e,
    precursorEmissionsTco2e,
    totalEmbeddedEmissionsTco2e,
    euEtsBenchmarkPriceEur: etsPrice,
    grossCarbonLiabilityEur,
    foreignCarbonPricePaidEur: foreignCarbonPaid,
    netCarbonLiabilityEur,
  };
}

/**
 * Generates an EU CBAM Transitional Registry XML payload compliant with European Commission schema specifications.
 */
export function generateCbamTransitionalXml(
  input: CbamTransitionalXmlInput,
): string {
  const totalNetMass = input.items.reduce(
    (sum, item) => sum + item.netMassTonnes,
    0,
  );
  const totalDirect = input.items.reduce(
    (sum, item) => sum + item.directEmissionsTco2e,
    0,
  );
  const totalIndirect = input.items.reduce(
    (sum, item) => sum + item.indirectEmissionsTco2e,
    0,
  );
  const totalEmbedded = input.items.reduce(
    (sum, item) => sum + item.totalEmbeddedEmissionsTco2e,
    0,
  );
  const totalForeignPaid = input.items.reduce(
    (sum, item) => sum + item.foreignCarbonPricePaidEur,
    0,
  );

  const linesXml = input.items
    .map((item) => {
      return `    <GoodsItem>
      <ItemNumber>${item.itemNumber}</ItemNumber>
      <CNCode>${escapeXml(item.cnCode)}</CNCode>
      <GoodsDescription>${escapeXml(item.goodsDescription)}</GoodsDescription>
      <CountryOfOrigin>${escapeXml(item.originCountry)}</CountryOfOrigin>
      <InstallationName>${escapeXml(item.installationName || "DEFAULT_BENCHMARK")}</InstallationName>
      <NetMassTonnes>${item.netMassTonnes.toFixed(4)}</NetMassTonnes>
      <DirectEmissionsTco2e>${item.directEmissionsTco2e.toFixed(4)}</DirectEmissionsTco2e>
      <IndirectEmissionsTco2e>${item.indirectEmissionsTco2e.toFixed(4)}</IndirectEmissionsTco2e>
      <TotalEmbeddedEmissionsTco2e>${item.totalEmbeddedEmissionsTco2e.toFixed(4)}</TotalEmbeddedEmissionsTco2e>
      <CarbonPricePaidForeignEur>${item.foreignCarbonPricePaidEur.toFixed(2)}</CarbonPricePaidForeignEur>
    </GoodsItem>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<CBAMQuarterlyReport xmlns="urn:eu:taxud:cbam:v1">
  <Header>
    <DeclarationNumber>${escapeXml(input.declarationNumber)}</DeclarationNumber>
    <ReportingPeriod>${escapeXml(input.reportingPeriod)}</ReportingPeriod>
    <CreationTimestamp>${new Date().toISOString()}</CreationTimestamp>
    <Standard>EU_REG_2023_956_TRANSITIONAL</Standard>
  </Header>
  <Declarant>
    <VATNumber>${escapeXml(input.declarantVat)}</VATNumber>
    <Name>${escapeXml(input.declarantName)}</Name>
  </Declarant>
  <ImporterOfRecord>
    <VATNumber>${escapeXml(input.importerVat)}</VATNumber>
    <Name>${escapeXml(input.importerName)}</Name>
  </ImporterOfRecord>
  <ReportSummary>
    <TotalNetMassTonnes>${totalNetMass.toFixed(4)}</TotalNetMassTonnes>
    <TotalDirectEmissionsTco2e>${totalDirect.toFixed(4)}</TotalDirectEmissionsTco2e>
    <TotalIndirectEmissionsTco2e>${totalIndirect.toFixed(4)}</TotalIndirectEmissionsTco2e>
    <TotalEmbeddedEmissionsTco2e>${totalEmbedded.toFixed(4)}</TotalEmbeddedEmissionsTco2e>
    <TotalCarbonPricePaidForeignEur>${totalForeignPaid.toFixed(2)}</TotalCarbonPricePaidForeignEur>
  </ReportSummary>
  <ImportedGoodsList>
${linesXml}
  </ImportedGoodsList>
</CBAMQuarterlyReport>`;
}

// ============================================================================
// 6. GLEC FRAMEWORK V3 / ISO 14083 SCOPE 3 CARBON ENGINE
// ============================================================================

const GLEC_EMISSION_FACTORS: Record<
  "OCEAN_CONTAINER" | "AIR_FREIGHT" | "ROAD_DIESEL" | "RAIL_ELECTRIC",
  { wtw: number; ttw: number; wtt: number }
> = {
  // gCO2e per tonne-km
  OCEAN_CONTAINER: { wtw: 12.5, ttw: 10.2, wtt: 2.3 },
  AIR_FREIGHT: { wtw: 602.0, ttw: 492.0, wtt: 110.0 },
  ROAD_DIESEL: { wtw: 62.0, ttw: 51.5, wtt: 10.5 },
  RAIL_ELECTRIC: { wtw: 18.0, ttw: 0.0, wtt: 18.0 },
};

/**
 * Calculates Scope 3 logistics greenhouse gas emissions compliant with GLEC Framework v3 and ISO 14083.
 */
export function calculateGlecScope3Emissions(
  legs: GlecTransportLegInput[],
): GlecCalculationSummary {
  let totalDistanceKm = 0;
  let totalTonneKm = 0;
  let totalTco2eWtw = 0;
  let totalTco2eTtw = 0;
  let totalTco2eWtt = 0;

  const legResults: GlecLegResult[] = legs.map((leg) => {
    const factors =
      GLEC_EMISSION_FACTORS[leg.mode] || GLEC_EMISSION_FACTORS.ROAD_DIESEL;
    const distanceKm = Math.max(0, leg.distanceKm);
    const weightTonnes = Math.max(0, leg.cargoWeightTonnes);
    const tonneKm = Math.round(distanceKm * weightTonnes * 100) / 100;

    // Convert gCO2e to tonnes CO2e (divide by 1,000,000)
    const legTco2eWtw =
      Math.round(((tonneKm * factors.wtw) / 1_000_000) * 10000) / 10000;
    const legTco2eTtw =
      Math.round(((tonneKm * factors.ttw) / 1_000_000) * 10000) / 10000;
    const legTco2eWtt =
      Math.round(((tonneKm * factors.wtt) / 1_000_000) * 10000) / 10000;

    totalDistanceKm += distanceKm;
    totalTonneKm += tonneKm;
    totalTco2eWtw = Math.round((totalTco2eWtw + legTco2eWtw) * 10000) / 10000;
    totalTco2eTtw = Math.round((totalTco2eTtw + legTco2eTtw) * 10000) / 10000;
    totalTco2eWtt = Math.round((totalTco2eWtt + legTco2eWtt) * 10000) / 10000;

    return {
      legOrder: leg.legOrder,
      origin: leg.origin,
      destination: leg.destination,
      mode: leg.mode,
      distanceKm,
      cargoWeightTonnes: weightTonnes,
      tonneKm,
      wtwFactorGco2ePerTkm: factors.wtw,
      ttwFactorGco2ePerTkm: factors.ttw,
      wttFactorGco2ePerTkm: factors.wtt,
      legTco2eWtw,
      legTco2eTtw,
      legTco2eWtt,
    };
  });

  const averageCarbonIntensityGco2ePerTkm =
    totalTonneKm > 0
      ? Math.round(((totalTco2eWtw * 1_000_000) / totalTonneKm) * 100) / 100
      : 0;

  return {
    totalDistanceKm,
    totalTonneKm,
    totalTco2eWtw,
    totalTco2eTtw,
    totalTco2eWtt,
    averageCarbonIntensityGco2ePerTkm,
    legs: legResults,
  };
}

// ============================================================================
// 7. XML SANITIZATION HELPER
// ============================================================================

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

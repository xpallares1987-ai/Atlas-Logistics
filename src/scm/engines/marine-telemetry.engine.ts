/**
 * @file marine-telemetry.engine.ts
 * @description Pure deterministic calculation engine for NMEA-0183/2000 & MQTT marine telemetry ingestion,
 * FuelEU Maritime (Regulation EU 2023/1805) compliance balance & financial penalties,
 * and IMO Operational Carbon Intensity Indicator (CII) rating assessment (MEPC.337(76)).
 * @module @atlas/scm/engines/marine-telemetry
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 *
 * Invariants:
 * - 100% Pure TypeScript: Zero database, ORM, Fastify HTTP, or Node.js filesystem imports.
 * - Stateless and deterministic: All calculations use fixed-precision math and immutable structures.
 * - Conforms to: Regulation (EU) 2023/1805 (FuelEU Maritime) and IMO Resolutions MEPC.336(76)-338(76).
 */

// ============================================================================
// 1. DOMAIN ENUMS & INTERFACES
// ============================================================================

export type MarineFuelType =
  "VLSFO" | "MDO" | "LNG" | "METHANOL" | "BIOFUEL" | "E_METHANOL";

export type VesselType =
  "CONTAINER" | "BULK_CARRIER" | "TANKER" | "GENERAL_CARGO";

export type CiiRating = "A" | "B" | "C" | "D" | "E";

export type TelemetryAlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface GeoCoordinate {
  latitude: number; // Decimal degrees [-90, 90]
  longitude: number; // Decimal degrees [-180, 180]
}

export interface NmeaRmcSentence {
  talker: string; // e.g. "GP", "GN"
  timeUtc: string; // HHMMSS.SS
  status: "ACTIVE" | "VOID";
  coordinate: GeoCoordinate;
  speedOverGroundKnots: number;
  trackAngleDeg: number;
  dateUtc: string; // DDMMYY
  magneticVariation?: number;
}

export interface NmeaVtgSentence {
  talker: string;
  courseTrueDeg: number;
  courseMagDeg?: number;
  speedKnots: number;
  speedKmh: number;
}

export interface NmeaRpmSentence {
  talker: string;
  source: "ENGINE" | "SHAFT";
  engineNumber: number;
  rpm: number;
  pitchPercent: number;
  status: "VALID" | "WARNING";
}

export interface FuelConsumptionReport {
  fuelType: MarineFuelType;
  massMetricTonnes: number;
  fuelTemperatureCelsius?: number;
  fuelDensityKgPerM3?: number;
}

export interface RawMqttMarineTelemetry {
  imoNumber: string; // 7 digits with check-digit, e.g. "IMO9811000"
  vesselName: string;
  vesselType: VesselType;
  deadweightTonnageDwt: number;
  timestamp: string; // ISO-8601
  coordinate: GeoCoordinate;
  speedOverGroundKnots: number;
  distanceSailedNm: number;
  fuelsConsumed: FuelConsumptionReport[];
  shaftPowerKw: number;
  auxiliaryPowerKw: number;
  shorePowerConsumptionKwh?: number;
}

export interface NormalizedMarineTelemetry {
  imoNumber: string;
  vesselName: string;
  vesselType: VesselType;
  deadweightTonnageDwt: number;
  timestamp: string;
  coordinate: GeoCoordinate;
  speedOverGroundKnots: number;
  distanceSailedNm: number;
  totalFuelMassTonnes: number;
  fuelsConsumed: FuelConsumptionReport[];
  totalEnergyMj: number;
  shaftPowerKw: number;
  auxiliaryPowerKw: number;
  specificFuelOilConsumptionGPerKwh: number;
  shorePowerConsumptionKwh: number;
}

export interface FuelEuComplianceResult {
  calendarYear: number;
  targetGhgIntensityGPerMj: number;
  actualGhgIntensityGPerMj: number;
  totalEnergyConsumedMj: number;
  complianceBalanceGco2e: number; // Positive = Surplus, Negative = Deficit
  isCompliant: boolean;
  statutoryPenaltyEur: number;
  bankingEligibleSurplusGco2e: number;
}

export interface CiiEvaluationResult {
  calendarYear: number;
  attainedAerGco2PerDwtNm: number;
  referenceCiiGco2PerDwtNm: number;
  requiredCiiGco2PerDwtNm: number;
  rating: CiiRating;
  ratingBoundaries: {
    superiorA: number;
    minorSuperiorB: number;
    moderateC: number;
    minorInferiorD: number;
  };
  ratioToRequiredCii: number;
  correctiveActionRequired: boolean;
}

export interface MarineTelemetryAlert {
  code: string;
  severity: TelemetryAlertSeverity;
  message: string;
  detectedAt: string;
  details: Record<string, unknown>;
}

export interface CompleteVoyageTelemetryAssessment {
  telemetry: NormalizedMarineTelemetry;
  fuelEu: FuelEuComplianceResult;
  cii: CiiEvaluationResult;
  alerts: MarineTelemetryAlert[];
}

// ============================================================================
// 2. STATUTORY CONSTANTS & FACTORS (EU 2023/1805 & IMO MEPC.337(76))
// ============================================================================

/**
 * FuelEU Maritime Lower Calorific Value (LCV) in MJ/kg (Regulation EU 2023/1805 Annex II)
 */
export const FUEL_EU_LCV_MJ_PER_KG: Record<MarineFuelType, number> = {
  VLSFO: 41.0,
  MDO: 42.7,
  LNG: 49.1,
  METHANOL: 19.9,
  BIOFUEL: 37.2,
  E_METHANOL: 19.9,
};

/**
 * FuelEU Maritime Well-to-Wake (WtW) GHG emission factors in gCO2eq/MJ (Regulation EU 2023/1805 Annex II)
 */
export const FUEL_EU_WTW_GHG_G_PER_MJ: Record<MarineFuelType, number> = {
  VLSFO: 91.16,
  MDO: 91.68,
  LNG: 75.5,
  METHANOL: 96.8,
  BIOFUEL: 15.2, // Certified sustainable hydrotreated vegetable oil / bio-diesel
  E_METHANOL: 5.0, // Renewable electricity synthesized e-methanol
};

/**
 * FuelEU Target GHG intensity reductions from 91.16 gCO2eq/MJ baseline by calendar year
 */
export const FUEL_EU_TARGETS_G_PER_MJ: Record<number, number> = {
  2024: 91.16, // Baseline
  2025: 89.3368, // -2.0%
  2026: 89.3368,
  2027: 89.3368,
  2028: 89.3368,
  2029: 89.3368,
  2030: 85.6904, // -6.0%
  2035: 77.9418, // -14.5%
  2040: 62.8994, // -31.0%
  2045: 34.6408, // -62.0%
  2050: 18.232, // -80.0%
};

/**
 * IMO MEPC.337(76) Carbon conversion factors CF (t-CO2 / t-Fuel)
 */
export const IMO_CARBON_FACTORS_CF: Record<MarineFuelType, number> = {
  VLSFO: 3.114,
  MDO: 3.206,
  LNG: 2.75,
  METHANOL: 1.375,
  BIOFUEL: 0.0, // Operational rating zero-carbon lifecycle offset under IMO guidelines
  E_METHANOL: 0.0,
};

/**
 * IMO Reference Line Parameters: a * Capacity^(-c)
 */
export const IMO_CII_REF_PARAMETERS: Record<
  VesselType,
  { a: number; c: number }
> = {
  CONTAINER: { a: 1984, c: 0.489 },
  BULK_CARRIER: { a: 4745, c: 0.622 },
  TANKER: { a: 5247, c: 0.61 },
  GENERAL_CARGO: { a: 31948, c: 0.792 },
};

/**
 * IMO CII Rating Boundary Vectors (d1, d2, d3, d4)
 */
export const IMO_CII_BOUNDARIES: Record<
  VesselType,
  { d1: number; d2: number; d3: number; d4: number }
> = {
  CONTAINER: { d1: 0.86, d2: 0.94, d3: 1.06, d4: 1.14 },
  BULK_CARRIER: { d1: 0.86, d2: 0.94, d3: 1.06, d4: 1.18 },
  TANKER: { d1: 0.82, d2: 0.93, d3: 1.08, d4: 1.28 },
  GENERAL_CARGO: { d1: 0.83, d2: 0.94, d3: 1.06, d4: 1.19 },
};

/**
 * Statutory FuelEU Maritime penalty: EUR 2,400 per tonne of VLSFO equivalent energy deficit (41,000 MJ/t)
 */
export const FUEL_EU_PENALTY_RATE_EUR_PER_TONNE_VLSFO = 2400;
export const VLSFO_ENERGY_PER_TONNE_MJ = 41000;

// ============================================================================
// 3. NMEA-0183 PROTOCOL PARSING ENGINE
// ============================================================================

/**
 * Computes and validates XOR checksum for standard NMEA-0183 sentences.
 * Format: $<payload>*<hexChecksum>\r?\n?
 */
export function verifyNmeaChecksum(sentence: string): boolean {
  const trimmed = sentence.trim();
  const dollarIndex = trimmed.indexOf("$");
  const starIndex = trimmed.lastIndexOf("*");

  if (dollarIndex === -1 || starIndex === -1 || starIndex <= dollarIndex + 1) {
    return false;
  }

  const payload = trimmed.substring(dollarIndex + 1, starIndex);
  const expectedChecksumHex = trimmed.substring(starIndex + 1, starIndex + 3);

  if (expectedChecksumHex.length !== 2) {
    return false;
  }

  let calculatedChecksum = 0;
  for (let i = 0; i < payload.length; i++) {
    calculatedChecksum ^= payload.charCodeAt(i);
  }

  const calculatedHex = calculatedChecksum
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
  return calculatedHex === expectedChecksumHex.toUpperCase();
}

/**
 * Converts NMEA coordinate format (DDMM.MMMM or DDDMM.MMMM) to decimal degrees.
 */
export function parseNmeaCoordinate(
  valueStr: string,
  quadrant: "N" | "S" | "E" | "W",
): number {
  const num = parseFloat(valueStr);
  if (isNaN(num)) return 0;

  // Latitude has 2 degrees digits, Longitude has 3 degrees digits
  const rawDegrees = Math.floor(num / 100);
  const minutes = num - rawDegrees * 100;
  const decimalDegrees = rawDegrees + minutes / 60;

  return quadrant === "S" || quadrant === "W"
    ? -Number(decimalDegrees.toFixed(6))
    : Number(decimalDegrees.toFixed(6));
}

/**
 * Parses a standard GPRMC / GNRMC GPS sentence.
 */
export function parseNmeaRmcSentence(sentence: string): NmeaRmcSentence | null {
  if (!verifyNmeaChecksum(sentence)) return null;

  const body = sentence.trim().split("*")[0].substring(1);
  const parts = body.split(",");

  if (parts.length < 10) return null;

  const talker = parts[0].substring(0, 2);
  const sentenceType = parts[0].substring(2);

  if (sentenceType !== "RMC") return null;

  const timeUtc = parts[1];
  const status: "ACTIVE" | "VOID" = parts[2] === "A" ? "ACTIVE" : "VOID";
  const latStr = parts[3];
  const latQuadrant = parts[4] as "N" | "S";
  const lonStr = parts[5];
  const lonQuadrant = parts[6] as "E" | "W";
  const sogKnots = parseFloat(parts[7]) || 0;
  const trackAngle = parseFloat(parts[8]) || 0;
  const dateUtc = parts[9];

  return {
    talker,
    timeUtc,
    status,
    coordinate: {
      latitude: parseNmeaCoordinate(latStr, latQuadrant),
      longitude: parseNmeaCoordinate(lonStr, lonQuadrant),
    },
    speedOverGroundKnots: Number(sogKnots.toFixed(2)),
    trackAngleDeg: Number(trackAngle.toFixed(1)),
    dateUtc,
  };
}

/**
 * Parses a standard GPVTG / GNVTG Track and Ground Speed sentence.
 */
export function parseNmeaVtgSentence(sentence: string): NmeaVtgSentence | null {
  if (!verifyNmeaChecksum(sentence)) return null;

  const body = sentence.trim().split("*")[0].substring(1);
  const parts = body.split(",");

  if (parts.length < 9) return null;

  const talker = parts[0].substring(0, 2);
  const courseTrue = parseFloat(parts[1]) || 0;
  const speedKnots = parseFloat(parts[5]) || 0;
  const speedKmh = parseFloat(parts[7]) || 0;

  return {
    talker,
    courseTrueDeg: Number(courseTrue.toFixed(1)),
    speedKnots: Number(speedKnots.toFixed(2)),
    speedKmh: Number(speedKmh.toFixed(2)),
  };
}

/**
 * Parses engine and shaft RPM sentences (e.g. $ERRPM or $IIRPM).
 */
export function parseNmeaRpmSentence(sentence: string): NmeaRpmSentence | null {
  if (!verifyNmeaChecksum(sentence)) return null;

  const body = sentence.trim().split("*")[0].substring(1);
  const parts = body.split(",");

  if (parts.length < 6) return null;

  const talker = parts[0].substring(0, 2);
  const sourceCode = parts[1];
  const engineNumber = parseInt(parts[2], 10) || 1;
  const rpm = parseFloat(parts[3]) || 0;
  const pitch = parseFloat(parts[4]) || 100;
  const status: "VALID" | "WARNING" = parts[5] === "A" ? "VALID" : "WARNING";

  return {
    talker,
    source: sourceCode === "E" ? "ENGINE" : "SHAFT",
    engineNumber,
    rpm: Number(rpm.toFixed(1)),
    pitchPercent: Number(pitch.toFixed(1)),
    status,
  };
}

// ============================================================================
// 4. IMO NUMBER VALIDATION (7-DIGIT CHECKSUM)
// ============================================================================

/**
 * Validates IMO Ship Identification Number checksum according to SOLAS XI-1/3.
 * Formula: sum(d_i * (8 - i)) mod 10 == d_7.
 */
export function isValidImoNumber(imoInput: string): boolean {
  const cleanImo = imoInput.toUpperCase().replace(/^IMO/, "").trim();

  if (!/^\d{7}$/.test(cleanImo)) {
    return false;
  }

  let weightedSum = 0;
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(cleanImo[i], 10);
    const weight = 8 - (i + 1);
    weightedSum += digit * weight;
  }

  const expectedCheckDigit = weightedSum % 10;
  const actualCheckDigit = parseInt(cleanImo[6], 10);

  return expectedCheckDigit === actualCheckDigit;
}

// ============================================================================
// 5. TELEMETRY NORMALIZATION & SFOC ENGINE
// ============================================================================

/**
 * Normalizes raw MQTT vessel telematics into structured domain telemetry
 * with Lower Calorific Value (LCV) energy conversion and Specific Fuel Oil Consumption (SFOC).
 */
export function normalizeMarineTelemetry(
  raw: RawMqttMarineTelemetry,
): NormalizedMarineTelemetry {
  let totalFuelMassTonnes = 0;
  let totalEnergyMj = 0;

  for (const fuel of raw.fuelsConsumed) {
    const massKg = fuel.massMetricTonnes * 1000;
    const lcv = FUEL_EU_LCV_MJ_PER_KG[fuel.fuelType] || 41.0;
    totalFuelMassTonnes += fuel.massMetricTonnes;
    totalEnergyMj += massKg * lcv;
  }

  const totalPowerKw = raw.shaftPowerKw + raw.auxiliaryPowerKw;

  // Specific Fuel Oil Consumption in g/kWh = (Total Fuel g / h) / Total kW
  // If instantaneous distance/speed is known, we normalize assuming hourly rate:
  const fuelGramsTotal = totalFuelMassTonnes * 1_000_000;
  const sfoc =
    totalPowerKw > 0 ? Number((fuelGramsTotal / totalPowerKw).toFixed(2)) : 0;

  return {
    imoNumber: raw.imoNumber,
    vesselName: raw.vesselName,
    vesselType: raw.vesselType,
    deadweightTonnageDwt: raw.deadweightTonnageDwt,
    timestamp: raw.timestamp,
    coordinate: raw.coordinate,
    speedOverGroundKnots: Number(raw.speedOverGroundKnots.toFixed(2)),
    distanceSailedNm: Number(raw.distanceSailedNm.toFixed(2)),
    totalFuelMassTonnes: Number(totalFuelMassTonnes.toFixed(4)),
    fuelsConsumed: raw.fuelsConsumed,
    totalEnergyMj: Number(totalEnergyMj.toFixed(2)),
    shaftPowerKw: Number(raw.shaftPowerKw.toFixed(1)),
    auxiliaryPowerKw: Number(raw.auxiliaryPowerKw.toFixed(1)),
    specificFuelOilConsumptionGPerKwh: sfoc,
    shorePowerConsumptionKwh: raw.shorePowerConsumptionKwh || 0,
  };
}

// ============================================================================
// 6. FUELEU MARITIME COMPLIANCE ENGINE (REGULATION EU 2023/1805)
// ============================================================================

/**
 * Evaluates FuelEU Maritime compliance balance, GHG intensity, and statutory financial penalties.
 * Regulation (EU) 2023/1805 Article 4 and Article 21.
 */
export function calculateFuelEuCompliance(
  fuels: FuelConsumptionReport[],
  calendarYear = 2025,
  shorePowerKwh = 0,
): FuelEuComplianceResult {
  let totalEnergyMj = 0;
  let totalWeightedGhg = 0;

  for (const fuel of fuels) {
    const massKg = fuel.massMetricTonnes * 1000;
    const lcv = FUEL_EU_LCV_MJ_PER_KG[fuel.fuelType] || 41.0;
    const wtwFactor = FUEL_EU_WTW_GHG_G_PER_MJ[fuel.fuelType] || 91.16;

    const energyMj = massKg * lcv;
    totalEnergyMj += energyMj;
    totalWeightedGhg += energyMj * wtwFactor;
  }

  // Shore power (OPS - Onshore Power Supply) emission zero-rating credit (1 kWh = 3.6 MJ)
  if (shorePowerKwh > 0) {
    const shoreEnergyMj = shorePowerKwh * 3.6;
    totalEnergyMj += shoreEnergyMj;
    // OPS is 0 gCO2eq/MJ under FuelEU Maritime Annex I
  }

  const actualGhgIntensity =
    totalEnergyMj > 0
      ? Number((totalWeightedGhg / totalEnergyMj).toFixed(4))
      : 91.16;

  // Statutory target determination
  const targetGhgIntensity =
    FUEL_EU_TARGETS_G_PER_MJ[calendarYear] ||
    (calendarYear < 2025 ? 91.16 : calendarYear >= 2050 ? 18.232 : 89.3368);

  // Compliance balance CB in gCO2e: (Target - Actual) * TotalEnergyMj
  const complianceBalanceGco2e = Number(
    ((targetGhgIntensity - actualGhgIntensity) * totalEnergyMj).toFixed(2),
  );

  const isCompliant = complianceBalanceGco2e >= 0;

  // Statutory Penalty: EUR 2,400 per tonne of VLSFO energy equivalent deficit
  // Penalty = |CB| / (actualGhgIntensity * 41,000 MJ/t) * 2,400
  let statutoryPenaltyEur = 0;
  if (!isCompliant) {
    const deficitGco2e = Math.abs(complianceBalanceGco2e);
    const vlsfoEquivalentTonnes =
      deficitGco2e / (actualGhgIntensity * VLSFO_ENERGY_PER_TONNE_MJ);
    statutoryPenaltyEur = Number(
      (
        vlsfoEquivalentTonnes * FUEL_EU_PENALTY_RATE_EUR_PER_TONNE_VLSFO
      ).toFixed(2),
    );
  }

  const bankingEligibleSurplus = isCompliant ? complianceBalanceGco2e : 0;

  return {
    calendarYear,
    targetGhgIntensityGPerMj: Number(targetGhgIntensity.toFixed(4)),
    actualGhgIntensityGPerMj: actualGhgIntensity,
    totalEnergyConsumedMj: Number(totalEnergyMj.toFixed(2)),
    complianceBalanceGco2e,
    isCompliant,
    statutoryPenaltyEur,
    bankingEligibleSurplusGco2e: Number(bankingEligibleSurplus.toFixed(2)),
  };
}

// ============================================================================
// 7. IMO OPERATIONAL CII ENGINE (MEPC.337(76))
// ============================================================================

/**
 * Computes Annual Operational Carbon Intensity Indicator (CII) and assigns rating band (A-E).
 */
export function evaluateImoCii(
  vesselType: VesselType,
  deadweightTonnageDwt: number,
  distanceSailedNm: number,
  fuels: FuelConsumptionReport[],
  calendarYear = 2026,
): CiiEvaluationResult {
  if (deadweightTonnageDwt <= 0 || distanceSailedNm <= 0) {
    return {
      calendarYear,
      attainedAerGco2PerDwtNm: 0,
      referenceCiiGco2PerDwtNm: 0,
      requiredCiiGco2PerDwtNm: 0,
      rating: "E",
      ratingBoundaries: {
        superiorA: 0,
        minorSuperiorB: 0,
        moderateC: 0,
        minorInferiorD: 0,
      },
      ratioToRequiredCii: 0,
      correctiveActionRequired: true,
    };
  }

  // 1. Calculate Total CO2 Emitted in grams
  let totalCo2EmittedGrams = 0;
  for (const fuel of fuels) {
    const cf = IMO_CARBON_FACTORS_CF[fuel.fuelType] ?? 3.114;
    const fuelTonnes = fuel.massMetricTonnes;
    const co2Tonnes = fuelTonnes * cf;
    totalCo2EmittedGrams += co2Tonnes * 1_000_000;
  }

  // 2. Attained Annual Operational CII (AER in gCO2 / (DWT * nm))
  const transportWorkDwtNm = deadweightTonnageDwt * distanceSailedNm;
  const attainedAer = Number(
    (totalCo2EmittedGrams / transportWorkDwtNm).toFixed(4),
  );

  // 3. Reference Line CII = a * Capacity^(-c)
  const refParams =
    IMO_CII_REF_PARAMETERS[vesselType] || IMO_CII_REF_PARAMETERS.CONTAINER;
  const referenceCii = Number(
    (refParams.a * Math.pow(deadweightTonnageDwt, -refParams.c)).toFixed(4),
  );

  // 4. Required CII for given year with reduction factor Z
  // 2023: 5%, 2024: 7%, 2025: 9%, 2026: 11% (IMO MEPC.338(76))
  const reductionPercentageZ = Math.min(
    20,
    Math.max(5, 5 + (calendarYear - 2023) * 2),
  );
  const requiredCii = Number(
    (referenceCii * (1 - reductionPercentageZ / 100)).toFixed(4),
  );

  // 5. Rating Boundaries Calculation
  const boundaries =
    IMO_CII_BOUNDARIES[vesselType] || IMO_CII_BOUNDARIES.CONTAINER;
  const superiorA = Number((requiredCii * boundaries.d1).toFixed(4));
  const minorSuperiorB = Number((requiredCii * boundaries.d2).toFixed(4));
  const moderateC = Number((requiredCii * boundaries.d3).toFixed(4));
  const minorInferiorD = Number((requiredCii * boundaries.d4).toFixed(4));

  // 6. Rating Assignment
  let rating: CiiRating = "E";
  if (attainedAer <= superiorA) {
    rating = "A";
  } else if (attainedAer <= minorSuperiorB) {
    rating = "B";
  } else if (attainedAer <= moderateC) {
    rating = "C";
  } else if (attainedAer <= minorInferiorD) {
    rating = "D";
  } else {
    rating = "E";
  }

  const ratioToRequiredCii = Number((attainedAer / requiredCii).toFixed(4));
  const correctiveActionRequired = rating === "D" || rating === "E";

  return {
    calendarYear,
    attainedAerGco2PerDwtNm: attainedAer,
    referenceCiiGco2PerDwtNm: referenceCii,
    requiredCiiGco2PerDwtNm: requiredCii,
    rating,
    ratingBoundaries: {
      superiorA,
      minorSuperiorB,
      moderateC,
      minorInferiorD,
    },
    ratioToRequiredCii,
    correctiveActionRequired,
  };
}

// ============================================================================
// 8. TELEMETRY ANOMALY DETECTION ENGINE
// ============================================================================

/**
 * Validates marine telematics stream for physical feasibility, sensor failures,
 * GPS spoofing, and regulatory thresholds.
 */
export function detectMarineTelemetryAnomalies(
  telemetry: NormalizedMarineTelemetry,
  previousCoordinate?: GeoCoordinate,
  timeElapsedHours = 1,
): MarineTelemetryAlert[] {
  const alerts: MarineTelemetryAlert[] = [];
  const now = new Date().toISOString();

  // 1. IMO Identification Validation
  if (!isValidImoNumber(telemetry.imoNumber)) {
    alerts.push({
      code: "INVALID_IMO_CHECKSUM",
      severity: "CRITICAL",
      message: `Invalid IMO ship identification number: ${telemetry.imoNumber}`,
      detectedAt: now,
      details: { imoNumber: telemetry.imoNumber },
    });
  }

  // 2. Specific Fuel Oil Consumption (SFOC) Anomaly
  // Normal modern marine 2-stroke diesel SFOC: 155 - 195 g/kWh. Above 230 indicates severe degradation or leak.
  if (telemetry.specificFuelOilConsumptionGPerKwh > 230) {
    alerts.push({
      code: "EXCESSIVE_SFOC_DETECTED",
      severity: "HIGH",
      message: `Abnormally high Specific Fuel Oil Consumption: ${telemetry.specificFuelOilConsumptionGPerKwh} g/kWh (Threshold: 230 g/kWh)`,
      detectedAt: now,
      details: {
        sfoc: telemetry.specificFuelOilConsumptionGPerKwh,
        shaftPowerKw: telemetry.shaftPowerKw,
        fuelMassTonnes: telemetry.totalFuelMassTonnes,
      },
    });
  }

  // 3. GPS Speed vs Distance Feasibility
  if (telemetry.speedOverGroundKnots > 32) {
    alerts.push({
      code: "UNREALISTIC_SOG_SPEED",
      severity: "MEDIUM",
      message: `Speed Over Ground of ${telemetry.speedOverGroundKnots} knots exceeds standard commercial vessel envelope (32 kts)`,
      detectedAt: now,
      details: { speedKnots: telemetry.speedOverGroundKnots },
    });
  }

  // 4. GPS Position Jump (Spoofing / Discontinuity)
  if (previousCoordinate && timeElapsedHours > 0) {
    const latDelta = Math.abs(
      telemetry.coordinate.latitude - previousCoordinate.latitude,
    );
    const lonDelta = Math.abs(
      telemetry.coordinate.longitude - previousCoordinate.longitude,
    );
    // Approximation: 1 deg lat ~ 60 nm. Speed max 35 knots * hours
    const maxFeasibleDegrees = (35 * timeElapsedHours) / 60;

    if (latDelta > maxFeasibleDegrees || lonDelta > maxFeasibleDegrees * 1.5) {
      alerts.push({
        code: "GPS_TELEPORTATION_DISCONTINUITY",
        severity: "CRITICAL",
        message:
          "Detected physically impossible coordinate shift between telemetry packets",
        detectedAt: now,
        details: {
          current: telemetry.coordinate,
          previous: previousCoordinate,
          timeElapsedHours,
        },
      });
    }
  }

  return alerts;
}

// ============================================================================
// 9. COMPLETE TELEMETRY VOYAGE EVALUATOR
// ============================================================================

/**
 * Pure master aggregator evaluating full voyage telematics: FuelEU Maritime balance,
 * IMO CII rating, and anomaly alerts.
 */
export function assessVoyageTelemetry(
  raw: RawMqttMarineTelemetry,
  calendarYear = 2026,
): CompleteVoyageTelemetryAssessment {
  const telemetry = normalizeMarineTelemetry(raw);
  const fuelEu = calculateFuelEuCompliance(
    telemetry.fuelsConsumed,
    calendarYear,
    telemetry.shorePowerConsumptionKwh,
  );
  const cii = evaluateImoCii(
    telemetry.vesselType,
    telemetry.deadweightTonnageDwt,
    telemetry.distanceSailedNm,
    telemetry.fuelsConsumed,
    calendarYear,
  );
  const alerts = detectMarineTelemetryAnomalies(telemetry);

  return {
    telemetry,
    fuelEu,
    cii,
    alerts,
  };
}

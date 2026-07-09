/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scope 3 Carbon Footprint & Green Logistics Calculator
 * Compliant with GLEC (Global Logistics Emissions Council) and DEFRA frameworks.
 */

export type TransportMode = "OCEAN" | "AIR" | "RAIL" | "ROAD";

export interface EmissionFactor {
  mode: TransportMode;
  /** kg CO2e per tonne-kilometer */
  factor: number;
}

/**
 * Standard GLEC emission factors (kg CO2e / t-km)
 */
export const GLEC_EMISSION_FACTORS: Record<TransportMode, number> = {
  OCEAN: 0.012, // Average container vessel
  AIR: 0.602, // Average air freight (long haul)
  ROAD: 0.085, // Heavy goods vehicle (FTL/LTL)
  RAIL: 0.022, // Average freight train
};

export interface EmissionsInput {
  mode: TransportMode;
  /** Total weight of the cargo in kilograms */
  weightKg: number;
  /** Distance in kilometers. If not provided, will be estimated based on origin/destination or default fallbacks */
  distanceKm?: number;
  /** Origin port/city UN/LOCODE or name */
  origin?: string;
  /** Destination port/city UN/LOCODE or name */
  destination?: string;
  /** Equipment/container type (e.g. "20GP", "40HC") */
  equipmentType?: string;
  /** Whether the cargo requires refrigeration (Reefer multiplier) */
  isReefer?: boolean;
}

export interface EmissionsResult {
  co2eKg: number;
  co2eTonnes: number;
  rating: "green" | "amber" | "red";
  factorUsed: number;
  estimatedDistanceKm: number;
  isDistanceEstimated: boolean;
}

/**
 * Average shipping lane distances (km) for ocean and air
 */
const LANE_DISTANCES: Record<string, Record<TransportMode, number>> = {
  "CN-EU": { OCEAN: 18000, AIR: 9000, RAIL: 11000, ROAD: 12000 }, // China to Europe
  "CN-US": { OCEAN: 11500, AIR: 8500, RAIL: 12000, ROAD: 13000 }, // China to US West Coast
  "EU-US": { OCEAN: 6500, AIR: 6000, RAIL: 7000, ROAD: 8000 }, // Europe to US East Coast
};

function matchesRegion(tokens: string[], region: "CN" | "EU" | "US"): boolean {
  if (region === "CN") {
    if (
      tokens.includes("CN") ||
      tokens.includes("SHANGHAI") ||
      tokens.includes("NINGBO") ||
      tokens.includes("YANTIAN") ||
      tokens.includes("SHENZHEN") ||
      tokens.includes("XIAMEN") ||
      tokens.includes("QINGDAO") ||
      tokens.includes("GUANGZHOU") ||
      tokens.includes("TIANJIN") ||
      tokens.includes("DALIAN")
    ) {
      return true;
    }
    if (tokens.includes("HONG") && tokens.includes("KONG")) {
      return true;
    }
    for (const t of tokens) {
      if (t.length === 5 && t.startsWith("CN")) {
        return true;
      }
    }
    return false;
  }

  if (region === "EU") {
    if (
      tokens.includes("EU") ||
      tokens.includes("ES") ||
      tokens.includes("FR") ||
      tokens.includes("DE") ||
      tokens.includes("GB") ||
      tokens.includes("NL") ||
      tokens.includes("ROTTERDAM") ||
      tokens.includes("HAMBURG") ||
      tokens.includes("BARCELONA") ||
      tokens.includes("VALENCIA") ||
      tokens.includes("ANTWERP") ||
      tokens.includes("FELIXSTOWE") ||
      tokens.includes("GENOA")
    ) {
      return true;
    }
    if (tokens.includes("LE") && tokens.includes("HAVRE")) {
      return true;
    }
    for (const t of tokens) {
      if (
        t.length === 5 &&
        (t.startsWith("ES") ||
          t.startsWith("DE") ||
          t.startsWith("NL") ||
          t.startsWith("FR") ||
          t.startsWith("GB") ||
          t.startsWith("IT") ||
          t.startsWith("BE"))
      ) {
        return true;
      }
    }
    return false;
  }

  if (region === "US") {
    if (
      tokens.includes("US") ||
      tokens.includes("USA") ||
      tokens.includes("NY") ||
      tokens.includes("LAX") ||
      tokens.includes("NYC") ||
      tokens.includes("OAKLAND") ||
      tokens.includes("SEATTLE") ||
      tokens.includes("SAVANNAH") ||
      tokens.includes("HOUSTON") ||
      tokens.includes("NORFOLK")
    ) {
      return true;
    }
    if (
      (tokens.includes("LONG") && tokens.includes("BEACH")) ||
      (tokens.includes("LOS") && tokens.includes("ANGELES")) ||
      (tokens.includes("NEW") && tokens.includes("YORK"))
    ) {
      return true;
    }
    for (const t of tokens) {
      if (t.length === 5 && t.startsWith("US")) {
        return true;
      }
    }
    return false;
  }

  return false;
}

/**
 * Estimates the transport distance based on origin and destination regions or fallback values.
 */
export function estimateDistance(
  origin: string | undefined,
  destination: string | undefined,
  mode: TransportMode,
): { distance: number; estimated: boolean } {
  const normalizedOrigin = (origin || "").toUpperCase();
  const normalizedDest = (destination || "").toUpperCase();

  const originTokens = normalizedOrigin.split(/[^A-Z0-9]+/).filter(Boolean);
  const destTokens = normalizedDest.split(/[^A-Z0-9]+/).filter(Boolean);

  const isOriginCN = matchesRegion(originTokens, "CN");
  const isDestCN = matchesRegion(destTokens, "CN");

  const isOriginEU = matchesRegion(originTokens, "EU");
  const isDestEU = matchesRegion(destTokens, "EU");

  const isOriginUS = matchesRegion(originTokens, "US");
  const isDestUS = matchesRegion(destTokens, "US");

  // Try China to Europe lanes (symmetric)
  if ((isOriginCN && isDestEU) || (isOriginEU && isDestCN)) {
    return { distance: LANE_DISTANCES["CN-EU"][mode], estimated: true };
  }

  // Try China to US lanes (symmetric)
  if ((isOriginCN && isDestUS) || (isOriginUS && isDestCN)) {
    return { distance: LANE_DISTANCES["CN-US"][mode], estimated: true };
  }

  // Try Europe to US lanes (symmetric)
  if ((isOriginEU && isDestUS) || (isOriginUS && isDestEU)) {
    return { distance: LANE_DISTANCES["EU-US"][mode], estimated: true };
  }

  // Default distances if lane is unrecognized
  const defaultDistances: Record<TransportMode, number> = {
    OCEAN: 8000,
    AIR: 4000,
    RAIL: 3000,
    ROAD: 1000,
  };

  return { distance: defaultDistances[mode], estimated: true };
}

/**
 * Calculates Green Logistics Scope 3 greenhouse gas emissions (CO2e)
 */
export function calculateScope3Emissions(
  input: EmissionsInput,
): EmissionsResult {
  const { mode, weightKg, isReefer } = input;

  // Calculate or estimate distance
  let distanceKm = input.distanceKm;
  let isDistanceEstimated = false;

  if (distanceKm === undefined || distanceKm <= 0) {
    const estimation = estimateDistance(input.origin, input.destination, mode);
    distanceKm = estimation.distance;
    isDistanceEstimated = estimation.estimated;
  }

  // Convert weight to tonnes
  const weightTonnes = weightKg / 1000;

  // Base emission factor (kg CO2e / t-km)
  let factor = GLEC_EMISSION_FACTORS[mode] || GLEC_EMISSION_FACTORS.OCEAN;

  // Apply Reefer multiplier (refrigerated transport is more energy-intensive)
  let multiplier = 1.0;
  if (isReefer) {
    if (mode === "OCEAN")
      multiplier = 1.25; // Reefers consume substantial fuel for cooling
    else multiplier = 1.15; // Reefers in air/road/rail also require extra electrical power
  }

  // Apply equipment-based adjustments if specified (e.g. specialized cargo containers)
  const equipment = (input.equipmentType || "").toUpperCase();
  if (equipment.includes("RF") || equipment.includes("REEFER")) {
    if (mode === "OCEAN") multiplier = 1.25;
    else multiplier = 1.15;
  }

  // Calculate final CO2e in kg
  const co2eKg = distanceKm * weightTonnes * factor * multiplier;
  const co2eTonnes = co2eKg / 1000;

  // Determine standard SCM carbon rating
  let rating: "green" | "amber" | "red" = "green";
  if (mode === "AIR") {
    rating = co2eKg < 10000 ? "amber" : "red";
  } else {
    if (co2eKg > 8000) {
      rating = "red";
    } else if (co2eKg > 2000) {
      rating = "amber";
    }
  }

  return {
    co2eKg: parseFloat(co2eKg.toFixed(2)),
    co2eTonnes: parseFloat(co2eTonnes.toFixed(4)),
    rating,
    factorUsed: parseFloat((factor * multiplier).toFixed(4)),
    estimatedDistanceKm: distanceKm,
    isDistanceEstimated,
  };
}

/**
 * Rates the carbon intensity relative to standard transport baseline.
 * Provides a string descriptor and efficiency score (0-100).
 */
export function evaluateEcoEfficiency(
  co2eKg: number,
  mode: TransportMode,
): {
  score: number;
  descriptor: string;
} {
  let score = 100;
  let descriptor = "Excellent";

  if (mode === "AIR") {
    score = Math.max(10, Math.round(100 - co2eKg / 500));
    descriptor = score > 60 ? "Moderate Air Impact" : "High Carbon Intensity";
  } else if (mode === "OCEAN") {
    score = Math.max(50, Math.round(100 - co2eKg / 2000));
    descriptor = score > 85 ? "Optimal Sea Routing" : "Standard Maritime";
  } else if (mode === "RAIL") {
    score = Math.max(70, Math.round(100 - co2eKg / 1000));
    descriptor = "Low Carbon Rail";
  } else {
    score = Math.max(30, Math.round(100 - co2eKg / 800));
    descriptor = "Road Transit Impact";
  }

  return { score, descriptor };
}

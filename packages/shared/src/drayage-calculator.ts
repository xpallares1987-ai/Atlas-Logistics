/**
 * Container Drayage / Road Haulage Calculator & GLEC Framework v3.0 Emissions Model
 *
 * Implements:
 * - Geodesic Haversine distance with 1.28x road curvature tortuosity factor
 * - Comprehensive container drayage tariff engine (Base, Per Km, Fuel Surcharge, Tolls, Reefer/Genset, ADR/IMO)
 * - Certified ISO 14083 / GLEC Framework v3.0 Well-to-Wheel (WTW) carbon emissions
 */

export type DrayageContainerType = "20GP" | "40GP" | "40HC" | "40HR" | "45HC";

export interface DrayageCoordinates {
  lat: number;
  lon: number;
}

export interface DrayagePricingParams {
  distanceKm: number;
  transitMinutes?: number;
  containerType: DrayageContainerType;
  cargoWeightKg: number;
  isDangerousGoods?: boolean;
  requiresGenset?: boolean;
  baseRateEuro?: number;
  perKmRateEuro?: number;
  fuelSurchargePct?: number;
  tollPerKmEuro?: number;
}

export interface DrayageCostBreakdown {
  baseRate: number;
  distanceRate: number;
  fuelSurcharge: number;
  tollsEurovignette: number;
  equipmentSurcharge: number;
  dangerousGoodsSurcharge: number;
  heavyWeightSurcharge: number;
  subtotalNet: number;
  vatAmount: number;
  totalGross: number;
  currency: "EUR" | "USD";
}

export interface DrayageCarbonFootprint {
  cargoWeightTonnes: number;
  distanceKm: number;
  tonnesKm: number;
  conventionalDieselKgCO2e: number;
  hvo100RenewableKgCO2e: number;
  co2eSavingsKg: number;
  savingsPercentage: number;
  frameworkVersion: string;
}

export interface DrayageQuoteResult {
  distanceKm: number;
  transitMinutes: number;
  transitFormatted: string;
  routingEngine: "OSRM_ROAD_NETWORK" | "HAVERSINE_ESTIMATED";
  costs: DrayageCostBreakdown;
  emissions: DrayageCarbonFootprint;
}

/**
 * Calculates geodesic distance between two points using the Haversine formula,
 * adjusted by road tortuosity factor (default 1.28 for European/Iberian freight corridors).
 */
export function calculateHaversineDistanceKm(
  coord1: DrayageCoordinates,
  coord2: DrayageCoordinates,
  roadTortuosityFactor = 1.28,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lon - coord1.lon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistanceKm = R * c;

  const roadDistanceKm = directDistanceKm * roadTortuosityFactor;
  return Math.round(roadDistanceKm * 10) / 10;
}

/**
 * Estimates heavy articulated truck transit time assuming average commercial speed of 68 km/h.
 */
export function estimateTruckTransitMinutes(
  distanceKm: number,
  avgSpeedKmH = 68,
): number {
  if (distanceKm <= 0) return 15;
  const hours = distanceKm / avgSpeedKmH;
  // Add 15 mins for terminal gate-in / maneuver
  return Math.round(hours * 60 + 15);
}

/**
 * Formats minutes into human-readable duration (e.g. "1h 45m" or "40m").
 */
export function formatTransitMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Calculates granular container drayage tariff.
 */
export function calculateDrayageCosts(
  params: DrayagePricingParams,
): DrayageCostBreakdown {
  const baseRate = params.baseRateEuro ?? 140.0;
  const perKmRate = params.perKmRateEuro ?? 1.35;
  const fuelSurchargePct = params.fuelSurchargePct ?? 12.0; // 12%
  const tollPerKm = params.tollPerKmEuro ?? 0.18; // 0.18 €/km

  const distanceRate = Math.round(params.distanceKm * perKmRate * 100) / 100;
  const tollsEurovignette =
    Math.round(params.distanceKm * tollPerKm * 100) / 100;

  // Equipment surcharges: Reefer with Genset (+25%)
  const isReefer = params.containerType === "40HR" || !!params.requiresGenset;
  const equipmentSurcharge = isReefer
    ? Math.round((baseRate + distanceRate) * 0.25 * 100) / 100
    : 0;

  // Dangerous Goods (IMO/ADR) (+20%)
  const dangerousGoodsSurcharge = params.isDangerousGoods
    ? Math.round((baseRate + distanceRate) * 0.2 * 100) / 100
    : 0;

  // Heavy Weight (> 22,000 kg cargo) (+10%)
  const heavyWeightSurcharge =
    params.cargoWeightKg > 22000
      ? Math.round((baseRate + distanceRate) * 0.1 * 100) / 100
      : 0;

  const baseMileageSum =
    baseRate +
    distanceRate +
    equipmentSurcharge +
    dangerousGoodsSurcharge +
    heavyWeightSurcharge;

  const fuelSurcharge =
    Math.round(baseMileageSum * (fuelSurchargePct / 100) * 100) / 100;

  const subtotalNet =
    Math.round((baseMileageSum + fuelSurcharge + tollsEurovignette) * 100) /
    100;
  const vatAmount = Math.round(subtotalNet * 0.21 * 100) / 100; // 21% VAT
  const totalGross = Math.round((subtotalNet + vatAmount) * 100) / 100;

  return {
    baseRate,
    distanceRate,
    fuelSurcharge,
    tollsEurovignette,
    equipmentSurcharge,
    dangerousGoodsSurcharge,
    heavyWeightSurcharge,
    subtotalNet,
    vatAmount,
    totalGross,
    currency: "EUR",
  };
}

/**
 * Calculates certified GLEC Framework v3.0 / ISO 14083 carbon emissions.
 * Standard factors for articulated heavy goods vehicles:
 * - Euro VI Conventional Diesel: 62 gCO2e / (tonne * km)
 * - HVO100 Renewable Bio-Diesel: 9.3 gCO2e / (tonne * km) (-85% reduction)
 */
export function calculateDrayageCarbon(
  distanceKm: number,
  cargoWeightKg: number,
): DrayageCarbonFootprint {
  const weightTonnes = Math.max(1, cargoWeightKg / 1000);
  const tonnesKm = Math.round(distanceKm * weightTonnes * 10) / 10;

  // 62 gCO2e per t-km = 0.062 kgCO2e
  const dieselKg = Math.round(tonnesKm * 0.062 * 100) / 100;
  // 9.3 gCO2e per t-km = 0.0093 kgCO2e
  const hvo100Kg = Math.round(tonnesKm * 0.0093 * 100) / 100;

  const co2eSavingsKg = Math.round((dieselKg - hvo100Kg) * 100) / 100;
  const savingsPercentage = 85.0;

  return {
    cargoWeightTonnes: Math.round(weightTonnes * 10) / 10,
    distanceKm: Math.round(distanceKm * 10) / 10,
    tonnesKm,
    conventionalDieselKgCO2e: dieselKg,
    hvo100RenewableKgCO2e: hvo100Kg,
    co2eSavingsKg,
    savingsPercentage,
    frameworkVersion: "GLEC Framework v3.0 / ISO 14083",
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FreightRate } from "../types";
import { calculateScope3Emissions, TransportMode } from "@atlas/ui";

/**
 * Calculates estimated CO2 emissions for a freight route using the standardized Scope 3 calculator.
 * Returns both the kg CO2e value and the mode-aware carbon rating from the Scope 3 result.
 * Industrialization Phase 4: Environmental sustainability tracking.
 */
export function estimateCarbonFootprint(
  rate: FreightRate,
): { co2eKg: number; rating: "green" | "amber" | "red" } {
  // Determine transport mode based on carrier name
  const carrierLower = (rate.carrier || "").toLowerCase();
  let mode: TransportMode = "OCEAN";
  if (carrierLower.includes("air")) {
    mode = "AIR";
  } else if (carrierLower.includes("rail")) {
    mode = "RAIL";
  } else if (carrierLower.includes("truck") || carrierLower.includes("road") || carrierLower.includes("ftl") || carrierLower.includes("ltl")) {
    mode = "ROAD";
  }

  // Use average weight of 18 tons (18,000 kg) per container/rate shipment
  const estimatedWeight = 18000;

  const result = calculateScope3Emissions({
    mode,
    weightKg: estimatedWeight,
    origin: rate.pol,
    destination: rate.pod,
  });

  return { co2eKg: result.co2eKg, rating: result.rating };
}

/**
 * Gets a color rating for carbon footprint.
 */
export function getCarbonRating(kgCO2: number): "green" | "amber" | "red" {
  if (kgCO2 < 3000) return "green";
  if (kgCO2 < 10000) return "amber";
  return "red";
}


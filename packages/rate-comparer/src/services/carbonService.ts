// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { FreightRate } from "../types";

/**
 * Calculates estimated CO2 emissions (kgs) for a freight route.
 * Industrialization Phase 4: Environmental sustainability tracking.
 */
export function estimateCarbonFootprint(rate: FreightRate): number {
  // Simplified calculation based on distance/mode (Simulated)
  // Real industrial app would use GLEC framework or similar APIs.

  const baseEmissionFactor = 0.015; // Kg CO2 per ton-km (Maritime)
  const estimatedDistance = 12000; // Estimated distance in KM (Avg Asia-Europe)
  const estimatedWeight = 18; // Avg tons per TEU

  let modeMultiplier = 1.0;
  if (rate.carrier.toLowerCase().includes("air")) {
    modeMultiplier = 50.0; // Air freight is much more carbon intensive
  } else if (rate.carrier.toLowerCase().includes("rail")) {
    modeMultiplier = 0.5;
  }

  return (
    estimatedDistance * estimatedWeight * baseEmissionFactor * modeMultiplier
  );
}

/**
 * Gets a color rating for carbon footprint.
 */
export function getCarbonRating(kgCO2: number): "green" | "amber" | "red" {
  if (kgCO2 < 3000) return "green";
  if (kgCO2 < 10000) return "amber";
  return "red";
}


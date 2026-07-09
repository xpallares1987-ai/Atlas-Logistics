/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FreightRate } from "../types";
import { calculateScope3Emissions, TransportMode, EmissionsResult } from "@atlas/ui";

/**
 * Calculates estimated CO2 emissions and other standard indicators for a freight route using the standardized Scope 3 calculator.
 * Industrialization Phase 4: Environmental sustainability tracking.
 */
export function estimateCarbonFootprint(rate: FreightRate): EmissionsResult {
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

  return calculateScope3Emissions({
    mode,
    weightKg: estimatedWeight,
    origin: rate.pol,
    destination: rate.pod,
  });
}


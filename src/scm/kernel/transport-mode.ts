/**
 * Transport Mode Classification (Shared Kernel)
 *
 * SOLAS VGM (IMO SOLAS Chapter VI, Regulation 2) applies exclusively to packed
 * sea containers. Air (IATA e-AWB / chargeable weight / security screening) and
 * Ground (CMR / gross vehicle & axle weight) shipments must never receive SOLAS
 * VGM workflows, tasks, milestones, SLA clocks or data-quality findings.
 *
 * This helper normalises the heterogeneous mode/service codes used across the
 * SCM contexts (`serviceType`, `serviceMode`, leg `mode`) into a single family.
 */

export type TransportModeFamily = "OCEAN" | "AIR" | "ROAD";

/**
 * Resolves the transport mode family from any service/mode code.
 * Unknown or empty codes default to OCEAN to preserve legacy behaviour.
 */
export function resolveTransportModeFamily(
  code?: string | null,
): TransportModeFamily {
  const c = (code || "").toUpperCase().trim();
  if (!c) return "OCEAN";
  if (c.startsWith("AIR") || c === "ULD") return "AIR";
  if (
    c.startsWith("ROAD") ||
    c.startsWith("GROUND") ||
    c.startsWith("RAIL") ||
    c.startsWith("TRUCK") ||
    c === "FTL" ||
    c === "LTL" ||
    c.startsWith("FTL_") ||
    c.startsWith("LTL_") ||
    c === "TRAILER" ||
    c === "DRAYAGE"
  ) {
    return "ROAD";
  }
  return "OCEAN";
}

/** True only for ocean/sea shipments, where SOLAS VGM is mandatory. */
export function isSolasVgmApplicable(code?: string | null): boolean {
  return resolveTransportModeFamily(code) === "OCEAN";
}

/**
 * Derives the governing mode code from a route's legs: the MAIN_CARRIAGE leg
 * wins (a road pre-carriage must not turn an ocean export into a road one).
 */
export function resolveModeFromLegs(
  legs?: Array<{ mode?: string | null; legCategory?: string | null }> | null,
): string | undefined {
  if (!legs || legs.length === 0) return undefined;
  const main = legs.find((l) => l?.legCategory === "MAIN_CARRIAGE");
  return (main?.mode || legs[0]?.mode || undefined) ?? undefined;
}

/** Standard export workflow definition key per mode family. */
export function resolveStandardWorkflowDefinitionKey(
  code?: string | null,
): "OCEAN_EXPORT_STANDARD" | "AIR_EXPORT_STANDARD" | "ROAD_EXPORT_STANDARD" {
  const family = resolveTransportModeFamily(code);
  if (family === "AIR") return "AIR_EXPORT_STANDARD";
  if (family === "ROAD") return "ROAD_EXPORT_STANDARD";
  return "OCEAN_EXPORT_STANDARD";
}

/** Pre-departure cut-off milestone code per mode family. */
export function resolvePreDepartureCutoffMilestone(code?: string | null): {
  milestoneCode: "VGM_CUTOFF" | "AWB_SECURITY_CUTOFF" | "CMR_LOADING_CHECK";
  label: string;
  slaName: string;
} {
  const family = resolveTransportModeFamily(code);
  if (family === "AIR") {
    return {
      milestoneCode: "AWB_SECURITY_CUTOFF",
      label: "Cut-Off e-AWB & Security Screening (Lodge-In)",
      slaName: "IATA e-AWB & Security Screening Lodge-In Cut-Off",
    };
  }
  if (family === "ROAD") {
    return {
      milestoneCode: "CMR_LOADING_CHECK",
      label: "Carga Vehículo & e-CMR (Peso Bruto / Ejes)",
      slaName: "Vehicle Loading, Axle Weight & e-CMR Cut-Off",
    };
  }
  return {
    milestoneCode: "VGM_CUTOFF",
    label: "Cut-Off VGM & Gate-In",
    slaName: "SOLAS VGM & Export Gate-In Cut-Off",
  };
}

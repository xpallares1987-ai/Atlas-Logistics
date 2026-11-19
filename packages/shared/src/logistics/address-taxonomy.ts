/**
 * @file address-taxonomy.ts
 * @description Canonical 25-code Logistics Entity Taxonomy, semantic Role Groups,
 * 7 UI category groupings, directional sorting, and read-filter expansion helpers.
 * @module @atlas/shared/logistics/address-taxonomy
 */

// ============================================================================
// 1. CANONICAL 25 UNIQUE 3-LETTER CODES
// ============================================================================

export const CANONICAL_ADDRESS_TYPE_CODES = [
  "MCC",
  "OCA",
  "ACA",
  "RCA",
  "CLA",
  "CBA",
  "OAG",
  "DAG",
  "FFC",
  "SPT",
  "RST",
  "OIC",
  "DIC",
  "OEW",
  "DEW",
  "OWO",
  "DWO",
  "OHA",
  "DHA",
  "INS",
  "PLL",
  "PDL",
  "POL",
  "POD",
  "TSP",
] as const;

export type CanonicalAddressTypeCode =
  (typeof CANONICAL_ADDRESS_TYPE_CODES)[number];

const CANONICAL_CODE_SET = new Set<string>(CANONICAL_ADDRESS_TYPE_CODES);

/**
 * Strict type guard checking whether a string is one of the 25 canonical 3-letter codes.
 */
export function isCanonicalAddressTypeCode(
  value?: string | null,
): value is CanonicalAddressTypeCode {
  if (!value) return false;
  return CANONICAL_CODE_SET.has(value.trim().toUpperCase());
}

/**
 * Port & gateway codes that require a valid 5-character UN/LOCODE.
 */
export const PORT_GATEWAY_UNLOCODE_REQUIRED_CODES: readonly CanonicalAddressTypeCode[] =
  ["POL", "POD", "TSP"] as const;

export function requiresUnLocodeForAddressType(code?: string | null): boolean {
  if (!code) return false;
  const normalized = code.trim().toUpperCase();
  return (PORT_GATEWAY_UNLOCODE_REQUIRED_CODES as readonly string[]).includes(
    normalized,
  );
}

// ============================================================================
// 2. SHARED CANONICAL ROLE GROUPS (BACKEND SERVICES & UI SELECTORS)
// ============================================================================

export const CUSTOMER_CODES: readonly CanonicalAddressTypeCode[] = [
  "MCC",
] as const;

export const CARRIER_CODES: readonly CanonicalAddressTypeCode[] = [
  "OCA",
  "ACA",
  "RCA",
] as const;

export const AGENCY_FORWARDER_CODES: readonly CanonicalAddressTypeCode[] = [
  "CLA",
  "CBA",
  "OAG",
  "DAG",
  "FFC",
] as const;

export const AGENT_CODES: readonly CanonicalAddressTypeCode[] = [
  "OAG",
  "DAG",
  "CLA",
] as const;

export const TERMINAL_CODES: readonly CanonicalAddressTypeCode[] = [
  "SPT",
  "RST",
  "OIC",
  "DIC",
] as const;

export const WAREHOUSE_CODES: readonly CanonicalAddressTypeCode[] = [
  "OEW",
  "DEW",
  "OWO",
  "DWO",
] as const;

export const HAULIER_CODES: readonly CanonicalAddressTypeCode[] = [
  "OHA",
  "DHA",
] as const;

export const INSURANCE_CODES: readonly CanonicalAddressTypeCode[] = [
  "INS",
] as const;

export const GATEWAY_CODES: readonly CanonicalAddressTypeCode[] = [
  "PLL",
  "PDL",
  "POL",
  "POD",
  "TSP",
] as const;

export const PICKUP_DELIVERY_LOCATION_CODES: readonly CanonicalAddressTypeCode[] =
  ["MCC", "OEW", "DEW", "OWO", "DWO", "PLL", "PDL"] as const;

export const DRAYAGE_TERMINAL_NODE_CODES: readonly CanonicalAddressTypeCode[] =
  ["SPT", "RST", "OIC", "DIC", "POL", "POD", "TSP"] as const;

export const ORIGIN_PREFERRED_CODES: readonly CanonicalAddressTypeCode[] = [
  "OAG",
  "OIC",
  "OEW",
  "OWO",
  "OHA",
  "PLL",
  "POL",
] as const;

export const DESTINATION_PREFERRED_CODES: readonly CanonicalAddressTypeCode[] =
  ["DAG", "DIC", "DEW", "DWO", "DHA", "PDL", "POD"] as const;

// ============================================================================
// 3. SEVEN SEMANTIC UI CATEGORIES (ADDRESSES HUB & ADDRESS MODAL OPTGROUPS)
// ============================================================================

export type AddressCategoryId =
  | "CUSTOMERS"
  | "CARRIERS"
  | "AGENCIES_FORWARDERS"
  | "TERMINALS"
  | "WAREHOUSES"
  | "HAULIERS_INSURANCE"
  | "GATEWAYS_PORTS";

export interface AddressCategoryGroup {
  id: AddressCategoryId;
  label: string;
  shortLabel: string;
  codes: readonly CanonicalAddressTypeCode[];
}

export const ADDRESS_TYPE_CATEGORIES: readonly AddressCategoryGroup[] = [
  {
    id: "CUSTOMERS",
    label: "Customers & Cargo Owners",
    shortLabel: "Customers",
    codes: ["MCC"],
  },
  {
    id: "CARRIERS",
    label: "Carriers (Ocean, Air, Rail)",
    shortLabel: "Carriers",
    codes: ["OCA", "ACA", "RCA"],
  },
  {
    id: "AGENCIES_FORWARDERS",
    label: "Agencies, Brokers & Forwarders",
    shortLabel: "Agencies & 3PL",
    codes: ["CLA", "CBA", "OAG", "DAG", "FFC"],
  },
  {
    id: "TERMINALS",
    label: "Seaport, Rail & Inland Terminals",
    shortLabel: "Terminals",
    codes: ["SPT", "RST", "OIC", "DIC"],
  },
  {
    id: "WAREHOUSES",
    label: "Warehouses & CFS Facilities",
    shortLabel: "Warehouses",
    codes: ["OEW", "DEW", "OWO", "DWO"],
  },
  {
    id: "HAULIERS_INSURANCE",
    label: "Hauliers & Marine Insurance",
    shortLabel: "Hauliers & Ins.",
    codes: ["OHA", "DHA", "INS"],
  },
  {
    id: "GATEWAYS_PORTS",
    label: "Gateways, Ports & Loading/Delivery Locations",
    shortLabel: "Gateways & Ports",
    codes: ["PLL", "PDL", "POL", "POD", "TSP"],
  },
] as const;

// ============================================================================
// 4. READ-FILTER EXPANSION & DIRECTIONAL PRIORITIZATION
// ============================================================================

const FILTER_ALIAS_EXPANSION: Record<
  string,
  readonly CanonicalAddressTypeCode[]
> = {
  // Category IDs
  CUSTOMERS: CUSTOMER_CODES,
  CARRIERS: CARRIER_CODES,
  AGENCIES_FORWARDERS: AGENCY_FORWARDER_CODES,
  TERMINALS: TERMINAL_CODES,
  WAREHOUSES: WAREHOUSE_CODES,
  HAULIERS_INSURANCE: ["OHA", "DHA", "INS"],
  GATEWAYS_PORTS: GATEWAY_CODES,
  // Legacy short codes & literals (lenient GET query expansion)
  CUS: ["MCC"],
  CUST: ["MCC"],
  CUSTOMER: ["MCC"],
  CONSIGNEE_NOTIFY: ["MCC"],
  CAR: ["OCA", "ACA", "RCA"],
  CARRIER: ["OCA", "ACA", "RCA"],
  CAA: ["CLA"],
  CARRIER_AGENT: ["CLA"],
  CB: ["CBA"],
  CUSTOMS_BROKER: ["CBA"],
  AG: ["OAG", "DAG"],
  AGENT: ["OAG", "DAG"],
  PORT_AUTHORITY: ["POL", "POD", "SPT"],
  FW: ["FFC"],
  FWD: ["FFC"],
  FORWARDER: ["FFC"],
  TRM: ["SPT", "RST", "OIC", "DIC"],
  TERMINAL: ["SPT", "RST", "OIC", "DIC"],
  INLAND_DEPOT: ["OIC", "DIC"],
  INLAND_CONTAINER_DEPOT: ["OIC", "DIC"],
  WH: ["OEW", "DEW", "OWO", "DWO"],
  WAREHOUSE: ["OEW", "DEW", "OWO", "DWO"],
  HAU: ["OHA", "DHA"],
  HAULIER: ["OHA", "DHA"],
  INSURANCE: ["INS"],
};

/**
 * Expands a comma-separated GET query filter (canonical codes, category IDs,
 * or legacy alias tokens) into a deduplicated array of canonical 3-letter codes.
 */
export function expandAddressTypeFilter(
  rawFilter: string | readonly string[],
): CanonicalAddressTypeCode[] {
  const tokens = Array.isArray(rawFilter)
    ? rawFilter.flatMap((t) => String(t).split(","))
    : String(rawFilter).split(",");

  const expanded = new Set<CanonicalAddressTypeCode>();
  for (const raw of tokens) {
    const token = raw.trim().toUpperCase();
    if (!token || token === "ALL") continue;
    if (isCanonicalAddressTypeCode(token)) {
      expanded.add(token);
      continue;
    }
    const aliasGroup = FILTER_ALIAS_EXPANSION[token];
    if (aliasGroup) {
      for (const code of aliasGroup) {
        expanded.add(code);
      }
    }
  }
  return Array.from(expanded);
}

/**
 * Sorts address items so entities matching the preferred corridor direction
 * (Origin `O*`/`PLL`/`POL` or Destination `D*`/`PDL`/`POD`) appear first while
 * still allowing both counterparts to be selected without duplicating master records.
 */
export function sortByPreferredDirection<T extends { addressType?: string }>(
  items: readonly T[],
  direction?: "ORIGIN" | "DESTINATION",
): T[] {
  if (!direction) return [...items];
  const preferred = new Set<string>(
    direction === "ORIGIN"
      ? ORIGIN_PREFERRED_CODES
      : DESTINATION_PREFERRED_CODES,
  );
  return [...items].sort((a, b) => {
    const aPref = preferred.has((a.addressType || "").toUpperCase()) ? 0 : 1;
    const bPref = preferred.has((b.addressType || "").toUpperCase()) ? 0 : 1;
    return aPref - bPref;
  });
}

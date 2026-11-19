import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  groupCode: text("group_code"),
  sector: text("sector"),
  headquartersCountry: text("headquarters_country"),
  taxId: text("tax_id"),
  creditLimit: real("credit_limit"),
  ...commonAuditFields,
});

export const addressTypes = sqliteTable("address_types", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ...commonAuditFields,
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  ...commonAuditFields,
});

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  companyId: text("company_id").references(() => companies.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // PORT, WAREHOUSE, AIRPORT, CUSTOMER_FACILITY
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  ...commonAuditFields,
});

export const contracts = sqliteTable("contracts", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id),
  title: text("title").notNull(),
  validFrom: integer("valid_from", { mode: "timestamp" }),
  validTo: integer("valid_to", { mode: "timestamp" }),
  ...commonAuditFields,
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  companyId: text("company_id").references(() => companies.id),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password"),
  role: text("role").notNull(),
  ...commonAuditFields,
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
});

export const systemSequences = sqliteTable("system_sequences", {
  name: text("name").primaryKey(),
  currentValue: integer("current_value").notNull().default(0),
  prefix: text("prefix"),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  action: text("action").notNull(),
  userId: text("user_id"),
  oldData: text("old_data"),
  newData: text("new_data"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
});

export const workflows = sqliteTable("workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  xmlData: text("xml_data").notNull(),
  status: text("status").notNull().default("draft"),
  ...commonAuditFields,
});

export const addressTypeCodeEnum = [
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
  // Legacy compatibility short codes
  "CUS",
  "CB",
  "AG",
  "HAU",
  "CAR",
  "CAA",
  "WH",
  "FW",
  "FWD",
  "TRM",
] as const;

export type AddressTypeCode = (typeof addressTypeCodeEnum)[number];

export const addressTypeEnum = [
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
  // Legacy compatibility short codes and literals normalized at runtime
  "CUS",
  "CB",
  "AG",
  "HAU",
  "CAR",
  "CAA",
  "WH",
  "FW",
  "FWD",
  "TRM",
  "CUSTOMER",
  "CARRIER",
  "CARRIER_AGENT",
  "CUSTOMS_BROKER",
  "PORT_AUTHORITY",
  "WAREHOUSE",
  "TERMINAL",
  "INLAND_DEPOT",
  "HAULIER",
  "FORWARDER",
  "AGENT",
  "INSURANCE",
] as const;

export type AddressType = (typeof addressTypeEnum)[number];

export interface AddressTypeDefinition {
  code: AddressTypeCode;
  name: string;
  description: string;
}

export const ADDRESS_TYPE_DEFINITIONS: readonly AddressTypeDefinition[] = [
  {
    code: "MCC",
    name: "Main Customer Company",
    description:
      "Beneficial cargo owner (BCO), primary merchant, shipper, importer, exporter, or consignee party.",
  },
  {
    code: "OCA",
    name: "Ocean Carrier",
    description:
      "Vessel-operating common carrier (VOCC), container liner service, or ocean shipping company.",
  },
  {
    code: "ACA",
    name: "Airline Carrier",
    description:
      "Commercial cargo airline, air freight carrier, or scheduled freighter operator.",
  },
  {
    code: "RCA",
    name: "Rail Carrier",
    description:
      "Intermodal freight rail operator, railway undertaking, or rail shuttle service.",
  },
  {
    code: "CLA",
    name: "Carrier Line Agency",
    description:
      "Authorized liner shipping agency representing an ocean or air carrier at port (agencia consignataria).",
  },
  {
    code: "CBA",
    name: "Customs Broker Agency",
    description:
      "AEO-licensed customs house broker agency, fiscal representative, and tariff clearance provider.",
  },
  {
    code: "OAG",
    name: "Representative Agent (Origin)",
    description:
      "Freight forwarding representative and handling partner for the country of origin.",
  },
  {
    code: "DAG",
    name: "Representative Agent (Destination)",
    description:
      "Freight forwarding representative and breakbulk delivery partner for the country of destination.",
  },
  {
    code: "FFC",
    name: "Freight Forwarding Company",
    description:
      "Non-vessel operating common carrier (NVOCC), international freight forwarder, or 3PL orchestrator.",
  },
  {
    code: "SPT",
    name: "Seaport Terminal",
    description:
      "Deep-sea maritime container terminal, stevedoring facility, or seaport container quay.",
  },
  {
    code: "RST",
    name: "Railway Station Terminal",
    description:
      "Intermodal rail freight terminal, container railhead depot, or marshalling yard.",
  },
  {
    code: "OIC",
    name: "Inland Container Terminal (Origin)",
    description:
      "Inland dry port, container depot, or off-dock intermodal facility at origin.",
  },
  {
    code: "DIC",
    name: "Inland Container Terminal (Destination)",
    description:
      "Inland dry port, container depot, or off-dock intermodal facility at destination.",
  },
  {
    code: "OEW",
    name: "External Warehouse (Origin)",
    description:
      "Third-party (3PL) contracted consolidation warehouse, CFS, or distribution facility at origin.",
  },
  {
    code: "DEW",
    name: "External Warehouse (Destination)",
    description:
      "Third-party (3PL) contracted deconsolidation warehouse, CFS, or bonded distribution facility at destination.",
  },
  {
    code: "OWO",
    name: "Owned Warehouse (Origin)",
    description:
      "Company-owned and operated cross-dock facility, customs warehouse, or distribution hub at origin.",
  },
  {
    code: "DWO",
    name: "Owned Warehouse (Destination)",
    description:
      "Company-owned and operated cross-dock facility, bonded depot, or delivery hub at destination.",
  },
  {
    code: "OHA",
    name: "Haulier (Origin)",
    description:
      "Pre-carriage road transport operator, drayage trucker, or inland carrier at origin.",
  },
  {
    code: "DHA",
    name: "Haulier (Destination)",
    description:
      "On-carriage road transport operator, final-mile delivery trucker, or drayage carrier at destination.",
  },
  {
    code: "INS",
    name: "Insurance",
    description:
      "Marine cargo insurer, P&I club, cargo underwriter, or claims average adjuster.",
  },
  {
    code: "PLL",
    name: "Place of Loading Location",
    description:
      "Designated origin place, factory, farm, or cargo consolidation location where freight is loaded.",
  },
  {
    code: "PDL",
    name: "Place of Delivery Location",
    description:
      "Designated destination place, consignee facility, or cargo delivery location where freight is surrendered.",
  },
  {
    code: "POL",
    name: "Port of Loading",
    description:
      "Origin maritime seaport, airport, or railhead where goods are laden on board the main international conveyance.",
  },
  {
    code: "POD",
    name: "Port of Discharge",
    description:
      "Destination maritime seaport, airport, or railhead where goods are unladen from the main international conveyance.",
  },
  {
    code: "TSP",
    name: "Transhipment Port",
    description:
      "Intermediate transfer port or airport hub where containers/cargo undergo vessel-to-vessel or multimodal relay.",
  },
] as const;

const LEGACY_ADDRESS_TYPE_TO_CODE: Record<string, AddressTypeCode> = {
  // Canonical identity mappings
  MCC: "MCC",
  MAIN_CUSTOMER_COMPANY: "MCC",
  CUS: "MCC",
  CUST: "MCC",
  CUSTOMER: "MCC",
  CONSIGNEE_NOTIFY: "MCC",

  OCA: "OCA",
  OCEAN_CARRIER: "OCA",
  ACA: "ACA",
  AIRLINE_CARRIER: "ACA",
  RCA: "RCA",
  RAIL_CARRIER: "RCA",

  CLA: "CLA",
  CARRIER_LINE_AGENCY: "CLA",
  CAA: "CLA",
  CARRIER_AGENT: "CLA",

  CBA: "CBA",
  CUSTOMS_BROKER_AGENCY: "CBA",
  CB: "CBA",
  CUSTOMS_BROKER: "CBA",

  OAG: "OAG",
  ORIGIN_AGENT: "OAG",
  DAG: "DAG",
  DESTINATION_AGENT: "DAG",
  AG: "DAG",
  AGENT: "DAG",
  PORT_AUTHORITY: "DAG",

  FFC: "FFC",
  FREIGHT_FORWARDING_COMPANY: "FFC",
  FW: "FFC",
  FWD: "FFC",
  FORWARDER: "FFC",

  SPT: "SPT",
  SEAPORT_TERMINAL: "SPT",
  RST: "RST",
  RAILWAY_STATION_TERMINAL: "RST",
  OIC: "OIC",
  ORIGIN_INLAND_CONTAINER: "OIC",
  DIC: "DIC",
  DESTINATION_INLAND_CONTAINER: "DIC",
  TRM: "SPT",
  TERMINAL: "SPT",

  OEW: "OEW",
  ORIGIN_EXTERNAL_WAREHOUSE: "OEW",
  DEW: "DEW",
  DESTINATION_EXTERNAL_WAREHOUSE: "DEW",
  OWO: "OWO",
  ORIGIN_OWNED_WAREHOUSE: "OWO",
  DWO: "DWO",
  DESTINATION_OWNED_WAREHOUSE: "DWO",
  WH: "OEW",
  WAREHOUSE: "OEW",
  INLAND_DEPOT: "OIC",
  INLAND_CONTAINER_DEPOT: "OIC",

  OHA: "OHA",
  ORIGIN_HAULIER: "OHA",
  DHA: "DHA",
  DESTINATION_HAULIER: "DHA",
  HAU: "OHA",
  HAULIER: "OHA",

  CAR: "OCA",
  CARRIER: "OCA",

  INS: "INS",
  INSURANCE: "INS",

  PLL: "PLL",
  PLACE_OF_LOADING: "PLL",
  PLACE_OF_LOADING_LOCATION: "PLL",

  PDL: "PDL",
  PLACE_OF_DELIVERY: "PDL",
  PLACE_OF_DELIVERY_LOCATION: "PDL",

  POL: "POL",
  PORT_OF_LOADING: "POL",

  POD: "POD",
  PORT_OF_DISCHARGE: "POD",

  TSP: "TSP",
  TRANSHIPMENT_PORT: "TSP",
  TRANSSHIPMENT_PORT: "TSP",
};

/**
 * Normalizes any short code or legacy addressType value to its canonical `address_types.code`.
 * Eliminates CONSIGNEE_NOTIFY by mapping it to MCC (Main Customer Company).
 */
export function normalizeAddressTypeCode(raw?: string | null): AddressTypeCode {
  if (!raw) return "MCC";
  const key = raw.trim().toUpperCase();
  return LEGACY_ADDRESS_TYPE_TO_CODE[key] ?? "MCC";
}

export const CORPORATE_GROUP_AUTHORIZED_ROLES = [
  "ADMIN",
  "ACCOUNTING",
  "CONTROLLING",
] as const;

export type CorporateGroupAuthorizedRole =
  (typeof CORPORATE_GROUP_AUTHORIZED_ROLES)[number];

/**
 * Checks whether a user role is authorized to view and link Corporate Groups (`companies`)
 * to registered operational addresses (`addresses`).
 * Corporate Groups are strictly restricted to Accounting, Controlling, and Admin users.
 */
export function canManageCorporateGroups(role?: string | null): boolean {
  if (!role) return false;
  return CORPORATE_GROUP_AUTHORIZED_ROLES.includes(
    role.trim().toUpperCase() as CorporateGroupAuthorizedRole,
  );
}

export interface EnterpriseCompanyGroupDefinition {
  id: string;
  name: string;
  groupCode: string;
  sector: string;
  headquartersCountry: string;
  taxId: string;
  creditLimit: number;
}

export const ENTERPRISE_COMPANY_GROUPS: readonly EnterpriseCompanyGroupDefinition[] =
  [
    {
      id: "c-1",
      name: "Atlas Logistics Enterprise Group",
      groupCode: "ATLAS-HQ",
      sector: "Global Control Tower & 4PL",
      headquartersCountry: "ES",
      taxId: "US-99887766",
      creditLimit: 500000,
    },
    {
      id: "grp_apm_terminals",
      name: "APM Terminals",
      groupCode: "APMT",
      sector: "Port & Terminal Operations",
      headquartersCountry: "NL",
      taxId: "NL-809281721B01",
      creditLimit: 2500000,
    },
    {
      id: "grp_maersk",
      name: "A.P. Moller - Maersk",
      groupCode: "MAEU",
      sector: "Ocean Carrier & Integrated Logistics",
      headquartersCountry: "DK",
      taxId: "DK-22756214",
      creditLimit: 5000000,
    },
    {
      id: "grp_msc",
      name: "MSC Mediterranean Shipping Company",
      groupCode: "MSCU",
      sector: "Ocean Carrier & Terminal Investment",
      headquartersCountry: "CH",
      taxId: "CHE-101.545.298",
      creditLimit: 5000000,
    },
    {
      id: "grp_hapag",
      name: "Hapag-Lloyd",
      groupCode: "HLCU",
      sector: "Ocean Carrier",
      headquartersCountry: "DE",
      taxId: "DE-813960018",
      creditLimit: 4000000,
    },
    {
      id: "grp_cosco",
      name: "COSCO SHIPPING",
      groupCode: "COSU",
      sector: "Ocean Carrier & Port Terminals",
      headquartersCountry: "CN",
      taxId: "CN-91310000MA1FL1X",
      creditLimit: 4500000,
    },
    {
      id: "grp_one",
      name: "Ocean Network Express (ONE)",
      groupCode: "ONEY",
      sector: "Ocean Carrier",
      headquartersCountry: "SG",
      taxId: "SG-201718923K",
      creditLimit: 3500000,
    },
    {
      id: "grp_evergreen",
      name: "Evergreen Marine",
      groupCode: "EGLV",
      sector: "Ocean Carrier",
      headquartersCountry: "TW",
      taxId: "TW-03795504",
      creditLimit: 3500000,
    },
    {
      id: "grp_hutchison",
      name: "Hutchison Ports",
      groupCode: "HPH",
      sector: "Port & Terminal Operations",
      headquartersCountry: "HK",
      taxId: "HK-10982341",
      creditLimit: 2500000,
    },
    {
      id: "grp_atlas",
      name: "Atlas Global Freight Forwarding",
      groupCode: "ATLS",
      sector: "Freight Forwarding & NVOCC",
      headquartersCountry: "ES",
      taxId: "ES-B88990011",
      creditLimit: 1500000,
    },
    {
      id: "grp_iberian_chem",
      name: "Iberian Chemicals & Polymers",
      groupCode: "IBCP",
      sector: "Chemical Manufacturing (BCO Customer)",
      headquartersCountry: "ES",
      taxId: "ES-A98765432",
      creditLimit: 1200000,
    },
    {
      id: "grp_sese",
      name: "Grupo Logístico Sesé",
      groupCode: "SESE",
      sector: "Road Haulage & Contract Logistics",
      headquartersCountry: "ES",
      taxId: "ES-A50612340",
      creditLimit: 900000,
    },
    {
      id: "grp_allianz",
      name: "Allianz Marine & Cargo Insurance",
      groupCode: "ALNZ",
      sector: "Marine Cargo Insurance & Underwriting",
      headquartersCountry: "DE",
      taxId: "DE-129274114",
      creditLimit: 3000000,
    },
    {
      id: "grp_customs_iberia",
      name: "Agencia Aduanera Ibérica & Brokers",
      groupCode: "AAIB",
      sector: "Customs Brokerage & Fiscal Representation",
      headquartersCountry: "ES",
      taxId: "ES-B08112233",
      creditLimit: 600000,
    },
    {
      id: "grp_euro_bco",
      name: "European Industrial & Retail Shippers",
      groupCode: "EIRS",
      sector: "Industrial & Retail Importers/Exporters",
      headquartersCountry: "DE",
      taxId: "DE-298441092",
      creditLimit: 1800000,
    },
  ] as const;

export function inferEnterpriseGroupId(
  companyName?: string | null,
  addressType?: string | null,
  explicitCompanyId?: string | null,
): string {
  if (
    explicitCompanyId &&
    explicitCompanyId !== "c-1" &&
    explicitCompanyId.trim() !== ""
  ) {
    return explicitCompanyId.trim();
  }
  const name = (companyName || "").toLowerCase();
  if (name.includes("apm terminal")) return "grp_apm_terminals";
  if (name.includes("maersk")) return "grp_maersk";
  if (name.includes("msc") || name.includes("mediterranean shipping"))
    return "grp_msc";
  if (name.includes("hapag")) return "grp_hapag";
  if (name.includes("cosco")) return "grp_cosco";
  if (name.includes("ocean network express") || name.startsWith("one "))
    return "grp_one";
  if (name.includes("evergreen")) return "grp_evergreen";
  if (name.includes("hutchison") || name.includes("best"))
    return "grp_hutchison";
  if (name.includes("atlas global") || name.includes("atlas logistics"))
    return "grp_atlas";
  if (name.includes("iberian chem")) return "grp_iberian_chem";
  if (
    name.includes("sesé") ||
    name.includes("sese") ||
    name.includes("transports portuaris") ||
    name.includes("transportes")
  )
    return "grp_sese";
  if (
    name.includes("allianz") ||
    name.includes("lloyd's") ||
    name.includes("generali")
  )
    return "grp_allianz";
  if (
    name.includes("aduan") ||
    name.includes("customs") ||
    name.includes("broker")
  )
    return "grp_customs_iberia";

  const code = normalizeAddressTypeCode(addressType);
  if (code === "MCC" || (code as string) === "CUS")
    return explicitCompanyId || "grp_euro_bco";
  if (code === "CBA" || (code as string) === "CB") return "grp_customs_iberia";
  if (code === "OHA" || code === "DHA" || (code as string) === "HAU")
    return "grp_sese";
  if (code === "INS") return "grp_allianz";
  if (code === "FFC" || (code as string) === "FW") return "grp_atlas";
  if (
    code === "SPT" ||
    code === "RST" ||
    code === "OIC" ||
    code === "DIC" ||
    (code as string) === "TRM"
  )
    return "grp_apm_terminals";
  return explicitCompanyId || "c-1";
}

export const addressVerificationStatusEnum = [
  "NOT_CHECKED",
  "VERIFIED",
  "MANUAL_UNVERIFIED",
  "AMBIGUOUS",
] as const;

export type AddressVerificationStatus =
  (typeof addressVerificationStatusEnum)[number];

export const addressVerificationProviderEnum = [
  "GOOGLE_MAPS",
  "NOMINATIM",
  "PHOTON",
  "MANUAL",
] as const;

export type AddressVerificationProvider =
  (typeof addressVerificationProviderEnum)[number];

export const contactRoleCategoryEnum = [
  "OPERATIONS",
  "CUSTOMS",
  "BILLING",
  "DISPATCH",
  "MANAGEMENT",
] as const;

export type ContactRoleCategory = (typeof contactRoleCategoryEnum)[number];

export const addresses = sqliteTable("addresses", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id), // Parent Enterprise Group (1:N with addresses)
  addressType: text("address_type", { enum: addressTypeEnum })
    .notNull()
    .references(() => addressTypes.code),
  companyName: text("company_name").notNull(),
  tradeName: text("trade_name"),
  taxId: text("tax_id"), // VAT, CIF, NIF, EORI, EIN
  street1: text("street_1").notNull(),
  street2: text("street_2"),
  zipCode: text("zip_code").notNull(),
  city: text("city").notNull(),
  federalState: text("federal_state"),
  country: text("country").notNull(),
  unLocode: text("un_locode"),
  isDefaultShipper: integer("is_default_shipper", { mode: "boolean" }).default(
    false,
  ),
  isDefaultConsignee: integer("is_default_consignee", {
    mode: "boolean",
  }).default(false),
  isDefaultNotify: integer("is_default_notify", { mode: "boolean" }).default(
    false,
  ),
  notes: text("notes"),
  lat: real("lat"),
  lon: real("lon"),
  formattedAddress: text("formatted_address"),
  verificationStatus: text("verification_status", {
    enum: addressVerificationStatusEnum,
  }).default("NOT_CHECKED"),
  verificationProvider: text("verification_provider", {
    enum: addressVerificationProviderEnum,
  }),
  ...commonAuditFields,
});

export const addressContacts = sqliteTable("address_contacts", {
  id: text("id").primaryKey(),
  addressId: text("address_id")
    .notNull()
    .references(() => addresses.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  mobile: text("mobile"),
  roleCategory: text("role_category", {
    enum: contactRoleCategoryEnum,
  }).default("OPERATIONS"),
  jobTitle: text("job_title"),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
  ...commonAuditFields,
});

export const identifierSchemeEnum = [
  "SCAC",
  "IATA",
  "BIC_OWNER",
  "BROKER_LICENSE",
  "EORI",
  "AEO",
  "CUSTOMS_AUTHORIZATION",
  "LEI",
  "DUNS",
  "TAX_ID",
] as const;

export type IdentifierScheme = (typeof identifierSchemeEnum)[number];

export const addressIdentifiers = sqliteTable("address_identifiers", {
  id: text("id").primaryKey(),
  addressId: text("address_id")
    .notNull()
    .references(() => addresses.id, { onDelete: "cascade" }),
  scheme: text("scheme", { enum: identifierSchemeEnum }).notNull(),
  value: text("value").notNull(),
  transportMode: text("transport_mode", {
    enum: ["OCEAN", "AIR", "ROAD", "RAIL", "MULTIMODAL"],
  }),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(true),
  issuedBy: text("issued_by"),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  ...commonAuditFields,
});

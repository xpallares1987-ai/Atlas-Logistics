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
  "CUS",
  "CB",
  "AG",
  "HAU",
  "CAR",
  "INS",
  "CAA",
  "WH",
  "FW",
  "TRM",
] as const;

export type AddressTypeCode = (typeof addressTypeCodeEnum)[number];

export const addressTypeEnum = [
  "CUS",
  "CB",
  "AG",
  "HAU",
  "CAR",
  "INS",
  "CAA",
  "WH",
  "FW",
  "TRM",
  // Legacy compatibility literals normalized at runtime
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
    code: "CUS",
    name: "Customer",
    description:
      "Beneficial cargo owner (BCO), shipper, importer, exporter, or consignee party.",
  },
  {
    code: "CB",
    name: "Customs Broker",
    description:
      "Licensed customs house broker, fiscal representative, and tariff clearance agency.",
  },
  {
    code: "AG",
    name: "Agent",
    description:
      "Port agency, handling agent, surveyor, or regional logistics representative.",
  },
  {
    code: "HAU",
    name: "Haulier",
    description:
      "Road transport operator, drayage carrier, and intermodal trucking fleet.",
  },
  {
    code: "CAR",
    name: "Carrier",
    description:
      "Vessel-operating common carrier (VOCC), airline, or rail operator.",
  },
  {
    code: "INS",
    name: "Insurance",
    description:
      "Marine cargo insurer, P&I club, underwriter, or claims average adjuster.",
  },
  {
    code: "CAA",
    name: "Carrier Agent",
    description:
      "Authorized liner shipping agency representing an ocean or air carrier at port.",
  },
  {
    code: "WH",
    name: "Warehouse",
    description:
      "Logistics distribution center, bonded warehouse, CFS, or inland container depot.",
  },
  {
    code: "FW",
    name: "Forwarder",
    description: "Freight forwarder, NVOCC, or 3PL/4PL logistics orchestrator.",
  },
  {
    code: "TRM",
    name: "Terminal",
    description:
      "Maritime container terminal, stevedoring facility, or air cargo terminal.",
  },
] as const;

const LEGACY_ADDRESS_TYPE_TO_CODE: Record<string, AddressTypeCode> = {
  CUS: "CUS",
  CUSTOMER: "CUS",
  CONSIGNEE_NOTIFY: "CUS",
  CB: "CB",
  CUSTOMS_BROKER: "CB",
  AG: "AG",
  AGENT: "AG",
  PORT_AUTHORITY: "AG",
  HAU: "HAU",
  HAULIER: "HAU",
  CAR: "CAR",
  CARRIER: "CAR",
  INS: "INS",
  INSURANCE: "INS",
  CAA: "CAA",
  CARRIER_AGENT: "CAA",
  WH: "WH",
  WAREHOUSE: "WH",
  INLAND_DEPOT: "WH",
  INLAND_CONTAINER_DEPOT: "WH",
  FW: "FW",
  FORWARDER: "FW",
  TRM: "TRM",
  TERMINAL: "TRM",
};

/**
 * Normalizes any short code or legacy addressType value to its canonical `address_types.code`.
 * Eliminates CONSIGNEE_NOTIFY by mapping it to CUS (Customer).
 */
export function normalizeAddressTypeCode(raw?: string | null): AddressTypeCode {
  if (!raw) return "CUS";
  const key = raw.trim().toUpperCase();
  return LEGACY_ADDRESS_TYPE_TO_CODE[key] ?? "CUS";
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
  if (code === "CUS") return explicitCompanyId || "grp_euro_bco";
  if (code === "CB") return "grp_customs_iberia";
  if (code === "HAU") return "grp_sese";
  if (code === "INS") return "grp_allianz";
  if (code === "FW") return "grp_atlas";
  if (code === "TRM") return "grp_apm_terminals";
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

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  taxId: text("tax_id"),
  creditLimit: real("credit_limit"),
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

export const addressTypeEnum = [
  "CUSTOMER",
  "CARRIER",
  "CARRIER_AGENT",
  "CUSTOMS_BROKER",
  "PORT_AUTHORITY",
  "WAREHOUSE",
  "TERMINAL",
  "INLAND_DEPOT",
  "HAULIER",
  "CONSIGNEE_NOTIFY",
] as const;

export type AddressType = (typeof addressTypeEnum)[number];

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
    .references(() => companies.id), // Tenant Isolation
  addressType: text("address_type", { enum: addressTypeEnum }).notNull(),
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

/**
 * @file organization.ts
 * @description Enterprise Freight Forwarding Stations, Functional Departments, Matrix RBAC, and Global Network Alliances.
 * @module @atlas/db/schema/organization
 * @see {@link docs/architecture/enterprise-organization.md}
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { companies, users, addresses } from "./core.js";

// ============================================================================
// 1. ENUMS & CONSTANTS
// ============================================================================

export const stationTypeEnum = [
  "OCEAN_GATEWAY",
  "AIR_CARGO_HUB",
  "INTERMODAL_RAIL_RAMP",
  "CROSSDOCK_CFS",
  "CUSTOMS_OFFICE",
  "COMMERCIAL_BRANCH",
] as const;

export type StationType = (typeof stationTypeEnum)[number];

export const departmentCodeEnum = [
  "OCEAN_EXPORT",
  "OCEAN_IMPORT",
  "AIR_LOGISTICS",
  "CUSTOMS_BROKERAGE",
  "ROAD_DRAYAGE",
  "WAREHOUSE_CFS",
  "FINANCE_CONTROLLING",
  "PRICING_PROCUREMENT",
  "SALES_KEY_ACCOUNTS",
  "LEGAL_COMPLIANCE",
] as const;

export type DepartmentCode = (typeof departmentCodeEnum)[number];

// ============================================================================
// 2. STATIONS & BRANCH OFFICES
// ============================================================================

export const branchOffices = sqliteTable(
  "branch_offices",
  {
    id: text("id").primaryKey(), // e.g. "stn_esbcn_01"
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    addressId: text("address_id")
      .notNull()
      .references(() => addresses.id),
    stationCode: text("station_code").notNull().unique(), // e.g. "BCN-OCEAN", "MAD-AIR"
    name: text("name").notNull(),
    stationType: text("station_type", { enum: stationTypeEnum }).notNull(),
    unLocode: text("un_locode").notNull(), // Gateway UN/LOCODE (e.g. "ESBCN")
    iataCode: text("iata_code"), // Airport code (e.g. "BCN")
    primaryCurrency: text("primary_currency").notNull().default("EUR"),
    timezone: text("timezone").notNull().default("UTC"),
    managerUserId: text("manager_user_id").references(() => users.id),
    fmcOtiNumber: text("fmc_oti_number"), // Federal Maritime Commission Ocean Transp. Intermediary
    iataNumericCode: text("iata_numeric_code"), // 7-digit CASS / IATA Agency Code
    ...commonAuditFields,
  },
  (table) => ({
    companyIdx: index("idx_branch_offices_company").on(table.companyId),
    unLocodeIdx: index("idx_branch_offices_un_locode").on(table.unLocode),
  }),
);

// ============================================================================
// 3. FUNCTIONAL DEPARTMENTS
// ============================================================================

export const departments = sqliteTable(
  "departments",
  {
    id: text("id").primaryKey(), // e.g. "dept_esbcn_ocean_exp"
    branchId: text("branch_id")
      .notNull()
      .references(() => branchOffices.id, { onDelete: "cascade" }),
    code: text("code", { enum: departmentCodeEnum }).notNull(),
    name: text("name").notNull(),
    costCenter: text("cost_center").notNull(), // Financial Cost Center (e.g. "CC-ES-0101")
    parentDepartmentId: text("parent_department_id"),
    managerUserId: text("manager_user_id").references(() => users.id),
    emailAlias: text("email_alias"), // e.g. "ocean.export.bcn@atlas-logistics.com"
    phone: text("phone"),
    ...commonAuditFields,
  },
  (table) => ({
    branchIdx: index("idx_departments_branch").on(table.branchId),
    codeIdx: index("idx_departments_code").on(table.code),
  }),
);

// ============================================================================
// 4. GRANULAR RBAC: ROLES & PERMISSIONS
// ============================================================================

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(), // e.g. "role_ocean_operator"
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystemRole: integer("is_system_role", { mode: "boolean" })
    .default(false)
    .notNull(),
  ...commonAuditFields,
});

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(), // e.g. "perm_doc_release_obl"
  code: text("code").notNull().unique(), // e.g. "documents:release_obl"
  category: text("category").notNull(), // "OPERATIONS", "CUSTOMS", "FINANCE", "DOCUMENTS"
  description: text("description").notNull(),
  ...commonAuditFields,
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    ...commonAuditFields,
  },
  (table) => ({
    rolePermissionUnique: uniqueIndex("idx_role_permissions_unique").on(
      table.roleId,
      table.permissionId,
    ),
  }),
);

export const userStationAssignments = sqliteTable(
  "user_station_assignments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branchOffices.id, { onDelete: "cascade" }),
    departmentId: text("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .default(true)
      .notNull(),
    ...commonAuditFields,
  },
  (table) => ({
    userBranchIdx: index("idx_user_station_assignments_user").on(
      table.userId,
      table.branchId,
    ),
  }),
);

// ============================================================================
// 5. GLOBAL FORWARDING ALLIANCES & CARRIER COMMITMENTS
// ============================================================================

export const forwardingAgentNetworks = sqliteTable(
  "forwarding_agent_networks",
  {
    id: text("id").primaryKey(), // e.g. "net_wca", "net_fiata"
    networkCode: text("network_code").notNull().unique(), // "WCA", "FIATA", "C5C"
    name: text("name").notNull(),
    secretarialBody: text("secretarial_body"),
    financialProtectionCoverageUsd: real(
      "financial_protection_coverage_usd",
    ).default(100000),
    arbitrationJurisdiction: text("arbitration_jurisdiction").default(
      "Singapore / Geneva",
    ),
    ...commonAuditFields,
  },
);

export const carrierAllocationContracts = sqliteTable(
  "carrier_allocation_contracts",
  {
    id: text("id").primaryKey(),
    carrierAddressId: text("carrier_address_id")
      .notNull()
      .references(() => addresses.id),
    branchId: text("branch_id")
      .notNull()
      .references(() => branchOffices.id),
    contractReference: text("contract_reference").notNull(), // e.g. "SC-MSK-2026-EU-ASIA"
    tradeLaneName: text("trade_lane_name").notNull(), // e.g. "FEWB - Far East Westbound"
    effectiveFrom: integer("effective_from", { mode: "timestamp" }).notNull(),
    effectiveTo: integer("effective_to", { mode: "timestamp" }).notNull(),
    monthlyTeuMqc: real("monthly_teu_mqc").notNull(), // Minimum Quantity Commitment
    committedTeuTiers: text("committed_teu_tiers", { mode: "json" }), // JSON details
    deadfreightPenaltyRatePerTeu: real(
      "deadfreight_penalty_rate_per_teu",
    ).default(250),
    ...commonAuditFields,
  },
);

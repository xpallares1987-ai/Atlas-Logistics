import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const incotermRules = sqliteTable("incoterm_rules", {
  code: text("code").primaryKey(), // EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF
  name: text("name").notNull(),
  transportCategory: text("transport_category").notNull(), // ANY_MODE | MARITIME_ONLY
  riskTransferPoint: text("risk_transfer_point").notNull(),
  costTransferPoint: text("cost_transfer_point").notNull(),
  insuranceRequirement: text("insurance_requirement").notNull(), // NONE | MANDATORY_CLAUSE_A | MANDATORY_CLAUSE_C
  sellerResponsibilities: text("seller_responsibilities", { mode: "json" }), // array of 10 stage flags
  buyerResponsibilities: text("buyer_responsibilities", { mode: "json" }),
  customsExportBy: text("customs_export_by").notNull().default("SELLER"), // SELLER | BUYER
  customsImportBy: text("customs_import_by").notNull().default("BUYER"), // SELLER | BUYER
  description: text("description").notNull(),
  ...commonAuditFields,
});

export const commercialContracts = sqliteTable("commercial_contracts", {
  id: text("id").primaryKey(),
  contractNumber: text("contract_number").notNull().unique(), // CTR-2026-XXXX
  title: text("title").notNull(),
  sellerCompanyId: text("seller_company_id"),
  buyerCompanyId: text("buyer_company_id"),
  sellerData: text("seller_data", { mode: "json" }),
  buyerData: text("buyer_data", { mode: "json" }),
  forwarderData: text("forwarder_data", { mode: "json" }),
  incotermCode: text("incoterm_code").notNull(), // e.g. CIP
  namedPlace: text("named_place").notNull(), // e.g. "JFK International Airport, New York, US"
  transportMode: text("transport_mode").notNull().default("MULTIMODAL"), // OCEAN, AIR, ROAD, RAIL, MULTIMODAL
  currency: text("currency").notNull().default("EUR"),
  goodsValue: real("goods_value").notNull(),
  freightEstimatedCost: real("freight_estimated_cost").notNull().default(0),
  insuranceEstimatedCost: real("insurance_estimated_cost").notNull().default(0),
  customsEstimatedDuty: real("customs_estimated_duty").notNull().default(0),
  effectiveDate: integer("effective_date", { mode: "timestamp" }).notNull(),
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
  status: text("status").notNull().default("ACTIVE"), // DRAFT, ACTIVE, EXECUTED, TERMINATED
  governingLaw: text("governing_law")
    .notNull()
    .default("ICC / Spanish Commercial Code"),
  disputeJurisdiction: text("dispute_jurisdiction")
    .notNull()
    .default("Arbitration Tribunal Madrid"),
  milestonesData: text("milestones_data", { mode: "json" }),
  ...commonAuditFields,
});

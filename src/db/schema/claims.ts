import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const cargoClaims = sqliteTable("cargo_claims", {
  id: text("id").primaryKey(),
  claimNumber: text("claim_number").notNull().unique(), // CLM-2026-XXXX
  shipmentId: text("shipment_id"),
  transportDocNumber: text("transport_doc_number").notNull(), // B/L, AWB, or CMR number
  transportMode: text("transport_mode").notNull(), // OCEAN, AIR, ROAD, RAIL, MULTIMODAL
  governingConvention: text("governing_convention").notNull(), // HAGUE_VISBY, MONTREAL_1999, CMR, CIM_COTIF
  incidentType: text("incident_type").notNull(), // WATER_DAMAGE, TEMPERATURE_EXCURSION, CRUSH_COLLAPSE, PILFERAGE_THEFT, TOTAL_LOSS, DELAY
  incidentDate: integer("incident_date", { mode: "timestamp" }).notNull(),
  noticeDate: integer("notice_date", { mode: "timestamp" }).notNull(),
  deliveryDate: integer("delivery_date", { mode: "timestamp" }),
  claimantName: text("claimant_name").notNull(),
  carrierName: text("carrier_name").notNull(),
  packagesDamaged: integer("packages_damaged").notNull().default(1),
  damagedWeightKg: real("damaged_weight_kg").notNull(),
  claimedAmount: real("claimed_amount").notNull(),
  claimedCurrency: text("claimed_currency").notNull().default("EUR"),
  statutorySdrRate: real("statutory_sdr_rate").notNull(), // e.g. 2.00, 22.00, 8.33
  statutoryLimitEur: real("statutory_limit_eur").notNull(),
  insuranceInsuredValue: real("insurance_insured_value").notNull().default(0),
  insurancePolicyDeductible: real("insurance_policy_deductible")
    .notNull()
    .default(0),
  insurancePayoutAmount: real("insurance_payout_amount").notNull().default(0),
  subrogationRecoveredAmount: real("subrogation_recovered_amount")
    .notNull()
    .default(0),
  status: text("status").notNull().default("OPEN"), // OPEN, UNDER_SURVEY, PROTEST_ISSUED, INSURER_APPROVED, SUBROGATED, RECOVERED, REJECTED
  protestIssued: integer("protest_issued", { mode: "boolean" })
    .notNull()
    .default(false),
  subrogationSigned: integer("subrogation_signed", { mode: "boolean" })
    .notNull()
    .default(false),
  incidentDescription: text("incident_description").notNull(),
  surveyorData: text("surveyor_data", { mode: "json" }),
  recoveryNotes: text("recovery_notes"),
  ...commonAuditFields,
});

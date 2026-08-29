import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { companies } from "./core.js";

/**
 * AEO Audits: Authorized Economic Operator (OEA) assessment files
 * Covers EU UCC Arts. 38-39 (OEAC, OEAS, OEAF) and Mutual Recognition Agreements (MRA - US C-TPAT, UK AEO, etc.)
 */
export const aeoAudits = sqliteTable("aeo_audits", {
  id: text("id").primaryKey(),
  auditReference: text("audit_reference").notNull().unique(), // e.g. OEA-2026-MAD-001
  companyId: text("company_id").references(() => companies.id),
  aeoModality: text("aeo_modality")
    .$type<
      | "OEAC_CUSTOMS_SIMPLIFICATIONS"
      | "OEAS_SECURITY_SAFETY"
      | "OEAF_FULL_COMBINED"
    >()
    .notNull()
    .default("OEAF_FULL_COMBINED"),
  targetStandard: text("target_standard")
    .$type<
      | "EU_UCC_AEO"
      | "US_CTPAT_TIER2"
      | "US_CTPAT_TIER3"
      | "UK_AEO"
      | "ISO_28000"
    >()
    .notNull()
    .default("EU_UCC_AEO"),
  leadAuditorName: text("lead_auditor_name").notNull(),
  auditDate: text("audit_date").notNull(),
  nextReviewDate: text("next_review_date").notNull(),
  overallReadinessScore: real("overall_readiness_score").notNull().default(0.0), // 0 to 100%
  customsComplianceScore: real("customs_compliance_score")
    .notNull()
    .default(0.0),
  financialSolvencyScore: real("financial_solvency_score")
    .notNull()
    .default(0.0),
  commercialRecordsScore: real("commercial_records_score")
    .notNull()
    .default(0.0),
  competenceScore: real("competence_score").notNull().default(0.0),
  securitySafetyScore: real("security_safety_score").notNull().default(0.0),
  complianceStatus: text("compliance_status")
    .$type<
      | "DRAFT"
      | "IN_PROGRESS"
      | "AUDIT_READY"
      | "CERTIFIED_APPROVED"
      | "ACTION_PLAN_REQUIRED"
      | "SUSPENDED"
    >()
    .notNull()
    .default("IN_PROGRESS"),
  aeoOfficialCertificateNumber: text("aeo_official_certificate_number"), // e.g. ES AEOF 2026000089
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * AEO CAE Questionnaire Sections (Cuestionario de Auto-Evaluación de la AEAT / DG TAXUD)
 * 6 Official Blocks under UCC Article 39 Criteria
 */
export const aeoCaeQuestionnaireSections = sqliteTable(
  "aeo_cae_questionnaire_sections",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => aeoAudits.id, { onDelete: "cascade" }),
    blockNumber: integer("block_number").notNull(), // 1 to 6
    blockCode: text("block_code")
      .$type<
        | "BLOCK_1_GENERAL_INFO"
        | "BLOCK_2_CUSTOMS_COMPLIANCE"
        | "BLOCK_3_ACCOUNTING_LOGISTICS_RECORDS"
        | "BLOCK_4_FINANCIAL_SOLVENCY"
        | "BLOCK_5_PRACTICAL_COMPETENCE"
        | "BLOCK_6_SECURITY_SAFETY_STANDARDS"
      >()
      .notNull(),
    blockTitle: text("block_title").notNull(),
    totalQuestions: integer("total_questions").notNull().default(10),
    compliantCount: integer("compliant_count").notNull().default(0),
    nonCompliantCount: integer("non_compliant_count").notNull().default(0),
    waivedCount: integer("waived_count").notNull().default(0),
    blockScorePercentage: real("block_score_percentage").notNull().default(0.0),
    blockStatus: text("block_status")
      .$type<"COMPLIANT" | "DEFICIENT_ACTION_REQUIRED" | "NOT_APPLICABLE">()
      .notNull()
      .default("COMPLIANT"),
    findingsSummary: text("findings_summary"),
    actionPlanRequired: text("action_plan_required"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
);

/**
 * AEO 7-Point Container & Vehicle Physical Security Inspections (C-TPAT / OEAS)
 * Verification of the 7 mandatory structural checkpoints before loading
 */
export const aeoSevenPointInspections = sqliteTable(
  "aeo_seven_point_inspections",
  {
    id: text("id").primaryKey(),
    inspectionReference: text("inspection_reference").notNull().unique(), // e.g. 7PT-2026-0891
    equipmentType: text("equipment_type")
      .$type<
        | "OCEAN_CONTAINER"
        | "ROAD_TRAILER"
        | "REEFER_BOX"
        | "CURTAINSIDER"
        | "BOX_TRUCK"
      >()
      .notNull()
      .default("OCEAN_CONTAINER"),
    equipmentIdentifier: text("equipment_identifier").notNull(), // Container/Trailer number e.g. MSKU-782910-3
    inspectorName: text("inspector_name").notNull(),
    inspectionDate: text("inspection_date").notNull(),
    facilityLocation: text("facility_location")
      .notNull()
      .default("Terminal Muelle Prat BCN"),
    // The 7 Standard C-TPAT / OEAS Checkpoints
    p1FrontWallPassed: integer("p1_front_wall_passed", { mode: "boolean" })
      .notNull()
      .default(true),
    p2LeftSidePassed: integer("p2_left_side_passed", { mode: "boolean" })
      .notNull()
      .default(true),
    p3RightSidePassed: integer("p3_right_side_passed", { mode: "boolean" })
      .notNull()
      .default(true),
    p4FloorPassed: integer("p4_floor_passed", { mode: "boolean" })
      .notNull()
      .default(true),
    p5RoofCeilingPassed: integer("p5_roof_ceiling_passed", { mode: "boolean" })
      .notNull()
      .default(true),
    p6DoorsLocksPassed: integer("p6_doors_locks_passed", { mode: "boolean" })
      .notNull()
      .default(true),
    p7UndercarriagePassed: integer("p7_undercarriage_passed", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    // Specific contraband & contamination checks
    hasAgriculturalContamination: integer("has_agricultural_contamination", {
      mode: "boolean",
    })
      .notNull()
      .default(false), // C-TPAT WDO check (Wood Destroying Organisms / soil / pests)
    physicalTamperingDetected: integer("physical_tampering_detected", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    overallPassed: integer("overall_passed", { mode: "boolean" })
      .notNull()
      .default(true),
    inspectionResult: text("inspection_result")
      .$type<"PASSED_CLEAN" | "FAILED_REJECTED" | "MAINTENANCE_REQUIRED">()
      .notNull()
      .default("PASSED_CLEAN"),
    actionTaken: text("action_taken"),
    remarks: text("remarks"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
);

/**
 * AEO ISO 17712 High-Security Seals & Chain of Custody Ledger
 * Tracking of Mechanical Bolt & Cable Seals (Class 'H')
 */
export const aeoSecuritySeals = sqliteTable("aeo_security_seals", {
  id: text("id").primaryKey(),
  sealNumber: text("seal_number").notNull().unique(), // e.g. H-ES-2026-991204
  sealType: text("seal_type")
    .$type<
      | "BOLT_SEAL_CLASS_H"
      | "CABLE_SEAL_CLASS_H"
      | "ELECTRONIC_E_SEAL"
      | "INDICATIVE_SEAL"
    >()
    .notNull()
    .default("BOLT_SEAL_CLASS_H"),
  iso17712Compliant: integer("iso17712_compliant", { mode: "boolean" })
    .notNull()
    .default(true),
  manufacturerName: text("manufacturer_name")
    .notNull()
    .default("Mega Fortris / TydenBrooks"),
  iso17712TestCertificateRef: text("iso17712_test_certificate_ref").default(
    "CERT-ISO17712-2025-H",
  ),
  associatedEquipmentIdentifier: text("associated_equipment_identifier"), // Container/Trailer No.
  associatedShipmentReference: text("associated_shipment_reference"), // B/L or e-CMR ref
  affixedDate: text("affixed_date"),
  affixedBy: text("affixed_by"),
  verifiedAtPortOfEntry: integer("verified_at_port_of_entry", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  verifiedIntactDate: text("verified_intact_date"),
  verifiedBy: text("verified_by"),
  sealStatus: text("seal_status")
    .$type<
      | "IN_STOCK"
      | "AFFIXED_TRANSIT"
      | "VERIFIED_INTACT"
      | "TAMPERED_BROKEN"
      | "REMOVED_CUSTOMS"
      | "DEFECTIVE_DISCARDED"
    >()
    .notNull()
    .default("IN_STOCK"),
  tamperIncidentReport: text("tamper_incident_report"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * AEO Business Partners & Supply Chain Security Risk Screening (ISO 28000 / C-TPAT)
 * Homologation of third-party hauliers, customs brokers, ocean carriers, and packers
 */
export const aeoBusinessPartners = sqliteTable("aeo_business_partners", {
  id: text("id").primaryKey(),
  partnerName: text("partner_name").notNull(),
  partnerVatNumber: text("partner_vat_number").notNull().unique(), // CIF/NIF or foreign tax ID
  partnerType: text("partner_type")
    .$type<
      | "HAULIER_CARRIER"
      | "CUSTOMS_BROKER"
      | "WAREHOUSE_KEEPER"
      | "FREIGHT_FORWARDER"
      | "SUPPLIER_PACKER"
      | "TERMINAL_OPERATOR"
    >()
    .notNull(),
  countryCode: text("country_code").notNull().default("ES"),
  hasAeoCertification: integer("has_aeo_certification", { mode: "boolean" })
    .notNull()
    .default(false),
  aeoCertificateNumber: text("aeo_certificate_number"), // e.g. ES AEOF 190000456
  hasCtpatCertification: integer("has_ctpat_certification", { mode: "boolean" })
    .notNull()
    .default(false),
  ctpatSviNumber: text("ctpat_svi_number"),
  iso28000Certified: integer("iso28000_certified", { mode: "boolean" })
    .notNull()
    .default(false),
  securityQuestionnaireScore: real("security_questionnaire_score")
    .notNull()
    .default(0.0), // 0 to 100%
  riskLevel: text("risk_level")
    .$type<"LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK_ENHANCED_CONTROL">()
    .notNull()
    .default("LOW_RISK"),
  lastAssessmentDate: text("last_assessment_date").notNull(),
  reassessmentDueDate: text("reassessment_due_date").notNull(),
  status: text("status")
    .$type<"APPROVED_PARTNER" | "PROVISIONAL" | "SUSPENDED_REVOKED">()
    .notNull()
    .default("APPROVED_PARTNER"),
  remarks: text("remarks"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

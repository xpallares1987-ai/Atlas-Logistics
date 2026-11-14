/**
 * @file index.ts
 * @description Domain types and contracts for AEO/OEA customs security, 7-point inspection, and ISO 28000 partner risk.
 * @module @atlas/frontend/components/AeoSecurity/types
 */

export type AeoTabKey = "CAE_AUDITS" | "SEVEN_POINT_SEALS" | "PARTNERS_RISK";

export interface AeoAuditRecord {
  id: string;
  auditReference: string;
  leadAuditorName: string;
  auditDate: string;
  auditScope: string;
  overallScore: number;
  auditStatus: string;
  findingsCount?: number;
  caeBlocks?: {
    block1CorporateRecord: number;
    block2AccountingLogistics: number;
    block3FinancialSolvency: number;
    block4PracticalCompetence: number;
    block5PhysicalSecurity: number;
    block6CrisisManagement: number;
  };
}

export interface SevenPointInspectionRecord {
  id: string;
  inspectionReference: string;
  equipmentType: string;
  equipmentIdentifier: string;
  inspectorName: string;
  facilityLocation: string;
  inspectionResult: string;
  overallPassed: boolean;
  actionRequired?: string;
}

export interface IsoSealRecord {
  id: string;
  sealNumber: string;
  sealType: string;
  associatedEquipmentIdentifier?: string;
  sealStatus: string;
  appliedDate?: string;
}

export interface LogisticsPartnerRecord {
  id: string;
  partnerName: string;
  partnerType: string;
  hasAeoCertification: boolean;
  aeoCertificateNumber?: string;
  hasCtpatCertification?: boolean;
  iso28000Certified?: boolean;
  securityQuestionnaireScore: number;
  riskLevel: string;
  status: string;
}

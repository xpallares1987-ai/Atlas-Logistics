import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedAeoSecurity(): Promise<void> {
  // =========================================================================
  console.log(
    "🌱 Insertando Auditorías OEA, Cuestionario CAE, Inspecciones 7 Puntos, Precintos ISO 17712 y Socios...",
  );

  await db
    .insert(schema.aeoAudits)
    .values([
      {
        id: "audit_mad_oeaf_2026",
        auditReference: "OEA-2026-MAD-0088",
        aeoModality: "OEAF_FULL_COMBINED",
        targetStandard: "EU_UCC_AEO",
        leadAuditorName: "Inspectora Carmen Morales (AEAT / OEA Lead Auditor)",
        auditDate: "2026-06-15",
        nextReviewDate: "2029-06-15",
        overallReadinessScore: 94.5,
        customsComplianceScore: 98.0,
        financialSolvencyScore: 95.0,
        commercialRecordsScore: 92.0,
        competenceScore: 95.0,
        securitySafetyScore: 92.5,
        complianceStatus: "CERTIFIED_APPROVED",
        aeoOfficialCertificateNumber: "ES AEOF 2026000088",
        notes:
          "Auditoría periódica de reevaluación conforme a las Directrices TAXUD/B2/047/2011. Certificación completa renovada.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "audit_bcn_oeas_2026",
        auditReference: "OEA-2026-BCN-0042",
        aeoModality: "OEAS_SECURITY_SAFETY",
        targetStandard: "US_CTPAT_TIER2",
        leadAuditorName:
          "David Rovira (Auditor Senior Seguridad Cadena Suministro)",
        auditDate: "2026-08-01",
        nextReviewDate: "2027-08-01",
        overallReadinessScore: 91.0,
        customsComplianceScore: 90.0,
        financialSolvencyScore: 88.0,
        commercialRecordsScore: 90.0,
        competenceScore: 92.0,
        securitySafetyScore: 95.0,
        complianceStatus: "AUDIT_READY",
        aeoOfficialCertificateNumber: "ES AEOS 2026000042",
        notes:
          "Preparación para validación conjunta de Reconocimiento Mutuo US C-TPAT / MRA UE.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "audit_vlc_oeac_2026",
        auditReference: "OEA-2026-VLC-0019",
        aeoModality: "OEAC_CUSTOMS_SIMPLIFICATIONS",
        targetStandard: "EU_UCC_AEO",
        leadAuditorName:
          "Laura Benítez (Especialista en Procedimientos Aduaneros)",
        auditDate: "2026-08-20",
        nextReviewDate: "2026-11-20",
        overallReadinessScore: 78.5,
        customsComplianceScore: 75.0,
        financialSolvencyScore: 82.0,
        commercialRecordsScore: 78.0,
        competenceScore: 80.0,
        securitySafetyScore: 77.0,
        complianceStatus: "ACTION_PLAN_REQUIRED",
        aeoOfficialCertificateNumber: null,
        notes:
          "Requiere subsanar trazabilidad en el archivo de registros logísticos antes de remitir solicitud formal al Departamento de Aduanas de la AEAT.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.aeoCaeQuestionnaireSections)
    .values([
      {
        id: "cae_sec_mad_b1",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 1,
        blockCode: "BLOCK_1_GENERAL_INFO",
        blockTitle: "Bloque 1: Información General sobre el Solicitante",
        totalQuestions: 8,
        compliantCount: 8,
        nonCompliantCount: 0,
        waivedCount: 0,
        blockScorePercentage: 100.0,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Estructura societaria, centros operativos y organigrama plenamente documentados.",
      },
      {
        id: "cae_sec_mad_b2",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 2,
        blockCode: "BLOCK_2_CUSTOMS_COMPLIANCE",
        blockTitle:
          "Bloque 2: Historial de Cumplimiento Aduanero y Fiscal (Art. 39.a CAU)",
        totalQuestions: 10,
        compliantCount: 10,
        nonCompliantCount: 0,
        waivedCount: 0,
        blockScorePercentage: 100.0,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Cero sanciones graves o reiteradas en los últimos 3 años ante la AEAT y Seguridad Social.",
      },
      {
        id: "cae_sec_mad_b3",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 3,
        blockCode: "BLOCK_3_ACCOUNTING_LOGISTICS_RECORDS",
        blockTitle:
          "Bloque 3: Sistema Contable y Registros Comerciales (Art. 39.b CAU)",
        totalQuestions: 12,
        compliantCount: 11,
        nonCompliantCount: 1,
        waivedCount: 0,
        blockScorePercentage: 91.7,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Pista de auditoría completa integrada en Atlas ERP con backup diario inmutable.",
      },
      {
        id: "cae_sec_mad_b4",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 4,
        blockCode: "BLOCK_4_FINANCIAL_SOLVENCY",
        blockTitle: "Bloque 4: Solvencia Financiera Acreditada (Art. 39.c CAU)",
        totalQuestions: 6,
        compliantCount: 6,
        nonCompliantCount: 0,
        waivedCount: 0,
        blockScorePercentage: 100.0,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Patrimonio neto positivo y ratios de liquidez auditados sin contingencias concursales.",
      },
      {
        id: "cae_sec_mad_b5",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 5,
        blockCode: "BLOCK_5_PRACTICAL_COMPETENCE",
        blockTitle:
          "Bloque 5: Competencia o Cualificación Profesional (Art. 39.d CAU)",
        totalQuestions: 8,
        compliantCount: 8,
        nonCompliantCount: 0,
        waivedCount: 0,
        blockScorePercentage: 100.0,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Personal con título oficial de Representante Aduanero y formación continua de 35 horas anuales.",
      },
      {
        id: "cae_sec_mad_b6",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 6,
        blockCode: "BLOCK_6_SECURITY_SAFETY_STANDARDS",
        blockTitle:
          "Bloque 6: Normas de Seguridad y Protección (Art. 39.e CAU)",
        totalQuestions: 15,
        compliantCount: 14,
        nonCompliantCount: 1,
        waivedCount: 0,
        blockScorePercentage: 93.3,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "CCTV perimetral con grabación 30 días, control de accesos biométrico y protocolo de 7 puntos.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.aeoSevenPointInspections)
    .values([
      {
        id: "7pt_bcn_2026_01",
        inspectionReference: "7PT-2026-BCN-01",
        equipmentType: "OCEAN_CONTAINER",
        equipmentIdentifier: "MSKU-782910-3",
        inspectorName: "Marc Vilanova (Oficial de Seguridad Muelle)",
        inspectionDate: "2026-08-25",
        facilityLocation: "Terminal BEST Muelle Prat BCN",
        p1FrontWallPassed: true,
        p2LeftSidePassed: true,
        p3RightSidePassed: true,
        p4FloorPassed: true,
        p5RoofCeilingPassed: true,
        p6DoorsLocksPassed: true,
        p7UndercarriagePassed: true,
        hasAgriculturalContamination: false,
        physicalTamperingDetected: false,
        overallPassed: true,
        inspectionResult: "PASSED_CLEAN",
        actionTaken:
          "Aprobado para carga de exportación con destino a Charleston USA.",
        remarks:
          "Estructura estanca y limpia sin olores ni restos de infestación de madera (WDO free).",
      },
      {
        id: "7pt_val_2026_02",
        inspectionReference: "7PT-2026-VAL-02",
        equipmentType: "ROAD_TRAILER",
        equipmentIdentifier: "TR-8921-HBG",
        inspectorName: "Vicente Soler",
        inspectionDate: "2026-08-26",
        facilityLocation: "Hub Logístico Valencia Riba-roja",
        p1FrontWallPassed: true,
        p2LeftSidePassed: true,
        p3RightSidePassed: true,
        p4FloorPassed: true,
        p5RoofCeilingPassed: true,
        p6DoorsLocksPassed: true,
        p7UndercarriagePassed: true,
        hasAgriculturalContamination: false,
        physicalTamperingDetected: false,
        overallPassed: true,
        inspectionResult: "PASSED_CLEAN",
        actionTaken: "Aprobado para precintado ISO 17712 y precinto TIR.",
        remarks:
          "Semirremolque frigorífico verificado en los 7 puntos de control.",
      },
      {
        id: "7pt_mad_2026_03",
        inspectionReference: "7PT-2026-MAD-03",
        equipmentType: "OCEAN_CONTAINER",
        equipmentIdentifier: "CMAU-491028-1",
        inspectorName: "Elena Sánchez",
        inspectionDate: "2026-08-27",
        facilityLocation: "Depósito Puerto Seco Coslada MAD",
        p1FrontWallPassed: true,
        p2LeftSidePassed: true,
        p3RightSidePassed: true,
        p4FloorPassed: false,
        p5RoofCeilingPassed: true,
        p6DoorsLocksPassed: true,
        p7UndercarriagePassed: false,
        hasAgriculturalContamination: true,
        physicalTamperingDetected: false,
        overallPassed: false,
        inspectionResult: "FAILED_REJECTED",
        actionTaken:
          "Rechazado para carga. Retirado a zona de limpieza y cuarentena.",
        remarks:
          "Presencia de tierra y restos orgánicos vegetales en el suelo de madera y tren de rodaje.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.aeoSecuritySeals)
    .values([
      {
        id: "seal_h_881901",
        sealNumber: "H-ES-2026-881901",
        sealType: "BOLT_SEAL_CLASS_H",
        iso17712Compliant: true,
        manufacturerName: "Mega Fortris Klicker",
        iso17712TestCertificateRef: "ISO17712-H-MF-2026-99",
        associatedEquipmentIdentifier: "MSKU-782910-3",
        associatedShipmentReference: "EXP-2026-BCN-USA-01",
        affixedDate: "2026-08-25 10:30:00",
        affixedBy: "Marc Vilanova",
        verifiedAtPortOfEntry: true,
        verifiedIntactDate: "2026-08-25 18:45:00",
        verifiedBy: "Aduana Marítima BCN",
        sealStatus: "AFFIXED_TRANSIT",
        tamperIncidentReport: null,
      },
      {
        id: "seal_h_881902",
        sealNumber: "H-ES-2026-881902",
        sealType: "CABLE_SEAL_CLASS_H",
        iso17712Compliant: true,
        manufacturerName: "TydenBrooks Flex-Cable",
        iso17712TestCertificateRef: "ISO17712-H-TB-2026-14",
        associatedEquipmentIdentifier: "TR-8921-HBG",
        associatedShipmentReference: "CMR-2026-VAL-FRA-08",
        affixedDate: "2026-08-26 14:00:00",
        affixedBy: "Vicente Soler",
        verifiedAtPortOfEntry: false,
        sealStatus: "AFFIXED_TRANSIT",
        tamperIncidentReport: null,
      },
      {
        id: "seal_h_881903",
        sealNumber: "H-ES-2026-881903",
        sealType: "BOLT_SEAL_CLASS_H",
        iso17712Compliant: true,
        manufacturerName: "Mega Fortris Klicker",
        associatedEquipmentIdentifier: "TCLU-190284-9",
        associatedShipmentReference: "IMP-2026-CN-VLC-99",
        affixedDate: "2026-08-10 09:00:00",
        affixedBy: "Ningbo Port Shipper",
        verifiedAtPortOfEntry: true,
        verifiedIntactDate: "2026-08-26 11:15:00",
        verifiedBy: "Guardia Civil Fiscal Valencia",
        sealStatus: "TAMPERED_BROKEN",
        tamperIncidentReport:
          "Alarma de rotura: Precinto sustituido por modelo no registrado. Apertura de inspección física en circuito rojo.",
      },
      {
        id: "seal_h_881904",
        sealNumber: "H-ES-2026-881904",
        sealType: "BOLT_SEAL_CLASS_H",
        iso17712Compliant: true,
        manufacturerName: "Mega Fortris Klicker",
        sealStatus: "IN_STOCK",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.aeoBusinessPartners)
    .values([
      {
        id: "partner_trans_iberia",
        partnerName: "Trans-Iberia Logistics Express SA",
        partnerVatNumber: "ESA28991204",
        partnerType: "HAULIER_CARRIER",
        countryCode: "ES",
        hasAeoCertification: true,
        aeoCertificateNumber: "ES AEOF 190000342",
        hasCtpatCertification: true,
        ctpatSviNumber: "SVI-99210-TI",
        iso28000Certified: true,
        securityQuestionnaireScore: 98.0,
        riskLevel: "LOW_RISK",
        lastAssessmentDate: "2026-01-15",
        reassessmentDueDate: "2027-01-15",
        status: "APPROVED_PARTNER",
        remarks:
          "Transportista homologado con flota GPS telemetrizada y conductores acreditados.",
      },
      {
        id: "partner_global_customs",
        partnerName: "Global Customs Brokerage SL",
        partnerVatNumber: "ESB61099238",
        partnerType: "CUSTOMS_BROKER",
        countryCode: "ES",
        hasAeoCertification: true,
        aeoCertificateNumber: "ES AEOC 210000881",
        hasCtpatCertification: false,
        iso28000Certified: true,
        securityQuestionnaireScore: 94.0,
        riskLevel: "LOW_RISK",
        lastAssessmentDate: "2026-03-10",
        reassessmentDueDate: "2027-03-10",
        status: "APPROVED_PARTNER",
        remarks:
          "Agencia de aduanas homologada para simplificaciones aduaneras.",
      },
      {
        id: "partner_med_warehousing",
        partnerName: "Mediterranean Bonded Warehousing SA",
        partnerVatNumber: "ESA46019284",
        partnerType: "WAREHOUSE_KEEPER",
        countryCode: "ES",
        hasAeoCertification: true,
        aeoCertificateNumber: "ES AEOF 220000109",
        hasCtpatCertification: false,
        iso28000Certified: true,
        securityQuestionnaireScore: 92.0,
        riskLevel: "LOW_RISK",
        lastAssessmentDate: "2026-04-20",
        reassessmentDueDate: "2027-04-20",
        status: "APPROVED_PARTNER",
        remarks:
          "Operador de depósito aduanero y ADT con control perimetral CCTV.",
      },
      {
        id: "partner_east_cargo",
        partnerName: "FastCargo Eastern Logistics SRO",
        partnerVatNumber: "CZ28910482",
        partnerType: "HAULIER_CARRIER",
        countryCode: "CZ",
        hasAeoCertification: false,
        aeoCertificateNumber: null,
        hasCtpatCertification: false,
        iso28000Certified: false,
        securityQuestionnaireScore: 72.0,
        riskLevel: "MEDIUM_RISK",
        lastAssessmentDate: "2026-07-05",
        reassessmentDueDate: "2026-10-05",
        status: "PROVISIONAL",
        remarks:
          "Transportista subcontractado en periodo provisional. Requiere doble precintado e inspección reforzada.",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Auditorías OEA, Cuestionario CAE, Inspecciones 7 Puntos, Precintos ISO 17712 y Socios Comerciales.",
  );
}

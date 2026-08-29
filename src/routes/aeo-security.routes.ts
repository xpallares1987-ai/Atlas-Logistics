import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { PDFService } from "../services/pdf.service.js";
import { AeoCaeScoringService } from "../services/aeo-security/aeo-cae-scoring.service.js";
import { SevenPointInspectionService } from "../services/aeo-security/seven-point-inspection.service.js";
import { Iso17712SealService } from "../services/aeo-security/iso-17712-seal.service.js";
import { PartnerSecurityRiskService } from "../services/aeo-security/partner-security-risk.service.js";
import crypto from "node:crypto";

export const aeoSecurityRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List AEO Audits
  fastify.get("/audits", async (request, reply) => {
    try {
      const audits = await db
        .select()
        .from(schema.aeoAudits)
        .orderBy(desc(schema.aeoAudits.auditDate));
      return reply.send({ success: true, data: audits });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 2. Get Single Audit Detail with CAE Sections
  fastify.get("/audits/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [audit] = await db
        .select()
        .from(schema.aeoAudits)
        .where(eq(schema.aeoAudits.id, id));

      if (!audit) {
        return reply
          .status(404)
          .send({ success: false, error: "Auditoría no encontrada" });
      }

      const sections = await db
        .select()
        .from(schema.aeoCaeQuestionnaireSections)
        .where(eq(schema.aeoCaeQuestionnaireSections.auditId, id));

      return reply.send({ success: true, data: { ...audit, sections } });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Create & Score an AEO Audit
  fastify.post("/audits", async (request, reply) => {
    try {
      const body = request.body as any;
      const auditId = `audit_${crypto.randomUUID().slice(0, 8)}`;
      const ref =
        body.auditReference ||
        `OEA-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      const scoringResult = AeoCaeScoringService.calculateOverallScore(
        body.aeoModality || "OEAF_FULL_COMBINED",
        body.sections || [],
      );

      await db.insert(schema.aeoAudits).values({
        id: auditId,
        auditReference: ref,
        aeoModality: body.aeoModality || "OEAF_FULL_COMBINED",
        targetStandard: body.targetStandard || "EU_UCC_AEO",
        leadAuditorName: body.leadAuditorName || "Auditor Acreditado OEA",
        auditDate: body.auditDate || new Date().toISOString().split("T")[0],
        nextReviewDate:
          body.nextReviewDate ||
          new Date(Date.now() + 86400000 * 365 * 3).toISOString().split("T")[0],
        overallReadinessScore: scoringResult.overallScorePercentage,
        complianceStatus: scoringResult.recommendedStatus,
        notes:
          body.notes ||
          `Evaluación de madurez completada con score ${scoringResult.overallScorePercentage}%.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const [newAudit] = await db
        .select()
        .from(schema.aeoAudits)
        .where(eq(schema.aeoAudits.id, auditId));

      if (body.sections && Array.isArray(body.sections)) {
        for (const sec of scoringResult.blockScores) {
          await db.insert(schema.aeoCaeQuestionnaireSections).values({
            id: `cae_sec_${crypto.randomUUID().slice(0, 8)}`,
            auditId,
            blockNumber: sec.blockNumber,
            blockCode: sec.blockCode as any,
            blockTitle: sec.blockTitle,
            totalQuestions: sec.totalQuestions,
            compliantCount: sec.compliantCount,
            nonCompliantCount: sec.nonCompliantCount,
            waivedCount: sec.waivedCount,
            blockScorePercentage: sec.scorePercentage,
            blockStatus: sec.status,
            findingsSummary: sec.recommendation,
          });
        }
      }

      return reply.status(201).send({
        success: true,
        data: newAudit,
        scoring: scoringResult,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 4. List 7-Point Inspections
  fastify.get("/inspections", async (request, reply) => {
    try {
      const inspections = await db
        .select()
        .from(schema.aeoSevenPointInspections)
        .orderBy(desc(schema.aeoSevenPointInspections.inspectionDate));
      return reply.send({ success: true, data: inspections });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 5. Create & Evaluate 7-Point Physical Inspection
  fastify.post("/inspections", async (request, reply) => {
    try {
      const body = request.body as any;
      const ref =
        body.inspectionReference ||
        `7PT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
      const inspId = `7pt_${crypto.randomUUID().slice(0, 8)}`;

      const evaluation = SevenPointInspectionService.evaluateInspection({
        inspectionReference: ref,
        equipmentType: body.equipmentType || "OCEAN_CONTAINER",
        equipmentIdentifier: body.equipmentIdentifier,
        inspectorName: body.inspectorName || "Inspector de Muelle",
        facilityLocation: body.facilityLocation || "Terminal Portuaria",
        p1FrontWallPassed: body.p1FrontWallPassed !== false,
        p2LeftSidePassed: body.p2LeftSidePassed !== false,
        p3RightSidePassed: body.p3RightSidePassed !== false,
        p4FloorPassed: body.p4FloorPassed !== false,
        p5RoofCeilingPassed: body.p5RoofCeilingPassed !== false,
        p6DoorsLocksPassed: body.p6DoorsLocksPassed !== false,
        p7UndercarriagePassed: body.p7UndercarriagePassed !== false,
        hasAgriculturalContamination: Boolean(
          body.hasAgriculturalContamination,
        ),
        physicalTamperingDetected: Boolean(body.physicalTamperingDetected),
      });

      await db.insert(schema.aeoSevenPointInspections).values({
        id: inspId,
        inspectionReference: ref,
        equipmentType: body.equipmentType || "OCEAN_CONTAINER",
        equipmentIdentifier: body.equipmentIdentifier,
        inspectorName: body.inspectorName || "Inspector de Muelle",
        inspectionDate:
          body.inspectionDate || new Date().toISOString().split("T")[0],
        facilityLocation: body.facilityLocation || "Terminal Portuaria",
        p1FrontWallPassed: body.p1FrontWallPassed !== false,
        p2LeftSidePassed: body.p2LeftSidePassed !== false,
        p3RightSidePassed: body.p3RightSidePassed !== false,
        p4FloorPassed: body.p4FloorPassed !== false,
        p5RoofCeilingPassed: body.p5RoofCeilingPassed !== false,
        p6DoorsLocksPassed: body.p6DoorsLocksPassed !== false,
        p7UndercarriagePassed: body.p7UndercarriagePassed !== false,
        hasAgriculturalContamination: Boolean(
          body.hasAgriculturalContamination,
        ),
        physicalTamperingDetected: Boolean(body.physicalTamperingDetected),
        overallPassed: evaluation.overallPassed,
        inspectionResult: evaluation.inspectionResult,
        actionTaken: evaluation.actionRequired,
        remarks: body.remarks || null,
      });

      const [inspection] = await db
        .select()
        .from(schema.aeoSevenPointInspections)
        .where(eq(schema.aeoSevenPointInspections.id, inspId));

      return reply.status(201).send({
        success: true,
        data: inspection,
        evaluation,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 6. List ISO 17712 Security Seals
  fastify.get("/seals", async (request, reply) => {
    try {
      const seals = await db
        .select()
        .from(schema.aeoSecuritySeals)
        .orderBy(desc(schema.aeoSecuritySeals.createdAt));
      return reply.send({ success: true, data: seals });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 7. Register / Validate ISO 17712 Security Seal
  fastify.post("/seals", async (request, reply) => {
    try {
      const body = request.body as any;
      const sealId = `seal_${crypto.randomUUID().slice(0, 8)}`;
      const validation = Iso17712SealService.validateSeal({
        sealNumber: body.sealNumber,
        sealType: body.sealType || "BOLT_SEAL_CLASS_H",
        iso17712Compliant: body.iso17712Compliant !== false,
        associatedEquipmentIdentifier: body.associatedEquipmentIdentifier,
        associatedShipmentReference: body.associatedShipmentReference,
        affixedDate: body.affixedDate,
        verifiedAtPortOfEntry: Boolean(body.verifiedAtPortOfEntry),
        tamperIncidentReport: body.tamperIncidentReport,
      });

      await db.insert(schema.aeoSecuritySeals).values({
        id: sealId,
        sealNumber: body.sealNumber,
        sealType: body.sealType || "BOLT_SEAL_CLASS_H",
        iso17712Compliant: body.iso17712Compliant !== false,
        manufacturerName: body.manufacturerName || "Mega Fortris Klicker",
        iso17712TestCertificateRef:
          body.iso17712TestCertificateRef || "CERT-ISO17712-H",
        associatedEquipmentIdentifier:
          body.associatedEquipmentIdentifier || null,
        associatedShipmentReference: body.associatedShipmentReference || null,
        affixedDate: body.affixedDate || null,
        affixedBy: body.affixedBy || null,
        verifiedAtPortOfEntry: Boolean(body.verifiedAtPortOfEntry),
        verifiedIntactDate: body.verifiedIntactDate || null,
        verifiedBy: body.verifiedBy || null,
        sealStatus: validation.status,
        tamperIncidentReport: body.tamperIncidentReport || null,
      });

      const [seal] = await db
        .select()
        .from(schema.aeoSecuritySeals)
        .where(eq(schema.aeoSecuritySeals.id, sealId));

      return reply.status(201).send({
        success: true,
        data: seal,
        validation,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 8. List Business Partners
  fastify.get("/partners", async (request, reply) => {
    try {
      const partners = await db
        .select()
        .from(schema.aeoBusinessPartners)
        .orderBy(desc(schema.aeoBusinessPartners.securityQuestionnaireScore));
      return reply.send({ success: true, data: partners });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 9. Screen Business Partner Security Risk
  fastify.post("/partners/screen", async (request, reply) => {
    try {
      const body = request.body as any;
      const assessment = PartnerSecurityRiskService.assessPartnerRisk({
        partnerName: body.partnerName,
        partnerType: body.partnerType || "HAULIER_CARRIER",
        hasAeoCertification: Boolean(body.hasAeoCertification),
        hasCtpatCertification: Boolean(body.hasCtpatCertification),
        iso28000Certified: Boolean(body.iso28000Certified),
        securityQuestionnaireScore: Number(
          body.securityQuestionnaireScore || 80,
        ),
        monthsSinceLastAssessment: Number(body.monthsSinceLastAssessment || 3),
      });

      return reply.send({ success: true, data: assessment });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 10. PDF Streaming Routes
  fastify.get("/audits/:id/cae-report-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [audit] = await db
        .select()
        .from(schema.aeoAudits)
        .where(eq(schema.aeoAudits.id, id));

      if (!audit) {
        return reply
          .status(404)
          .send({ success: false, error: "Auditoría no encontrada" });
      }

      const sections = await db
        .select()
        .from(schema.aeoCaeQuestionnaireSections)
        .where(eq(schema.aeoCaeQuestionnaireSections.auditId, id));

      const pdfBuffer = await PDFService.generateAeoCaeAuditReportPdf({
        audit,
        sections,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `inline; filename="AEO_CAE_Report_${audit.auditReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  fastify.get("/inspections/:id/seven-point-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [inspection] = await db
        .select()
        .from(schema.aeoSevenPointInspections)
        .where(eq(schema.aeoSevenPointInspections.id, id));

      if (!inspection) {
        return reply
          .status(404)
          .send({ success: false, error: "Inspección no encontrada" });
      }

      const pdfBuffer =
        await PDFService.generateSevenPointInspectionCertificatePdf({
          inspection,
        });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `inline; filename="7Point_Inspection_${inspection.inspectionReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  fastify.get("/seals/:id/custody-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [seal] = await db
        .select()
        .from(schema.aeoSecuritySeals)
        .where(eq(schema.aeoSecuritySeals.id, id));

      if (!seal) {
        return reply
          .status(404)
          .send({ success: false, error: "Precinto no encontrado" });
      }

      const pdfBuffer =
        await PDFService.generateIso17712SealCustodyCertificatePdf({
          seal,
        });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `inline; filename="ISO17712_Seal_${seal.sealNumber}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  fastify.get("/partners/risk-matrix-pdf", async (request, reply) => {
    try {
      const partners = await db.select().from(schema.aeoBusinessPartners);
      const pdfBuffer = await PDFService.generateBusinessPartnerRiskMatrixPdf({
        partners,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `inline; filename="AEO_ISO28000_Partners_Risk_Matrix.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
};

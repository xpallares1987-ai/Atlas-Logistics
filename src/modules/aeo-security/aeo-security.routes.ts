/**
 * @file aeo-security.routes.ts
 * @description Fastify routes for EU UCC Authorized Economic Operator (AEO / OEA) CAE self-assessment audits, CTPAT/ISO 28000 7-Point container inspections, ISO 17712 high-security seals, partner risk screening, and PDF certificates.
 * @module @atlas/api/modules/aeo-security/routes
 */

import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { PDFService } from "../../services/pdf.service.js";
import { AeoCaeScoringService } from "./aeo-cae-scoring.service.js";
import { SevenPointInspectionService } from "./seven-point-inspection.service.js";
import { Iso17712SealService } from "./iso-17712-seal.service.js";
import { PartnerSecurityRiskService } from "./partner-security-risk.service.js";
import crypto from "node:crypto";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. DOMAIN PAYLOAD INTERFACES
// ============================================================================

type AeoAuditInsert = typeof schema.aeoAudits.$inferInsert;
type AeoCaeSectionInsert =
  typeof schema.aeoCaeQuestionnaireSections.$inferInsert;
type SevenPointInspectionInsert =
  typeof schema.aeoSevenPointInspections.$inferInsert;
type SecuritySealInsert = typeof schema.aeoSecuritySeals.$inferInsert;

type AeoModalityParam = Parameters<
  typeof AeoCaeScoringService.calculateOverallScore
>[0];
type AeoSectionsParam = Parameters<
  typeof AeoCaeScoringService.calculateOverallScore
>[1];
type EvaluateInspectionInput = Parameters<
  typeof SevenPointInspectionService.evaluateInspection
>[0];
type ValidateSealInput = Parameters<typeof Iso17712SealService.validateSeal>[0];
type AssessPartnerRiskInput = Parameters<
  typeof PartnerSecurityRiskService.assessPartnerRisk
>[0];

interface CreateAeoAuditBody extends Partial<AeoAuditInsert> {
  aeoModality?: AeoModalityParam;
  sections?: AeoSectionsParam;
}

type CreateSevenPointInspectionBody = Partial<SevenPointInspectionInsert> &
  Partial<EvaluateInspectionInput>;

type CreateSecuritySealBody = Partial<SecuritySealInsert> &
  Partial<ValidateSealInput>;

type ScreenPartnerRiskBody = Partial<AssessPartnerRiskInput>;

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

export const aeoSecurityRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List AEO Audits
  fastify.get(
    "/audits",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "List EU UCC AEO / OEA maturity audits",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const audits = await db
          .select()
          .from(schema.aeoAudits)
          .orderBy(desc(schema.aeoAudits.auditDate));
        return reply.send({ success: true, data: audits });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 2. Get Single Audit Detail with CAE Sections
  fastify.get(
    "/audits/:id",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "Retrieve AEO audit detail with CAE questionnaire blocks",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 3. Create & Score an AEO Audit
  fastify.post(
    "/audits",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "Create and score an AEO CAE self-assessment audit",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as CreateAeoAuditBody | undefined) || {};
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
            new Date(Date.now() + 86400000 * 365 * 3)
              .toISOString()
              .split("T")[0],
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
              blockCode: sec.blockCode as AeoCaeSectionInsert["blockCode"],
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 4. List 7-Point Inspections
  fastify.get(
    "/inspections",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary:
          "List 7-Point container and trailer physical security inspections",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const inspections = await db
          .select()
          .from(schema.aeoSevenPointInspections)
          .orderBy(desc(schema.aeoSevenPointInspections.inspectionDate));
        return reply.send({ success: true, data: inspections });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 5. Create & Evaluate 7-Point Physical Inspection
  fastify.post(
    "/inspections",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary:
          "Record and evaluate a 7-Point physical container security inspection",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body =
          (request.body as CreateSevenPointInspectionBody | undefined) || {};
        const ref =
          body.inspectionReference ||
          `7PT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
        const inspId = `7pt_${crypto.randomUUID().slice(0, 8)}`;
        const equipId = body.equipmentIdentifier || "MSKU-000000-0";

        const evaluation = SevenPointInspectionService.evaluateInspection({
          inspectionReference: ref,
          equipmentType: body.equipmentType || "OCEAN_CONTAINER",
          equipmentIdentifier: equipId,
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
          equipmentIdentifier: equipId,
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 6. List ISO 17712 Security Seals
  fastify.get(
    "/seals",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "List ISO 17712 high-security container seals",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const seals = await db
          .select()
          .from(schema.aeoSecuritySeals)
          .orderBy(desc(schema.aeoSecuritySeals.createdAt));
        return reply.send({ success: true, data: seals });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 7. Register / Validate ISO 17712 Security Seal
  fastify.post(
    "/seals",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "Register and validate an ISO 17712 high-security seal",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as CreateSecuritySealBody | undefined) || {};
        const sealId = `seal_${crypto.randomUUID().slice(0, 8)}`;
        const sealNum =
          body.sealNumber ||
          `SEAL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
        const validation = Iso17712SealService.validateSeal({
          sealNumber: sealNum,
          sealType: body.sealType || "BOLT_SEAL_CLASS_H",
          iso17712Compliant: body.iso17712Compliant !== false,
          associatedEquipmentIdentifier:
            body.associatedEquipmentIdentifier ?? undefined,
          associatedShipmentReference:
            body.associatedShipmentReference ?? undefined,
          affixedDate: body.affixedDate ?? undefined,
          verifiedAtPortOfEntry: Boolean(body.verifiedAtPortOfEntry),
          tamperIncidentReport: body.tamperIncidentReport ?? undefined,
        });

        await db.insert(schema.aeoSecuritySeals).values({
          id: sealId,
          sealNumber: sealNum,
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 8. List Business Partners
  fastify.get(
    "/partners",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "List business partners and supply-chain security scores",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const partners = await db
          .select()
          .from(schema.aeoBusinessPartners)
          .orderBy(desc(schema.aeoBusinessPartners.securityQuestionnaireScore));
        return reply.send({ success: true, data: partners });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 9. Screen Business Partner Security Risk
  fastify.post(
    "/partners/screen",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "Screen business partner supply-chain security risk profile",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as ScreenPartnerRiskBody | undefined) || {};
        const assessment = PartnerSecurityRiskService.assessPartnerRisk({
          partnerName: body.partnerName || "Partner Entity",
          partnerType: body.partnerType || "HAULIER_CARRIER",
          hasAeoCertification: Boolean(body.hasAeoCertification),
          hasCtpatCertification: Boolean(body.hasCtpatCertification),
          iso28000Certified: Boolean(body.iso28000Certified),
          securityQuestionnaireScore: Number(
            body.securityQuestionnaireScore || 80,
          ),
          monthsSinceLastAssessment: Number(
            body.monthsSinceLastAssessment || 3,
          ),
        });

        return reply.send({ success: true, data: assessment });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 10. PDF Streaming: AEO CAE Audit Report PDF
  fastify.get(
    "/audits/:id/cae-report-pdf",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "Download AEO CAE Self-Assessment Audit Report PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 11. PDF Streaming: 7-Point Inspection Certificate PDF
  fastify.get(
    "/inspections/:id/seven-point-pdf",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary:
          "Download 7-Point Physical Container Inspection Certificate PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 12. PDF Streaming: ISO 17712 Seal Custody Certificate PDF
  fastify.get(
    "/seals/:id/custody-pdf",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "Download ISO 17712 Seal Chain-of-Custody Certificate PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 13. PDF Streaming: Business Partner Risk Matrix PDF
  fastify.get(
    "/partners/risk-matrix-pdf",
    {
      schema: {
        tags: ["AEO & Supply Chain Security"],
        summary: "Download Business Partner Security Risk Matrix PDF",
        response: {
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const partners = await db.select().from(schema.aeoBusinessPartners);
        const pdfBuffer = await PDFService.generateBusinessPartnerRiskMatrixPdf(
          {
            partners,
          },
        );

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `inline; filename="AEO_ISO28000_Partners_Risk_Matrix.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );
};

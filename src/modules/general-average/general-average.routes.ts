/**
 * @file general-average.routes.ts
 * @description Fastify routes for General Average (York-Antwerp Rules 2016), LOF 2024 SCOPIC salvage declarations, sacrifices & allowances, contributory values, Lloyd's Average Bonds (LAB 77), Underwriter's Average Guarantees, and PDF statements.
 * @module @atlas/api/modules/general-average/routes
 */

import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { GeneralAverageAllowanceService } from "./ga-allowance.service.js";
import { ContributoryValueService } from "./contributory-value.service.js";
import { GeneralAverageAdjustmentService } from "./ga-adjustment.service.js";
import { PDFService } from "../../services/pdf.service.js";
import crypto from "crypto";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. DOMAIN PAYLOAD INTERFACES
// ============================================================================

type GaCaseInsert = typeof schema.gaCases.$inferInsert;
type GaAllowanceInsert = typeof schema.gaAllowances.$inferInsert;
type GaContributoryInterestInsert =
  typeof schema.gaContributoryInterests.$inferInsert;
type GaSecurityInsert = typeof schema.gaSecurities.$inferInsert;
type CalculateAllowancesInput = Parameters<
  typeof GeneralAverageAllowanceService.calculateAllowances
>[0];
type AssessContributoryValuesInput = Parameters<
  typeof ContributoryValueService.assessContributoryValues
>[0];

type CreateGaCaseBody = Partial<GaCaseInsert>;
type CreateGaAllowanceBody = Partial<GaAllowanceInsert>;
type CreateGaContributoryInterestBody = Partial<GaContributoryInterestInsert>;
type CreateGaSecurityBody = Partial<GaSecurityInsert>;

interface CalculateGaAdjustmentBody {
  casualtyDate?: string;
  adjustmentDate?: string;
  cmiAnnualInterestRatePercentage?: number;
  allowanceItems?: CalculateAllowancesInput["items"];
  contributoryInterests?: AssessContributoryValuesInput;
  caseReference?: string;
  vesselName?: string;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

export const generalAverageRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List General Average Cases
  fastify.get(
    "/cases",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary: "List all General Average and maritime salvage cases",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const cases = await db
          .select()
          .from(schema.gaCases)
          .orderBy(desc(schema.gaCases.createdAt));
        return reply.send({ success: true, data: cases });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 2. Get Case Details with Allowances, Contributory Interests, Securities and Adjustments
  fastify.get(
    "/cases/:id",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary:
          "Retrieve General Average case detail with allowances, contributory interests, securities, and adjustments",
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
        const [gaCase] = await db
          .select()
          .from(schema.gaCases)
          .where(eq(schema.gaCases.id, id));

        if (!gaCase) {
          return reply
            .status(404)
            .send({ success: false, error: "General Average Case not found" });
        }

        const allowances = await db
          .select()
          .from(schema.gaAllowances)
          .where(eq(schema.gaAllowances.gaCaseId, id));

        const contributoryInterests = await db
          .select()
          .from(schema.gaContributoryInterests)
          .where(eq(schema.gaContributoryInterests.gaCaseId, id));

        const securities = await db
          .select()
          .from(schema.gaSecurities)
          .where(eq(schema.gaSecurities.gaCaseId, id));

        const adjustments = await db
          .select()
          .from(schema.gaAdjustments)
          .where(eq(schema.gaAdjustments.gaCaseId, id));

        return reply.send({
          success: true,
          data: {
            ...gaCase,
            allowances,
            contributoryInterests,
            securities,
            adjustments,
          },
        });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 3. Create General Average Case
  fastify.post(
    "/cases",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary: "Declare a new General Average maritime casualty case",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as CreateGaCaseBody | undefined) || {};
        const caseId = `ga_${crypto.randomUUID().slice(0, 8)}`;
        const ref =
          body.caseReference ||
          `GA-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

        await db.insert(schema.gaCases).values({
          id: caseId,
          caseReference: ref,
          vesselName: body.vesselName || "MV Valencia Bridge",
          imoNumber: body.imoNumber || "9751024",
          flagState: body.flagState || "Liberia",
          builtYear: body.builtYear || 2020,
          grossTonnage: body.grossTonnage || 68000,
          summerDwtMt: body.summerDwtMt || 75000.0,
          shipownerName:
            body.shipownerName || "Mediterranean Shipping Carriers SA",
          disponentOwnerOrCharterer: body.disponentOwnerOrCharterer || null,
          masterName: body.masterName || "Capt. Rodrigo Alarcón",
          casualtyType: body.casualtyType || "FIRE_EXPLOSION",
          casualtyDate:
            body.casualtyDate || new Date().toISOString().substring(0, 10),
          casualtyLocation:
            body.casualtyLocation || "Golfo de León (42° 15' N, 004° 20' E)",
          voyageOrigin: body.voyageOrigin || "Puerto de Valencia (ESVLC)",
          voyageDestination:
            body.voyageDestination || "Puerto de Génova (ITGOA)",
          portOfRefuge: body.portOfRefuge || "Puerto de Marsella (FRMRS)",
          dateArrivalPortOfRefuge: body.dateArrivalPortOfRefuge || null,
          dateDeparturePortOfRefuge: body.dateDeparturePortOfRefuge || null,
          governingRules: body.governingRules || "YAR_2016",
          salvageContractType: body.salvageContractType || "LOF_2024_SCOPIC",
          salvorName: body.salvorName || "Smit Salvage BV",
          averageAdjusterFirm:
            body.averageAdjusterFirm || "Richards Hogg Lindley (RHL)",
          leadAdjusterName:
            body.leadAdjusterName || "Senior Adjuster David Sterling",
          estimatedLossUsd: body.estimatedLossUsd ?? 1845000.0,
          estimatedContributionPercentage:
            body.estimatedContributionPercentage ?? 7.5,
          declarationNarrative:
            body.declarationNarrative ||
            "Declaración formal de avería gruesa emitida por el Capitán tras siniestro extraordinario.",
          currencyCode: body.currencyCode || "USD",
          status: body.status || "DECLARED_ACTIVE",
        });

        const [newCase] = await db
          .select()
          .from(schema.gaCases)
          .where(eq(schema.gaCases.id, caseId));

        return reply.status(201).send({ success: true, data: newCase });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 4. Add Sacrifice or Allowance to Case
  fastify.post(
    "/cases/:id/allowances",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary:
          "Record a York-Antwerp Rules sacrifice or extraordinary expenditure allowance",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = (request.body as CreateGaAllowanceBody | undefined) || {};
        const allowanceId = `ga_all_${crypto.randomUUID().slice(0, 8)}`;

        await db.insert(schema.gaAllowances).values({
          id: allowanceId,
          gaCaseId: id,
          allowanceCategory: body.allowanceCategory || "SHIP_SACRIFICE",
          yarRuleReference:
            body.yarRuleReference || "RULE_VII_MACHINERY_DAMAGE",
          description: body.description || "Sacrificio de avería gruesa",
          creditedPartyType: body.creditedPartyType || "SHIPOWNER",
          creditedPartyName:
            body.creditedPartyName || "Mediterranean Shipping Carriers SA",
          originalCurrencyAmount: body.amountUsd || 100000,
          originalCurrency: "USD",
          exchangeRateToUsd: 1.0,
          amountUsd: body.amountUsd || 100000,
          isAdmissible: body.isAdmissible !== false,
          remarks: body.remarks || null,
        });

        const [newAllowance] = await db
          .select()
          .from(schema.gaAllowances)
          .where(eq(schema.gaAllowances.id, allowanceId));

        return reply.status(201).send({ success: true, data: newAllowance });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 5. Add Contributory Interest to Case
  fastify.post(
    "/cases/:id/contributory-interests",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary:
          "Register a ship, cargo, freight, or container contributory interest",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body =
          (request.body as CreateGaContributoryInterestBody | undefined) || {};
        const interestId = `ga_ci_${crypto.randomUUID().slice(0, 8)}`;

        const soundVal = body.soundValueDestinationUsd || 1000000;
        const partDmg = body.particularDamageDeductionUsd || 0;
        const madeGood = body.madeGoodAllowanceUsd || 0;
        const cv = Math.max(0, soundVal - partDmg + madeGood);

        await db.insert(schema.gaContributoryInterests).values({
          id: interestId,
          gaCaseId: id,
          interestCategory: body.interestCategory || "CARGO",
          blReference: body.blReference || null,
          containerNumber: body.containerNumber || null,
          ownerOrReceiverName: body.ownerOrReceiverName || "Consignee Name",
          cargoDescription: body.cargoDescription || "General Cargo",
          weightOrTeu: body.weightOrTeu || null,
          soundValueDestinationUsd: soundVal,
          particularDamageDeductionUsd: partDmg,
          madeGoodAllowanceUsd: madeGood,
          contributoryValueUsd: cv,
          calculatedContributionUsd: 0,
          netFinancialBalanceUsd: 0,
          balanceType: "PAYABLE_DEBTOR",
          hasSecurityProvided: Boolean(body.hasSecurityProvided),
          cargoReleaseAuthorized: Boolean(body.cargoReleaseAuthorized),
        });

        const [newInterest] = await db
          .select()
          .from(schema.gaContributoryInterests)
          .where(eq(schema.gaContributoryInterests.id, interestId));

        return reply.status(201).send({ success: true, data: newInterest });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 6. Register / Validate Security & Authorize Cargo Release
  fastify.post(
    "/cases/:id/securities",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary:
          "Register Lloyd's Average Bond, Underwriter's Guarantee, or Cash Deposit and authorize cargo release",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = (request.body as CreateGaSecurityBody | undefined) || {};
        const secId = `ga_sec_${crypto.randomUUID().slice(0, 8)}`;
        const ref =
          body.securityReference ||
          `SEC-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

        await db.insert(schema.gaSecurities).values({
          id: secId,
          gaCaseId: id,
          contributoryInterestId:
            body.contributoryInterestId || "ga_ci_default",
          securityReference: ref,
          securityType: body.securityType || "AVERAGE_BOND_AND_GUARANTEE",
          cargoConsigneeName: body.cargoConsigneeName || "Consignee Name",
          cargoConsigneeVat: body.cargoConsigneeVat || null,
          insurerName: body.insurerName || "Marine Insurance Co",
          insurerPolicyNumber: body.insurerPolicyNumber || "POL-2026",
          insurerContactEmail: body.insurerContactEmail || "claims@insurer.com",
          securityAmountUsd: body.securityAmountUsd || 100000,
          depositBankName: body.depositBankName || "Joint Trust Account",
          depositBankAccountNumber: body.depositBankAccountNumber || null,
          cashDepositReceiptNumber: body.cashDepositReceiptNumber || null,
          averageBondSigned: Boolean(body.averageBondSigned),
          averageBondSignDate:
            body.averageBondSignDate ||
            new Date().toISOString().substring(0, 10),
          averageGuaranteeSigned: Boolean(body.averageGuaranteeSigned),
          averageGuaranteeSignDate:
            body.averageGuaranteeSignDate ||
            new Date().toISOString().substring(0, 10),
          cargoReleaseAuthorized: Boolean(body.cargoReleaseAuthorized),
          releaseAuthorizedBy: body.releaseAuthorizedBy || "Average Adjuster",
          releaseTimestamp: body.cargoReleaseAuthorized
            ? new Date().toISOString()
            : null,
          status: body.cargoReleaseAuthorized
            ? "CARGO_RELEASED"
            : "SECURITY_VALIDATED",
          remarks: body.remarks || null,
        });

        if (body.contributoryInterestId) {
          await db
            .update(schema.gaContributoryInterests)
            .set({
              hasSecurityProvided: true,
              cargoReleaseAuthorized: Boolean(body.cargoReleaseAuthorized),
            })
            .where(
              eq(
                schema.gaContributoryInterests.id,
                body.contributoryInterestId,
              ),
            );
        }

        const [newSec] = await db
          .select()
          .from(schema.gaSecurities)
          .where(eq(schema.gaSecurities.id, secId));

        return reply.status(201).send({ success: true, data: newSec });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 7. Calculate Full General Average Adjustment
  fastify.post(
    "/calculate-adjustment",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary:
          "Calculate York-Antwerp Rules 2016 pro-rata contribution rate and Rule XXI CMI interest",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body =
          (request.body as CalculateGaAdjustmentBody | undefined) || {};

        const allowanceSummary =
          GeneralAverageAllowanceService.calculateAllowances({
            casualtyDate: body.casualtyDate || "2026-08-10",
            adjustmentDate: body.adjustmentDate,
            cmiAnnualInterestRatePercentage:
              body.cmiAnnualInterestRatePercentage ?? 6.0,
            items: body.allowanceItems || [],
          });

        const contributorySummary =
          ContributoryValueService.assessContributoryValues(
            body.contributoryInterests || [],
          );

        const adjustmentResult =
          GeneralAverageAdjustmentService.calculateAdjustment({
            allowanceSummary,
            contributorySummary,
            caseReference: body.caseReference,
            vesselName: body.vesselName,
          });

        return reply.send({
          success: true,
          allowanceSummary,
          contributorySummary,
          adjustmentResult,
        });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 8. PDF Streaming: Master's General Average Declaration PDF
  fastify.get(
    "/cases/:id/declaration-pdf",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary: "Download Master's General Average Declaration PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const [gaCase] = await db
          .select()
          .from(schema.gaCases)
          .where(eq(schema.gaCases.id, id));

        if (!gaCase) {
          return reply
            .status(404)
            .send({ success: false, error: "Case not found" });
        }

        const pdfBuffer =
          await PDFService.generateMasterGeneralAverageDeclarationPdf(gaCase);
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="GA_Declaration_${gaCase.caseReference}.pdf"`,
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

  // 9. PDF Streaming: Lloyd's Average Bond PDF (LAB 77)
  fastify.get(
    "/securities/:id/bond-pdf",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary: "Download Lloyd's Average Bond (LAB 77) PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const [sec] = await db
          .select()
          .from(schema.gaSecurities)
          .where(eq(schema.gaSecurities.id, id));

        if (!sec) {
          return reply
            .status(404)
            .send({ success: false, error: "Security not found" });
        }

        const [gaCase] = await db
          .select()
          .from(schema.gaCases)
          .where(eq(schema.gaCases.id, sec.gaCaseId));

        const pdfBuffer = await PDFService.generateLloydsAverageBondPdf(
          sec,
          gaCase,
        );
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="Average_Bond_${sec.securityReference}.pdf"`,
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

  // 10. PDF Streaming: Underwriter's Average Guarantee PDF
  fastify.get(
    "/securities/:id/guarantee-pdf",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary: "Download Underwriter's Average Guarantee PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const [sec] = await db
          .select()
          .from(schema.gaSecurities)
          .where(eq(schema.gaSecurities.id, id));

        if (!sec) {
          return reply
            .status(404)
            .send({ success: false, error: "Security not found" });
        }

        const [gaCase] = await db
          .select()
          .from(schema.gaCases)
          .where(eq(schema.gaCases.id, sec.gaCaseId));

        const pdfBuffer =
          await PDFService.generateUnderwritersAverageGuaranteePdf(sec, gaCase);
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="Average_Guarantee_${sec.securityReference}.pdf"`,
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

  // 11. PDF Streaming: General Average Adjustment Statement PDF
  fastify.get(
    "/cases/:id/adjustment-statement-pdf",
    {
      schema: {
        tags: ["General Average (YAR 2016)"],
        summary: "Download General Average Adjustment Statement PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const [gaCase] = await db
          .select()
          .from(schema.gaCases)
          .where(eq(schema.gaCases.id, id));

        if (!gaCase) {
          return reply
            .status(404)
            .send({ success: false, error: "Case not found" });
        }

        const [adjustment] = await db
          .select()
          .from(schema.gaAdjustments)
          .where(eq(schema.gaAdjustments.gaCaseId, id));

        const interests = await db
          .select()
          .from(schema.gaContributoryInterests)
          .where(eq(schema.gaContributoryInterests.gaCaseId, id));

        const pdfBuffer =
          await PDFService.generateGeneralAverageAdjustmentStatementPdf(
            adjustment || {
              adjustmentReference: `ADJ-${gaCase.caseReference}`,
              totalAllowancesUsd: 1845000,
              totalContributoryValueUsd: 24600000,
              finalRateOfContributionPercentage: 7.5,
              totalCmiInterestUsd: 24000,
              cmiInterestRatePercentage: 6.0,
            },
            gaCase,
            interests,
          );

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="GA_Adjustment_${gaCase.caseReference}.pdf"`,
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

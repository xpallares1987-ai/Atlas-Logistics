/**
 * @file claims.routes.ts
 * @description Fastify routes for Cargo Loss & Damage Claims, statutory SDR carrier liability limitation calculations (Hague-Visby, Montreal, CMR, CIM), formal Carrier Protest Letters, and Subrogation Receipts PDF generation.
 * @module @atlas/api/modules/claims/routes
 */

import { FastifyPluginAsync } from "fastify";
import { CarrierLiabilityService } from "./carrier-liability.service.js";
import { CargoClaimService } from "./cargo-claim.service.js";
import { PDFService } from "../../services/pdf.service.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. DOMAIN PAYLOAD & QUERY INTERFACES
// ============================================================================

type ListClaimsFilter = NonNullable<
  Parameters<typeof CargoClaimService.listClaims>[0]
>;
type CalculateLiabilityInput = Parameters<
  typeof CarrierLiabilityService.calculateStatutoryLiability
>[0];
type CreateClaimInput = Parameters<typeof CargoClaimService.createClaim>[0];

interface ListClaimsQuery {
  status?: ListClaimsFilter["status"];
  convention?: ListClaimsFilter["convention"];
  q?: string;
}

interface CalculateLiabilityBody {
  convention?: CalculateLiabilityInput["convention"];
  transportMode?: CalculateLiabilityInput["transportMode"];
  damagedWeightKg?: number | string;
  packagesCount?: number | string;
  claimedAmount?: number | string;
  incidentDate?: CalculateLiabilityInput["incidentDate"];
  noticeDate?: CalculateLiabilityInput["noticeDate"];
  deliveryDate?: CalculateLiabilityInput["deliveryDate"];
}

interface CreateClaimBody extends Partial<
  Omit<
    CreateClaimInput,
    | "incidentDate"
    | "noticeDate"
    | "deliveryDate"
    | "packagesDamaged"
    | "damagedWeightKg"
    | "claimedAmount"
    | "insuranceInsuredValue"
    | "insurancePolicyDeductible"
  >
> {
  incidentDate?: string | Date;
  noticeDate?: string | Date;
  deliveryDate?: string | Date;
  packagesDamaged?: number | string;
  damagedWeightKg?: number | string;
  claimedAmount?: number | string;
  insuranceInsuredValue?: number | string;
  insurancePolicyDeductible?: number | string;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const CLAIMS_TAG = ["Cargo Claims & Carrier Liability"] as const;

export const claimsRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/claims - List cargo claims with optional filters
  fastify.get(
    "/",
    {
      schema: {
        tags: [...CLAIMS_TAG],
        summary:
          "List cargo loss and damage claims with status, governing convention, and text filters",
        querystring: openApiObject({
          status: { type: "string" },
          convention: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const query = (request.query ?? {}) as ListClaimsQuery;
      try {
        const claims = await CargoClaimService.listClaims({
          status: query.status,
          convention: query.convention,
          search: query.q,
        });
        return reply.send(claims);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({ error: "Failed to list cargo claims" });
      }
    },
  );

  // 2. GET /api/claims/:id - Get single claim details
  fastify.get(
    "/:id",
    {
      schema: {
        tags: [...CLAIMS_TAG],
        summary: "Retrieve cargo claim details by ID",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const claim = await CargoClaimService.getClaimById(id);
        if (!claim) {
          return reply.code(404).send({ error: "Cargo claim not found" });
        }
        return reply.send(claim);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({ error: "Failed to fetch claim" });
      }
    },
  );

  // 3. POST /api/claims/calculate-liability - Calculate statutory SDR liability and notice deadlines
  fastify.post(
    "/calculate-liability",
    {
      schema: {
        tags: [...CLAIMS_TAG],
        summary:
          "Calculate statutory SDR carrier liability ceiling and legal protest notice deadlines",
        body: openApiObject({
          convention: { type: "string" },
          transportMode: { type: "string" },
          damagedWeightKg: { type: "number" },
          packagesCount: { type: "number" },
          claimedAmount: { type: "number" },
          incidentDate: { type: "string" },
          noticeDate: { type: "string" },
          deliveryDate: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as CalculateLiabilityBody;
      if (
        !body.convention ||
        !body.transportMode ||
        !body.damagedWeightKg ||
        body.claimedAmount === undefined
      ) {
        return reply.code(400).send({
          error:
            "convention, transportMode, damagedWeightKg, and claimedAmount are required",
        });
      }

      try {
        const result = CarrierLiabilityService.calculateStatutoryLiability({
          convention: body.convention,
          transportMode: body.transportMode,
          damagedWeightKg: Number(body.damagedWeightKg),
          packagesCount: Number(body.packagesCount || 1),
          claimedAmount: Number(body.claimedAmount),
          incidentDate: body.incidentDate || new Date(),
          noticeDate: body.noticeDate || new Date(),
          deliveryDate: body.deliveryDate,
        });
        return reply.send({ success: true, liability: result });
      } catch (err: unknown) {
        return reply.code(400).send({ error: getErrorMessage(err) });
      }
    },
  );

  // 4. POST /api/claims - Create a new cargo claim
  fastify.post(
    "/",
    {
      schema: {
        tags: [...CLAIMS_TAG],
        summary: "Register a new cargo loss or damage claim",
        body: openApiObject({
          shipmentId: { type: "string" },
          transportDocNumber: { type: "string" },
          transportMode: { type: "string" },
          governingConvention: { type: "string" },
          incidentType: { type: "string" },
          claimantName: { type: "string" },
          carrierName: { type: "string" },
          damagedWeightKg: { type: "number" },
          claimedAmount: { type: "number" },
          claimedCurrency: { type: "string" },
          incidentDescription: { type: "string" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as CreateClaimBody;
      if (
        !body.transportDocNumber ||
        !body.transportMode ||
        !body.governingConvention ||
        !body.incidentType ||
        !body.claimantName ||
        !body.carrierName ||
        !body.damagedWeightKg ||
        !body.claimedAmount
      ) {
        return reply.code(400).send({
          error: "Missing required fields for cargo claim registration",
        });
      }

      try {
        const result = await CargoClaimService.createClaim({
          shipmentId: body.shipmentId,
          transportDocNumber: body.transportDocNumber,
          transportMode: body.transportMode,
          governingConvention: body.governingConvention,
          incidentType: body.incidentType,
          incidentDate: body.incidentDate
            ? new Date(body.incidentDate)
            : new Date(),
          noticeDate: body.noticeDate ? new Date(body.noticeDate) : new Date(),
          deliveryDate: body.deliveryDate
            ? new Date(body.deliveryDate)
            : undefined,
          claimantName: body.claimantName,
          carrierName: body.carrierName,
          packagesDamaged: Number(body.packagesDamaged || 1),
          damagedWeightKg: Number(body.damagedWeightKg),
          claimedAmount: Number(body.claimedAmount),
          claimedCurrency: body.claimedCurrency || "EUR",
          insuranceInsuredValue: Number(body.insuranceInsuredValue || 0),
          insurancePolicyDeductible: Number(
            body.insurancePolicyDeductible || 0,
          ),
          incidentDescription:
            body.incidentDescription || "Cargo loss/damage incident",
          surveyorData: body.surveyorData,
        });

        return reply.code(201).send(result);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(400).send({
          error: getErrorMessage(err, "Failed to create cargo claim"),
        });
      }
    },
  );

  // 5. GET /api/claims/:id/protest-pdf - Generate Notice of Claim / Carrier Protest PDF
  fastify.get(
    "/:id/protest-pdf",
    {
      schema: {
        tags: [...CLAIMS_TAG],
        summary:
          "Generate and download Notice of Claim / Carrier Protest Letter PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const claim = await CargoClaimService.getClaimById(id);
        if (!claim) {
          return reply.code(404).send({ error: "Claim not found" });
        }

        const pdfBuffer = await PDFService.generateCarrierProtestLetter({
          claimNumber: claim.claimNumber,
          transportDocNumber: claim.transportDocNumber,
          transportMode: claim.transportMode,
          governingConvention: claim.governingConvention,
          incidentType: claim.incidentType,
          incidentDate: claim.incidentDate,
          noticeDate: claim.noticeDate,
          deliveryDate: claim.deliveryDate || undefined,
          claimantName: claim.claimantName,
          carrierName: claim.carrierName,
          packagesDamaged: claim.packagesDamaged,
          damagedWeightKg: claim.damagedWeightKg,
          claimedAmount: claim.claimedAmount,
          claimedCurrency: claim.claimedCurrency || "EUR",
          statutoryLimitEur: claim.statutoryLimitEur,
          incidentDescription: claim.incidentDescription,
          surveyorData: claim.surveyorData,
        });

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="Protest-${claim.claimNumber}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: "Failed to generate protest PDF" });
      }
    },
  );

  // 6. GET /api/claims/:id/subrogation-pdf - Generate Subrogation Receipt PDF
  fastify.get(
    "/:id/subrogation-pdf",
    {
      schema: {
        tags: [...CLAIMS_TAG],
        summary: "Generate and download Marine Insurer Subrogation Receipt PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const claim = await CargoClaimService.getClaimById(id);
        if (!claim) {
          return reply.code(404).send({ error: "Claim not found" });
        }

        const pdfBuffer = await PDFService.generateSubrogationReceipt({
          claimNumber: claim.claimNumber,
          transportDocNumber: claim.transportDocNumber,
          claimantName: claim.claimantName,
          carrierName: claim.carrierName,
          claimedAmount: claim.claimedAmount,
          claimedCurrency: claim.claimedCurrency || "EUR",
          insurancePayoutAmount:
            claim.insurancePayoutAmount || claim.claimedAmount,
          incidentDate: claim.incidentDate,
          governingConvention: claim.governingConvention,
        });

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="Subrogation-${claim.claimNumber}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: "Failed to generate subrogation PDF" });
      }
    },
  );
};

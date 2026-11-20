/**
 * @file incoterms.routes.ts
 * @description Fastify routes for ICC Incoterms 2020 rule matrix, transport mode compatibility validation, CIP/CIF minimum insurance calculations, DUA Box 46 customs value normalization, and commercial freight contracts.
 * @module @atlas/api/modules/incoterms/routes
 */

import { FastifyPluginAsync } from "fastify";
import {
  IncotermsMatrixService,
  IncotermCode,
} from "./incoterms-matrix.service.js";
import { CustomsNormalizerService } from "./customs-normalizer.service.js";
import { CommercialContractService } from "./contract.service.js";
import { PDFService } from "../../services/pdf.service.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. DOMAIN PAYLOAD & QUERY INTERFACES
// ============================================================================

type ValidateModeInput = Parameters<
  typeof IncotermsMatrixService.validateModeCompatibility
>[0];
type ListContractsFilter = NonNullable<
  Parameters<typeof CommercialContractService.listContracts>[0]
>;
type CreateContractInput = Parameters<
  typeof CommercialContractService.createContract
>[0];
type CommercialContractPdfInput = Parameters<
  typeof PDFService.generateCommercialContract
>[0];

interface ValidateModeBody {
  incotermCode?: string;
  transportMode?: string;
  isContainerized?: boolean;
}

interface CalculateInsuranceBody {
  incotermCode?: string;
  goodsValue?: number | string;
  freightCost?: number | string;
  currency?: string;
}

interface NormalizeCustomsValueBody {
  incotermCode?: string;
  invoiceValue?: number | string;
  currency?: string;
  preCarriageCost?: number | string;
  exportFormalitiesCost?: number | string;
  internationalFreightCost?: number | string;
  insuranceCost?: number | string;
  destinationHandlingCost?: number | string;
  importDutyCost?: number | string;
  importVatCost?: number | string;
  exchangeRateToEur?: number | string;
}

interface ListContractsQuery {
  incoterm?: ListContractsFilter["incoterm"];
  status?: ListContractsFilter["status"];
  q?: string;
}

interface CreateContractBody extends Partial<
  Omit<CreateContractInput, "effectiveDate" | "expiryDate">
> {
  effectiveDate?: string | Date;
  expiryDate?: string | Date;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

export const incotermsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * 1. GET /api/incoterms/rules - List all 11 official ICC Incoterms 2020 rules
   */
  fastify.get(
    "/rules",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary:
          "List all 11 official ICC Incoterms 2020 rules and cost/risk matrices",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const rules = IncotermsMatrixService.getAllRules();
        return reply.send({ success: true, count: rules.length, rules });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: "Failed to retrieve Incoterms rules" });
      }
    },
  );

  /**
   * 2. GET /api/incoterms/rules/:code - Get single Incoterm rule definition
   */
  fastify.get(
    "/rules/:code",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary:
          "Retrieve a single ICC Incoterms 2020 rule definition by 3-letter code",
        params: buildParamSchema(
          "code",
          "3-letter ICC Incoterm 2020 code (e.g. EXW, FOB, CIF, DDP)",
        ),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { code } = request.params as { code: string };
      try {
        const rule = IncotermsMatrixService.getRule(
          code.toUpperCase() as IncotermCode,
        );
        return reply.send({ success: true, rule });
      } catch (err: unknown) {
        return reply
          .code(404)
          .send({ error: getErrorMessage(err, "Rule not found") });
      }
    },
  );

  /**
   * 3. POST /api/incoterms/validate-mode - Check transport mode and container compatibility
   */
  fastify.post(
    "/validate-mode",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary:
          "Validate Incoterm 2020 transport mode and containerization compatibility",
        body: openApiObject({
          incotermCode: { type: "string" },
          transportMode: { type: "string" },
          isContainerized: { type: "boolean" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = (request.body as ValidateModeBody | undefined) || {};
      if (!body.incotermCode || !body.transportMode) {
        return reply
          .code(400)
          .send({ error: "incotermCode and transportMode are required" });
      }

      try {
        const result = IncotermsMatrixService.validateModeCompatibility({
          incotermCode: body.incotermCode.toUpperCase() as IncotermCode,
          transportMode:
            body.transportMode.toUpperCase() as ValidateModeInput["transportMode"],
          isContainerized: Boolean(body.isContainerized),
        });
        return reply.send({ success: true, validation: result });
      } catch (err: unknown) {
        return reply.code(400).send({ error: getErrorMessage(err) });
      }
    },
  );

  /**
   * 4. POST /api/incoterms/calculate-insurance - Calculate mandatory minimum insurance
   */
  fastify.post(
    "/calculate-insurance",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary:
          "Calculate mandatory ICC (A)/(C) minimum cargo insurance under CIF and CIP",
        body: openApiObject({
          incotermCode: { type: "string" },
          goodsValue: { type: "number" },
          freightCost: { type: "number" },
          currency: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = (request.body as CalculateInsuranceBody | undefined) || {};
      if (!body.incotermCode || body.goodsValue === undefined) {
        return reply
          .code(400)
          .send({ error: "incotermCode and goodsValue are required" });
      }

      try {
        const result = IncotermsMatrixService.calculateInsuranceObligation({
          incotermCode: body.incotermCode.toUpperCase() as IncotermCode,
          goodsValue: Number(body.goodsValue),
          freightCost: Number(body.freightCost || 0),
          currency: body.currency || "EUR",
        });
        return reply.send({ success: true, insurance: result });
      } catch (err: unknown) {
        return reply.code(400).send({ error: getErrorMessage(err) });
      }
    },
  );

  /**
   * 5. POST /api/incoterms/normalize-customs-value - Compute DUA Box 46 / TARIC valuation adjustments
   */
  fastify.post(
    "/normalize-customs-value",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary:
          "Normalize commercial invoice amount to EU Customs CIF Border Value (DUA Box 46)",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body =
        (request.body as NormalizeCustomsValueBody | undefined) || {};
      if (!body.incotermCode || body.invoiceValue === undefined) {
        return reply
          .code(400)
          .send({ error: "incotermCode and invoiceValue are required" });
      }

      try {
        const result = CustomsNormalizerService.normalizeCustomsValue({
          incotermCode: body.incotermCode.toUpperCase() as IncotermCode,
          invoiceValue: Number(body.invoiceValue),
          currency: body.currency || "EUR",
          preCarriageCost: Number(body.preCarriageCost || 0),
          exportFormalitiesCost: Number(body.exportFormalitiesCost || 0),
          internationalFreightCost: Number(body.internationalFreightCost || 0),
          insuranceCost: Number(body.insuranceCost || 0),
          destinationHandlingCost: Number(body.destinationHandlingCost || 0),
          importDutyCost: Number(body.importDutyCost || 0),
          importVatCost: Number(body.importVatCost || 0),
          exchangeRateToEur: Number(body.exchangeRateToEur || 1.0),
        });
        return reply.send({ success: true, normalization: result });
      } catch (err: unknown) {
        return reply.code(400).send({ error: getErrorMessage(err) });
      }
    },
  );

  /**
   * 6. GET /api/incoterms/contracts - List commercial freight contracts
   */
  fastify.get(
    "/contracts",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary: "List commercial international sales and freight contracts",
        querystring: openApiObject({
          incoterm: { type: "string" },
          status: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const query = (request.query as ListContractsQuery | undefined) || {};
      try {
        const contracts = await CommercialContractService.listContracts({
          incoterm: query.incoterm,
          status: query.status,
          search: query.q,
        });
        return reply.send(contracts);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({ error: "Failed to list contracts" });
      }
    },
  );

  /**
   * 7. GET /api/incoterms/contracts/:id - Get single contract by ID
   */
  fastify.get(
    "/contracts/:id",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary: "Retrieve a commercial contract by ID",
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
        const contract = await CommercialContractService.getContractById(id);
        if (!contract) {
          return reply.code(404).send({ error: "Contract not found" });
        }
        return reply.send(contract);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({ error: "Failed to fetch contract" });
      }
    },
  );

  /**
   * 8. POST /api/incoterms/contracts - Create a new Commercial Contract
   */
  fastify.post(
    "/contracts",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary: "Create a new ICC Incoterms 2020 commercial contract",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = (request.body as CreateContractBody | undefined) || {};
      if (
        !body.title ||
        !body.incotermCode ||
        !body.namedPlace ||
        !body.goodsValue
      ) {
        return reply.code(400).send({
          error: "title, incotermCode, namedPlace, and goodsValue are required",
        });
      }

      try {
        const result = await CommercialContractService.createContract({
          title: body.title,
          sellerCompanyId: body.sellerCompanyId,
          buyerCompanyId: body.buyerCompanyId,
          sellerData: body.sellerData || {
            name: "Default Exporter SL",
            address: "Barcelona",
            country: "ES",
          },
          buyerData: body.buyerData || {
            name: "Default Importer GmbH",
            address: "Hamburg",
            country: "DE",
          },
          forwarderData: body.forwarderData,
          incotermCode: body.incotermCode.toUpperCase() as IncotermCode,
          namedPlace: body.namedPlace,
          transportMode: body.transportMode || "MULTIMODAL",
          currency: body.currency || "EUR",
          goodsValue: Number(body.goodsValue),
          freightEstimatedCost: Number(body.freightEstimatedCost || 0),
          insuranceEstimatedCost: Number(body.insuranceEstimatedCost || 0),
          customsEstimatedDuty: Number(body.customsEstimatedDuty || 0),
          effectiveDate: body.effectiveDate
            ? new Date(body.effectiveDate)
            : new Date(),
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
          governingLaw: body.governingLaw,
          disputeJurisdiction: body.disputeJurisdiction,
        });

        return reply.code(201).send(result);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(400)
          .send({ error: getErrorMessage(err, "Failed to create contract") });
      }
    },
  );

  /**
   * 9. GET /api/incoterms/contracts/:id/pdf - Generate bilingual commercial contract PDF
   */
  fastify.get(
    "/contracts/:id/pdf",
    {
      schema: {
        tags: ["Incoterms 2020 & Contracts"],
        summary:
          "Download bilingual ICC Incoterms 2020 Commercial Contract PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const contract = await CommercialContractService.getContractById(id);
        if (!contract) {
          return reply.code(404).send({ error: "Contract not found" });
        }

        const milestonesData: CommercialContractPdfInput["milestonesData"] =
          Array.isArray(contract.milestonesData)
            ? (contract.milestonesData as CommercialContractPdfInput["milestonesData"])
            : [];

        const pdfBuffer = await PDFService.generateCommercialContract({
          contractNumber: contract.contractNumber,
          title: contract.title,
          incotermCode: contract.incotermCode,
          namedPlace: contract.namedPlace,
          transportMode: contract.transportMode,
          currency: contract.currency || "EUR",
          goodsValue: contract.goodsValue,
          freightEstimatedCost: contract.freightEstimatedCost || 0,
          insuranceEstimatedCost: contract.insuranceEstimatedCost || 0,
          customsEstimatedDuty: contract.customsEstimatedDuty || 0,
          effectiveDate: contract.effectiveDate,
          expiryDate: contract.expiryDate || undefined,
          governingLaw: contract.governingLaw,
          disputeJurisdiction: contract.disputeJurisdiction,
          sellerData: contract.sellerData,
          buyerData: contract.buyerData,
          forwarderData: contract.forwarderData,
          milestonesData,
        });

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="Contract-${contract.contractNumber}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: "Failed to generate contract PDF" });
      }
    },
  );
};

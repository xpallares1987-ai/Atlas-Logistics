/**
 * @file customs-brokerage.routes.ts
 * @description Fastify routes for Customs Brokerage (DUA/MRN), 1:N Shipment Grouping, Zero-Markup Disbursements (Suplidos), and EU CBAM Compliance.
 * @module @atlas/routes/customs/customs-brokerage
 * @see {@link docs/adr/0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md}
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CustomsClearanceService } from "../../services/customs/customs-clearance.service.js";
import { CbamComplianceService } from "../../services/cbam/cbam-compliance.service.js";
import { logger } from "../../config/logger.js";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  openApiObject,
} from "../openapi.schemas.js";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createClearanceSchema = z.object({
  clearanceNumber: z.string().optional(),
  mrn: z.string().min(18).max(18),
  procedureType: z.enum([
    "IMPORT_4000",
    "IMPORT_7100",
    "EXPORT_1000",
    "TRANSIT_T1",
  ]),
  customsOfficeCode: z.string().min(6).max(8),
  importerCompanyId: z.string().min(1),
  declarantAddressId: z.string().min(1),
  taricCode: z.string().min(4),
  goodsDescription: z.string().min(1),
  originCountryCode: z.string().length(2),
  grossMassKg: z.number().positive(),
  netMassKg: z.number().positive(),
  customsValueEur: z.number().nonnegative(),
  dutyTariffRatePercent: z.number().nonnegative().optional(),
  importVatRatePercent: z.number().nonnegative().optional(),
  t1GuaranteeId: z.string().optional(),
  ocrStagingReference: z.string().optional(),
  tenantId: z.string().optional(),
});

const allocateShipmentsSchema = z.object({
  allocations: z
    .array(
      z.object({
        shipmentId: z.string().min(1),
        netMassKg: z.number().positive(),
      }),
    )
    .min(1),
  apInvoiceReference: z.string().optional(),
  officialVoucherNumber: z.string().optional(),
});

const channelUpdateSchema = z.object({
  channel: z.enum(["GREEN", "ORANGE", "RED"]),
});

const recordDisbursementSchema = z.object({
  clearanceId: z.string().min(1),
  shipmentId: z.string().min(1),
  disbursementType: z.enum([
    "IMPORT_DUTY",
    "IMPORT_VAT",
    "PORT_T3_TAX",
    "HEALTH_SOIVRE_INSPECTION_FEE",
  ]),
  officialVoucherNumber: z.string().min(1),
  incurredCostAmountEur: z.number().nonnegative(),
  billedRevenueAmountEur: z.number().nonnegative(),
  apInvoiceReference: z.string().min(1),
  arInvoiceId: z.string().optional(),
  tenantId: z.string().optional(),
});

const cbamEvaluateSchema = z.object({
  cnCode: z.string().min(2),
  netMassTonnes: z.number().positive(),
  directEmissionFactor: z.number().nonnegative().optional(),
  indirectEmissionFactor: z.number().nonnegative().optional(),
  precursorTonnes: z.number().nonnegative().optional(),
  euEtsBenchmarkPriceEur: z.number().nonnegative().optional(),
  foreignCarbonPricePaidEur: z.number().nonnegative().optional(),
});

const createCbamDeclarationSchema = z.object({
  declarationNumber: z.string().optional(),
  reportingPeriod: z.string().regex(/^[0-9]{4}-Q[1-4]$/),
  declarantVat: z.string().min(1),
  declarantName: z.string().min(1),
  importerVat: z.string().min(1),
  importerName: z.string().min(1),
  responsibleDeclarant: z.string().optional(),
  remarks: z.string().optional(),
  items: z
    .array(
      z.object({
        shipmentId: z.string().optional(),
        duaNumber: z.string().optional(),
        duaBox33HsCode: z.string().min(2),
        goodDescription: z.string().min(1),
        originCountry: z.string().length(2),
        installationId: z.string().optional(),
        netWeightTonnes: z.number().positive(),
        useDefaultFactors: z.boolean().optional(),
        directEmissionFactor: z.number().nonnegative().optional(),
        indirectEmissionFactor: z.number().nonnegative().optional(),
        precursorEmissionsTco2e: z.number().nonnegative().optional(),
        foreignCarbonPricePerTco2e: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

// ============================================================================
// ROUTES PLUGIN
// ============================================================================

export const customsBrokerageRoutes: FastifyPluginAsync = async (fastify) => {
  const clearanceService = new CustomsClearanceService();
  const cbamService = new CbamComplianceService();

  // 1. Register a new Customs Clearance (DUA / MRN)
  fastify.post(
    "/clearances",
    {
      schema: {
        tags: ["Customs Brokerage"],
        summary: "Register a new Customs Clearance declaration (DUA / MRN)",
        body: openApiObject({
          clearanceNumber: { type: "string" },
          mrn: { type: "string" },
          procedureType: { type: "string" },
          customsOfficeCode: { type: "string" },
          importerCompanyId: { type: "string" },
          declarantAddressId: { type: "string" },
          taricCode: { type: "string" },
          goodsDescription: { type: "string" },
          originCountryCode: { type: "string" },
          grossMassKg: { type: "number" },
          netMassKg: { type: "number" },
          customsValueEur: { type: "number" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = createClearanceSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await clearanceService.createClearance(parsed.data);
        return reply.status(201).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error creating customs clearance");
        return reply.status(400).send({
          error: "Failed to create customs clearance",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 2. Allocate 1:N shipments to a clearance and prorate taxes
  fastify.post<{ Params: { id: string } }>(
    "/clearances/:id/allocate-shipments",
    {
      schema: {
        tags: ["Customs Brokerage"],
        summary:
          "Allocate 1:N shipments to a customs clearance and prorate taxes",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          allocations: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          apInvoiceReference: { type: "string" },
          officialVoucherNumber: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const parsed = allocateShipmentsSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await clearanceService.allocateShipments({
          clearanceId: id,
          allocations: parsed.data.allocations,
          apInvoiceReference: parsed.data.apInvoiceReference,
          officialVoucherNumber: parsed.data.officialVoucherNumber,
        });

        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error allocating shipments to clearance");
        return reply.status(400).send({
          error: "Failed to allocate shipments",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 3. Assign inspection channel (GREEN, ORANGE, RED)
  fastify.post<{ Params: { id: string } }>(
    "/clearances/:id/channel",
    {
      schema: {
        tags: ["Customs Brokerage"],
        summary: "Assign customs inspection channel (GREEN, ORANGE, RED)",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          channel: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const parsed = channelUpdateSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await clearanceService.updateRoutingChannel(
          id,
          parsed.data.channel,
        );
        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error updating routing channel");
        return reply.status(400).send({
          error: "Failed to update routing channel",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 4. Release Levante
  fastify.post<{ Params: { id: string } }>(
    "/clearances/:id/levante",
    {
      schema: {
        tags: ["Customs Brokerage"],
        summary: "Release customs Levante clearance authorization",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await clearanceService.releaseLevante(id);
        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error releasing Levante");
        return reply.status(400).send({
          error: "Failed to release Levante",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 5. Discharge T1 Bonded Transit Guarantee
  fastify.post<{ Params: { id: string } }>(
    "/clearances/:id/discharge-t1",
    {
      schema: {
        tags: ["Customs Brokerage"],
        summary: "Discharge T1 bonded transit customs guarantee",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await clearanceService.dischargeT1Transit(id);
        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error discharging T1 transit");
        return reply.status(400).send({
          error: "Failed to discharge T1 transit",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 6. Record Zero-Markup Disbursement
  fastify.post(
    "/disbursements",
    {
      schema: {
        tags: ["Customs Brokerage"],
        summary: "Record zero-markup customs disbursement (Suplido)",
        body: openApiObject({
          clearanceId: { type: "string" },
          shipmentId: { type: "string" },
          disbursementType: { type: "string" },
          officialVoucherNumber: { type: "string" },
          incurredCostAmountEur: { type: "number" },
          billedRevenueAmountEur: { type: "number" },
          apInvoiceReference: { type: "string" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = recordDisbursementSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await clearanceService.recordDisbursement(parsed.data);
        return reply.status(201).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error recording disbursement");
        return reply.status(400).send({
          error: "Failed to record disbursement",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 7. Get Clearance Details
  fastify.get<{ Params: { id: string } }>(
    "/clearances/:id",
    {
      schema: {
        tags: ["Customs Brokerage"],
        summary: "Retrieve customs clearance details by identifier",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await clearanceService.getClearanceById(id);
        if (!result) {
          return reply.status(404).send({ error: "Clearance not found" });
        }
        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error fetching clearance");
        return reply.status(500).send({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 8. Evaluate commodity for EU CBAM liability
  fastify.post(
    "/cbam/evaluate",
    {
      schema: {
        tags: ["Customs Brokerage", "CBAM"],
        summary: "Evaluate commodity embedded emissions and EU CBAM liability",
        body: openApiObject({
          cnCode: { type: "string" },
          netMassTonnes: { type: "number" },
          directEmissionFactor: { type: "number" },
          indirectEmissionFactor: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = cbamEvaluateSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = cbamService.evaluateCommodity(parsed.data);
        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error evaluating CBAM commodity");
        return reply.status(400).send({
          error: "Failed to evaluate CBAM commodity",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 9. Create Quarterly CBAM Declaration
  fastify.post(
    "/cbam/declarations",
    {
      schema: {
        tags: ["Customs Brokerage", "CBAM"],
        summary: "Create a quarterly EU CBAM transitional declaration",
        body: openApiObject({
          reportingPeriod: { type: "string" },
          declarantVat: { type: "string" },
          declarantName: { type: "string" },
          importerVat: { type: "string" },
          importerName: { type: "string" },
          items: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = createCbamDeclarationSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await cbamService.createQuarterlyDeclaration(
          parsed.data,
        );
        return reply.status(201).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error creating CBAM declaration");
        return reply.status(400).send({
          error: "Failed to create CBAM declaration",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 10. Export CBAM Transitional XML
  fastify.get<{ Params: { id: string } }>(
    "/cbam/declarations/:id/xml",
    {
      schema: {
        tags: ["Customs Brokerage", "CBAM"],
        summary: "Export quarterly EU CBAM declaration as transitional XML",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const xml = await cbamService.exportDeclarationXml(id);
        reply.header("Content-Type", "application/xml; charset=utf-8");
        return reply.status(200).send(xml);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error exporting CBAM XML");
        return reply.status(400).send({
          error: "Failed to export CBAM XML",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
};

export default customsBrokerageRoutes;

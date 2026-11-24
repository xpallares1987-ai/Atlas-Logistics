/**
 * @file cbam.routes.ts
 * @description Fastify routes for EU Carbon Border Adjustment Mechanism (CBAM Regulation 2023/956) CN goods catalog, third-country installations, quarterly declarations, embedded emissions and liability simulators, XML registry export, and certificate PDFs.
 * @module @atlas/api/modules/cbam/routes
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import {
  cbamGoodsCatalog,
  cbamInstallations,
  cbamDeclarations,
  cbamDeclarationLines,
  cbamEexQuotes,
  cbamCertificateInventory,
  cbamCertificateSurrenders,
} from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  CbamCalculatorService,
  CbamEmissionInput,
} from "./cbam-calculator.service.js";
import {
  CbamFinancialService,
  CbamLiabilityInput,
} from "./cbam-financial.service.js";
import { CbamXmlService } from "./cbam-xml.service.js";
import { CbamEexService } from "./cbam-eex.service.js";
import { CbamCertificateService } from "./cbam-certificate.service.js";
import { bootstrapCbamDefinitiveTables } from "./cbam-bootstrap.js";
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
// 1. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const CBAM_TAG = ["EU CBAM Compliance"] as const;

export const cbamRoutes: FastifyPluginAsync = async (fastify) => {
  // Ensure definitive regime tables exist in SQLite WAL
  await bootstrapCbamDefinitiveTables();

  // Authentication hook (parent app.ts authMiddleware already enforces authentication)
  fastify.addHook("onRequest", async (req) => {
    try {
      if (req.headers.authorization) {
        await req.jwtVerify();
      }
    } catch {
      // Allow gracefully if parent authMiddleware validated or for dev/test
    }
  });

  // 1. GET /api/cbam/catalog
  fastify.get(
    "/catalog",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "List EU CBAM Annex I CN commodity goods catalog and default SEE values",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const catalog = await db.select().from(cbamGoodsCatalog);
        return reply.send(catalog);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 2. GET /api/cbam/installations
  fastify.get(
    "/installations",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary: "List verified third-country CBAM manufacturing installations",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const installations = await db.select().from(cbamInstallations);
        return reply.send(installations);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 3. GET /api/cbam/declarations
  fastify.get(
    "/declarations",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "List CBAM quarterly declarations with period, status, and text filters",
        querystring: openApiObject({
          period: { type: "string" },
          status: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const { period, status, q } = req.query as {
        period?: string;
        status?: string;
        q?: string;
      };

      try {
        const declarationsList = await db
          .select()
          .from(cbamDeclarations)
          .orderBy(desc(cbamDeclarations.createdAt));

        let filtered = declarationsList;
        if (period && period !== "ALL") {
          filtered = filtered.filter((d) => d.reportingPeriod === period);
        }
        if (status && status !== "ALL") {
          filtered = filtered.filter((d) => d.status === status);
        }
        if (q) {
          const query = q.toLowerCase();
          filtered = filtered.filter(
            (d) =>
              d.declarationNumber.toLowerCase().includes(query) ||
              d.importerName.toLowerCase().includes(query) ||
              d.importerVat.toLowerCase().includes(query) ||
              d.declarantName.toLowerCase().includes(query),
          );
        }

        return reply.send(filtered);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 4. GET /api/cbam/declarations/:id
  fastify.get(
    "/declarations/:id",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Retrieve CBAM declaration details with CN emission line items",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const declaration = await db
          .select()
          .from(cbamDeclarations)
          .where(eq(cbamDeclarations.id, id))
          .get();

        if (!declaration) {
          return reply
            .status(404)
            .send({ error: "CBAM Declaration not found" });
        }

        const lines = await db
          .select()
          .from(cbamDeclarationLines)
          .where(eq(cbamDeclarationLines.declarationId, id));

        return reply.send({
          ...declaration,
          lines,
        });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 5. POST /api/cbam/calculate-emissions
  fastify.post(
    "/calculate-emissions",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Calculate direct and indirect CBAM embedded emissions (tCO2e) for imported goods",
        body: openApiObject({
          netWeightTonnes: { type: "number" },
          directEmissionsFactor: { type: "number" },
          indirectEmissionsFactor: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const input = req.body as CbamEmissionInput;

      if (!input || input.netWeightTonnes === undefined) {
        return reply
          .status(400)
          .send({ error: "netWeightTonnes and factors are required" });
      }

      const result = CbamCalculatorService.calculateEmbeddedEmissions(input);
      return reply.send({
        success: true,
        result,
      });
    },
  );

  // 6. POST /api/cbam/calculate-liability
  fastify.post(
    "/calculate-liability",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Calculate CBAM certificate financial liability net of origin carbon prices",
        body: openApiObject({
          totalEmbeddedEmissionsTco2e: { type: "number" },
          euEtsPriceEurPerTonne: { type: "number" },
          originCarbonPricePaidEur: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const input = req.body as CbamLiabilityInput;

      if (!input || input.totalEmbeddedEmissionsTco2e === undefined) {
        return reply
          .status(400)
          .send({ error: "totalEmbeddedEmissionsTco2e is required" });
      }

      const result = CbamFinancialService.calculateCarbonLiability(input);
      return reply.send({
        success: true,
        result,
      });
    },
  );

  // 7. POST /api/cbam/declarations/:id/status
  fastify.post(
    "/declarations/:id/status",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary: "Transition CBAM declaration lifecycle status",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          status: {
            type: "string",
            enum: ["DRAFT", "VALIDATED", "SUBMITTED_REGISTRY", "AMENDED"],
          },
          remarks: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { status, remarks } = req.body as {
        status: "DRAFT" | "VALIDATED" | "SUBMITTED_REGISTRY" | "AMENDED";
        remarks?: string;
      };

      if (!status) {
        return reply.status(400).send({ error: "status is required" });
      }

      try {
        const declaration = await db
          .select()
          .from(cbamDeclarations)
          .where(eq(cbamDeclarations.id, id))
          .get();

        if (!declaration) {
          return reply.status(404).send({ error: "Declaration not found" });
        }

        await db
          .update(cbamDeclarations)
          .set({
            status,
            remarks: remarks || declaration.remarks,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(cbamDeclarations.id, id));

        return reply.send({
          success: true,
          message: `Declaration ${declaration.declarationNumber} updated to ${status}`,
        });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 8. GET /api/cbam/declarations/:id/xml
  fastify.get(
    "/declarations/:id/xml",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary: "Export EU CBAM Transitional Registry XML report",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const declaration = await db
          .select()
          .from(cbamDeclarations)
          .where(eq(cbamDeclarations.id, id))
          .get();

        if (!declaration) {
          return reply.status(404).send({ error: "Declaration not found" });
        }

        const lines = await db
          .select()
          .from(cbamDeclarationLines)
          .where(eq(cbamDeclarationLines.declarationId, id));

        const xmlString = CbamXmlService.generateTransitionalRegistryXml(
          declaration,
          lines,
        );

        return reply
          .header("Content-Type", "application/xml")
          .header(
            "Content-Disposition",
            `attachment; filename="CBAM_Transitional_Report_${declaration.declarationNumber}.xml"`,
          )
          .send(xmlString);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "XML Generation Error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 9. GET /api/cbam/declarations/:id/pdf
  fastify.get(
    "/declarations/:id/pdf",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Generate and stream CBAM Declaration Compliance Certificate PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const declaration = await db
          .select()
          .from(cbamDeclarations)
          .where(eq(cbamDeclarations.id, id))
          .get();

        if (!declaration) {
          return reply.status(404).send({ error: "Declaration not found" });
        }

        const lines = await db
          .select()
          .from(cbamDeclarationLines)
          .where(eq(cbamDeclarationLines.declarationId, id));

        const pdfBuffer = await PDFService.generateCbamDeclarationCertificate(
          declaration,
          lines,
        );

        return reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `inline; filename="CBAM_Declaration_${declaration.declarationNumber}.pdf"`,
          )
          .send(pdfBuffer);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "PDF Generation Error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // ============================================================================
  // DEFINITIVE CBAM REGIME: EEX AUCTION QUOTES & CERTIFICATE INVENTORY (2026+)
  // ============================================================================

  // 10. GET /api/cbam/eex/quotes
  fastify.get(
    "/eex/quotes",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "List weekly EEX EUA carbon auction benchmark quotes for CBAM certificate pricing",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const quotes = await CbamEexService.listQuotes();
        return reply.send(quotes);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 11. POST /api/cbam/eex/quotes
  fastify.post(
    "/eex/quotes",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Record or publish a new weekly EEX carbon auction benchmark quote",
        body: openApiObject({
          quoteWeek: { type: "string" }, // e.g. "2026-W42"
          validFrom: { type: "string" },
          validUntil: { type: "string" },
          auctionAveragePriceEur: { type: "number" },
          source: {
            type: "string",
            enum: [
              "EEX_AUCTION",
              "COMMISSION_PUBLICATION",
              "CONFIGURED_FALLBACK",
            ],
          },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const body = req.body as {
        quoteWeek: string;
        validFrom: string;
        validUntil: string;
        auctionAveragePriceEur: number;
        source?:
          "EEX_AUCTION" | "COMMISSION_PUBLICATION" | "CONFIGURED_FALLBACK";
      };

      if (!body.quoteWeek || !body.validFrom || !body.validUntil) {
        return reply.status(400).send({
          error: "Validation error",
          message:
            "Missing mandatory fields: quoteWeek, validFrom, and validUntil are required.",
        });
      }

      try {
        const recorded = await CbamEexService.recordQuote(body);
        return reply.status(201).send(recorded);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Quote recording error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 12. GET /api/cbam/eex/quotes/active
  fastify.get(
    "/eex/quotes/active",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Resolve active EEX EUA auction benchmark quote for a given date or today",
        querystring: openApiObject({
          date: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const query = req.query as { date?: string };
      const targetDate = query.date ? new Date(query.date) : new Date();

      try {
        const resolved = await CbamEexService.resolveActiveQuote(targetDate);
        return reply.send(resolved);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Resolution error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 13. GET /api/cbam/certificates/inventory
  fastify.get(
    "/certificates/inventory",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Retrieve holding inventory of purchased CBAM certificates and summary metrics",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const summary = await CbamCertificateService.getInventorySummary();
        const lots = await CbamCertificateService.listInventory();
        return reply.send({ summary, lots });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 14. POST /api/cbam/certificates/lots
  fastify.post(
    "/certificates/lots",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Purchase and register a new batch/lot of electronic CBAM certificates",
        body: openApiObject({
          lotReference: { type: "string" },
          purchaseDate: { type: "string" },
          ncaRegistryAccountId: { type: "string" },
          quantityPurchased: { type: "number" },
          unitPriceEur: { type: "number" },
          paymentReference: { type: "string" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const body = req.body as {
        lotReference: string;
        purchaseDate: string;
        ncaRegistryAccountId: string;
        quantityPurchased: number;
        unitPriceEur: number;
        paymentReference?: string;
      };

      if (
        !body.lotReference ||
        !body.purchaseDate ||
        !body.ncaRegistryAccountId ||
        !body.quantityPurchased ||
        !body.unitPriceEur
      ) {
        return reply.status(400).send({
          error: "Validation error",
          message:
            "Missing required fields: lotReference, purchaseDate, ncaRegistryAccountId, quantityPurchased, and unitPriceEur.",
        });
      }

      try {
        const lot = await CbamCertificateService.purchaseLot(body);
        return reply.status(201).send(lot);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Lot registration error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 15. POST /api/cbam/certificates/lots/:id/payment-order
  fastify.post(
    "/certificates/lots/:id/payment-order",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Generate ISO 20022 pain.001.001.09 payment initiation XML for settling certificate lot purchase with NCA",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          debtorName: { type: "string" },
          debtorIban: { type: "string" },
          debtorBic: { type: "string" },
          creditorNcaName: { type: "string" },
          creditorNcaIban: { type: "string" },
          creditorNcaBic: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as {
        debtorName: string;
        debtorIban: string;
        debtorBic: string;
        creditorNcaName?: string;
        creditorNcaIban?: string;
        creditorNcaBic?: string;
      };

      if (!body.debtorName || !body.debtorIban || !body.debtorBic) {
        return reply.status(400).send({
          error: "Validation error",
          message:
            "debtorName, debtorIban, and debtorBic are mandatory to generate ISO 20022 wire.",
        });
      }

      try {
        const paymentOrder = CbamCertificateService.generatePaymentOrderXml({
          lotId: id,
          ...body,
        });

        return reply.send({
          lotId: id,
          messageId: paymentOrder.messageId,
          messageType: "PAIN_001",
          ["schema"]: "pain.001.001.09",
          xml: paymentOrder.xml,
        });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Payment order generation error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 16. POST /api/cbam/declarations/:id/surrender
  fastify.post(
    "/declarations/:id/surrender",
    {
      schema: {
        tags: [...CBAM_TAG],
        summary:
          "Surrender electronic CBAM certificates for a validated declaration via FIFO inventory with SHA-256 seal",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          verifierName: { type: "string" },
          verifierAccreditationNumber: { type: "string" }, // e.g. "ENAC-045/V-012"
          verificationReportId: { type: "string" },
          surrenderDate: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as {
        verifierName: string;
        verifierAccreditationNumber: string;
        verificationReportId: string;
        surrenderDate?: string;
      };

      if (
        !body.verifierName ||
        !body.verifierAccreditationNumber ||
        !body.verificationReportId
      ) {
        return reply.status(400).send({
          error: "Validation error",
          message:
            "verifierName, verifierAccreditationNumber, and verificationReportId are required (EU Reg 2023/956 Art. 8).",
        });
      }

      try {
        const result = await CbamCertificateService.surrenderCertificates({
          declarationId: id,
          ...body,
        });

        return reply.send({
          success: true,
          message: "CBAM certificates surrendered successfully.",
          result,
        });
      } catch (err: unknown) {
        const errMsg = getErrorMessage(err);
        if (errMsg.includes("not found")) {
          return reply.status(404).send({ error: errMsg });
        }
        if (
          errMsg.includes("INSUFFICIENT_CBAM_CERTIFICATES") ||
          errMsg.includes("already been surrendered") ||
          errMsg.includes("compliance violation")
        ) {
          return reply.status(400).send({ error: errMsg });
        }
        req.log.error(err);
        return reply.status(500).send({
          error: "Surrender execution error",
          message: errMsg,
        });
      }
    },
  );
};

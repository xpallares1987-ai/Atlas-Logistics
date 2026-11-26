/**
 * @file iso20022.routes.ts
 * @description Fastify REST routes for SWIFT ISO 20022 Financial Settlement Gateway (pain.001 / pacs.008),
 * electronic bank statement ingestion & automatic AP/AR clearing reconciliation (camt.053).
 * @module @atlas/api/routes/financial/iso20022
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { FastifyPluginAsync } from "fastify";
import { swiftIso20022Service } from "../../services/swift-iso20022.service.js";
import {
  buildErrorResponses,
  openApiArray,
  openApiObject,
  OPENAPI_ID_PARAMS_SCHEMA,
} from "../openapi.schemas.js";

// ============================================================================
// 1. OPENAPI TYPEBOX PROPERTIES
// ============================================================================

const BANKING_TRANSMISSION_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  transmissionNumber: { type: "string" },
  nettingCycleId: { anyOf: [{ type: "string" }, { type: "null" }] },
  messageType: {
    type: "string",
    enum: ["PAIN_001", "PACS_008", "TSMT_019", "CAMT_053"],
  },
  bahMessageId: { type: "string" },
  senderBic: { type: "string" },
  receiverBic: { type: "string" },
  totalAmount: { type: "number" },
  currency: { type: "string" },
  payloadXml: { type: "string" },
  payloadHashSha256: { type: "string" },
  status: {
    type: "string",
    enum: ["PENDING", "TRANSMITTED", "ACKED", "REJECTED"],
  },
  failureReason: { anyOf: [{ type: "string" }, { type: "null" }] },
  metadata: { type: "object", additionalProperties: true },
  createdAt: { type: "string" },
  updatedAt: { type: "string" },
};

const BANK_STATEMENT_ENTRY_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  statementId: { type: "string" },
  transmissionId: { anyOf: [{ type: "string" }, { type: "null" }] },
  bookingDate: { type: "string" },
  valueDate: { type: "string" },
  creditDebitIndicator: { type: "string", enum: ["CRDT", "DBIT"] },
  amount: { type: "number" },
  currency: { type: "string" },
  accountIban: { anyOf: [{ type: "string" }, { type: "null" }] },
  accountBic: { anyOf: [{ type: "string" }, { type: "null" }] },
  endToEndId: { anyOf: [{ type: "string" }, { type: "null" }] },
  paymentInformationId: { anyOf: [{ type: "string" }, { type: "null" }] },
  remittanceInformation: { anyOf: [{ type: "string" }, { type: "null" }] },
  reconciliationStatus: {
    type: "string",
    enum: ["UNMATCHED", "PARTIALLY_MATCHED", "RECONCILED", "DISPUTED"],
  },
  matchedInvoiceId: { anyOf: [{ type: "string" }, { type: "null" }] },
  matchedCompanyId: { anyOf: [{ type: "string" }, { type: "null" }] },
  notes: { anyOf: [{ type: "string" }, { type: "null" }] },
  createdAt: { type: "string" },
};

// ============================================================================
// 2. ROUTE PLUGIN DEFINITION
// ============================================================================

export const iso20022Routes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/financial/iso20022/payments/generate
   * Generates a compliant ISO 20022 payment initiation or pacs.008 transfer from a netting cycle.
   */
  fastify.post<{
    Body: {
      nettingCycleId: string;
      paymentType?: "PAIN_001" | "PACS_008";
      senderBic?: string;
      receiverBic?: string;
    };
  }>(
    "/api/financial/iso20022/payments/generate",
    {
      schema: {
        description:
          "Generates ISO 20022 XML payment instruction (pain.001 / pacs.008) from a settled netting cycle",
        tags: ["Financial Clearing - ISO 20022"],
        body: openApiObject({
          nettingCycleId: { type: "string" },
          paymentType: {
            anyOf: [
              { type: "string", enum: ["PAIN_001", "PACS_008"] },
              { type: "null" },
            ],
          },
          senderBic: { anyOf: [{ type: "string" }, { type: "null" }] },
          receiverBic: { anyOf: [{ type: "string" }, { type: "null" }] },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            payment: openApiObject(BANKING_TRANSMISSION_PROPERTIES),
          }),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const payment = await swiftIso20022Service.generateSettlementPayment({
          nettingCycleId: request.body.nettingCycleId,
          paymentType: request.body.paymentType,
          senderBic: request.body.senderBic,
          receiverBic: request.body.receiverBic,
        });

        return reply.code(200).send({
          success: true,
          payment,
        });
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message?.includes("not found")) {
          return reply.code(404).send({
            error: "NOT_FOUND",
            message: error.message,
          });
        }
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to generate settlement payment",
        });
      }
    },
  );

  /**
   * POST /api/financial/iso20022/cbam/generate
   * Generates a compliant ISO 20022 pain.001 payment initiation for a CBAM certificate lot.
   */
  fastify.post<{
    Body: {
      lotId: string;
      debtorName: string;
      debtorIban: string;
      debtorBic: string;
      creditorNcaName?: string;
      creditorNcaIban?: string;
      creditorNcaBic?: string;
    };
  }>(
    "/api/financial/iso20022/cbam/generate",
    {
      schema: {
        description:
          "Generates ISO 20022 pain.001.001.09 payment initiation XML for settling a CBAM Certificate Lot purchase with NCA",
        tags: ["Financial Clearing - ISO 20022"],
        body: openApiObject({
          lotId: { type: "string" },
          debtorName: { type: "string" },
          debtorIban: { type: "string" },
          debtorBic: { type: "string" },
          creditorNcaName: { anyOf: [{ type: "string" }, { type: "null" }] },
          creditorNcaIban: { anyOf: [{ type: "string" }, { type: "null" }] },
          creditorNcaBic: { anyOf: [{ type: "string" }, { type: "null" }] },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            payment: openApiObject(BANKING_TRANSMISSION_PROPERTIES),
          }),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          lotId,
          debtorName,
          debtorIban,
          debtorBic,
          creditorNcaName,
          creditorNcaIban,
          creditorNcaBic,
        } = request.body;

        if (!lotId || !debtorName || !debtorIban || !debtorBic) {
          return reply.code(400).send({
            error: "BAD_REQUEST",
            message:
              "lotId, debtorName, debtorIban, and debtorBic are mandatory.",
          });
        }

        const payment =
          await swiftIso20022Service.generateCbamCertificatePayment({
            lotId,
            debtorName,
            debtorIban,
            debtorBic,
            creditorNcaName,
            creditorNcaIban,
            creditorNcaBic,
          });

        return reply.code(200).send({
          success: true,
          payment,
        });
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message?.includes("not found")) {
          return reply.code(404).send({
            error: "NOT_FOUND",
            message: error.message,
          });
        }
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Failed to generate CBAM payment instruction",
        });
      }
    },
  );

  /**
   * POST /api/financial/iso20022/fueleu/generate
   * Generates a compliant ISO 20022 pain.001 payment initiation for settling FuelEU Maritime penalties.
   */
  fastify.post<{
    Body: {
      penaltyId: string;
      debtorName: string;
      debtorIban: string;
      debtorBic: string;
      creditorFundName?: string;
      creditorFundIban?: string;
      creditorFundBic?: string;
    };
  }>(
    "/api/financial/iso20022/fueleu/generate",
    {
      schema: {
        description:
          "Generates ISO 20022 pain.001.001.09 payment initiation XML for settling FuelEU Maritime penalties with EU Innovation Fund",
        tags: ["Financial Clearing - ISO 20022"],
        body: openApiObject({
          penaltyId: { type: "string" },
          debtorName: { type: "string" },
          debtorIban: { type: "string" },
          debtorBic: { type: "string" },
          creditorFundName: { anyOf: [{ type: "string" }, { type: "null" }] },
          creditorFundIban: { anyOf: [{ type: "string" }, { type: "null" }] },
          creditorFundBic: { anyOf: [{ type: "string" }, { type: "null" }] },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            payment: openApiObject(BANKING_TRANSMISSION_PROPERTIES),
          }),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          penaltyId,
          debtorName,
          debtorIban,
          debtorBic,
          creditorFundName,
          creditorFundIban,
          creditorFundBic,
        } = request.body;

        if (!penaltyId || !debtorName || !debtorIban || !debtorBic) {
          return reply.code(400).send({
            error: "BAD_REQUEST",
            message:
              "penaltyId, debtorName, debtorIban, and debtorBic are mandatory.",
          });
        }

        const payment = await swiftIso20022Service.generateFuelEuPenaltyPayment(
          {
            penaltyId,
            debtorName,
            debtorIban,
            debtorBic,
            creditorFundName,
            creditorFundIban,
            creditorFundBic,
          },
        );

        return reply.code(200).send({
          success: true,
          payment,
        });
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message?.includes("not found")) {
          return reply.code(404).send({
            error: "NOT_FOUND",
            message: error.message,
          });
        }
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Failed to generate FuelEU payment instruction",
        });
      }
    },
  );

  /**
   * POST /api/financial/iso20022/statements/reconcile
   * Ingests electronic bank statement (camt.053) and executes automated AP/AR clearing reconciliation.
   */
  fastify.post<{
    Body: { xmlContent: string };
  }>(
    "/api/financial/iso20022/statements/reconcile",
    {
      schema: {
        description:
          "Ingests ISO 20022 camt.053 XML statement and reconciles open AP/AR invoices",
        tags: ["Financial Clearing - ISO 20022"],
        body: openApiObject({
          xmlContent: { type: "string" },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            reconciliation: openApiObject({
              statementId: { type: "string" },
              totalEntriesCount: { type: "number" },
              reconciledCount: { type: "number" },
              unmatchedCount: { type: "number" },
              entries: openApiArray(BANK_STATEMENT_ENTRY_PROPERTIES),
            }),
          }),
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const reconciliation = await swiftIso20022Service.ingestBankStatement(
        request.body.xmlContent,
      );

      return reply.code(200).send({
        success: true,
        reconciliation,
      });
    },
  );

  /**
   * POST /api/financial/iso20022/mt/translate
   * Translates raw legacy SWIFT MT message into compliant ISO 20022 XML.
   */
  fastify.post<{
    Body: {
      rawMt: string;
      targetType: "PACS_008" | "PAIN_001" | "TSMT_019";
    };
  }>(
    "/api/financial/iso20022/mt/translate",
    {
      schema: {
        description:
          "Translates SWIFT MT (MT103 / MT700) to ISO 20022 XML (pacs.008 / tsmt.019)",
        tags: ["Financial Clearing - ISO 20022"],
        body: openApiObject({
          rawMt: { type: "string" },
          targetType: {
            type: "string",
            enum: ["PACS_008", "PAIN_001", "TSMT_019"],
          },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            xml: { type: "string" },
            hash: { type: "string" },
          }),
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const { xml, hash } = swiftIso20022Service.translateMtMessage(
        request.body.rawMt,
        request.body.targetType,
      );

      return reply.code(200).send({
        success: true,
        xml,
        hash,
      });
    },
  );

  /**
   * GET /api/financial/iso20022/transmissions
   * Lists banking transmissions with optional pagination.
   */
  fastify.get<{
    Querystring: { limit?: number; category?: string };
  }>(
    "/api/financial/iso20022/transmissions",
    {
      schema: {
        description: "Lists generated ISO 20022 banking transmissions",
        tags: ["Financial Clearing - ISO 20022"],
        querystring: openApiObject({
          limit: { anyOf: [{ type: "number" }, { type: "null" }] },
          category: { anyOf: [{ type: "string" }, { type: "null" }] },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            transmissions: openApiArray(BANKING_TRANSMISSION_PROPERTIES),
          }),
          ...buildErrorResponses([500]),
        },
      },
    },
    async (request, reply) => {
      const { category, limit } = request.query;
      let transmissions = await swiftIso20022Service.listTransmissions(
        "tenant-default",
        limit || 100,
      );

      if (category && category !== "ALL") {
        transmissions = transmissions.filter((t) => {
          const meta = (t.metadata as Record<string, unknown>) || {};
          if (category === "NETTING") {
            return (
              t.nettingCycleId !== null || meta.category === "NETTING_CYCLE"
            );
          }
          if (category === "CBAM") {
            return meta.category === "CBAM_CERTIFICATE_PURCHASE";
          }
          if (category === "FUELEU") {
            return meta.category === "FUELEU_MARITIME_PENALTY";
          }
          return true;
        });
      }

      return reply.code(200).send({
        success: true,
        transmissions,
      });
    },
  );

  /**
   * GET /api/financial/iso20022/transmissions/:id
   * Retrieves single banking transmission metadata and audit trail.
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/financial/iso20022/transmissions/:id",
    {
      schema: {
        description: "Retrieves transmission details by ID",
        tags: ["Financial Clearing - ISO 20022"],
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            transmission: openApiObject(BANKING_TRANSMISSION_PROPERTIES),
          }),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const transmission = await swiftIso20022Service.getTransmissionDetails(
        request.params.id,
      );

      if (!transmission) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: `Transmission ${request.params.id} not found`,
        });
      }

      return reply.code(200).send({
        success: true,
        transmission,
      });
    },
  );

  /**
   * GET /api/financial/iso20022/transmissions/:id/xml
   * Streams raw canonical XML payload for banking clearance.
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/financial/iso20022/transmissions/:id/xml",
    {
      schema: {
        description:
          "Streams raw ISO 20022 XML document for banking network transmission",
        tags: ["Financial Clearing - ISO 20022"],
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: buildErrorResponses([400, 404, 500]),
      },
    },
    async (request, reply) => {
      const transmission = await swiftIso20022Service.getTransmissionDetails(
        request.params.id,
      );

      if (!transmission) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: `Transmission ${request.params.id} not found`,
        });
      }

      return reply
        .type("application/xml")
        .header(
          "Content-Disposition",
          `attachment; filename="${transmission.transmissionNumber}.xml"`,
        )
        .send(transmission.payloadXml);
    },
  );

  /**
   * GET /api/financial/iso20022/statements
   * Lists bank statement entries and reconciliation statuses.
   */
  fastify.get<{
    Querystring: { limit?: number };
  }>(
    "/api/financial/iso20022/statements",
    {
      schema: {
        description:
          "Lists ingested bank statement lines and their reconciliation status",
        tags: ["Financial Clearing - ISO 20022"],
        querystring: openApiObject({
          limit: { anyOf: [{ type: "number" }, { type: "null" }] },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            entries: openApiArray(BANK_STATEMENT_ENTRY_PROPERTIES),
          }),
          ...buildErrorResponses([500]),
        },
      },
    },
    async (request, reply) => {
      const entries = await swiftIso20022Service.listStatementEntries(
        "tenant-default",
        request.query.limit || 50,
      );

      return reply.code(200).send({
        success: true,
        entries,
      });
    },
  );
};

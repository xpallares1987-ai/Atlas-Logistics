/**
 * @file customs-filing.routes.ts
 * @description Fastify REST routes for Sovereign Customs Authority Gateway & mTLS XML/SOAP Filing Engine.
 * Endpoints for PKI certificate management, clearance declaration submission, transmission query, and CUSRES webhook ingestion.
 * @module @atlas/api/routes/customs-filing
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  customsGatewayService,
  type RegisterCertificateInput,
  type SubmitDeclarationInput,
  type CustomsAgency,
} from "../services/customs-gateway.service.js";
import {
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";
import { DEFAULT_OPERATOR_ACTOR } from "../scm/kernel/primitives.js";

// ============================================================================
// 1. OPENAPI TYPEBOX SCHEMAS
// ============================================================================

const CERTIFICATE_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  agency: { type: "string" },
  certificateAlias: { type: "string" },
  thumbprintSha256: { type: "string" },
  issuerDn: { type: "string" },
  subjectDn: { type: "string" },
  validFrom: { type: "string" },
  validUntil: { type: "string" },
  keyStorageType: { type: "string" },
  isRevoked: { type: "boolean" },
  createdAt: { type: "string" },
  updatedAt: { type: "string" },
};

const CERTIFICATE_SCHEMA = openApiObject(CERTIFICATE_PROPERTIES);

const TRANSMISSION_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  clearanceId: { type: "string" },
  agency: { type: "string" },
  protocol: { type: "string" },
  messageFunction: { type: "string" },
  filingReference: { type: "string" },
  payloadSha256: { type: "string" },
  signatureAlgorithm: { type: "string" },
  certificateThumbprint: { type: "string" },
  responseStatus: { type: "string" },
  mrnAssigned: { anyOf: [{ type: "string" }, { type: "null" }] },
  errorCode: { anyOf: [{ type: "string" }, { type: "null" }] },
  errorMessage: { anyOf: [{ type: "string" }, { type: "null" }] },
  sentAt: { anyOf: [{ type: "string" }, { type: "null" }] },
  acknowledgedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
  createdAt: { type: "string" },
  updatedAt: { type: "string" },
};

const TRANSMISSION_SCHEMA = openApiObject(TRANSMISSION_PROPERTIES);

// ============================================================================
// 2. FASTIFY PLUGIN IMPLEMENTATION
// ============================================================================

export const customsFilingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/customs/certificates
   * Registers a PKI digital certificate in the secure catalog.
   */
  fastify.post<{ Body: RegisterCertificateInput }>(
    "/api/customs/certificates",
    {
      schema: {
        description:
          "Registers an authorized customs PKI digital certificate in the secure ledger",
        tags: ["Customs Gateway"],
        body: openApiObject({
          agency: {
            type: "string",
            enum: ["AEAT", "ATLAS", "DELTA", "NCTS_P5", "HMRC_CDS", "CBP_ACE"],
          },
          certificateAlias: { type: "string" },
          thumbprintSha256: { type: "string" },
          issuerDn: { type: "string" },
          subjectDn: { type: "string" },
          validFrom: { type: "string" },
          validUntil: { type: "string" },
          keyStorageType: {
            type: "string",
            enum: ["LOCAL_PKCS12", "AZURE_KEYVAULT", "AWS_KMS", "PKCS11_HSM"],
          },
          tenantId: { type: "string" },
        }),
        response: {
          201: CERTIFICATE_SCHEMA,
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await customsGatewayService.registerCertificate(
          request.body,
        );
        return reply.code(201).send(result);
      } catch (err: unknown) {
        request.log.error(err, "Failed to register customs PKI certificate");
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message:
            err instanceof Error
              ? err.message
              : "Certificate registration failed",
        });
      }
    },
  );

  /**
   * GET /api/customs/certificates
   * Lists active, non-revoked digital certificates for the tenant.
   */
  fastify.get<{
    Querystring: { agency?: string; tenantId?: string };
  }>(
    "/api/customs/certificates",
    {
      schema: {
        description: "Lists active PKI certificates for customs gateways",
        tags: ["Customs Gateway"],
        querystring: openApiObject({
          agency: { type: "string" },
          tenantId: { type: "string" },
        }),
        response: {
          200: openApiArray(CERTIFICATE_PROPERTIES),
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const { agency, tenantId } = request.query;
      const list = await customsGatewayService.listCertificates(
        tenantId,
        agency as CustomsAgency | undefined,
      );
      return reply.code(200).send(list);
    },
  );

  /**
   * POST /api/customs/filings/submit
   * Synthesizes and submits a clearance declaration to the national customs authority.
   */
  fastify.post<{ Body: SubmitDeclarationInput }>(
    "/api/customs/filings/submit",
    {
      schema: {
        description:
          "Synthesizes XML/SOAP declaration, signs digest, and submits to customs authority gateway",
        tags: ["Customs Gateway"],
        body: openApiObject({
          clearanceId: { type: "string" },
          agency: {
            type: "string",
            enum: ["AEAT", "ATLAS", "DELTA", "NCTS_P5", "HMRC_CDS", "CBP_ACE"],
          },
          protocol: {
            type: "string",
            enum: ["SOAP_MTLS", "REST_MTLS", "AS4"],
          },
          messageFunction: {
            type: "string",
            enum: [
              "ORIGINAL",
              "REPLACEMENT",
              "AMENDMENT",
              "CANCELLATION",
              "STATUS_QUERY",
            ],
          },
          guaranteeReference: { type: "string" },
          simulateImmediateAck: { type: "boolean" },
          tenantId: { type: "string" },
        }),
        response: {
          200: TRANSMISSION_SCHEMA,
          201: TRANSMISSION_SCHEMA,
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = DEFAULT_OPERATOR_ACTOR;
        const result = await customsGatewayService.submitDeclaration({
          ...request.body,
          actor,
        });
        return reply.code(201).send(result);
      } catch (err: unknown) {
        request.log.error(err, "Failed to submit customs filing declaration");
        const msg =
          err instanceof Error ? err.message : "Filing submission failed";
        const code = msg.includes("not found") ? 404 : 400;
        return reply.code(code).send({
          statusCode: code,
          error: code === 404 ? "Not Found" : "Bad Request",
          message: msg,
        });
      }
    },
  );

  /**
   * GET /api/customs/filings
   * Queries customs transmissions ledger with filters.
   */
  fastify.get<{
    Querystring: {
      clearanceId?: string;
      agency?: string;
      responseStatus?: string;
      tenantId?: string;
      limit?: number;
      offset?: number;
    };
  }>(
    "/api/customs/filings",
    {
      schema: {
        description:
          "Queries transmission audit ledger for customs authority filings",
        tags: ["Customs Gateway"],
        querystring: openApiObject({
          clearanceId: { type: "string" },
          agency: { type: "string" },
          responseStatus: { type: "string" },
          tenantId: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
        }),
        response: {
          200: openApiArray(TRANSMISSION_PROPERTIES),
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const { clearanceId, agency, responseStatus, tenantId, limit, offset } =
        request.query;
      const list = await customsGatewayService.listTransmissions({
        clearanceId,
        agency: agency as CustomsAgency | undefined,
        responseStatus,
        tenantId,
        limit,
        offset,
      });
      return reply.code(200).send(list);
    },
  );

  /**
   * GET /api/customs/filings/:id
   * Retrieves single transmission record.
   */
  fastify.get<{ Params: { id: string }; Querystring: { tenantId?: string } }>(
    "/api/customs/filings/:id",
    {
      schema: {
        description: "Retrieves a single customs transmission record by ID",
        tags: ["Customs Gateway"],
        params: openApiObject({ id: { type: "string" } }),
        querystring: openApiObject({ tenantId: { type: "string" } }),
        response: {
          200: TRANSMISSION_SCHEMA,
          ...buildErrorResponses([404, 500]),
        },
      },
    },
    async (request, reply) => {
      const tx = await customsGatewayService.getTransmissionById(
        request.params.id,
        request.query.tenantId,
      );
      if (!tx) {
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Customs transmission not found: ${request.params.id}`,
        });
      }
      return reply.code(200).send(tx);
    },
  );

  /**
   * POST /api/customs/filings/:id/cusres-webhook
   * Ingestion webhook for asynchronous CUSRES responses from customs authorities.
   */
  fastify.post<{
    Params: { id: string };
    Body: { rawPayload: string; tenantId?: string };
  }>(
    "/api/customs/filings/:id/cusres-webhook",
    {
      schema: {
        description:
          "Ingests asynchronous CUSRES XML/JSON response from national customs authority",
        tags: ["Customs Gateway"],
        params: openApiObject({ id: { type: "string" } }),
        body: openApiObject({
          rawPayload: { type: "string" },
          tenantId: { type: "string" },
        }),
        response: {
          200: TRANSMISSION_SCHEMA,
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = DEFAULT_OPERATOR_ACTOR;
        const updated = await customsGatewayService.processCusresWebhook(
          request.params.id,
          request.body.rawPayload,
          request.body.tenantId,
          actor,
        );
        return reply.code(200).send(updated);
      } catch (err: unknown) {
        request.log.error(err, "Failed to process CUSRES webhook payload");
        const msg =
          err instanceof Error ? err.message : "CUSRES processing failed";
        const code = msg.includes("not found") ? 404 : 400;
        return reply.code(code).send({
          statusCode: code,
          error: code === 404 ? "Not Found" : "Bad Request",
          message: msg,
        });
      }
    },
  );
};

/**
 * @file portal-vendor.routes.ts
 * @description Fastify REST routes for Zero-Trust B2B Vendor Portal operations (ADR 0035).
 * Implements physical isolation, cryptographic Magic Access Token verification,
 * sanitized CQRS PO read-models, and decentralized factory milestone recording.
 * @module @atlas/api/routes/portal-vendor
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import {
  resolveVendorAuth,
  listVendorPos,
  getVendorPoDetail,
  confirmVendorPo,
  recordVendorMilestone,
  createMagicAccessToken,
  VendorAuthContext,
} from "../services/portal-vendor.service.js";
import {
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";
import { DEFAULT_OPERATOR_ACTOR } from "../scm/kernel/primitives.js";

// ============================================================================
// 1. OPENAPI ROUTE SCHEMAS
// ============================================================================

const PORTAL_PO_PROJECTION_PROPERTIES = {
  id: { type: "string" },
  poId: { type: "string" },
  tenantId: { type: "string" },
  vendorCompanyId: { type: "string" },
  buyerCompanyId: { type: "string" },
  poNumber: { type: "string" },
  buyerName: { type: "string" },
  supplierName: { type: "string" },
  incoterm: { type: "string" },
  expectedCargoReadyDate: { type: "string" },
  promisedCargoReadyDate: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  poStatus: { type: "string" },
  supplierConfirmationStatus: { type: "string" },
  confirmedAt: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  confirmationNotes: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  lineItemsSummaryJson: {
    type: "array",
    items: { type: "object", additionalProperties: true },
  },
  milestonesSummaryJson: {
    type: "array",
    items: { type: "object", additionalProperties: true },
  },
  exceptionsSummaryJson: {
    type: "array",
    items: { type: "object", additionalProperties: true },
  },
  lastProjectedAt: { type: "string" },
  createdAt: { anyOf: [{ type: "string" }, { type: "object" }] },
  updatedAt: { anyOf: [{ type: "string" }, { type: "object" }] },
};

const PORTAL_PO_SCHEMA = openApiObject(PORTAL_PO_PROJECTION_PROPERTIES);

const PORTAL_PO_LIST_SCHEMA = openApiArray(PORTAL_PO_PROJECTION_PROPERTIES);

const CONFIRM_PO_BODY_SCHEMA = {
  type: "object",
  required: ["promisedCargoReadyDate"],
  properties: {
    promisedCargoReadyDate: { type: "string" },
    confirmationNotes: { type: "string" },
  },
  additionalProperties: false,
};

const RECORD_MILESTONE_BODY_SCHEMA = {
  type: "object",
  required: ["milestoneCode", "actualDate"],
  properties: {
    milestoneCode: { type: "string" },
    actualDate: { type: "string" },
    notes: { type: "string" },
  },
  additionalProperties: false,
};

const CREATE_TOKEN_BODY_SCHEMA = {
  type: "object",
  required: ["poId", "companyId"],
  properties: {
    poId: { type: "string" },
    companyId: { type: "string" },
    ttlHours: { type: "integer", minimum: 1, maximum: 720 },
  },
  additionalProperties: false,
};

const CREATE_TOKEN_RESPONSE_SCHEMA = openApiObject({
  id: { type: "string" },
  rawToken: { type: "string" },
  expiresAt: { type: "integer" },
});

// ============================================================================
// 2. FASTIFY REQUEST DECORATION
// ============================================================================

declare module "fastify" {
  interface FastifyRequest {
    vendorAuth?: VendorAuthContext;
  }
}

// ============================================================================
// 3. ZERO-TRUST AUTHENTICATION PRE-HANDLER
// ============================================================================

async function requireVendorAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | void> {
  const authHeader = request.headers.authorization;
  const vendorAuth = await resolveVendorAuth(authHeader);

  if (!vendorAuth) {
    return reply.code(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message:
        "Valid Magic Access Token ('atk_vendor_*') or Bearer JWT required for Vendor Portal",
    });
  }

  request.vendorAuth = vendorAuth;
}

// ============================================================================
// 4. ROUTE REGISTRATION PLUGIN
// ============================================================================

export const portalVendorRoutes: FastifyPluginAsync = async (fastify) => {
  // --------------------------------------------------------------------------
  // POST /api/portal/vendor/tokens (Token Generation Utility)
  // --------------------------------------------------------------------------
  fastify.post<{
    Body: { poId: string; companyId: string; ttlHours?: number };
  }>(
    "/tokens",
    {
      schema: {
        tags: ["Portal Vendor"],
        summary: "Generate a cryptographic Magic Access Token for a PO",
        body: CREATE_TOKEN_BODY_SCHEMA,
        response: {
          201: CREATE_TOKEN_RESPONSE_SCHEMA,
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const result = await createMagicAccessToken({
        poId: request.body.poId,
        companyId: request.body.companyId,
        ttlHours: request.body.ttlHours,
      });

      return reply.code(201).send(result);
    },
  );

  // --------------------------------------------------------------------------
  // GET /api/portal/vendor/pos (List Sanitized POs)
  // --------------------------------------------------------------------------
  fastify.get(
    "/pos",
    {
      preHandler: [requireVendorAuth],
      schema: {
        tags: ["Portal Vendor"],
        summary: "List sanitized purchase order projections for vendor company",
        response: {
          200: PORTAL_PO_LIST_SCHEMA,
          ...buildErrorResponses([401, 500]),
        },
      },
    },
    async (request, reply) => {
      const auth = request.vendorAuth!;
      const pos = await listVendorPos(auth.vendorCompanyId, auth.allowedPoId);
      return reply.code(200).send(pos);
    },
  );

  // --------------------------------------------------------------------------
  // GET /api/portal/vendor/pos/:id (Get Sanitized PO Detail)
  // --------------------------------------------------------------------------
  fastify.get<{
    Params: { id: string };
  }>(
    "/pos/:id",
    {
      preHandler: [requireVendorAuth],
      schema: {
        tags: ["Portal Vendor"],
        summary: "Get sanitized purchase order projection detail",
        response: {
          200: PORTAL_PO_SCHEMA,
          ...buildErrorResponses([401, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const auth = request.vendorAuth!;
      const po = await getVendorPoDetail(
        auth.vendorCompanyId,
        request.params.id,
        auth.allowedPoId,
      );

      if (!po) {
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Purchase order ${request.params.id} not found or access forbidden`,
        });
      }

      return reply.code(200).send(po);
    },
  );

  // --------------------------------------------------------------------------
  // POST /api/portal/vendor/pos/:id/confirm (Confirm PO & Promised Ready Date)
  // --------------------------------------------------------------------------
  fastify.post<{
    Params: { id: string };
    Body: { promisedCargoReadyDate: string; confirmationNotes?: string };
  }>(
    "/pos/:id/confirm",
    {
      preHandler: [requireVendorAuth],
      schema: {
        tags: ["Portal Vendor"],
        summary: "Confirm PO and lock Promised Cargo Ready Date",
        body: CONFIRM_PO_BODY_SCHEMA,
        response: {
          200: PORTAL_PO_SCHEMA,
          ...buildErrorResponses([400, 401, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const auth = request.vendorAuth!;

      if (auth.allowedPoId && auth.allowedPoId !== request.params.id) {
        return reply.code(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Magic token is not scoped to this purchase order",
        });
      }

      try {
        const updated = await confirmVendorPo({
          vendorCompanyId: auth.vendorCompanyId,
          poId: request.params.id,
          promisedCargoReadyDate: request.body.promisedCargoReadyDate,
          confirmationNotes: request.body.confirmationNotes,
          actor: DEFAULT_OPERATOR_ACTOR,
        });

        return reply.code(200).send(updated);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Confirmation failed";
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: msg,
        });
      }
    },
  );

  // --------------------------------------------------------------------------
  // POST /api/portal/vendor/pos/:id/milestones (Record Factory Milestone)
  // --------------------------------------------------------------------------
  fastify.post<{
    Params: { id: string };
    Body: { milestoneCode: string; actualDate: string; notes?: string };
  }>(
    "/pos/:id/milestones",
    {
      preHandler: [requireVendorAuth],
      schema: {
        tags: ["Portal Vendor"],
        summary: "Record decentralized factory production milestone",
        body: RECORD_MILESTONE_BODY_SCHEMA,
        response: {
          200: PORTAL_PO_SCHEMA,
          ...buildErrorResponses([400, 401, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const auth = request.vendorAuth!;

      if (auth.allowedPoId && auth.allowedPoId !== request.params.id) {
        return reply.code(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Magic token is not scoped to this purchase order",
        });
      }

      try {
        const updated = await recordVendorMilestone({
          vendorCompanyId: auth.vendorCompanyId,
          poId: request.params.id,
          milestoneCode: request.body.milestoneCode,
          actualDate: request.body.actualDate,
          notes: request.body.notes,
          actor: DEFAULT_OPERATOR_ACTOR,
        });

        return reply.code(200).send(updated);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Milestone recording failed";
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: msg,
        });
      }
    },
  );
};

export default portalVendorRoutes;

/**
 * @file shipments.routes.ts
 * @description Operational shipment CRUD routes, lifecycle state management, and milestone event queries.
 * @module @atlas/api/routes/shipments
 * @see {@link docs/adr/0018-cross-tenant-security-and-jwt-rbac-contracts.md}
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { shipments, shipmentEventLogs } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { ShipmentIdParamsSchema } from "./shipments.schemas.js";
import { CreateShipmentSchema } from "@atlas/shared/src/logistics-schemas.js";
import {
  scopeByTenant,
  getCurrentTenant,
  assertTenantAccess,
  TenantAccessDeniedError,
} from "../lib/tenancy/index.js";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";

const SHIPMENT_RECORD_PROPERTIES = {
  id: { type: "string" },
  companyId: { type: "string" },
  status: { type: "string" },
  trackingNumber: { type: "string" },
  origin: { type: "string" },
  destination: { type: "string" },
  weight: { type: ["number", "null"] },
  distanceKm: { type: ["number", "null"] },
  co2eTonnes: { type: ["number", "null"] },
  serviceType: { type: ["string", "null"] },
} as const;

interface CreateShipmentBody {
  status?: string;
  origin?: string;
  destination?: string;
  weight?: number | null;
  distanceKm?: number | null;
  co2eTonnes?: number | null;
  mode?: string;
  documentBase64?: string;
  documentMimeType?: string;
  documentName?: string;
  [key: string]: unknown;
}

const shipmentsRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Shipments"],
        summary: "List all operational shipments",
        description:
          "Returns all persisted shipment records from the SQLite operational ledger.",
        response: {
          200: openApiArray(SHIPMENT_RECORD_PROPERTIES, "Shipment collection"),
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, _reply) => {
      try {
        const tenantCondition = scopeByTenant(shipments.companyId);
        const allShipments = await (tenantCondition
          ? db.select().from(shipments).where(tenantCondition)
          : db.select().from(shipments));
        return allShipments;
      } catch {
        fastify.log.warn(
          "DB unavailable for shipments, returning fallback data",
        );
        return [];
      }
    },
  );

  fastify.get<{
    Params: { id: string };
  }>(
    "/:id",
    {
      preHandler: [validate(ShipmentIdParamsSchema)],
      schema: {
        tags: ["Shipments"],
        summary: "Retrieve shipment detail with milestone events",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject(
            {
              ...SHIPMENT_RECORD_PROPERTIES,
              events: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
            },
            "Shipment detail with chronological milestone events",
          ),
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const shipment = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, id))
          .limit(1);

        if (shipment.length === 0) {
          return reply.code(404).send({ error: "Shipment not found" });
        }

        assertTenantAccess(shipment[0].companyId);

        const events = await db
          .select()
          .from(shipmentEventLogs)
          .where(eq(shipmentEventLogs.shipmentId, id));

        return {
          ...shipment[0],
          events,
        };
      } catch (error: unknown) {
        if (error instanceof TenantAccessDeniedError) {
          return reply.code(403).send({ error: error.message });
        }
        const message =
          error instanceof Error ? error.message : "Failed to fetch shipment";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{
    Body: CreateShipmentBody;
  }>(
    "/",
    {
      preHandler: [validate(CreateShipmentSchema)],
      schema: {
        tags: ["Shipments"],
        summary: "Create an operational shipment",
        body: openApiObject({
          status: { type: "string" },
          origin: { type: "string" },
          destination: { type: "string" },
          weight: { type: ["number", "null"] },
          distanceKm: { type: ["number", "null"] },
          co2eTonnes: { type: ["number", "null"] },
          mode: { type: "string" },
          documentBase64: { type: "string" },
          documentMimeType: { type: "string" },
          documentName: { type: "string" },
        }),
        response: {
          200: openApiObject(SHIPMENT_RECORD_PROPERTIES, "Created shipment"),
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          _documentBase64,
          _documentMimeType,
          _documentName,
          ...shipmentData
        } = request.body as Record<string, unknown>;

        const tenant = getCurrentTenant();
        if (
          tenant &&
          !tenant.isSuperAdmin &&
          (!tenant.organizationId || tenant.organizationId === "org_default")
        ) {
          return reply.code(403).send({
            error:
              "Access denied: authenticated tenant organization context is missing",
          });
        }
        const resolvedCompanyId =
          tenant && !tenant.isSuperAdmin ? tenant.organizationId : "c-1";

        const newShipment = await db
          .insert(shipments)
          .values({
            id: "s-" + Date.now(),
            companyId: resolvedCompanyId,
            status: (shipmentData.status as string) || "PENDING",
            trackingNumber: `SHP-${Date.now()}`,
            origin: (shipmentData.origin as string) || "UNKNOWN",
            destination: (shipmentData.destination as string) || "UNKNOWN",
            weight:
              typeof shipmentData.weight === "number"
                ? shipmentData.weight
                : null,
            distanceKm:
              typeof shipmentData.distanceKm === "number"
                ? shipmentData.distanceKm
                : null,
            co2eTonnes:
              typeof shipmentData.co2eTonnes === "number"
                ? shipmentData.co2eTonnes
                : null,
            serviceType: (shipmentData.mode as string) || "Ocean",
          })
          .returning();

        return newShipment[0];
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create shipment";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.delete<{
    Params: { id: string };
  }>(
    "/:id",
    {
      preHandler: [validate(ShipmentIdParamsSchema)],
      schema: {
        tags: ["Shipments"],
        summary: "Delete a shipment by identifier",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const existing = await db
          .select({ id: shipments.id, companyId: shipments.companyId })
          .from(shipments)
          .where(eq(shipments.id, id))
          .limit(1);

        if (existing.length === 0) {
          return reply.code(404).send({ error: "Shipment not found" });
        }

        assertTenantAccess(existing[0].companyId);

        await db.delete(shipments).where(eq(shipments.id, id));
        return { success: true };
      } catch (error: unknown) {
        if (error instanceof TenantAccessDeniedError) {
          return reply.code(403).send({ error: error.message });
        }
        const message =
          error instanceof Error ? error.message : "Failed to delete shipment";
        return reply.code(500).send({ error: message });
      }
    },
  );
};

export default shipmentsRoutes;

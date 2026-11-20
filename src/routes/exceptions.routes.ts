/**
 * @file exceptions.routes.ts
 * @description Shipment exception acknowledgement, assignment, and resolution triage routes.
 * @module @atlas/api/routes/exceptions
 */

import { FastifyInstance } from "fastify";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
} from "./openapi.schemas.js";

const EXCEPTIONS_TAG = ["Exceptions"] as const;

// In-memory exception store for development
const exceptionUpdates = new Map<
  string,
  {
    status: string;
    acknowledged_by?: string;
    assigned_to?: string;
    resolution_note?: string;
  }
>();

export default async function exceptionsRoutes(app: FastifyInstance) {
  // PATCH /exceptions/:id — Update exception status
  app.patch<{
    Params: { id: string };
    Body: { action: string; userId?: string; note?: string };
  }>(
    "/:id",
    {
      schema: {
        tags: [...EXCEPTIONS_TAG],
        summary: "Acknowledge, assign, or resolve a shipment exception",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      if (!request.user?.id && process.env.NODE_ENV !== "test") {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const { id } = request.params;
      const { action, userId, note } = request.body || {};

      if (!["acknowledge", "assign", "resolve"].includes(action)) {
        return reply.code(400).send({
          error:
            "Invalid action. Expected one of: acknowledge, assign, resolve.",
        });
      }

      const actorId = request.user?.id || userId;
      const update: {
        status: string;
        acknowledged_by?: string;
        assigned_to?: string;
        resolution_note?: string;
      } = { status: action };
      if (action === "acknowledge") {
        update.acknowledged_by = actorId || "system";
      } else if (action === "assign") {
        update.assigned_to = userId || actorId || "unassigned";
      } else if (action === "resolve") {
        update.resolution_note = note || "";
        update.status = "resolved";
      }

      exceptionUpdates.set(id, update);
      return reply.send({ success: true, id, ...update });
    },
  );
}

/**
 * @file tasks.routes.ts
 * @description Operational task triage and state transition routes.
 * @module @atlas/api/routes/tasks
 * @see {@link docs/adr/0018-cross-tenant-security-and-jwt-rbac-contracts.md}
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { tasks } from "../db/schema/support.js";
import { eq } from "drizzle-orm";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
  openApiObject,
} from "./openapi.schemas.js";

const TASKS_TAG = ["Tasks"] as const;

const tasksRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  // Get all tasks
  fastify.get(
    "/",
    {
      schema: {
        tags: [...TASKS_TAG],
        summary: "List operational tasks",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const records = await db.select().from(tasks).limit(50);
        return reply.send(records);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch tasks";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Update task state
  fastify.put<{
    Params: { id: string };
    Body: { state: string };
  }>(
    "/:id/state",
    {
      schema: {
        tags: [...TASKS_TAG],
        summary: "Transition an operational task state",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          state: { type: "string" },
        }),
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { state } = request.body;

        if (!["TODO", "IN_PROGRESS", "DONE"].includes(state)) {
          return reply.code(400).send({ error: "Invalid state" });
        }

        await db
          .update(tasks)
          .set({ status: state, updatedAt: new Date() })
          .where(eq(tasks.id, id));

        return reply.send({ success: true, id, state });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update task state";
        return reply.code(500).send({ error: message });
      }
    },
  );
};

export default tasksRoutes;

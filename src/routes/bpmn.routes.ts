/**
 * @file bpmn.routes.ts
 * @description BPMN 2.0 workflow diagram catalog and version history management routes.
 * @module @atlas/api/routes/bpmn
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { bpmnDiagrams, bpmnVersions } from "../db/schema/support.js";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../config/logger.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
} from "./openapi.schemas.js";

const BPMN_TAG = ["BPMN Workflows"] as const;

interface DiagramParams {
  id: string;
}

interface CreateDiagramBody {
  name: string;
  description?: string;
  xmlContent: string;
  authorId?: string;
}

interface CreateVersionBody {
  xmlContent: string;
  authorId?: string;
}

const bpmnRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.get(
    "/bpmn/diagrams",
    {
      schema: {
        tags: [...BPMN_TAG],
        summary: "List all stored BPMN 2.0 workflow diagrams",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const diagrams = await db.select().from(bpmnDiagrams);
        return { success: true, data: diagrams };
      } catch (error: unknown) {
        logger.error(error, "Failed to fetch BPMN diagrams");
        return reply.code(500).send({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch BPMN diagrams",
        });
      }
    },
  );

  fastify.get<{ Params: DiagramParams }>(
    "/bpmn/diagrams/:id/versions",
    {
      schema: {
        tags: [...BPMN_TAG],
        summary: "List revision versions for a BPMN 2.0 workflow diagram",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const versions = await db
          .select()
          .from(bpmnVersions)
          .where(eq(bpmnVersions.diagramId, id))
          .orderBy(desc(bpmnVersions.versionNumber));
        return { success: true, data: versions };
      } catch (error: unknown) {
        logger.error(error, "Failed to fetch BPMN versions");
        return reply.code(500).send({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch BPMN versions",
        });
      }
    },
  );

  fastify.post<{ Body: CreateDiagramBody }>(
    "/bpmn/diagrams",
    {
      schema: {
        tags: [...BPMN_TAG],
        summary: "Create a new BPMN 2.0 workflow diagram and initial version",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const { name, description, xmlContent, authorId } = request.body;
      try {
        const diagramId = crypto.randomUUID();
        await db.insert(bpmnDiagrams).values({
          id: diagramId,
          name,
          description,
        });

        await db.insert(bpmnVersions).values({
          id: crypto.randomUUID(),
          diagramId,
          versionNumber: 1,
          xmlContent,
          authorId: authorId || null,
        });

        return { success: true, data: { id: diagramId } };
      } catch (error: unknown) {
        logger.error(error, "Failed to save BPMN diagram");
        return reply.code(500).send({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to save BPMN diagram",
        });
      }
    },
  );

  fastify.post<{ Params: DiagramParams; Body: CreateVersionBody }>(
    "/bpmn/diagrams/:id/versions",
    {
      schema: {
        tags: [...BPMN_TAG],
        summary: "Publish a new incremental XML version for a BPMN diagram",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { xmlContent, authorId } = request.body;
      try {
        // Find latest version
        const latestVersion = await db
          .select()
          .from(bpmnVersions)
          .where(eq(bpmnVersions.diagramId, id))
          .orderBy(desc(bpmnVersions.versionNumber))
          .limit(1);

        const nextVersion = (latestVersion[0]?.versionNumber || 0) + 1;

        await db.insert(bpmnVersions).values({
          id: crypto.randomUUID(),
          diagramId: id,
          versionNumber: nextVersion,
          xmlContent,
          authorId: authorId || null,
        });

        return { success: true, data: { version: nextVersion } };
      } catch (error: unknown) {
        logger.error(error, "Failed to save BPMN version");
        return reply.code(500).send({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to save BPMN version",
        });
      }
    },
  );
};

export default bpmnRoutes;

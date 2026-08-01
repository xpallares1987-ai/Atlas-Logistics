import { FastifyPluginAsync } from "fastify";
import { db } from "../db/db.config.js";
import { bpmnDiagrams, bpmnVersions } from "../db/schema/support.js";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../config/logger.js";

const bpmnRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/bpmn/diagrams", async (request, reply) => {
    try {
      const diagrams = await db.select().from(bpmnDiagrams);
      return { success: true, data: diagrams };
    } catch (error: any) {
      logger.error(error, "Failed to fetch BPMN diagrams");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.get("/bpmn/diagrams/:id/versions", async (request: any, reply) => {
    const { id } = request.params;
    try {
      const versions = await db
        .select()
        .from(bpmnVersions)
        .where(eq(bpmnVersions.diagramId, id))
        .orderBy(desc(bpmnVersions.versionNumber));
      return { success: true, data: versions };
    } catch (error: any) {
      logger.error(error, "Failed to fetch BPMN versions");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/bpmn/diagrams", async (request: any, reply) => {
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
    } catch (error: any) {
      logger.error(error, "Failed to save BPMN diagram");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/bpmn/diagrams/:id/versions", async (request: any, reply) => {
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
    } catch (error: any) {
      logger.error(error, "Failed to save BPMN version");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });
};

export default bpmnRoutes;

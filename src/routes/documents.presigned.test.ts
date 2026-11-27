import { describe, it, expect, beforeAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import documentsRoutes from "./documents.routes.js";
import { db } from "../db/index.js";
import { documents } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

describe("Presigned S3 Document Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(documentsRoutes, { prefix: "/api/documents" });
    await app.ready();
  });

  it("POST /api/documents/presigned-upload should create PENDING record and return presigned PUT url", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/documents/presigned-upload",
      payload: {
        name: "test-bol.pdf",
        type: "HBL",
        mimeType: "application/pdf",
        fileSize: 2048,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.documentId).toMatch(/^doc_/);
    expect(body.uploadUrl).toBeDefined();
    expect(body.key).toContain("documents/HBL/");
    expect(body.expiresIn).toBe(900);

    // Verify DB entry
    const [row] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, body.documentId))
      .limit(1);
    expect(row).toBeDefined();
    expect(row.status).toBe("PENDING");
    expect(row.url).toBe(body.key);
  });

  it("POST /api/documents/:id/confirm should update status to AVAILABLE", async () => {
    // 1. Create upload
    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/documents/presigned-upload",
      payload: {
        name: "epod-delivery.png",
        type: "EPOD",
        mimeType: "image/png",
      },
    });
    const { documentId } = JSON.parse(uploadRes.body);

    // 2. Confirm upload
    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/documents/${documentId}/confirm`,
      payload: {
        fileSize: 4096,
        sha256Hash: "abcdef1234567890",
      },
    });

    expect(confirmRes.statusCode).toBe(200);
    const confirmBody = JSON.parse(confirmRes.body);
    expect(confirmBody.status).toBe("AVAILABLE");
    expect(confirmBody.documentId).toBe(documentId);

    // Verify in DB
    const [row] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    expect(row.status).toBe("AVAILABLE");
    expect(row.fileSize).toBe(4096);
    expect(row.sha256Hash).toBe("abcdef1234567890");
  });

  it("GET /api/documents/:id/download-url should generate a presigned GET URL", async () => {
    // 1. Create upload
    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/documents/presigned-upload",
      payload: {
        name: "customs-dua.pdf",
        type: "DUA",
        mimeType: "application/pdf",
      },
    });
    const { documentId } = JSON.parse(uploadRes.body);

    // 2. Get download URL
    const getRes = await app.inject({
      method: "GET",
      url: `/api/documents/${documentId}/download-url`,
    });

    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body);
    expect(body.success).toBe(true);
    expect(body.documentId).toBe(documentId);
    expect(body.downloadUrl).toBeDefined();
    expect(body.expiresIn).toBe(900);
  });
});

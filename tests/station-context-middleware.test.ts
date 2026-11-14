/**
 * @file station-context-middleware.test.ts
 * @description Unit & integration tests for Fastify global station context hook and write authorization guards.
 * @module @atlas/tests/station-context-middleware
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import {
  stationContextHook,
  validateStationAccess,
  validateStationWriteAccess,
} from "../src/middleware/station-context.js";
import { db } from "../src/db/index.js";
import {
  branchOffices,
  userStationAssignments,
  users,
} from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("Global Station Context Middleware & Authorization Guards", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.addHook("onRequest", stationContextHook);

    app.get("/test/context", async (request, reply) => {
      return reply.code(200).send({
        stationContext: request.stationContext || null,
        rawStationHeader: request.rawStationHeader || null,
        stationResolutionFailed: request.stationResolutionFailed || false,
      });
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("resolves valid station code BCN-OCEAN into request.stationContext", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test/context",
      headers: {
        "x-station-context": "BCN-OCEAN",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.stationContext).not.toBeNull();
    expect(body.stationContext.stationCode).toBe("BCN-OCEAN");
    expect(body.stationContext.unLocode).toBe("ESBCN");
    expect(body.stationResolutionFailed).toBe(false);
  });

  it("resolves station by UN/LOCODE ESBCN", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test/context",
      headers: {
        "x-station-context": "ESBCN",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.stationContext).not.toBeNull();
    expect(body.stationContext.unLocode).toBe("ESBCN");
  });

  it("handles 'ALL' or missing X-Station-Context header gracefully as null", async () => {
    const resAll = await app.inject({
      method: "GET",
      url: "/test/context",
      headers: {
        "x-station-context": "ALL",
      },
    });

    expect(resAll.statusCode).toBe(200);
    const bodyAll = JSON.parse(resAll.payload);
    expect(bodyAll.stationContext).toBeNull();
    expect(bodyAll.stationResolutionFailed).toBe(false);

    const resNone = await app.inject({
      method: "GET",
      url: "/test/context",
    });

    expect(resNone.statusCode).toBe(200);
    const bodyNone = JSON.parse(resNone.payload);
    expect(bodyNone.stationContext).toBeNull();
    expect(bodyNone.stationResolutionFailed).toBe(false);
  });

  it("flags stationResolutionFailed when unknown station code is supplied", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test/context",
      headers: {
        "x-station-context": "NON_EXISTENT_STN_999",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.stationContext).toBeNull();
    expect(body.stationResolutionFailed).toBe(true);
    expect(body.rawStationHeader).toBe("NON_EXISTENT_STN_999");
  });

  it("validates write access: SYSTEM_ADMIN has system-wide execution permissions", async () => {
    const mockRequest: any = {
      user: {
        id: "sysadmin_user",
        role: "SYSTEM_ADMIN",
        companyId: "c-1",
      },
    };

    const res = await validateStationWriteAccess(mockRequest, "stn_esbcn_01");
    expect(res.allowed).toBe(true);
  });

  it("validates write access: rejects non-admin operator without station assignment", async () => {
    const mockRequest: any = {
      user: {
        id: "unassigned_operator_123",
        role: "OPERATOR",
        companyId: "c-1",
      },
    };

    const res = await validateStationWriteAccess(mockRequest, "stn_esbcn_01");
    expect(res.allowed).toBe(false);
    expect(res.error).toBe("UNAUTHORIZED_CROSS_STATION_EXECUTION");
  });
});

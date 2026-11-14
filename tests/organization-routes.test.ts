/**
 * @file organization-routes.test.ts
 * @description Fastify integration test suite for Enterprise Forwarding Station & Organization routes.
 * @module @atlas/tests/organization-routes
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";

let testUserId = "admin_user_id";

// 1. Mock auth middleware per AGENTS.md rule 3
vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(async (request) => {
    (request as any).user = {
      id: testUserId,
      role: "ADMIN",
      email: "ops.admin@atlaslogistics.com",
    };
  }),
  requireRole: vi.fn(() => async () => {}),
}));

import { organizationRoutes } from "../src/routes/organization.routes.js";
import { db } from "../src/db/index.js";
import {
  users,
  branchOffices,
  departments,
  userStationAssignments,
  roles,
} from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("Enterprise Forwarding Organization & Station Fastify Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();

    // Register organization routes
    await app.register(organizationRoutes, { prefix: "/api/organization" });

    // Defensive lookup of an existing user to guarantee foreign key integrity
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .limit(1);
    if (existingUsers.length > 0) {
      testUserId = existingUsers[0].id;
    }

    const roleList = await db.select().from(roles).limit(1);
    const roleId = roleList[0]?.id || "role_ocean_operator";

    // Defensive lookup of an existing department in stn_esbcn_01
    const deptList = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.branchId, "stn_esbcn_01"))
      .limit(1);
    const deptId = deptList[0]?.id || "dept_bcn-ocean_ocean_export";

    await db
      .insert(userStationAssignments)
      .values({
        id: `assign_${testUserId}_test`,
        userId: testUserId,
        branchId: "stn_esbcn_01",
        departmentId: deptId,
        roleId,
        isPrimary: true,
      })
      .onConflictDoUpdate({
        target: [userStationAssignments.id],
        set: { isPrimary: true },
      });

    await app.ready();
  });

  afterAll(async () => {
    // Clean up test assignment
    await db
      .delete(userStationAssignments)
      .where(eq(userStationAssignments.id, `assign_${testUserId}_test`));
    await app.close();
  });

  it("GET /stations - returns list of operating freight forwarding branch stations", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/organization/stations",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(10);
    expect(Array.isArray(body.stations)).toBe(true);

    const bcn = body.stations.find((s: any) => s.stationCode === "BCN-OCEAN");
    expect(bcn).toBeDefined();
    expect(bcn.unLocode).toBe("ESBCN");
    expect(bcn.address).toBeDefined();
    expect(bcn.address.city).toBe("Barcelona");

    const nyc = body.stations.find((s: any) => s.stationCode === "NYC-GATEWAY");
    expect(nyc).toBeDefined();
    expect(nyc.fmcOtiNumber).toBe("019284-NF");
  });

  it("GET /stations/:id/departments - returns operational departments for a specific station", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/organization/stations/stn_esbcn_01/departments",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.branchId).toBe("stn_esbcn_01");
    expect(body.total).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(body.departments)).toBe(true);

    const codes = body.departments.map((d: any) => d.code);
    expect(codes).toContain("OCEAN_EXPORT");
    expect(codes).toContain("OCEAN_IMPORT");
    expect(codes).toContain("CUSTOMS_BROKERAGE");
  });

  it("GET /my-stations - returns stations and assigned roles for current authenticated user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/organization/my-stations",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.userId).toBe(testUserId);
    expect(body.isAdmin).toBe(true);
    expect(body.canAccessAllStations).toBe(true);
    expect(body.assignments.length).toBeGreaterThanOrEqual(1);

    const bcnAssign = body.assignments.find(
      (a: any) => a.branch?.stationCode === "BCN-OCEAN",
    );
    expect(bcnAssign).toBeDefined();
    expect(bcnAssign.isPrimary).toBe(true);
  });

  it("GET /alliances - returns international freight forwarding networks and alliances", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/organization/alliances",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(body.alliances)).toBe(true);

    const codes = body.alliances.map((a: any) => a.networkCode);
    expect(codes).toContain("WCA");
    expect(codes).toContain("FIATA");
    expect(codes).toContain("C5C");
  });

  it("GET /contracts - returns active ocean carrier MQC and allocation contracts", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/organization/contracts",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.contracts)).toBe(true);

    const msContract = body.contracts.find((c: any) =>
      c.contractReference.includes("SC-MSK-2026-FEWB-001"),
    );
    expect(msContract).toBeDefined();
    expect(msContract.tradeLaneName).toContain("FEWB - Far East Westbound");
    expect(msContract.station?.stationCode).toBe("BCN-OCEAN");
  });

  it("decodes station context from X-Station-Context header hook", async () => {
    // 1. With BCN-OCEAN header
    const resBcn = await app.inject({
      method: "GET",
      url: "/api/organization/context",
      headers: {
        "x-station-context": "BCN-OCEAN",
      },
    });
    expect(resBcn.statusCode).toBe(200);
    const bcnBody = resBcn.json();
    expect(bcnBody.stationContext).toBeDefined();
    expect(bcnBody.stationContext.stationCode).toBe("BCN-OCEAN");
    expect(bcnBody.stationContext.unLocode).toBe("ESBCN");
    expect(bcnBody.stationContext.primaryCurrency).toBe("EUR");

    // 2. With UN/LOCODE header (ESBCN)
    const resUnLocode = await app.inject({
      method: "GET",
      url: "/api/organization/context",
      headers: {
        "x-station-context": "ESBCN",
      },
    });
    expect(resUnLocode.statusCode).toBe(200);
    const unLocodeBody = resUnLocode.json();
    expect(unLocodeBody.stationContext).toBeDefined();
    expect(unLocodeBody.stationContext.stationCode).toBe("BCN-OCEAN");

    // 3. With ALL header (global view)
    const resAll = await app.inject({
      method: "GET",
      url: "/api/organization/context",
      headers: {
        "x-station-context": "ALL",
      },
    });
    expect(resAll.statusCode).toBe(200);
    const allBody = resAll.json();
    expect(allBody.stationContext).toBeNull();
  });
});

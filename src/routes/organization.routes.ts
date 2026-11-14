/**
 * @file organization.routes.ts
 * @description Fastify routes for Enterprise Forwarding Stations, Departments, Matrix RBAC, Alliances & MQC Allocation Contracts.
 * @module @atlas/api/routes/organization
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { db } from "../db/index.js";
import {
  branchOffices,
  departments,
  roles,
  permissions,
  rolePermissions,
  userStationAssignments,
  forwardingAgentNetworks,
  carrierAllocationContracts,
  addresses,
  users,
} from "../db/schema/index.js";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

// Extend FastifyRequest interface for TypeScript support
declare module "fastify" {
  interface FastifyRequest {
    stationContext?: {
      stationId: string;
      stationCode: string;
      unLocode: string;
      timezone: string;
      primaryCurrency: string;
    } | null;
  }
}

// ============================================================================
// 1. STATION CONTEXT HOOK & AUTHORIZATION GUARD
// ============================================================================

export async function validateStationAccess(
  userId: string,
  userRole: string,
  stationId: string,
): Promise<boolean> {
  if (userRole === "ADMIN") return true;
  const assignment = await db
    .select({ id: userStationAssignments.id })
    .from(userStationAssignments)
    .where(
      and(
        eq(userStationAssignments.userId, userId),
        eq(userStationAssignments.branchId, stationId),
      ),
    )
    .limit(1);
  return assignment.length > 0;
}

export const verifyStationAuthorization = async (request: FastifyRequest) => {
  const user = (request as any).user;
  if (user && user.id && request.stationContext) {
    const allowed = await validateStationAccess(
      user.id,
      user.role || "USER",
      request.stationContext.stationId,
    );
    if (!allowed) {
      request.log.warn(
        { userId: user.id, stationId: request.stationContext.stationId },
        "Unauthorized station context attempt rejected",
      );
      request.stationContext = null;
    }
  }
};

export const organizationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request) => {
    const headerStationCode = request.headers["x-station-context"];
    if (
      headerStationCode &&
      typeof headerStationCode === "string" &&
      headerStationCode !== "ALL"
    ) {
      try {
        const code = headerStationCode.trim().toUpperCase();
        const found = await db
          .select({
            stationId: branchOffices.id,
            stationCode: branchOffices.stationCode,
            unLocode: branchOffices.unLocode,
            timezone: branchOffices.timezone,
            primaryCurrency: branchOffices.primaryCurrency,
          })
          .from(branchOffices)
          .where(
            or(
              eq(branchOffices.stationCode, code),
              eq(branchOffices.unLocode, code),
              eq(branchOffices.iataCode, code),
              eq(branchOffices.id, headerStationCode.trim().toLowerCase()),
            ),
          )
          .limit(1);

        if (found.length > 0) {
          request.stationContext = found[0];
        } else {
          request.stationContext = null;
        }
      } catch {
        request.stationContext = null;
      }
    } else {
      request.stationContext = null;
    }
  });

  // ============================================================================
  // 2. STATIONS & GATEWAYS ENDPOINTS
  // ============================================================================

  /**
   * GET /api/organization/context
   * Returns current resolved station context derived from X-Station-Context header.
   */
  app.get(
    "/context",
    { preHandler: [authMiddleware, verifyStationAuthorization] },
    async (request, reply) => {
      return reply.code(200).send({
        success: true,
        stationContext: request.stationContext || null,
      });
    },
  );

  /**
   * GET /api/organization/stations
   * Lists all operating freight forwarding branch stations and gateways.
   */
  app.get(
    "/stations",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const rows = await db
          .select({
            id: branchOffices.id,
            companyId: branchOffices.companyId,
            stationCode: branchOffices.stationCode,
            name: branchOffices.name,
            stationType: branchOffices.stationType,
            unLocode: branchOffices.unLocode,
            iataCode: branchOffices.iataCode,
            primaryCurrency: branchOffices.primaryCurrency,
            timezone: branchOffices.timezone,
            managerUserId: branchOffices.managerUserId,
            fmcOtiNumber: branchOffices.fmcOtiNumber,
            iataNumericCode: branchOffices.iataNumericCode,
            createdAt: branchOffices.createdAt,
            updatedAt: branchOffices.updatedAt,
            address: {
              id: addresses.id,
              companyName: addresses.companyName,
              tradeName: addresses.tradeName,
              street1: addresses.street1,
              street2: addresses.street2,
              zipCode: addresses.zipCode,
              city: addresses.city,
              federalState: addresses.federalState,
              country: addresses.country,
              formattedAddress: addresses.formattedAddress,
              lat: addresses.lat,
              lon: addresses.lon,
              unLocode: addresses.unLocode,
            },
          })
          .from(branchOffices)
          .leftJoin(addresses, eq(branchOffices.addressId, addresses.id))
          .orderBy(branchOffices.stationCode);

        return reply.code(200).send({
          success: true,
          total: rows.length,
          stations: rows,
        });
      } catch (err: any) {
        request.log.error({ err }, "Error listing branch stations");
        return reply.code(500).send({
          success: false,
          message: "Failed to retrieve branch stations",
          error: err?.message,
        });
      }
    },
  );

  /**
   * GET /api/organization/stations/:id/departments
   * Lists all functional operational units and cost centers for a station.
   */
  app.get<{ Params: { id: string } }>(
    "/stations/:id/departments",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const rows = await db
          .select({
            id: departments.id,
            branchId: departments.branchId,
            code: departments.code,
            name: departments.name,
            costCenter: departments.costCenter,
            emailAlias: departments.emailAlias,
            managerUserId: departments.managerUserId,
            createdAt: departments.createdAt,
            updatedAt: departments.updatedAt,
          })
          .from(departments)
          .where(eq(departments.branchId, id))
          .orderBy(departments.code);

        return reply.code(200).send({
          success: true,
          branchId: id,
          total: rows.length,
          departments: rows,
        });
      } catch (err: any) {
        request.log.error(
          { err },
          `Error listing departments for station ${id}`,
        );
        return reply.code(500).send({
          success: false,
          message: `Failed to retrieve departments for station ${id}`,
          error: err?.message,
        });
      }
    },
  );

  /**
   * GET /api/organization/my-stations
   * Returns stations, departments, and roles assigned to the currently authenticated user.
   */
  app.get(
    "/my-stations",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = (request as any).user;
      if (!user || !user.id) {
        return reply
          .code(401)
          .send({ success: false, message: "Unauthorized" });
      }

      try {
        const isAdmin = user.role === "ADMIN";

        const assignments = await db
          .select({
            id: userStationAssignments.id,
            userId: userStationAssignments.userId,
            branchId: userStationAssignments.branchId,
            departmentId: userStationAssignments.departmentId,
            roleId: userStationAssignments.roleId,
            isPrimary: userStationAssignments.isPrimary,
            branch: {
              id: branchOffices.id,
              stationCode: branchOffices.stationCode,
              name: branchOffices.name,
              unLocode: branchOffices.unLocode,
              primaryCurrency: branchOffices.primaryCurrency,
              timezone: branchOffices.timezone,
            },
            role: {
              id: roles.id,
              name: roles.name,
              description: roles.description,
            },
          })
          .from(userStationAssignments)
          .leftJoin(
            branchOffices,
            eq(userStationAssignments.branchId, branchOffices.id),
          )
          .leftJoin(roles, eq(userStationAssignments.roleId, roles.id))
          .where(eq(userStationAssignments.userId, user.id));

        return reply.code(200).send({
          success: true,
          userId: user.id,
          userRole: user.role,
          isAdmin,
          canAccessAllStations: isAdmin,
          assignments,
        });
      } catch (err: any) {
        request.log.error({ err }, "Error retrieving user station assignments");
        return reply.code(500).send({
          success: false,
          message: "Failed to retrieve station assignments",
          error: err?.message,
        });
      }
    },
  );

  /**
   * GET /api/organization/alliances
   * Returns global forwarding alliances (WCA, FIATA, C5C) and financial coverage.
   */
  app.get(
    "/alliances",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const networks = await db
          .select()
          .from(forwardingAgentNetworks)
          .orderBy(forwardingAgentNetworks.networkCode);

        return reply.code(200).send({
          success: true,
          total: networks.length,
          alliances: networks,
        });
      } catch (err: any) {
        request.log.error(
          { err },
          "Error retrieving forwarding agent networks",
        );
        return reply.code(500).send({
          success: false,
          message: "Failed to retrieve forwarding agent networks",
          error: err?.message,
        });
      }
    },
  );

  /**
   * GET /api/organization/contracts
   * Returns active carrier MQC / BSA allocation contracts.
   */
  app.get(
    "/contracts",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const contracts = await db
          .select({
            id: carrierAllocationContracts.id,
            carrierAddressId: carrierAllocationContracts.carrierAddressId,
            branchId: carrierAllocationContracts.branchId,
            contractReference: carrierAllocationContracts.contractReference,
            tradeLaneName: carrierAllocationContracts.tradeLaneName,
            effectiveFrom: carrierAllocationContracts.effectiveFrom,
            effectiveTo: carrierAllocationContracts.effectiveTo,
            monthlyTeuMqc: carrierAllocationContracts.monthlyTeuMqc,
            committedTeuTiers: carrierAllocationContracts.committedTeuTiers,
            deadfreightPenaltyRatePerTeu:
              carrierAllocationContracts.deadfreightPenaltyRatePerTeu,
            station: {
              stationCode: branchOffices.stationCode,
              name: branchOffices.name,
            },
          })
          .from(carrierAllocationContracts)
          .leftJoin(
            branchOffices,
            eq(carrierAllocationContracts.branchId, branchOffices.id),
          )
          .orderBy(carrierAllocationContracts.contractReference);

        return reply.code(200).send({
          success: true,
          total: contracts.length,
          contracts,
        });
      } catch (err: any) {
        request.log.error(
          { err },
          "Error retrieving carrier allocation contracts",
        );
        return reply.code(500).send({
          success: false,
          message: "Failed to retrieve carrier allocation contracts",
          error: err?.message,
        });
      }
    },
  );
};

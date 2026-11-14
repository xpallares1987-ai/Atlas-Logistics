/**
 * @file organization.routes.ts
 * @description Fastify routes for Enterprise Forwarding Stations, Departments, Matrix RBAC, Alliances & MQC Allocation Contracts.
 * @module @atlas/api/routes/organization
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
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
import {
  StationContext,
  StationAccessValidationResult,
  validateStationAccess,
  stationContextHook,
} from "../middleware/station-context.js";

export {
  StationContext,
  StationAccessValidationResult,
  validateStationAccess,
  stationContextHook,
};

// ============================================================================
// 1. STATION CONTEXT HOOK & AUTHORIZATION GUARD
// ============================================================================

export const verifyStationAuthorization = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const user = (request as any).user;
  if (!user || !user.id) {
    return reply.code(401).send({
      success: false,
      error: "UNAUTHORIZED",
      message: "Authentication required to access station resources",
    });
  }

  // 1. If station resolution failed for an explicitly provided header, reject with 404
  if (request.stationResolutionFailed && request.rawStationHeader) {
    request.log.warn(
      {
        userId: user.id,
        rawHeader: request.rawStationHeader,
        path: request.url,
        correlationId: request.id,
      },
      "Station context lookup failed for requested code (404)",
    );
    return reply.code(404).send({
      success: false,
      error: "STATION_NOT_FOUND",
      message: `Requested station context '${request.rawStationHeader}' not found or inactive`,
    });
  }

  // 2. If stationContext is present, perform strict authorization check
  if (request.stationContext) {
    const authResult = await validateStationAccess(
      user.id,
      user.role || "USER",
      request.stationContext.stationId,
      user.companyId,
    );

    if (!authResult.allowed) {
      request.log.warn(
        {
          userId: user.id,
          userRole: user.role,
          userCompanyId: user.companyId,
          stationCode: request.stationContext.stationCode,
          stationId: request.stationContext.stationId,
          reason: authResult.reason,
          path: request.url,
          correlationId: request.id,
        },
        "Unauthorized station context access attempt rejected (403)",
      );

      return reply.code(403).send({
        success: false,
        error: "FORBIDDEN_STATION_ACCESS",
        message: `User '${user.id}' is not authorized to access station '${request.stationContext.stationCode}' (${authResult.reason})`,
      });
    }
  }
};

export const requireStationContext = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.stationContext) {
    return reply.code(400).send({
      success: false,
      error: "MISSING_STATION_CONTEXT",
      message:
        "Explicit X-Station-Context header is required for this station-scoped operation",
    });
  }
};

export const organizationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", stationContextHook);

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
   * Enforces station authorization guard (SEC-04 IDOR prevention).
   */
  app.get<{ Params: { id: string } }>(
    "/stations/:id/departments",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = (request as any).user;
      if (!user || !user.id) {
        return reply
          .code(401)
          .send({ success: false, message: "Unauthorized" });
      }

      const { id } = request.params;
      const cleanId = id.trim();
      const codeUpper = cleanId.toUpperCase();
      const codeLower = cleanId.toLowerCase();

      // Resolve target branch/station
      const stationRows = await db
        .select({
          id: branchOffices.id,
          stationCode: branchOffices.stationCode,
          companyId: branchOffices.companyId,
        })
        .from(branchOffices)
        .where(
          or(
            eq(branchOffices.id, codeLower),
            eq(branchOffices.stationCode, codeUpper),
            eq(branchOffices.unLocode, codeUpper),
          ),
        )
        .limit(1);

      if (stationRows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: "STATION_NOT_FOUND",
          message: `Station '${id}' not found`,
        });
      }

      const targetStation = stationRows[0];

      // Validate user access to targetStation
      const authResult = await validateStationAccess(
        user.id,
        user.role || "USER",
        targetStation.id,
        user.companyId,
      );

      if (!authResult.allowed) {
        request.log.warn(
          {
            userId: user.id,
            targetStation: targetStation.stationCode,
            reason: authResult.reason,
            path: request.url,
            correlationId: request.id,
          },
          "Cross-station direct resource access attempt rejected (403)",
        );
        return reply.code(403).send({
          success: false,
          error: "FORBIDDEN_STATION_ACCESS",
          message: `User '${user.id}' is not authorized to access station '${targetStation.stationCode}' (${authResult.reason})`,
        });
      }

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
          .where(eq(departments.branchId, targetStation.id))
          .orderBy(departments.code);

        return reply.code(200).send({
          success: true,
          branchId: targetStation.id,
          stationCode: targetStation.stationCode,
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
   * Scoped to stationContext when provided, or filtered by user's assigned stations for operators.
   */
  app.get(
    "/contracts",
    { preHandler: [authMiddleware, verifyStationAuthorization] },
    async (request, reply) => {
      const user = (request as any).user;
      try {
        let condition;

        if (request.stationContext) {
          condition = eq(
            carrierAllocationContracts.branchId,
            request.stationContext.stationId,
          );
        } else if (
          user &&
          user.role !== "ADMIN" &&
          user.role !== "SYSTEM_ADMIN" &&
          user.role !== "COMPANY_ADMIN"
        ) {
          // Operators without active stationContext: filter by their assigned stations
          const assigned = await db
            .select({ branchId: userStationAssignments.branchId })
            .from(userStationAssignments)
            .where(eq(userStationAssignments.userId, user.id));

          const branchIds = assigned.map((a) => a.branchId);
          if (branchIds.length === 0) {
            return reply.code(200).send({
              success: true,
              total: 0,
              contracts: [],
            });
          }
          condition = inArray(carrierAllocationContracts.branchId, branchIds);
        }

        const query = db
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
          );

        const contracts = condition
          ? await query
              .where(condition)
              .orderBy(carrierAllocationContracts.contractReference)
          : await query.orderBy(carrierAllocationContracts.contractReference);

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

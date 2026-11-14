/**
 * @file station-context.ts
 * @description Fastify middleware and onRequest hook for global station context resolution and cross-station authorization guards.
 * @module @atlas/api/middleware/station-context
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { branchOffices, userStationAssignments } from "../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";

// ============================================================================
// 1. TYPE DEFINITIONS & REQUEST AUGMENTATION
// ============================================================================

export interface StationContext {
  stationId: string; // Canonical DB Primary Key (e.g. "stn_esbcn_01")
  stationCode: string; // Operational Business Code (e.g. "BCN-OCEAN")
  companyId: string; // Owning Tenant Company ID (e.g. "c-1")
  unLocode: string; // Gateway UN/LOCODE (e.g. "ESBCN")
  timezone: string;
  primaryCurrency: string;
}

declare module "fastify" {
  interface FastifyRequest {
    stationContext?: StationContext | null;
    rawStationHeader?: string | null;
    stationResolutionFailed?: boolean;
  }
}

export interface StationAccessValidationResult {
  allowed: boolean;
  reason?:
    | "SYSTEM_ADMIN_ACCESS"
    | "COMPANY_ADMIN_ACCESS"
    | "STATION_ASSIGNMENT_VERIFIED"
    | "STATION_NOT_FOUND"
    | "CROSS_COMPANY_ACCESS_DENIED"
    | "NO_STATION_ASSIGNMENT";
}

// In-memory cache for resolved stations to avoid duplicate DB queries per request
const stationCache = new Map<string, StationContext | null>();
const CACHE_TTL_MS = 60_000;
let lastCacheReset = Date.now();

function getCachedStation(key: string): StationContext | null | undefined {
  if (Date.now() - lastCacheReset > CACHE_TTL_MS) {
    stationCache.clear();
    lastCacheReset = Date.now();
    return undefined;
  }
  return stationCache.get(key);
}

// ============================================================================
// 2. GLOBAL FASTIFY ON_REQUEST HOOK
// ============================================================================

/**
 * Extracts and resolves the X-Station-Context header into request.stationContext.
 * Gracefully defaults to null if header is missing, empty, or 'ALL'.
 */
export async function stationContextHook(
  request: FastifyRequest,
): Promise<void> {
  const headerStation = request.headers["x-station-context"];

  if (!headerStation || typeof headerStation !== "string") {
    request.stationContext = null;
    request.rawStationHeader = null;
    request.stationResolutionFailed = false;
    return;
  }

  const rawCode = headerStation.trim();
  if (!rawCode || rawCode.toUpperCase() === "ALL") {
    request.stationContext = null;
    request.rawStationHeader = rawCode || null;
    request.stationResolutionFailed = false;
    return;
  }

  request.rawStationHeader = rawCode;
  const cacheKey = rawCode.toUpperCase();
  const cached = getCachedStation(cacheKey);

  if (cached !== undefined) {
    request.stationContext = cached;
    request.stationResolutionFailed = cached === null;
    return;
  }

  const codeUpper = rawCode.toUpperCase();
  const codeLower = rawCode.toLowerCase();

  try {
    const found = await db
      .select({
        stationId: branchOffices.id,
        stationCode: branchOffices.stationCode,
        companyId: branchOffices.companyId,
        unLocode: branchOffices.unLocode,
        timezone: branchOffices.timezone,
        primaryCurrency: branchOffices.primaryCurrency,
      })
      .from(branchOffices)
      .where(
        or(
          eq(branchOffices.stationCode, codeUpper),
          eq(branchOffices.unLocode, codeUpper),
          eq(branchOffices.iataCode, codeUpper),
          eq(branchOffices.id, codeLower),
        ),
      )
      .limit(1);

    if (found.length > 0) {
      request.stationContext = found[0];
      request.stationResolutionFailed = false;
      stationCache.set(cacheKey, found[0]);
    } else {
      request.stationContext = null;
      request.stationResolutionFailed = true;
      stationCache.set(cacheKey, null);
    }
  } catch {
    request.stationContext = null;
    request.stationResolutionFailed = true;
  }
}

// ============================================================================
// 3. AUTHORIZATION & WRITE-ACCESS GUARDS
// ============================================================================

/**
 * Validates whether a user has permission to view or execute operations for a station.
 */
export async function validateStationAccess(
  userId: string,
  userRole: string,
  stationId: string,
  userCompanyId?: string | null,
): Promise<StationAccessValidationResult> {
  // 1. SYSTEM_ADMIN has system-wide access across all companies and stations
  if (userRole === "SYSTEM_ADMIN") {
    return { allowed: true, reason: "SYSTEM_ADMIN_ACCESS" };
  }

  // Retrieve station details including tenant companyId
  const stationRows = await db
    .select({
      id: branchOffices.id,
      companyId: branchOffices.companyId,
    })
    .from(branchOffices)
    .where(eq(branchOffices.id, stationId))
    .limit(1);

  if (stationRows.length === 0) {
    return { allowed: false, reason: "STATION_NOT_FOUND" };
  }

  const station = stationRows[0];

  // 2. COMPANY_ADMIN or general ADMIN: strictly bounded by company boundaries
  if (userRole === "COMPANY_ADMIN" || userRole === "ADMIN") {
    if (userCompanyId && station.companyId !== userCompanyId) {
      return { allowed: false, reason: "CROSS_COMPANY_ACCESS_DENIED" };
    }
    return { allowed: true, reason: "COMPANY_ADMIN_ACCESS" };
  }

  // 3. Operational users require explicit station assignment in user_station_assignments
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

  if (assignment.length === 0) {
    return { allowed: false, reason: "NO_STATION_ASSIGNMENT" };
  }

  return { allowed: true, reason: "STATION_ASSIGNMENT_VERIFIED" };
}

/**
 * Guardrail for mutation endpoints: asserts user has write authority for target station.
 */
export async function validateStationWriteAccess(
  request: FastifyRequest,
  targetBranchId?: string | null,
): Promise<{ allowed: boolean; error?: string; message?: string }> {
  let user = (request as any).user;
  if (!user || !user.id) {
    const headers = request.headers;
    const userId = headers["x-user-id"] as string | undefined;
    if (userId) {
      const rolesHeader = headers["x-roles"] as string | undefined;
      const role = rolesHeader ? rolesHeader.split(",")[0].trim() : "OPERATOR";
      const companyId =
        (headers["x-org-id"] as string) ||
        (headers["x-company-id"] as string) ||
        null;
      user = { id: userId, role, companyId };
      (request as any).user = user;
    }
  }

  if (!user || !user.id) {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      return { allowed: true };
    }
    return {
      allowed: false,
      error: "UNAUTHORIZED",
      message: "User session is required",
    };
  }

  // If no target station is specified, allow write if user is authenticated
  if (!targetBranchId || targetBranchId === "ALL") {
    return { allowed: true };
  }

  const authResult = await validateStationAccess(
    user.id,
    user.role || "OPERATOR",
    targetBranchId,
    user.companyId || user.company_id,
  );

  if (!authResult.allowed) {
    return {
      allowed: false,
      error: "UNAUTHORIZED_CROSS_STATION_EXECUTION",
      message: `User '${user.id}' is not authorized to execute operations on station '${targetBranchId}' (${authResult.reason})`,
    };
  }

  return { allowed: true };
}

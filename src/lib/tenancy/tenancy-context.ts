import { AsyncLocalStorage } from "async_hooks";
import { eq, SQL } from "drizzle-orm";
import { FastifyPluginAsync } from "fastify";

export interface TenantContext {
  organizationId: string;
  userId?: string;
  role?: string;
  isSuperAdmin?: boolean;
}

export class TenantAccessDeniedError extends Error {
  constructor(
    message = "Access denied: resource belongs to a different organization",
  ) {
    super(message);
    this.name = "TenantAccessDeniedError";
  }
}

/** Node.js AsyncLocalStorage instance for request-scoped tenant isolation */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get current active tenant context from AsyncLocalStorage.
 * Returns null if executed outside of an organization context.
 */
export function getCurrentTenant(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}

/**
 * Execute a callback inside an explicit tenant context.
 */
export function runWithTenant<T>(context: TenantContext, callback: () => T): T {
  return tenantStorage.run(context, callback);
}

/**
 * Enforce and assert tenant boundary.
 * Throws TenantAccessDeniedError if resource belongs to a different organization
 * and current context is not SUPER_ADMIN.
 */
export function assertTenantAccess(
  resourceOrgId: string | null | undefined,
  context?: TenantContext | null,
): void {
  const current = context ?? getCurrentTenant();
  if (!current) return; // Unscoped / system background task
  if (current.isSuperAdmin) return; // Super admin bypass

  if (resourceOrgId && resourceOrgId !== current.organizationId) {
    throw new TenantAccessDeniedError(
      `Cross-tenant access violation: resource organization (${resourceOrgId}) does not match authenticated organization (${current.organizationId})`,
    );
  }
}

/**
 * Generic Drizzle query scoping helper.
 * Generates an SQL condition `eq(column, currentOrgId)`.
 *
 * @param tableColumn The column representing companyId / customerId / organizationId on the table
 * @param explicitOrgId Optional explicit override orgId
 */
export function scopeByTenant(
  tableColumn: any,
  explicitOrgId?: string,
): SQL | undefined {
  const orgId = explicitOrgId ?? getCurrentTenant()?.organizationId;
  const current = getCurrentTenant();

  if (current?.isSuperAdmin && !explicitOrgId) {
    return undefined; // Super admins see all records unless explicitly filtered
  }

  if (!orgId) {
    return undefined;
  }

  return eq(tableColumn, orgId);
}

/**
 * Fastify Plugin to bind tenant context to the asynchronous request execution tree.
 */
export const tenancyPluginAsync: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", (request, _reply, done) => {
    const user = (request as any).user;
    const headerOrgId = request.headers["x-organization-id"] as
      string | undefined;

    const organizationId =
      user?.companyId || user?.organizationId || headerOrgId || "org_default";
    const role = user?.role || "USER";
    const isSuperAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

    const context: TenantContext = {
      organizationId,
      userId: user?.id,
      role,
      isSuperAdmin,
    };

    tenantStorage.run(context, () => {
      done();
    });
  });
};

export const tenancyPlugin = tenancyPluginAsync;

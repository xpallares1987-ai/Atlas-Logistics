import { AsyncLocalStorage } from "async_hooks";
import { Column, eq, SQL } from "drizzle-orm";
import { FastifyPluginAsync, FastifyRequest } from "fastify";

interface TenantRequestUser {
  id?: string;
  companyId?: string;
  organizationId?: string;
  role?: string;
}

function getRequestUser(
  request: FastifyRequest,
): TenantRequestUser | undefined {
  return (request as unknown as { user?: TenantRequestUser }).user;
}

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

  if (!current.organizationId || current.organizationId === "org_default") {
    throw new TenantAccessDeniedError(
      "Access denied: authenticated tenant organization context is missing",
    );
  }

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
  tableColumn: Column,
  explicitOrgId?: string,
): SQL | undefined {
  const current = getCurrentTenant();
  if (!current && !explicitOrgId) {
    return undefined; // Outside HTTP request tenant context (e.g. background jobs / unit tests)
  }

  if (current?.isSuperAdmin && !explicitOrgId) {
    return undefined; // Super admins see all records unless explicitly filtered
  }

  const orgId = explicitOrgId ?? current?.organizationId;
  if (!orgId || orgId === "org_default") {
    // Fail-closed: never return unscoped rows when inside a non-admin request context lacking companyId
    return eq(tableColumn, "__UNBOUNDED_TENANT_DENIED__");
  }

  return eq(tableColumn, orgId);
}

/**
 * Fastify Plugin to bind tenant context to the asynchronous request execution tree.
 */
export const tenancyPluginAsync: FastifyPluginAsync = async (fastify) => {
  const resolveTenantFromRequest = (request: FastifyRequest): TenantContext => {
    const user = getRequestUser(request);
    const headerOrgId =
      process.env.NODE_ENV === "test"
        ? (request.headers["x-organization-id"] as string | undefined)
        : undefined;

    const organizationId =
      user?.companyId || user?.organizationId || headerOrgId || "";
    const role = user?.role || "USER";
    const isSuperAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

    return {
      organizationId,
      userId: user?.id,
      role,
      isSuperAdmin,
    };
  };

  fastify.addHook("onRequest", (request, _reply, done) => {
    const context = resolveTenantFromRequest(request);
    tenantStorage.run(context, () => {
      done();
    });
  });

  fastify.addHook("preHandler", (request, _reply, done) => {
    const store = tenantStorage.getStore();
    if (store) {
      const updated = resolveTenantFromRequest(request);
      if (updated.organizationId || updated.userId) {
        store.organizationId = updated.organizationId;
        store.userId = updated.userId;
        store.role = updated.role;
        store.isSuperAdmin = updated.isSuperAdmin;
      }
    }
    done();
  });
};

(tenancyPluginAsync as unknown as Record<symbol, boolean>)[
  Symbol.for("skip-override")
] = true;

export const tenancyPlugin = tenancyPluginAsync;

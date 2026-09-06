import { describe, it, expect } from "vitest";
import {
  runWithTenant,
  getCurrentTenant,
  assertTenantAccess,
  scopeByTenant,
  TenantAccessDeniedError,
} from "./tenancy-context.js";
import { shipments } from "../../db/schema/operations.js";

describe("TenancyContext & Scoping Helper", () => {
  it("stores and retrieves tenant context in AsyncLocalStorage", () => {
    expect(getCurrentTenant()).toBeNull();

    runWithTenant(
      {
        organizationId: "org_acme",
        userId: "usr_alice",
        role: "FORWARDER",
        isSuperAdmin: false,
      },
      () => {
        const ctx = getCurrentTenant();
        expect(ctx).not.toBeNull();
        expect(ctx?.organizationId).toBe("org_acme");
        expect(ctx?.userId).toBe("usr_alice");
      },
    );

    expect(getCurrentTenant()).toBeNull();
  });

  it("asserts tenant access successfully when org matches", () => {
    runWithTenant(
      {
        organizationId: "org_acme",
        isSuperAdmin: false,
      },
      () => {
        expect(() => assertTenantAccess("org_acme")).not.toThrow();
      },
    );
  });

  it("throws TenantAccessDeniedError when accessing foreign organization resource", () => {
    runWithTenant(
      {
        organizationId: "org_acme",
        isSuperAdmin: false,
      },
      () => {
        expect(() => assertTenantAccess("org_rival_corp")).toThrow(
          TenantAccessDeniedError,
        );
      },
    );
  });

  it("allows SUPER_ADMIN to cross tenant boundaries without error", () => {
    runWithTenant(
      {
        organizationId: "org_admin",
        isSuperAdmin: true,
        role: "SUPER_ADMIN",
      },
      () => {
        expect(() => assertTenantAccess("org_any_tenant")).not.toThrow();
      },
    );
  });

  it("generates SQL equality condition for scoped table column", () => {
    runWithTenant(
      {
        organizationId: "org_123",
        isSuperAdmin: false,
      },
      () => {
        const condition = scopeByTenant(shipments.companyId);
        expect(condition).toBeDefined();
      },
    );
  });

  it("returns undefined condition for SUPER_ADMIN so all records are visible", () => {
    runWithTenant(
      {
        organizationId: "org_system",
        isSuperAdmin: true,
      },
      () => {
        const condition = scopeByTenant(shipments.companyId);
        expect(condition).toBeUndefined();
      },
    );
  });
});

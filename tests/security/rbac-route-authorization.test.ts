/**
 * @file rbac-route-authorization.test.ts
 * @description Negative and positive RBAC Fastify integration tests verifying 401 Unauthorized, 403 Forbidden, role hierarchy aliases, and ADMIN superuser bypass on real domain routes (CBAM, Trade Finance, Customs, Bookings).
 * @module @atlas/tests/security/rbac-route-authorization
 * @see {@link docs/adr/0018-cross-tenant-security-and-jwt-rbac-contracts.md}
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import jwt from "jsonwebtoken";
import {
  isRoleAuthorized,
  ROLE_HIERARCHY_ALIASES,
} from "../../src/middleware/auth.js";
import { cbamRoutes } from "../../src/modules/cbam/cbam.routes.js";
import { tradeFinanceRoutes } from "../../src/modules/trade-finance/trade-finance.routes.js";
import customsRoutes from "../../src/modules/customs/customs.routes.js";
import bookingsRoutes from "../../src/routes/bookings.routes.js";
import { invoicesRoutes } from "../../src/routes/financial/invoices.routes.js";
import { settlementsRoutes } from "../../src/routes/financial/settlements.routes.js";

const TEST_JWT_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
    ? process.env.JWT_SECRET
    : "atlas-rbac-integration-test-secret-32chars-min!!";
process.env.JWT_SECRET = TEST_JWT_SECRET;

function signTestToken(
  payload: { id: string; role?: string; email?: string; companyId?: string },
  secret = TEST_JWT_SECRET,
  expiresIn = "1h",
): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

describe("P1-C: Domain-Tiered Route RBAC Security Suite", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(fastifyCookie, { secret: TEST_JWT_SECRET });

    // Register real domain routes under their standard prefixes
    await app.register(cbamRoutes, { prefix: "/api/cbam" });
    await app.register(tradeFinanceRoutes, { prefix: "/api/trade-finance" });
    await app.register(customsRoutes, { prefix: "/api" });
    await app.register(bookingsRoutes, { prefix: "/api/bookings" });
    await app.register(invoicesRoutes, { prefix: "/api" });
    await app.register(settlementsRoutes, { prefix: "/api" });

    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ============================================================================
  // 1. UNIT & HIERARCHY ALIAS SANITY CHECKS
  // ============================================================================
  describe("Role Hierarchy & Superuser Logic (Unit)", () => {
    it("recognizes ADMIN and SYSTEM_ADMIN as superusers bypass on any route requirement", () => {
      expect(isRoleAuthorized("ADMIN", ["COMPLIANCE"])).toBe(true);
      expect(isRoleAuthorized("admin", ["ACCOUNTING"])).toBe(true);
      expect(isRoleAuthorized("SYSTEM_ADMIN", ["OPERATIONS"])).toBe(true);
      expect(isRoleAuthorized("system_admin", ["CUSTOMS"])).toBe(true);
    });

    it("evaluates operational role hierarchy aliases accurately", () => {
      expect(isRoleAuthorized("ESG_OFFICER", ["COMPLIANCE"])).toBe(true);
      expect(isRoleAuthorized("ROLE_COMPLIANCE_OFFICER", ["COMPLIANCE"])).toBe(
        true,
      );
      expect(isRoleAuthorized("FINANCE", ["ACCOUNTING"])).toBe(true);
      expect(isRoleAuthorized("CONTROLLING", ["ACCOUNTING"])).toBe(true);
      expect(isRoleAuthorized("CUSTOMS_BROKER", ["CUSTOMS"])).toBe(true);
      expect(isRoleAuthorized("ROLE_CUSTOMS_DECLARANT", ["CUSTOMS"])).toBe(
        true,
      );
      expect(isRoleAuthorized("OPERATOR", ["OPERATIONS"])).toBe(true);
      expect(isRoleAuthorized("ROLE_OCEAN_OPERATOR", ["OPERATIONS"])).toBe(
        true,
      );
    });

    it("rejects unauthorized or unknown roles", () => {
      expect(isRoleAuthorized("CUSTOMER", ["COMPLIANCE"])).toBe(false);
      expect(isRoleAuthorized("VIEWER", ["ACCOUNTING"])).toBe(false);
      expect(isRoleAuthorized("GUEST", ["OPERATIONS"])).toBe(false);
      expect(isRoleAuthorized(null, ["OPERATIONS"])).toBe(false);
      expect(isRoleAuthorized(undefined, ["OPERATIONS"])).toBe(false);
    });
  });

  // ============================================================================
  // 2. NEGATIVE ROUTE INJECTIONS: MISSING / INVALID CREDENTIALS (401)
  // ============================================================================
  describe("Missing or Invalid Credentials (401 Unauthorized)", () => {
    it("returns 401 when calling protected CBAM endpoints without Bearer token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/cbam/certificates/lots",
        payload: { lotReference: "LOT-UNAUTH-01" },
      });
      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.error).toMatch(/Unauthorized|Missing Authentication/i);
    });

    it("returns 401 when calling protected Trade Finance endpoints with invalid JWT token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/trade-finance/instruments",
        headers: { authorization: "Bearer invalid.signature.token" },
        payload: { applicantName: "Acme Corp" },
      });
      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.error).toMatch(/Unauthorized|Invalid or expired/i);
    });

    it("returns 401 when calling protected Customs clearance with expired JWT token", async () => {
      const expiredToken = signTestToken(
        { id: "u-expired", role: "CUSTOMS" },
        TEST_JWT_SECRET,
        "-1h",
      );
      const res = await app.inject({
        method: "POST",
        url: "/api/customs-declarations/dua-test/clearance",
        headers: { authorization: `Bearer ${expiredToken}` },
        payload: { channel: "VERDE" },
      });
      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.error).toMatch(/Unauthorized|Invalid or expired/i);
    });

    it("returns 401 when calling protected Booking confirm without token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/bookings/bk-123/confirm",
        payload: { carrierBookingNumber: "MSCU12345" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 when calling protected Invoices mutation endpoints without Bearer token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/invoices",
        payload: {
          invoiceNumber: "INV-2026-UNAUTH-01",
          type: "AR",
        },
      });

      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.error || json.message).toMatch(
        /Unauthorized|Missing Authentication|Invalid or expired/i,
      );
    });

    it("returns 401 when calling protected Agent Settlements generation without Bearer token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/agent-settlements",
        payload: {
          agentId: "agent-unauth-01",
          periodStart: "2026-01-01",
          periodEnd: "2026-01-31",
        },
      });

      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.error || json.message).toMatch(
        /Unauthorized|Missing Authentication|Invalid or expired/i,
      );
    });
  });

  // ============================================================================
  // 3. NEGATIVE ROUTE INJECTIONS: UNDER-PRIVILEGED ROLES (403 FORBIDDEN)
  // ============================================================================
  describe("Under-privileged Roles (403 Forbidden with Envelope)", () => {
    it("returns 403 when a CUSTOMER tries to register a CBAM certificate lot", async () => {
      const customerToken = signTestToken({
        id: "cust-01",
        role: "CUSTOMER",
        companyId: "comp-cust",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/cbam/certificates/lots",
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          lotReference: "LOT-UNPRIV-01",
          purchaseDate: "2026-10-15",
          ncaRegistryAccountId: "NCA-ES-01",
          quantityPurchased: 50,
          unitPriceEur: 85.5,
        },
      });

      expect(res.statusCode).toBe(403);
      const json = res.json();
      expect(json).toMatchObject({
        error: "Forbidden: Insufficient permissions",
        code: "INSUFFICIENT_ROLE",
        userRole: "CUSTOMER",
        requiredRoles: ["COMPLIANCE", "OPERATIONS"],
      });
    });

    it("returns 403 when a VIEWER tries to issue a Trade Finance instrument", async () => {
      const viewerToken = signTestToken({
        id: "view-01",
        role: "VIEWER",
        companyId: "comp-view",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/trade-finance/instruments",
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { applicantName: "Acme Corp" },
      });

      expect(res.statusCode).toBe(403);
      const json = res.json();
      expect(json).toMatchObject({
        error: "Forbidden: Insufficient permissions",
        code: "INSUFFICIENT_ROLE",
        userRole: "VIEWER",
        requiredRoles: ["ACCOUNTING", "CONTROLLING"],
      });
    });

    it("returns 403 when an OPERATIONS user tries to issue a Trade Finance instrument (Accounting only)", async () => {
      const opsToken = signTestToken({
        id: "ops-01",
        role: "OPERATIONS",
        companyId: "comp-ops",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/trade-finance/instruments",
        headers: { authorization: `Bearer ${opsToken}` },
        payload: { applicantName: "Acme Corp" },
      });

      expect(res.statusCode).toBe(403);
      const json = res.json();
      expect(json.code).toBe("INSUFFICIENT_ROLE");
      expect(json.requiredRoles).toEqual(["ACCOUNTING", "CONTROLLING"]);
    });

    it("returns 403 when a CUSTOMER tries to create a new booking (requires OPERATIONS or SALES)", async () => {
      const customerToken = signTestToken({
        id: "cust-02",
        role: "CUSTOMER",
        companyId: "comp-cust",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/bookings",
        headers: { authorization: `Bearer ${customerToken}` },
        payload: { origin: "VLC", destination: "HAM" },
      });

      expect(res.statusCode).toBe(403);
      const json = res.json();
      expect(json.code).toBe("INSUFFICIENT_ROLE");
      expect(json.requiredRoles).toEqual(["OPERATIONS", "SALES"]);
    });

    it("returns 403 when an OPERATIONS user tries to create an invoice (requires ACCOUNTING or ADMIN)", async () => {
      const opsToken = signTestToken({
        id: "ops-02",
        role: "OPERATIONS",
        companyId: "comp-ops",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/invoices",
        headers: { authorization: `Bearer ${opsToken}` },
        payload: {
          invoiceNumber: "INV-2026-FAIL-01",
          type: "AR",
          totalAmount: 1500,
        },
      });

      expect(res.statusCode).toBe(403);
      const json = res.json();
      expect(json.code).toBe("INSUFFICIENT_ROLE");
      expect(json.requiredRoles).toEqual(["ACCOUNTING", "ADMIN"]);
    });

    it("returns 403 when a CUSTOMS officer tries to generate agent settlement (requires ACCOUNTING or ADMIN)", async () => {
      const customsToken = signTestToken({
        id: "cust-03",
        role: "CUSTOMS_BROKER",
        companyId: "comp-customs",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/agent-settlements",
        headers: { authorization: `Bearer ${customsToken}` },
        payload: {
          agentId: "agent-01",
          periodStart: "2026-01-01",
          periodEnd: "2026-01-31",
        },
      });

      expect(res.statusCode).toBe(403);
      const json = res.json();
      expect(json.code).toBe("INSUFFICIENT_ROLE");
      expect(json.requiredRoles).toEqual(["ACCOUNTING", "ADMIN"]);
    });
  });

  // ============================================================================
  // 4. POSITIVE ROUTE INJECTIONS: AUTHORIZED ROLES & ADMIN SUPERUSER (PASSTHROUGH)
  // ============================================================================
  describe("Authorized Roles & ADMIN Superuser Passthrough", () => {
    it("allows ADMIN to bypass role checks on Trade Finance instrument issuance", async () => {
      const adminToken = signTestToken({
        id: "admin-01",
        role: "ADMIN",
        companyId: "holding-01",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/trade-finance/instruments",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          applicantName: "Admin Test Applicant",
          beneficiaryName: "Admin Test Beneficiary",
          issuingBankBic: "BNPAESMMXXX",
          issuingBankName: "BNP Paribas",
          creditAmount: 50000,
          currency: "EUR",
          issueDate: "2026-10-01",
          latestShipmentDate: "2026-11-01",
          expiryDate: "2026-11-15",
          portOfLoading: "VLC",
          portOfDischarge: "HAM",
          goodsDescriptionSummary: "Electronics components",
        },
      });

      // Does not fail with 401 or 403! (Returns 201 created)
      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).not.toBe(403);
      expect(res.statusCode).toBe(201);
      expect(res.json().applicantName).toBe("Admin Test Applicant");
    });

    it("allows COMPLIANCE officer to publish weekly EEX quote in CBAM", async () => {
      const complianceToken = signTestToken({
        id: "esg-01",
        role: "ESG_OFFICER", // Alias for COMPLIANCE
        companyId: "holding-01",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/cbam/eex/quotes",
        headers: { authorization: `Bearer ${complianceToken}` },
        payload: {
          quoteWeek: "2026-W43",
          validFrom: "2026-10-19",
          validUntil: "2026-10-25",
          auctionAveragePriceEur: 88.25,
          source: "EEX_AUCTION",
        },
      });

      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).not.toBe(403);
      expect(res.statusCode).toBe(201);
      expect(res.json().quoteWeek).toBe("2026-W43");
    });

    it("allows ROLE_FINANCIAL_CONTROLLER to validate UCP discrepancy in Trade Finance", async () => {
      const controllerToken = signTestToken({
        id: "ctrl-01",
        role: "ROLE_FINANCIAL_CONTROLLER", // Alias for ACCOUNTING
        companyId: "holding-01",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/trade-finance/instruments/inst_mock_nonexistent/validate-ucp",
        headers: { authorization: `Bearer ${controllerToken}` },
        payload: { presentationDate: "2026-10-20" },
      });

      // Authorization succeeded: reaches route handler which returns 404 for nonexistent instrument
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toMatch(
        /Trade credit instrument not found|Instrument not found/i,
      );
    });

    it("allows ACCOUNTING officer to create an invoice and sync GL", async () => {
      const accountantToken = signTestToken({
        id: "acct-01",
        role: "ACCOUNTING",
        companyId: "comp-2",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/invoices",
        headers: { authorization: `Bearer ${accountantToken}` },
        payload: {
          partyId: "comp-2",
          invoiceNumber: `INV-2026-AUTH-${Date.now()}`,
          type: "AR",
          totalAmount: 2500,
          currency: "EUR",
        },
      });

      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).not.toBe(403);
      expect(res.statusCode).toBe(201);
      expect(res.json().id).toBeDefined();
    });

    it("allows ADMIN to transition invoice status without 403", async () => {
      const adminToken = signTestToken({
        id: "admin-finance",
        role: "ADMIN",
        companyId: "holding-admin",
      });

      const res = await app.inject({
        method: "PUT",
        url: "/api/invoices/inv-nonexistent-id/status",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: "Paid" },
      });

      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).not.toBe(403);
      // Reached domain logic, invoice not found
      expect(res.statusCode).toBe(404);
    });
  });
});

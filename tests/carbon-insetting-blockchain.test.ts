/**
 * @file carbon-insetting-blockchain.test.ts
 * @description Integration and unit tests for Scope 3 Carbon Insetting (Book-and-Claim) and SHA-256 Mass Balance Blockchain.
 * Verifies token issuance backed by physical BDN, fractional energy allocation to shipments (sh_demo_01),
 * cryptographic block hash chaining (prevHash -> blockHash), and full ledger integrity verification.
 * @module @atlas/tests/carbon-insetting-blockchain
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

// Mock authentication
vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

describe("Carbon Insetting Book-and-Claim & Cryptographic SHA-256 Ledger", () => {
  const testBdnRef = "BDN-2026-TEST-INSET-01";
  const testShipmentId = "sh_demo_01";
  let authToken: string;

  beforeEach(async () => {
    authToken = jwt.sign(
      {
        sub: "user-sustainability-officer",
        email: "sustainability@atlas-logistics.eu",
        roles: ["ADMIN", "SUSTAINABILITY_MANAGER"],
      },
      process.env.JWT_SECRET || "atlas-dev-secret-key-32-chars-minimum-length!",
    );

    // Clean up test tokens/allocations for isolation
    const existing = await db
      .select()
      .from(schema.carbonInsettingTokens)
      .where(eq(schema.carbonInsettingTokens.bdnReference, testBdnRef));

    for (const t of existing) {
      await db
        .delete(schema.carbonInsettingAllocations)
        .where(eq(schema.carbonInsettingAllocations.tokenId, t.id));
      await db
        .delete(schema.carbonInsettingTokens)
        .where(eq(schema.carbonInsettingTokens.id, t.id));
    }
  });

  it("issues a new bunker insetting token and verifies SHA-256 digital seal in SQLite WAL", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/carbon-insetting/tokens/issue",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        fuelType: "B100_BIODIESEL",
        fuelVolumeMT: 150,
        bunkerLocation: "Port de Barcelona - Muelle de la Energía",
        bunkerPortLocode: "ESBCN",
        bdnReference: testBdnRef,
        sustainabilityCertificateNumber: "ISCC-EU-Cert-DE105-829104",
        beneficiaryCompany: "Atlas Maritime Green Lines",
        transportMode: "MARITIME_OCEAN",
        certifiedGhgIntensityGco2eqPerMj: 14.1,
        unitPriceEurPerMj: 0.042,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.token.bdnReference).toBe(testBdnRef);
    expect(body.token.totalVolumeMetricTonnes).toBe(150);
    expect(body.token.status).toBe("AVAILABLE");
    expect(body.token.digitalSignatureHash).toBeDefined();
    expect(body.token.digitalSignatureHash.length).toBe(64); // SHA-256 hex string

    // Assert database entity exists
    const [dbToken] = await db
      .select()
      .from(schema.carbonInsettingTokens)
      .where(eq(schema.carbonInsettingTokens.bdnReference, testBdnRef));
    expect(dbToken).toBeDefined();
    expect(dbToken.totalEnergyMj).toBeGreaterThan(0);
    expect(dbToken.availableEnergyMj).toBe(dbToken.totalEnergyMj);
  }, 15000);

  it("allocates fractional energy to shipment sh_demo_01, burns mass balance, and verifies hash linkage", async () => {
    // 1. Issue Token
    const issueRes = await app.inject({
      method: "POST",
      url: "/api/carbon-insetting/tokens/issue",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        fuelType: "B100_BIODIESEL",
        fuelVolumeMT: 200,
        bunkerLocation: "Port of Rotterdam - Maasvlakte",
        bunkerPortLocode: "NLRTM",
        bdnReference: testBdnRef,
        sustainabilityCertificateNumber: "ISCC-EU-Cert-NL201-9944",
        beneficiaryCompany: "Atlas Global Partner",
      },
    });

    const token = JSON.parse(issueRes.payload).token;

    // 2. Allocate 500,000 MJ to shipment sh_demo_01
    const allocRes = await app.inject({
      method: "POST",
      url: "/api/carbon-insetting/tokens/allocate",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        tokenId: token.id,
        shipmentId: testShipmentId,
        beneficiaryName: "Iberian Renewable Chemicals S.A.",
        transportMode: "MARITIME_OCEAN",
        allocatedEnergyMj: 500_000,
        leadAuditorVerifier: "Bureau Veritas Decarbonization",
      },
    });

    expect(allocRes.statusCode).toBe(201);
    const allocBody = JSON.parse(allocRes.payload);
    expect(allocBody.success).toBe(true);
    expect(allocBody.allocation).toBeDefined();
    expect(allocBody.allocation.shipmentId).toBe(testShipmentId);
    expect(allocBody.allocation.allocatedEnergyMj).toBe(500_000);
    expect(allocBody.allocation.status).toBe("CLAIMED_RETIRED");
    expect(allocBody.allocation.blockHashSha256.length).toBe(64);
    expect(allocBody.allocation.previousBlockHash).toBeDefined();

    // 3. Check remaining energy in token
    const [updatedToken] = await db
      .select()
      .from(schema.carbonInsettingTokens)
      .where(eq(schema.carbonInsettingTokens.id, token.id));
    expect(updatedToken.status).toBe("PARTIALLY_ALLOCATED");
    expect(updatedToken.availableEnergyMj).toBe(token.totalEnergyMj - 500_000);

    // 4. Verify blockchain ledger integrity endpoint
    const verifyRes = await app.inject({
      method: "GET",
      url: "/api/carbon-insetting/allocations/verify",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.payload);
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.report.isValid).toBe(true);
    expect(verifyBody.report.totalAllocationsChecked).toBeGreaterThanOrEqual(1);
  }, 15000);
});

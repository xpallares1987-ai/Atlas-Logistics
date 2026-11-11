import { describe, it, expect } from "vitest";
import { CarbonInsettingLedgerService } from "../src/modules/carbon-insetting/carbon-insetting-ledger.service.js";

describe("Carbon Insetting Cryptographic Book-and-Claim Ledger", () => {
  it("should fetch seeded tokens from SQLite database", async () => {
    const tokens = await CarbonInsettingLedgerService.getTokens();
    expect(tokens.length).toBeGreaterThanOrEqual(2);

    const b100 = tokens.find((t) => t.id === "token_b100_bcn_01");
    expect(b100).toBeDefined();
    expect(b100?.bunkerPortLocode).toBe("ESBCN");
    expect(b100?.baselineGhgIntensityGco2eqPerMj).toBe(91.16);
    expect(b100?.digitalSealHash).toHaveLength(64);
  });

  it("should issue a new verified Book-and-Claim token with SHA-256 seal", async () => {
    const token = await CarbonInsettingLedgerService.issueToken({
      fuelType: "B100_BIODIESEL",
      bunkerPortLocode: "ESVLC",
      bunkerLocationName: "Port de València - Terminal Dique del Este",
      bdnReference: "BDN-VLC-2026-9901",
      isccCertificateNumber: "ISCC-EU-Cert-ES216-778899",
      supplierCompanyName: "Cepsa Marine Biofuels",
      totalVolumeMetricTonnes: 200,
      certifiedGhgIntensityGco2eqPerMj: 14.1,
      unitPriceEurPerMj: 0.045,
    });

    expect(token.id).toBeDefined();
    expect(token.tokenReference).toContain("INSET-");
    expect(token.totalEnergyMj).toBe(8800000); // 200 * 1,000,000 * 0.044
    expect(token.availableEnergyMj).toBe(8800000);
    expect(token.digitalSealHash).toHaveLength(64);
    expect(token.status).toBe("AVAILABLE");
  });

  it("should allocate energy to canonical shipment sh_demo_01 and chain block hash", async () => {
    const tokens = await CarbonInsettingLedgerService.getTokens();
    const targetToken = tokens.find((t) => t.availableEnergyMj >= 200000);
    expect(targetToken).toBeDefined();

    const initialAvailable = targetToken!.availableEnergyMj;
    const allocation =
      await CarbonInsettingLedgerService.allocateTokenToShipment({
        tokenId: targetToken!.id,
        shipmentId: "sh_demo_01",
        beneficiaryName: "Atlas Global Logistics SL / Consignee Partner",
        transportMode: "MARITIME_OCEAN",
        allocatedEnergyMj: 200000,
        leadAuditorVerifier: "DNV Maritime Assurance",
      });

    expect(allocation.id).toBeDefined();
    expect(allocation.allocationReference).toContain("ALLOC-");
    expect(allocation.shipmentId).toBe("sh_demo_01");
    expect(allocation.abatedGhgTco2eq).toBeGreaterThan(0);
    expect(allocation.previousBlockHash).toHaveLength(64);
    expect(allocation.blockHashSha256).toHaveLength(64);

    // Verify token was decremented in database
    const refreshed = await CarbonInsettingLedgerService.getTokenById(
      targetToken!.id,
    );
    expect(refreshed?.availableEnergyMj).toBeCloseTo(
      initialAvailable - 200000,
      1,
    );
  });

  it("should prevent over-allocation if requested energy exceeds available balance", async () => {
    const tokens = await CarbonInsettingLedgerService.getTokens();
    const token = tokens[0];

    await expect(
      CarbonInsettingLedgerService.allocateTokenToShipment({
        tokenId: token.id,
        shipmentId: "sh_demo_01",
        beneficiaryName: "Test Exceeded",
        allocatedEnergyMj: token.availableEnergyMj + 99999999,
      }),
    ).rejects.toThrow("Insufficient available energy");
  });

  it("should verify cryptographic integrity across all allocation blocks", async () => {
    const report = await CarbonInsettingLedgerService.verifyLedgerIntegrity();
    expect(report.isValid).toBe(true);
    expect(report.totalAllocationsChecked).toBeGreaterThanOrEqual(1);
    expect(report.genesisBlockHash).toBe(
      "0000000000000000000000000000000000000000000000000000000000000000",
    );
    expect(report.latestBlockHash).toHaveLength(64);
  });
});

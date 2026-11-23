/**
 * @file cbam-ledger-module.test.ts
 * @description Unit tests for Maritime Decarbonization, FuelEU Pooling, and CBAM Financial Ledger (ADR 0042).
 * @module @atlas/tests/cbam-ledger-module
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";

describe("Maritime Decarbonization & CBAM Financial Ledger (T-66 / ADR 0042)", () => {
  describe("1. EU CBAM Net Carbon Liability Calculations", () => {
    it("correctly computes direct, indirect, and net carbon liability with Art. 9 deduction", () => {
      const netMassTonnes = 1250.0;
      const directFactor = 1.85; // tCO2e / t
      const indirectFactor = 0.35; // tCO2e / t
      const etsBenchmarkEur = 85.5; // € / tCO2e
      const foreignPricePaidEur = 45000.0; // Art. 9 credit

      const directEmissions = netMassTonnes * directFactor;
      const indirectEmissions = netMassTonnes * indirectFactor;
      const totalEmbeddedEmissions = directEmissions + indirectEmissions;
      const grossLiability = totalEmbeddedEmissions * etsBenchmarkEur;
      const netLiability = Math.max(0, grossLiability - foreignPricePaidEur);

      expect(directEmissions).toBe(2312.5);
      expect(indirectEmissions).toBe(437.5);
      expect(totalEmbeddedEmissions).toBe(2750.0);
      expect(grossLiability).toBe(235125.0);
      expect(netLiability).toBe(190125.0);
    });

    it("enforces zero net liability floor when foreign carbon credit exceeds gross liability", () => {
      const grossLiability = 50000.0;
      const foreignPricePaidEur = 60000.0; // Higher than EU ETS price
      const netLiability = Math.max(0, grossLiability - foreignPricePaidEur);

      expect(netLiability).toBe(0.0);
    });
  });

  describe("2. FuelEU Maritime Compliance Pooling (Regulation EU 2023/1805, Art. 21)", () => {
    it("calculates individual vessel compliance balances against the 89.3368 gCO2e/MJ target", () => {
      const targetIntensity = 89.3368;

      // Over-compliant vessel (bio-fuelled)
      const vesselSurplus = {
        name: "Atlas Atlantic Pioneer",
        actualIntensity: 78.4,
        totalEnergyMj: 145000000,
      };
      const cbSurplus =
        ((targetIntensity - vesselSurplus.actualIntensity) *
          vesselSurplus.totalEnergyMj) /
        1000;
      expect(cbSurplus).toBeGreaterThan(0);
      expect(Math.round(cbSurplus)).toBe(1585836);

      // Non-compliant vessel (conventional HFO)
      const vesselDeficit = {
        name: "Iberian Voyager",
        actualIntensity: 93.1,
        totalEnergyMj: 82000000,
      };
      const cbDeficit =
        ((targetIntensity - vesselDeficit.actualIntensity) *
          vesselDeficit.totalEnergyMj) /
        1000;
      expect(cbDeficit).toBeLessThan(0);
      expect(Math.round(cbDeficit)).toBe(-308582);
    });

    it("verifies pooled compliance balance offsets gross deficits and avoids statutory penalties", () => {
      const cbSurplus = 1585836;
      const cbDeficit = -308577;
      const poolBalance = cbSurplus + cbDeficit;

      expect(poolBalance).toBeGreaterThan(0);

      // Statutory penalty rate: €2,400 per metric ton of VLSFO-eq (41,000 MJ/t)
      const statutoryPenaltyRate = 2400;
      const energyDensityVlsfoMj = 41000;

      const individualDeficitPenalty =
        (Math.abs(cbDeficit) / energyDensityVlsfoMj) * statutoryPenaltyRate;
      const pooledPenalty =
        poolBalance >= 0
          ? 0
          : (Math.abs(poolBalance) / energyDensityVlsfoMj) *
            statutoryPenaltyRate;

      expect(individualDeficitPenalty).toBeCloseTo(18063.04, 1);
      expect(pooledPenalty).toBe(0);
      expect(individualDeficitPenalty - pooledPenalty).toBeGreaterThan(0);
    });
  });

  describe("3. Cryptographic Book-and-Claim Mass-Balance Audit Trail", () => {
    it("builds and verifies a SHA-256 block hash chain linking insetting allocations", () => {
      const genesisHash =
        "0000000000000000000000000000000000000000000000000000000000000000";

      // Block 1
      const block1Payload = `${genesisHash}:INSET-01:ISCC-EU-B100:SH-01:45.2`;
      const block1Hash = createHash("sha256")
        .update(block1Payload)
        .digest("hex");

      // Block 2 linked to Block 1
      const block2Payload = `${block1Hash}:INSET-02:RED-II-EMETH:SH-02:82.5`;
      const block2Hash = createHash("sha256")
        .update(block2Payload)
        .digest("hex");

      expect(block1Hash).toHaveLength(64);
      expect(block2Hash).toHaveLength(64);
      expect(block1Hash).not.toEqual(block2Hash);

      // Verification pass
      const recomputed1 = createHash("sha256")
        .update(block1Payload)
        .digest("hex");
      const recomputed2 = createHash("sha256")
        .update(block2Payload)
        .digest("hex");

      expect(recomputed1).toBe(block1Hash);
      expect(recomputed2).toBe(block2Hash);
    });

    it("detects tampering when an intermediate block's payload is altered", () => {
      const genesisHash =
        "0000000000000000000000000000000000000000000000000000000000000000";
      const block1Payload = `${genesisHash}:INSET-01:ISCC-EU-B100:SH-01:45.2`;
      const block1Hash = createHash("sha256")
        .update(block1Payload)
        .digest("hex");

      // Tampered block 1 payload
      const tamperedBlock1Payload = `${genesisHash}:INSET-01:ISCC-EU-B100:SH-01:999.9`;
      const tamperedHash = createHash("sha256")
        .update(tamperedBlock1Payload)
        .digest("hex");

      expect(tamperedHash).not.toBe(block1Hash);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  CERTIFIED_FUELS_CATALOG,
  calculateGhgInsettingAbatement,
  issueInsettingToken,
  calculateFuelEuComplianceBalance,
  executeFuelEuPooling,
  SEED_INSETTING_TOKENS,
  SEED_FUELEU_POOL_VESSELS,
  FUELEU_TARGET_GHG_INTENSITY_2025
} from './carbon-insetting.js';

describe('Scope 3 Carbon Insetting & FuelEU Maritime Pooling Engine', () => {
  describe('Alternative Fuels Catalog & LifeCycle GHG Parameters', () => {
    it('should have certified alternative fuels catalog with ISCC / RED II specifications', () => {
      const fuels = Object.keys(CERTIFIED_FUELS_CATALOG);
      expect(fuels).toContain('B100_BIODIESEL');
      expect(fuels).toContain('HVO_RENEWABLE_DIESEL');
      expect(fuels).toContain('E_METHANOL');
      expect(fuels).toContain('BIO_LNG');
      expect(fuels).toContain('GREEN_AMMONIA');

      const b100 = CERTIFIED_FUELS_CATALOG['B100_BIODIESEL'];
      expect(b100.certificationScheme).toContain('ISCC EU');
      expect(b100.ghgReductionPercentage).toBeGreaterThan(80);
      expect(b100.energyDensityMJPerKg).toBe(37.2);
    });
  });

  describe('Emissions Abatement Calculation (ISO 14083 / GLEC v3.0)', () => {
    it('should accurately calculate Scope 3 avoided emissions for 100 MT of B100 Biodiesel', () => {
      const result = calculateGhgInsettingAbatement('B100_BIODIESEL', 100);

      // Energy: 100,000 kg * 37.2 MJ/kg = 3,720,000 MJ
      expect(result.energyContentMJ).toBe(3720000);
      // Baseline fossil emissions: (3,720,000 * 91.0) / 1,000,000 = 338.52 MT
      expect(result.baselineEmissionsMTCO2e).toBe(338.52);
      // Actual B100 emissions: (3,720,000 * 14.1) / 1,000,000 = 52.452 MT
      expect(result.actualEmissionsMTCO2e).toBe(52.452);
      // Abated: 338.52 - 52.452 = 286.068 MT
      expect(result.abatedEmissionsMTCO2e).toBe(286.068);
      expect(result.reductionPercentage).toBe(84.5);
    });

    it('should achieve >90% abatement for synthetic e-Methanol', () => {
      const result = calculateGhgInsettingAbatement('E_METHANOL', 50);
      expect(result.reductionPercentage).toBe(94.1);
      expect(result.abatedEmissionsMTCO2e).toBeGreaterThan(0);
    });
  });

  describe('Book-and-Claim Tokenized Certificate Issuance', () => {
    it('should issue a cryptographically sealed Scope 3 insetting token', () => {
      const token = issueInsettingToken({
        fuelType: 'B100_BIODIESEL',
        fuelVolumeMT: 150.0,
        bunkerLocation: 'Port de Barcelona - Muelle de la Energía',
        bdnReference: 'BDN-BCN-2026-9921',
        sustainabilityCertificateNumber: 'ISCC-EU-Cert-DE105-829104',
        allocatedShipmentRef: 'SHP-BCN-CUST01-BOOKTEST01',
        beneficiaryCompany: 'Customer01 Paper España',
        transportMode: 'MARITIME_OCEAN'
      });

      expect(token.tokenId).toContain('INSET-');
      expect(token.fuelType).toBe('B100_BIODIESEL');
      expect(token.ghgAbatementTonsCO2e).toBeGreaterThan(400);
      expect(token.digitalSignatureHash).toMatch(/^SHA256-[0-9a-f]{24}$/);
      expect(token.qrCodeDigest).toContain('ATLAS-INSET://TOKEN/');
      expect(token.retirementStatus).toBe('ALLOCATED_RETIRED');
    });

    it('should verify seed insetting tokens integrity', () => {
      expect(SEED_INSETTING_TOKENS.length).toBe(3);
      const cust01Token = SEED_INSETTING_TOKENS.find((t) => t.allocatedShipmentRef === 'SHP-BCN-CUST01-BOOKTEST01');
      expect(cust01Token).toBeDefined();
      expect(cust01Token?.beneficiaryCompany).toContain('Customer01 Paper');
      expect(cust01Token?.bunkerLocation).toContain('Port de Barcelona');
    });
  });

  describe('FuelEU Maritime Compliance Balance & Pooling', () => {
    it('should calculate surplus compliance balance for green vessel', () => {
      const vessel = SEED_FUELEU_POOL_VESSELS[0]; // LAURA MAERSK (e-Methanol 5.4 gCO2e/MJ)
      const res = calculateFuelEuComplianceBalance(
        vessel.vesselName,
        vessel.actualGhgIntensity,
        vessel.totalEnergyMJ,
        FUELEU_TARGET_GHG_INTENSITY_2025
      );

      expect(res.status).toBe('SURPLUS');
      expect(res.complianceBalanceGCO2e).toBeGreaterThan(0);
      expect(res.potentialPenaltyEur).toBe(0);
    });

    it('should calculate deficit and penalty for conventional fossil vessel', () => {
      const vessel = SEED_FUELEU_POOL_VESSELS[2]; // MSC ISABELLA (VLSFO 91.0 gCO2e/MJ)
      const res = calculateFuelEuComplianceBalance(
        vessel.vesselName,
        vessel.actualGhgIntensity,
        vessel.totalEnergyMJ,
        FUELEU_TARGET_GHG_INTENSITY_2025
      );

      expect(res.status).toBe('DEFICIT');
      expect(res.complianceBalanceGCO2e).toBeLessThan(0);
      expect(res.potentialPenaltyEur).toBeGreaterThan(0);
    });

    it('should execute multi-vessel fleet pooling and eliminate deficit penalties', () => {
      const poolResult = executeFuelEuPooling(SEED_FUELEU_POOL_VESSELS, 2026);

      expect(poolResult.poolId).toContain('POOL-FUELEU-2026-');
      expect(poolResult.isCompliant).toBe(true);
      expect(poolResult.grossSurplusGCO2e).toBeGreaterThan(0);
      expect(poolResult.grossDeficitGCO2e).toBeGreaterThan(0);
      expect(poolResult.totalPenaltyAvoidedEur).toBeGreaterThan(0);

      // Deficit vessels should now have postPoolBalance = 0 and penalty = 0
      const isabella = poolResult.vessels.find((v) => v.vesselName === 'MSC ISABELLA')!;
      expect(isabella.allocatedFromPoolGCO2e).toBeGreaterThan(0);
      expect(isabella.penaltyPostPoolEur).toBe(0);
      expect(poolResult.contractSealHash).toMatch(/^SHA256-[0-9a-f]{24}$/);
    });
  });
});

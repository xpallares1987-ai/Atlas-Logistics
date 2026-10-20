import { describe, it, expect } from 'vitest';
import {
  detectSaicaVehicle,
  verifySaicaContainerStowage,
  validateSaicaRoleAssignment,
  ISO_40HC_PAYLOAD_LIMIT_KG,
  type SaicaCoil,
  SEED_SAICA_COILS
} from './saica.js';

describe('SAICA Logistics & FMS Platform (Book 012 · BCN.FE.FE01.012)', () => {
  describe('Rule 1 & 2: Transport Chains, Warehouses & Vehicle Identification', () => {
    it('should classify UIC numeric code in CANTUNIS as Electric Train with 76.9% CO2e savings', () => {
      const vehicle = detectSaicaVehicle('CANTUNIS', '31 71 4556 089-2');

      expect(vehicle.transportMode).toBe('TREN_VAGONES');
      expect(vehicle.isRail).toBe(true);
      expect(vehicle.co2eSavingsPercent).toBe(76.9);
      expect(vehicle.co2eFactorKgPerTonKm).toBe(0.018);
      expect(vehicle.warehouse).toBe('CANTUNIS');
    });

    it('should classify Spanish road plate in CANTUNIS as Road Truck', () => {
      const vehicle = detectSaicaVehicle('CANTUNIS', '4821-LXZ');

      expect(vehicle.transportMode).toBe('CAMION_LONA');
      expect(vehicle.isRail).toBe(false);
      expect(vehicle.co2eSavingsPercent).toBe(0.0);
      expect(vehicle.co2eFactorKgPerTonKm).toBe(0.078);
    });

    it('should classify trailer R- plate in CANTUNIS as Road Truck', () => {
      const vehicle = detectSaicaVehicle('CANTUNIS', 'R-9912-BKK');

      expect(vehicle.transportMode).toBe('CAMION_LONA');
      expect(vehicle.isRail).toBe(false);
    });

    it('should always classify TLSA and BERRIO as Road Truck', () => {
      const tlsaVehicle = detectSaicaVehicle('TLSA', 'ANY-TRAILER-123');
      expect(tlsaVehicle.transportMode).toBe('CAMION_LONA');
      expect(tlsaVehicle.isRail).toBe(false);

      const berrioVehicle = detectSaicaVehicle('BERRIO', 'TRAIN-CODE-4412');
      expect(berrioVehicle.transportMode).toBe('CAMION_LONA');
      expect(berrioVehicle.isRail).toBe(false);
    });

    it('should strictly prohibit and reject TMZa in the Book 012 corridor', () => {
      expect(() => {
        detectSaicaVehicle('CANTUNIS', 'TMZa Terminal Zaragoza');
      }).toThrow(/PROHIBICIÓN ESTRICTA: TMZa/);
    });
  });

  describe('Rule 3: 40ft HC Physical Stowage, Center of Gravity & 2-Opt Rebalancing', () => {
    it('should evaluate 26,500 kg baseline legal payload and falso flete', () => {
      const stowage = verifySaicaContainerStowage(SEED_SAICA_COILS, ISO_40HC_PAYLOAD_LIMIT_KG);

      expect(stowage.containerPayloadLimitKg).toBe(26500);
      expect(stowage.totalCoilsWeightKg).toBe(13080);
      expect(stowage.falsoFleteKg).toBe(13420);
      expect(stowage.falsoFleteEstimatedCostEur).toBeGreaterThan(0);
      expect(stowage.recommendedComplementaryCoils.length).toBeGreaterThan(0);
    });

    it('should automatically trigger 2-opt rebalancing when delta X > 0.35m', () => {
      // Coils positioned at one side creating high delta X > 0.35m
      const unbalancedCoils: SaicaCoil[] = [
        {
          coilId: 'C1',
          paperGrade: 'SAICA PRIMA 140',
          grossWeightKg: 4500,
          widthMm: 2400,
          diameterMm: 1250,
          factoryOrigin: 'Zaragoza El Burgo',
          destinationWarehouse: 'CANTUNIS',
          xPositionM: 1.0,
          yPositionM: 1.176
        },
        {
          coilId: 'C2',
          paperGrade: 'SAICA PRIMA 140',
          grossWeightKg: 4500,
          widthMm: 2400,
          diameterMm: 1250,
          factoryOrigin: 'Zaragoza El Burgo',
          destinationWarehouse: 'CANTUNIS',
          xPositionM: 2.0,
          yPositionM: 1.176
        },
        {
          coilId: 'C3',
          paperGrade: 'SAICA MEDIUM 110',
          grossWeightKg: 1500,
          widthMm: 2400,
          diameterMm: 1250,
          factoryOrigin: 'Zaragoza El Burgo',
          destinationWarehouse: 'CANTUNIS',
          xPositionM: 9.0,
          yPositionM: 1.176
        }
      ];

      const result = verifySaicaContainerStowage(unbalancedCoils);
      expect(result.twoOptRebalanced).toBe(true);
      expect(result.twoOptSwapsExecuted).toBeGreaterThan(0);
      expect(result.longitudinalStatus).toBe('BALANCED');
    });

    it('should verify transverse tolerance (tresbolillo) within 0.08m', () => {
      const stowage = verifySaicaContainerStowage(SEED_SAICA_COILS);
      expect(stowage.deltaYMeters).toBeLessThanOrEqual(0.08);
      expect(stowage.transverseStatus).toBe('BALANCED');
    });
  });

  describe('Rule 5: Governance, Role Hierarchy & Operational Integrity', () => {
    it('should authorize SuperAdmin ESXPA (Xavier Pallarès)', () => {
      const res = validateSaicaRoleAssignment('ESXPA', 'Xavier Pallarès');
      expect(res.allowed).toBe(true);
    });

    it('should authorize Department Team Leader ESACA (Ariel Catalano)', () => {
      const res = validateSaicaRoleAssignment('ESACA', 'Ariel Catalano');
      expect(res.allowed).toBe(true);
    });

    it('should strictly exclude ESRSE (Raquel Serrano) from tactical operational assignments', () => {
      const res = validateSaicaRoleAssignment('ESRSE', 'Raquel Serrano');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Raquel Serrano');
    });

    it('should strictly prohibit and exclude Jose Miguel Gomez from any operational processing', () => {
      const res = validateSaicaRoleAssignment('ESACA', 'Jose Miguel Gomez');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Jose Miguel Gomez');
    });
  });
});

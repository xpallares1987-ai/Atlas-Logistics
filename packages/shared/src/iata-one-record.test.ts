import { describe, it, expect } from 'vitest';
import {
  validateDangerousGoodsDeclaration,
  evaluateMilestoneSla,
  SEED_ONE_RECORD_WAYBILLS,
  SEED_CARGO_IQ_TIMELINE,
  SEED_DANGEROUS_GOODS,
  type CargoIqMilestone,
  type DangerousGoodsItem
} from './iata-one-record.js';

describe('IATA ONE Record & Air Cargo e-AWB Linked Data Hub', () => {
  describe('W3C JSON-LD ONE Record Ontology Integrity', () => {
    it('should have valid ONE Record schema with @context and logistics objects', () => {
      expect(SEED_ONE_RECORD_WAYBILLS.length).toBeGreaterThan(0);
      const bcnJfk = SEED_ONE_RECORD_WAYBILLS[0];

      expect(bcnJfk['@context']).toBe('https://onerecord.iata.org/ns/cargo#');
      expect(bcnJfk['@type']).toBe('Waybill');
      expect(bcnJfk.fullAwbNumber).toBe('075-82910482');
      expect(bcnJfk.originAirport).toBe('BCN');
      expect(bcnJfk.destinationAirport).toBe('JFK');
      expect(bcnJfk.pieces.length).toBe(4);
      expect(bcnJfk.specialHandlingCodes).toContain('PIL');
      expect(bcnJfk.specialHandlingCodes).toContain('COL');
      expect(bcnJfk.digitalSealHash).toMatch(/^SHA256-[0-9a-f]{24}$/);
    });
  });

  describe('Cargo iQ Milestone State Machine & SLA Evaluation', () => {
    it('should evaluate completed milestones with positive on-time delta', () => {
      const milestone = SEED_CARGO_IQ_TIMELINE[0]; // FWB completed
      const evaluated = evaluateMilestoneSla(milestone);

      expect(evaluated.status).toBe('COMPLETED');
      expect(evaluated.deltaMinutes).toBeDefined();
    });

    it('should identify upcoming milestones as ON_SCHEDULE', () => {
      const milestone = SEED_CARGO_IQ_TIMELINE[3]; // DEP future
      const evaluated = evaluateMilestoneSla(milestone, new Date().getTime());

      expect(evaluated.status).toBe('ON_SCHEDULE');
    });

    it('should flag milestone as SLA_BREACHED when current time exceeds SLA limit', () => {
      const breachedMilestone: CargoIqMilestone = {
        milestoneCode: 'DEP',
        name: 'Salida de Vuelo',
        locationAirport: 'BCN',
        plannedTimestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        slaLimitTimestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        status: 'ON_SCHEDULE'
      };

      const evaluated = evaluateMilestoneSla(breachedMilestone, Date.now());
      expect(evaluated.status).toBe('SLA_BREACHED');
      expect(evaluated.deltaMinutes).toBeGreaterThan(0);
    });
  });

  describe('IATA DGR e-DGD Dangerous Goods Validation Engine', () => {
    it('should certify compliant Dry Ice UN1845 with PI 954', () => {
      const dryIce = SEED_DANGEROUS_GOODS[0];
      const result = validateDangerousGoodsDeclaration(dryIce);

      expect(result.isCompliant).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.handlingAdvisories.length).toBeGreaterThan(0);
      expect(result.validationSealHash).toMatch(/^IATA-DGR-[0-9a-f]{24}$/);
    });

    it('should reject Dangerous Goods declaration with invalid packing instruction or class', () => {
      const invalidItem: DangerousGoodsItem = {
        unNumber: 'UN1845',
        properShippingName: 'Dry Ice',
        hazardClass: '3', // Wrong class (should be 9)
        packageQuantity: 1,
        netQuantityPerPackageKg: 10,
        totalNetQuantityKg: 10,
        packingInstruction: 'PI 305', // Wrong PI (should be PI 954)
        aircraftRestriction: 'PAX_AND_CARGO'
      };

      const result = validateDangerousGoodsDeclaration(invalidItem);
      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBe(2);
    });

    it('should validate Lithium ion batteries UN3481 under PI 967', () => {
      const lithium = SEED_DANGEROUS_GOODS[1];
      const result = validateDangerousGoodsDeclaration(lithium);

      expect(result.isCompliant).toBe(true);
      expect(result.unNumber).toBe('UN3481');
      expect(result.packingInstruction).toBe('PI 967');
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import {
  SysMetadataSchema,
  getValidatedMetadata,
  safeGetMetadata,
  validateProperty,
} from './metadata';

describe('Metadata Schema Validation', () => {
  describe('SysMetadataSchema', () => {
    it('should parse valid metadata', () => {
      const data = {
        costHR: '150',
        status: 'Retrasado',
        formKey: 'form-1',
        decisionRef: 'decision-1',
      };
      const result = SysMetadataSchema.parse(data);
      expect(result.costHR).toBe(150);
      expect(result.status).toBe('Retrasado');
      expect(result.formKey).toBe('form-1');
      expect(result.decisionRef).toBe('decision-1');
    });

    it('should use defaults for missing values', () => {
      const result = SysMetadataSchema.parse({});
      expect(result.costHR).toBe(0);
      expect(result.status).toBe('');
      expect(result.formKey).toBe('');
      expect(result.decisionRef).toBe('');
    });

    it('should fail on invalid status', () => {
      expect(() => SysMetadataSchema.parse({ status: 'invalido' })).toThrow();
    });

    it('should fail on negative cost', () => {
      expect(() => SysMetadataSchema.parse({ costHR: -10 })).toThrow();
    });
  });

  describe('getValidatedMetadata', () => {
    it('should extract data from business object with get()', () => {
      const bo = {
        get: vi.fn((key) => {
          if (key === 'sys:costHR') return '200';
          if (key === 'sys:status') return 'Listo';
          return undefined;
        }),
      };
      const result = getValidatedMetadata(bo);
      expect(result.costHR).toBe(200);
      expect(result.status).toBe('Listo');
      expect(bo.get).toHaveBeenCalledWith('sys:costHR');
    });

    it('should extract data from business object plain properties', () => {
      const bo = {
        costHR: '300',
        status: 'Bloqueado',
      };
      const result = getValidatedMetadata(bo);
      expect(result.costHR).toBe(300);
      expect(result.status).toBe('Bloqueado');
    });
  });

  describe('safeGetMetadata', () => {
    it('should return defaults on failure', () => {
      const bo = { status: 'invalido' };
      const result = safeGetMetadata(bo);
      expect(result.status).toBe('');
    });
  });

  describe('validateProperty', () => {
    it('should validate and parse sys:costHR', () => {
      expect(validateProperty('sys:costHR', '450')).toBe(450);
    });

    it('should validate and parse sys:status', () => {
      expect(validateProperty('sys:status', 'Retrasado')).toBe('Retrasado');
    });

    it('should throw on invalid value', () => {
      expect(() => validateProperty('sys:status', 'extremo')).toThrow();
    });
  });
});

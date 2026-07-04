import { z } from 'zod';
import { parseNum, toProperCase } from '../services/rateParser';

/**
 * Schema for a single Freight Rate after normalization from Excel/CSV.
 */
export const FreightRateSchema = z.object({
  id: z.number().optional(),
  sheetSource: z.string().default('Unknown'),
  mes: z.preprocess((val) => toProperCase(String(val || 'N/A')), z.string()),
  pol: z.preprocess((val) => toProperCase(String(val || '')), z.string().min(1, 'POL is required')),
  pod: z.preprocess((val) => toProperCase(String(val || '')), z.string().min(1, 'POD is required')),
  carrier: z.preprocess((val) => toProperCase(String(val || '')), z.string().min(1, 'Carrier is required')),
  total: z.preprocess((val) => parseNum(val), z.number().nonnegative()),
  gastosFob: z.preprocess((val) => parseNum(val), z.number().nonnegative().default(0)),
  oceanFreight: z.preprocess((val) => parseNum(val), z.number().nonnegative().default(0)),
  gastosDestino: z.preprocess((val) => parseNum(val), z.number().nonnegative().default(0)),
  baf: z.preprocess((val) => parseNum(val), z.number().nonnegative().default(0)),
  thc: z.preprocess((val) => parseNum(val), z.number().nonnegative().default(0)),
  lss: z.preprocess((val) => parseNum(val), z.number().nonnegative().default(0)),
  otrosRecargos: z.preprocess((val) => parseNum(val), z.number().nonnegative().default(0)),
  transitTime: z.preprocess((val) => parseNum(val), z.number().nonnegative().optional()),
  // New fields from datos.js and CSV
  contrato: z.string().or(z.number()).optional(),
  nac: z.string().optional(),
  diasLibresOrigen: z.string().or(z.number()).optional(),
  diasLibresDestino: z.string().or(z.number()).optional(),
  validUntil: z.string().or(z.number()).optional(),
  conceptos: z.record(z.string(), z.any()).optional(),
  oceanFreightDivisa: z.string().optional(),
});

export type ValidatedFreightRate = z.infer<typeof FreightRateSchema>;

/**
 * Validates an array of raw objects (from Excel/CSV) against the FreightRate schema.
 */
export function validateFreightRates(data: any[]): ValidatedFreightRate[] {
  return data.map((item, index) => {
    try {
      return FreightRateSchema.parse(item);
    } catch (err) {
      console.error(`Validation failed for row ${index}:`, err);
      throw new Error(`Row ${index + 1} has invalid format or missing required fields (POL, POD, Carrier).`);
    }
  });
}

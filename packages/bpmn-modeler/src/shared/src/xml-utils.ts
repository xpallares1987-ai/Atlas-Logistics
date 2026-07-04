import { parseStringPromise } from 'xml2js';
import { z } from 'zod';

/**
 * Data Masking Dictionary (Disabled per user request).
 */
// const MASKING_MAP: Record<string, string> = {};

/**
 * Returns the original string (masking disabled).
 */
export function applyDataMasking(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

/**
 * Deeply returns the original data (masking disabled).
 */
export function maskSensitiveData<T>(data: T): T {
  return data;
}

/**
 * Zod Schema for Boarding entry.
 */
export const BoardingSchema = z
  .object({
    Origin: z.string(),
    'Customer Order': z.string(),
    Warehouse: z.string(),
    POL: z.string(),
    'Final Destination': z.string(),
    'Fecha Lim. Carga': z.string(),
    'Delivery Date': z.string(),
    'Forecast Arrival': z.string(),
    Bultos: z.union([z.string(), z.number()]).transform((v) => String(v)),
    'Weight (Tons)': z.union([z.string(), z.number()]).transform((v) => String(v)),
    'Ext. Addr. Number': z.string(),
  })
  .passthrough();

/**
 * Zod Schema for Reception entry.
 */
export const ReceptionSchema = z
  .object({
    Origin: z.string(),
    Warehouse: z.string(),
    Status: z.string(),
    'Load Code': z.string(),
    'Plate Number': z.string(),
    'Estimated Arrival at WH': z.string(),
    'Ext. Addr. Number': z.string(),
    'Final Destination': z.string(),
    'Customer Order': z.string(),
    'Item Number': z.string(),
    'Reel Year': z.string(),
    'Paper Code': z.string(),
    'Product Description': z.string(),
    'Grammage (GM)': z.string(),
    'Diameter (CM)': z.string(),
    'Roll Width (CM)': z.string(),
    'Roll Length (CM)': z.string(),
    'Weight (Kgs)': z.union([z.string(), z.number()]).transform((v) => String(v)),
  })
  .passthrough();

/**
 * Zod Schema for Stock entry.
 */
export const StockSchema = z
  .object({
    Origin: z.string(),
    Warehouse: z.string(),
    'Ext. Addr. Number': z.string(),
    'Product Code': z.string(),
    'Item Number': z.string(),
    Description: z.string(),
    Grammage: z.string(),
    Diameter: z.string(),
    'Roll Width': z.string(),
    Weight: z.union([z.string(), z.number()]).transform((v) => String(v)),
    'Load Code': z.string().optional(),
    'Customer Name': z.string().optional(),
  })
  .passthrough();

/**
 * Utility to flatten complex XML structures and handle common Power Query logic.
 */
export function flattenXmlValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map(flattenXmlValue).join(', ');
    const obj = val as Record<string, unknown>;
    const inner = obj._ || obj.Value || obj['Element:Text'] || '';
    return typeof inner === 'object' ? flattenXmlValue(inner) : String(inner).trim();
  }
  return String(val).trim();
}

/**
 * Formats date objects from XML into DD/MM/YYYY.
 */
export function formatXmlDate(dateObj: unknown): string {
  if (!dateObj || typeof dateObj !== 'object') return flattenXmlValue(dateObj);
  const obj = dateObj as Record<string, unknown>;
  const day = flattenXmlValue(obj.Day || (obj.Date as Record<string, unknown>)?.Day);
  const month = flattenXmlValue(obj.Month || (obj.Date as Record<string, unknown>)?.Month);
  const year = flattenXmlValue(obj.Year || (obj.Date as Record<string, unknown>)?.Year);
  if (day && month && year) {
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return '';
}

/**
 * Rounds numbers to specified decimals and uses European format (comma).
 */
export function formatXmlNumber(val: unknown, decimals: number = 3): string {
  const s = flattenXmlValue(val).replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n.toFixed(decimals).replace('.', ',');
}

/**
 * Base configuration for XML parsing.
 */
export const xmlParserOptions = {
  explicitArray: false,
  mergeAttrs: true,
  tagNameProcessors: [(name: string) => name.replace(/.*:/, '')],
};

/**
 * Parses XML string using standard repository options.
 */
export async function parseExternalXml(content: string) {
  return await parseStringPromise(content, xmlParserOptions);
}

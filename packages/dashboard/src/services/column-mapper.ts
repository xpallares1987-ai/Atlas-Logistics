/**
 * column-mapper.ts
 * Maps user-supplied column names to canonical dashboard field names.
 * Provides fuzzy auto-matching and manual override support.
 */

import type {
  ColumnMapping,
  ReportType,
  OperationalRow,
  FinancialRow,
  ExceptionRow,
  MappingState,
} from '../types/dashboard';
import { TEMPLATE_FIELDS } from '../types/dashboard';

// ─── Normalise a column name for comparison ───────────────────────────────────

function normalise(s: string): string {
  return s.toLowerCase().replace(/[\s\-\/\\.()]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ─── Auto-match user columns to canonical fields ──────────────────────────────

const ALIASES: Record<string, string> = {
  // operational
  ref: 'shipment_ref', reference: 'shipment_ref', booking: 'shipment_ref', job: 'shipment_ref',
  bl: 'shipment_ref', job_number: 'shipment_ref', job_ref: 'shipment_ref',
  vessel: 'carrier', shipping_line: 'carrier', airline: 'carrier',
  pol_pod: 'trade_lane', route: 'trade_lane', lane: 'trade_lane',
  estimated_departure: 'etd', departure: 'etd', sail_date: 'etd',
  estimated_arrival: 'eta', arrival: 'eta', delivery: 'eta',
  actual_arrival: 'ata', actual_delivery: 'ata',
  transport_mode: 'mode', shipment_mode: 'mode',
  weight: 'weight_kg', gross_weight: 'weight_kg', kgs: 'weight_kg',
  volume: 'volume_cbm', cbm: 'volume_cbm', m3: 'volume_cbm',
  // financial
  invoice: 'invoice_number', inv_no: 'invoice_number', invoice_no: 'invoice_number',
  inv_date: 'invoice_date', date: 'invoice_date',
  payment_due: 'due_date', expiry: 'due_date',
  income: 'revenue', sales: 'revenue', sell: 'revenue',
  charge: 'cost', buying: 'cost', buy: 'cost', expenses: 'cost',
  margin: 'profit', net: 'profit',
  ccy: 'currency', curr: 'currency',
  payment_status: 'paid', settled: 'paid',
  // exception
  type: 'exception_type', alert_type: 'exception_type',
  date_detected: 'detected_date', alert_date: 'detected_date',
  notes: 'description', remarks: 'description', comment: 'description',
  priority: 'severity', level: 'severity',
  closed: 'resolved', fixed: 'resolved', done: 'resolved',
};

export function autoMatchColumns(
  columns: string[],
  reportType: ReportType,
): ColumnMapping[] {
  const fields = TEMPLATE_FIELDS[reportType].map((f) => f.key);
  const mappings: ColumnMapping[] = [];
  const usedTargets = new Set<string>();

  for (const col of columns) {
    const norm = normalise(col);

    // 1. Exact match
    if (fields.includes(norm) && !usedTargets.has(norm)) {
      mappings.push({ sourceColumn: col, targetField: norm });
      usedTargets.add(norm);
      continue;
    }

    // 2. Alias match
    const alias = ALIASES[norm];
    if (alias && fields.includes(alias) && !usedTargets.has(alias)) {
      mappings.push({ sourceColumn: col, targetField: alias });
      usedTargets.add(alias);
      continue;
    }

    // 3. Partial match (field name contained in column name)
    const partial = fields.find(
      (f) => !usedTargets.has(f) && (norm.includes(normalise(f)) || normalise(f).includes(norm)),
    );
    if (partial) {
      mappings.push({ sourceColumn: col, targetField: partial });
      usedTargets.add(partial);
    }
  }

  return mappings;
}

// ─── Check if all required fields are covered ─────────────────────────────────

export function getMissingRequired(
  mappings: ColumnMapping[],
  reportType: ReportType,
): string[] {
  const required = TEMPLATE_FIELDS[reportType].filter((f) => f.required).map((f) => f.key);
  const mapped = new Set(mappings.map((m) => m.targetField));
  return required.filter((r) => !mapped.has(r));
}

export function isMappingComplete(mappings: ColumnMapping[], reportType: ReportType): boolean {
  return getMissingRequired(mappings, reportType).length === 0;
}

// ─── Apply mapping to raw rows ────────────────────────────────────────────────

function parseBool(val: string): boolean {
  return ['yes', 'true', '1', 'y', 'si', 'sí'].includes(val.toLowerCase());
}

function parseNum(val: string): number | undefined {
  const n = parseFloat(val.replace(/[,\s]/g, ''));
  return isNaN(n) ? undefined : n;
}

export function applyMapping(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  reportType: ReportType,
): OperationalRow[] | FinancialRow[] | ExceptionRow[] {
  return rows.map((raw) => {
    const out: Record<string, unknown> = {};

    for (const { sourceColumn, targetField } of mappings) {
      const val = raw[sourceColumn] ?? '';
      if (val === '') continue;

      // Type coercions
      if (['weight_kg', 'volume_cbm', 'revenue', 'cost', 'profit'].includes(targetField)) {
        out[targetField] = parseNum(val);
      } else if (['paid', 'resolved'].includes(targetField)) {
        out[targetField] = parseBool(val);
      } else {
        out[targetField] = val;
      }
    }

    // Derived: profit = revenue - cost if not already set
    if (reportType === 'financial') {
      const fin = out as Partial<FinancialRow>;
      if (fin.profit === undefined && fin.revenue !== undefined && fin.cost !== undefined) {
        fin.profit = (fin.revenue ?? 0) - (fin.cost ?? 0);
      }
    }

    return out as unknown as OperationalRow | FinancialRow | ExceptionRow;
  }) as OperationalRow[] | FinancialRow[] | ExceptionRow[];
}

// ─── Build initial MappingState ────────────────────────────────────────────────

export function buildMappingState(
  fileName: string,
  columns: string[],
  rows: Record<string, string>[],
  reportType: ReportType,
): MappingState {
  return {
    reportType,
    availableColumns: columns,
    mappings: autoMatchColumns(columns, reportType),
    rawData: rows,
    fileName,
  };
}

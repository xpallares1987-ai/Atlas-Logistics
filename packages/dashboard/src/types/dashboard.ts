// Canonical types for all 3 report formats used in the Shipment Dashboard.
// Data flows: upload → column mapper → parse → merge into this shape → panels

// ─── Report row types ─────────────────────────────────────────────────────────

export interface OperationalRow {
  shipment_ref: string;
  carrier?: string;
  trade_lane?: string;
  etd?: string;           // Estimated Time of Departure  (ISO or dd/mm/yyyy)
  eta?: string;           // Estimated Time of Arrival
  ata?: string;           // Actual Time of Arrival
  status?: string;
  mode?: 'SEA' | 'AIR' | 'ROAD' | string;
  weight_kg?: number;
  volume_cbm?: number;
}

export interface FinancialRow {
  shipment_ref: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  revenue?: number;
  cost?: number;
  profit?: number;        // If absent, computed as revenue − cost
  currency?: string;      // ISO 4217 (EUR, USD, GBP, …)
  paid?: boolean;         // normalised from YES/NO/true/false
}

export interface ExceptionRow {
  shipment_ref: string;
  exception_type?: 'DELAY' | 'SLA_BREACH' | 'CUSTOMS_HOLD' | 'DAMAGE' | string;
  detected_date?: string;
  description?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  resolved?: boolean;     // normalised from YES/NO/true/false
}

// ─── Report types ─────────────────────────────────────────────────────────────

export type ReportType = 'operational' | 'financial' | 'exception';

export interface UploadedFile {
  id: string;
  name: string;
  type: ReportType;
  uploadedAt: string;     // ISO timestamp
  rowCount: number;
}

// ─── Column mapping ───────────────────────────────────────────────────────────

export interface ColumnMapping {
  sourceColumn: string;   // column name from the user's file
  targetField: string;    // canonical field name (key of one of the row types above)
}

export interface MappingState {
  reportType: ReportType;
  availableColumns: string[];
  mappings: ColumnMapping[];
  rawData: Record<string, string>[];
  fileName: string;
}

// ─── KPI metrics ──────────────────────────────────────────────────────────────

export interface LaneVolume {
  lane: string;
  weight_kg: number;
}

export interface KpiMetrics {
  onTimePercent: number;
  costPerShipment: number;
  totalShipments: number;
  volumeByLane: LaneVolume[];
  revenueMtd: number;
  costMtd: number;
  profitMtd: number;
  profitMarginPercent: number;
  outstandingInvoices: number;
  activeExceptions: number;
  criticalExceptions: number;
}

// ─── Dashboard store shape ────────────────────────────────────────────────────

export interface DashboardStore {
  operational: OperationalRow[];
  financial: FinancialRow[];
  exceptions: ExceptionRow[];
  uploadedFiles: UploadedFile[];
  lastImported: string | null;
}

// ─── Template field definitions ───────────────────────────────────────────────

export interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  example: string;
}

export const TEMPLATE_FIELDS: Record<ReportType, TemplateField[]> = {
  operational: [
    { key: 'shipment_ref',  label: 'Shipment Reference', required: true,  example: 'SHP-2024-001' },
    { key: 'carrier',       label: 'Carrier',            required: false, example: 'Maersk' },
    { key: 'trade_lane',    label: 'Trade Lane',         required: false, example: 'ESBCN-GBFXT' },
    { key: 'etd',           label: 'ETD',                required: false, example: '15/01/2025' },
    { key: 'eta',           label: 'ETA',                required: false, example: '28/01/2025' },
    { key: 'ata',           label: 'ATA',                required: false, example: '29/01/2025' },
    { key: 'status',        label: 'Status',             required: false, example: 'IN TRANSIT' },
    { key: 'mode',          label: 'Mode',               required: false, example: 'SEA' },
    { key: 'weight_kg',     label: 'Weight (kg)',        required: false, example: '12500' },
    { key: 'volume_cbm',    label: 'Volume (CBM)',       required: false, example: '45.5' },
  ],
  financial: [
    { key: 'shipment_ref',    label: 'Shipment Reference', required: true,  example: 'SHP-2024-001' },
    { key: 'invoice_number',  label: 'Invoice Number',     required: false, example: 'INV-20240115' },
    { key: 'invoice_date',    label: 'Invoice Date',       required: false, example: '15/01/2025' },
    { key: 'due_date',        label: 'Due Date',           required: false, example: '15/02/2025' },
    { key: 'revenue',         label: 'Revenue',            required: false, example: '3500.00' },
    { key: 'cost',            label: 'Cost',               required: false, example: '2100.00' },
    { key: 'profit',          label: 'Profit',             required: false, example: '1400.00' },
    { key: 'currency',        label: 'Currency',           required: false, example: 'EUR' },
    { key: 'paid',            label: 'Paid',               required: false, example: 'YES' },
  ],
  exception: [
    { key: 'shipment_ref',    label: 'Shipment Reference', required: true,  example: 'SHP-2024-001' },
    { key: 'exception_type',  label: 'Exception Type',     required: false, example: 'DELAY' },
    { key: 'detected_date',   label: 'Detected Date',      required: false, example: '20/01/2025' },
    { key: 'description',     label: 'Description',        required: false, example: 'Port congestion at destination' },
    { key: 'severity',        label: 'Severity',           required: false, example: 'HIGH' },
    { key: 'resolved',        label: 'Resolved',           required: false, example: 'NO' },
  ],
};

export interface KpiMetrics {
  totalShipments: number;
  onTimePercent: number;
  costPerShipment: number;
  revenueMtd: number;
  costMtd: number;
  profitMtd: number;
  profitMarginPercent: number;
  activeExceptions: number;
  criticalExceptions: number;
  outstandingInvoices: number;
  volumeByLane: Array<{ lane: string; weight_kg: number }>;
}

export interface FinancialMetrics {
  revenueMtd: number;
  costMtd: number;
  profitMtd: number;
  profitMarginPercent: number;
  outstandingInvoices: number;
}

export interface FinancialRow {
  date: string;
  revenue: number;
  cost: number;
  status: 'PAID' | 'PENDING';
  profit: number;
  paid: boolean;
  invoice_date: string;
  due_date: string;
  shipment_ref: string;
  invoice_number: string;
}

export interface ExceptionRow {
  id: string;
  shipmentId: string;
  type: string;
  severity: string;
  description: string;
  resolved: boolean;
  createdAt: string;
  exception_type: string;
  shipment_ref: string;
  detected_date: string;
}

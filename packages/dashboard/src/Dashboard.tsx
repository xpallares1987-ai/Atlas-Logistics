import { KpiPanel } from './components/KpiPanel';
import { FinancialPanel } from './components/FinancialPanel';
import { ExceptionPanel } from './components/ExceptionPanel';
import type { KpiMetrics, FinancialRow, ExceptionRow } from './types/dashboard';

const mockKpiMetrics: KpiMetrics = {
  totalShipments: 1250,
  onTimePercent: 92.5,
  costPerShipment: 450,
  revenueMtd: 1500000,
  costMtd: 1100000,
  profitMtd: 400000,
  profitMarginPercent: 26.6,
  activeExceptions: 12,
  criticalExceptions: 2,
  outstandingInvoices: 5,
  volumeByLane: [
    { lane: 'Shenzhen - LA', weight_kg: 45000 },
    { lane: 'Shanghai - Rotterdam', weight_kg: 38000 },
    { lane: 'Ningbo - Hamburg', weight_kg: 32000 },
    { lane: 'Qingdao - NY', weight_kg: 28000 },
  ],
};

const mockFinancials: FinancialRow[] = [
  { date: '2023-10-01', revenue: 5000, cost: 3000, status: 'PAID', profit: 2000, paid: true, invoice_date: '2023-10-01', due_date: '2023-10-31', shipment_ref: 'SHP-1001', invoice_number: 'INV-1001' },
  { date: '2023-10-02', revenue: 7000, cost: 4500, status: 'PENDING', profit: 2500, paid: false, invoice_date: '2023-10-02', due_date: '2023-11-01', shipment_ref: 'SHP-1002', invoice_number: 'INV-1002' }
];

const mockExceptions: ExceptionRow[] = [
  {
    id: '1',
    shipmentId: 'SHP-12001',
    type: 'DELAY',
    severity: 'CRITICAL',
    description: 'Vessel delayed at port of origin due to weather',
    resolved: false,
    createdAt: new Date().toISOString(),
    exception_type: 'DELAY',
    shipment_ref: 'SHP-12001',
    detected_date: new Date().toISOString()
  },
  {
    id: '2',
    shipmentId: 'SHP-12055',
    type: 'CUSTOMS_HOLD',
    severity: 'WARNING',
    description: 'Missing commercial invoice',
    resolved: true,
    createdAt: new Date().toISOString(),
    exception_type: 'CUSTOMS_HOLD',
    shipment_ref: 'SHP-12055',
    detected_date: new Date().toISOString()
  },
];

export function Dashboard() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time global logistics overview</p>
        </div>
      </div>

      <KpiPanel metrics={mockKpiMetrics} isEmpty={false} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FinancialPanel data={mockFinancials} />
        <ExceptionPanel data={mockExceptions} />
      </div>
    </div>
  );
}

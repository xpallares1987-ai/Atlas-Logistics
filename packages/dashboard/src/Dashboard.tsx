import { useTranslation } from "react-i18next";
import { useApiQuery, useQueryClient } from "./hooks/useApiQuery";
import { Download } from "lucide-react";
import { KpiPanel } from "./components/KpiPanel";
import { FinancialPanel } from "./components/FinancialPanel";
import { ExceptionPanel } from "./components/ExceptionPanel";
import { exportToCSV } from "./utils/exportUtils";
import type { KpiMetrics, FinancialRow, ExceptionRow } from "./types/dashboard";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const defaultKpiMetrics: KpiMetrics = {
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
    { lane: "Shenzhen - LA", weight_kg: 45000 },
    { lane: "Shanghai - Rotterdam", weight_kg: 38000 },
    { lane: "Ningbo - Hamburg", weight_kg: 32000 },
    { lane: "Qingdao - NY", weight_kg: 28000 },
  ],
};

const mockFinancials: FinancialRow[] = [
  {
    date: "2023-10-01",
    revenue: 5000,
    cost: 3000,
    status: "PAID",
    profit: 2000,
    paid: true,
    invoice_date: "2023-10-01",
    due_date: "2023-10-31",
    shipment_ref: "SHP-1001",
    invoice_number: "INV-1001",
  },
  {
    date: "2023-10-02",
    revenue: 7000,
    cost: 4500,
    status: "PENDING",
    profit: 2500,
    paid: false,
    invoice_date: "2023-10-02",
    due_date: "2023-11-01",
    shipment_ref: "SHP-1002",
    invoice_number: "INV-1002",
  },
];

const mockExceptions: ExceptionRow[] = [
  {
    id: "1",
    shipmentId: "SHP-12001",
    type: "DELAY",
    severity: "CRITICAL",
    description: "Vessel delayed at port of origin due to weather",
    resolved: false,
    createdAt: new Date().toISOString(),
    exception_type: "DELAY",
    shipment_ref: "SHP-12001",
    detected_date: new Date().toISOString(),
  },
  {
    id: "2",
    shipmentId: "SHP-12055",
    type: "CUSTOMS_HOLD",
    severity: "WARNING",
    description: "Missing commercial invoice",
    resolved: true,
    createdAt: new Date().toISOString(),
    exception_type: "CUSTOMS_HOLD",
    shipment_ref: "SHP-12055",
    detected_date: new Date().toISOString(),
  },
];

export function Dashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: statsData } = useApiQuery<any>(
    ["financial-stats"],
    "/financial-stats",
  );
  const { data: financialsData } = useApiQuery<FinancialRow[]>(
    ["financials"],
    "/invoices",
  );
  const { data: exceptionsData } = useApiQuery<ExceptionRow[]>(
    ["exceptions"],
    "/shipments/exceptions",
  );

  const metrics =
    statsData && statsData.totalAR !== undefined
      ? {
          ...defaultKpiMetrics,
          revenueMtd: statsData.totalAR,
          costMtd: statsData.totalAP,
          profitMtd: statsData.netProfit,
          profitMarginPercent:
            statsData.totalAR > 0
              ? Number(
                  ((statsData.netProfit / statsData.totalAR) * 100).toFixed(1),
                )
              : 0,
        }
      : defaultKpiMetrics;

  const financials =
    financialsData && Array.isArray(financialsData) && financialsData.length > 0
      ? financialsData
      : mockFinancials;
  const exceptions =
    exceptionsData && Array.isArray(exceptionsData) && exceptionsData.length > 0
      ? exceptionsData
      : mockExceptions;

  const handleAcknowledge = async (id: string) => {
    try {
      await fetch(`${API_URL}/shipments/exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge" }),
      });
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    } catch (err) {
      console.error("Failed to acknowledge exception:", err);
    }
  };

  const handleAssign = async (id: string, userId: string) => {
    try {
      await fetch(`${API_URL}/shipments/exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", userId }),
      });
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    } catch (err) {
      console.error("Failed to assign exception:", err);
    }
  };

  const handleResolve = async (id: string, note?: string) => {
    try {
      await fetch(`${API_URL}/shipments/exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", note }),
      });
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    } catch (err) {
      console.error("Failed to resolve exception:", err);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {t("sidebar.dashboard")}
          </h1>
          <p className="text-slate-400 mt-1">
            {t("dashboard.overview", "Real-time global logistics overview")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              exportToCSV(
                financials as unknown as Record<string, unknown>[],
                "financial-data",
              )
            }
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
          >
            <Download size={14} /> Export Financials CSV
          </button>
          <button
            onClick={() =>
              exportToCSV(
                exceptions as unknown as Record<string, unknown>[],
                "exceptions-data",
              )
            }
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
          >
            <Download size={14} /> Export Exceptions CSV
          </button>
        </div>
      </div>

      <KpiPanel metrics={metrics} isEmpty={false} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FinancialPanel data={financials} />
        <ExceptionPanel
          data={exceptions}
          onAcknowledge={handleAcknowledge}
          onAssign={handleAssign}
          onResolve={handleResolve}
        />
      </div>
    </div>
  );
}

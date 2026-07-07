import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, DollarSign, Percent } from "lucide-react";

export interface ProfitabilityData {
  category: string;
  ap: number; // Accounts Payable (Cost)
  ar: number; // Accounts Receivable (Revenue)
}

export interface ProfitabilityDashboardProps {
  data: ProfitabilityData[];
  alerts?: string[];
}

export const ProfitabilityDashboard: React.FC<ProfitabilityDashboardProps> = ({
  data,
  alerts = [],
}) => {
  const totalAp = data.reduce((sum, item) => sum + item.ap, 0);
  const totalAr = data.reduce((sum, item) => sum + item.ar, 0);
  const netProfit = totalAr - totalAp;
  const grossMargin = totalAr > 0 ? (netProfit / totalAr) * 100 : 0;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Shipment Profitability (P&L)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Accounts Payable vs Accounts Receivable
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Net Profit
            </p>
            <p
              className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              $
              {netProfit.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
            <Percent className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Gross Margin
            </p>
            <p
              className={`text-2xl font-black tracking-tight ${grossMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {grossMargin.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle
              className={`h-4 w-4 ${alerts.length > 0 ? "text-amber-500" : "text-slate-400"}`}
            />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Accrual Alerts
            </p>
          </div>
          {alerts.length > 0 ? (
            <ul className="text-xs text-amber-700 space-y-1 mt-1">
              {alerts.map((alert, idx) => (
                <li key={idx} className="flex items-start gap-1.5 font-medium">
                  <span className="text-amber-500 font-bold">•</span> {alert}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic mt-1 font-medium">
              No missing accruals detected.
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 w-full mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
                fontWeight: 500,
              }}
              itemStyle={{ fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
              }}
              iconType="circle"
            />
            <Bar
              dataKey="ap"
              name="Accounts Payable (Costs)"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
            <Bar
              dataKey="ar"
              name="Accounts Receivable (Revenue)"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

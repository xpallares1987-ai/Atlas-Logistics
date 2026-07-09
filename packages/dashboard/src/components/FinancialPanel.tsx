"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  FileText,
  Briefcase,
  Activity,
} from "lucide-react";
import type { FinancialRow } from "../types/dashboard";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface FinancialPanelProps {
  data: FinancialRow[];
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const PIE_COLORS = ["#10b981", "#f59e0b", "#64748b"];

const CHART_STYLE = {
  contentStyle: {
    background: "rgba(15, 23, 42, 0.9)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(51, 65, 85, 0.5)",
    borderRadius: 12,
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
  },
  labelStyle: { color: "#f8fafc", fontWeight: 800, paddingBottom: 4 },
  itemStyle: { color: "#cbd5e1", fontWeight: 600 },
};

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`;
  return `€${n.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
}

interface FinCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant: "blue" | "emerald" | "purple" | "amber";
}

function FinCard({ label, value, icon, variant }: FinCardProps) {
  const styles = {
    blue: "from-blue-500/20 to-indigo-500/5 text-blue-400 border-blue-500/20 shadow-blue-500/10",
    emerald:
      "from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10",
    purple:
      "from-purple-500/20 to-fuchsia-500/5 text-purple-400 border-purple-500/20 shadow-purple-500/10",
    amber:
      "from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/20 shadow-amber-500/10",
  };

  const iconBg = {
    blue: "bg-blue-500/20",
    emerald: "bg-emerald-500/20",
    purple: "bg-purple-500/20",
    amber: "bg-amber-500/20",
  };

  return (
    <div
      className={`relative overflow-hidden backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-3xl p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_30px_-5px_var(--tw-shadow-color)] ${styles[variant]} group`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity duration-500 group-hover:opacity-100 ${styles[variant]}`}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-2">
          <div
            className={`p-3 rounded-2xl ${iconBg[variant]} shadow-lg backdrop-blur-md`}
          >
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <span className="text-slate-400 font-semibold text-sm uppercase tracking-wider block mb-1">
            {label}
          </span>
          <span className="text-4xl font-black text-white tracking-tight group-hover:scale-105 transition-transform duration-300 origin-left inline-block">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

export function FinancialPanel({ data }: FinancialPanelProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl">
        <Briefcase size={64} className="mb-6 opacity-20" />
        <h3 className="text-2xl font-bold text-slate-300 mb-2">
          No financial data loaded
        </h3>
        <p>
          Upload a <strong>Financial</strong> report to activate revenue
          analytics.
        </p>
      </div>
    );
  }

  // Group by month for time-series
  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      { month: string; revenue: number; cost: number; profit: number }
    >();
    for (const row of data) {
      const d = parseDate(row.invoice_date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-GB", {
        month: "short",
        year: "2-digit",
      });
      const existing = map.get(key) ?? {
        month: label,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      existing.revenue += row.revenue ?? 0;
      existing.cost += row.cost ?? 0;
      existing.profit += row.profit ?? (row.revenue ?? 0) - (row.cost ?? 0);
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [data]);

  // Invoice status breakdown
  const paidCount = data.filter((r) => r.paid === true).length;
  const unpaidCount = data.filter((r) => r.paid === false).length;
  const unknownCount = data.length - paidCount - unpaidCount;

  const invoiceStatus = [
    { name: "Paid", value: paidCount },
    { name: "Pending", value: unpaidCount },
    { name: "Unknown", value: unknownCount },
  ].filter((s) => s.value > 0);

  // Totals
  const totalRevenue = data.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalCost = data.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalProfit = data.reduce(
    (s, r) => s + (r.profit ?? (r.revenue ?? 0) - (r.cost ?? 0)),
    0,
  );
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinCard
          label="Total Revenue"
          value={fmtCurrency(totalRevenue)}
          icon={<DollarSign size={24} />}
          variant="blue"
        />
        <FinCard
          label="Total Cost"
          value={fmtCurrency(totalCost)}
          icon={<Activity size={24} />}
          variant="amber"
        />
        <FinCard
          label="Total Profit"
          value={fmtCurrency(totalProfit)}
          icon={<TrendingUp size={24} />}
          variant="emerald"
        />
        <FinCard
          label="Profit Margin"
          value={`${margin.toFixed(1)}%`}
          icon={<FileText size={24} />}
          variant="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue / Cost / Profit over time */}
        {monthlyData.length > 0 && (
          <div className="xl:col-span-2 relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
            <div className="absolute top-0 right-1/4 w-1/2 h-full bg-blue-500/5 blur-[120px] pointer-events-none" />
            <div className="mb-6 relative z-10">
              <h3 className="text-xl font-black text-white">
                Financial Performance
              </h3>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Revenue vs Cost vs Profit trajectory
              </p>
            </div>
            <div className="h-[350px] relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyData}
                  margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#334155"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => fmtCurrency(v)}
                  />
                  <Tooltip
                    {...CHART_STYLE}
                    formatter={(v: any, name: any) => [
                      fmtCurrency(v as number),
                      name as string,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#3b82f6"
                    fill="url(#gradRev)"
                    strokeWidth={3}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    name="Cost"
                    stroke="#f59e0b"
                    fill="none"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#10b981"
                    fill="url(#gradProf)"
                    strokeWidth={3}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Invoice status Donut Chart */}
        <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl flex flex-col">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-emerald-500/10 blur-[100px] pointer-events-none" />
          <div className="mb-2 relative z-10">
            <h3 className="text-xl font-black text-white">Invoice Status</h3>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Collection overview
            </p>
          </div>
          <div className="flex-1 relative z-10 flex items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  {...CHART_STYLE}
                  formatter={(value: any) => [`${value} Invoices`, "Count"]}
                />
                <Pie
                  data={invoiceStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {invoiceStatus.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                {/* Custom inner label */}
                <text
                  x="50%"
                  y="45%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-3xl font-black"
                  fill="#fff"
                >
                  {data.length}
                </text>
                <text
                  x="50%"
                  y="55%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-sm font-semibold"
                  fill="#94a3b8"
                >
                  Total
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 relative z-10">
            {invoiceStatus.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i] }}
                />
                <span className="text-sm font-semibold text-slate-300">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden mt-4">
        <div className="px-8 py-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
          <div>
            <h3 className="text-xl font-black text-white">
              Invoice Details Registry
            </h3>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Showing {Math.min(data.length, 50)} of {data.length} records
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-bold tracking-wider">
              <tr>
                <th className="px-8 py-4 rounded-tl-xl">Shipment Ref</th>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Due</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Profit</th>
                <th className="px-8 py-4 rounded-tr-xl text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.slice(0, 50).map((row, i) => {
                const profit =
                  row.profit ?? (row.revenue ?? 0) - (row.cost ?? 0);
                return (
                  <tr
                    key={i}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-8 py-4 font-mono text-slate-300 group-hover:text-white transition-colors">
                      {row.shipment_ref}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {row.invoice_number ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {row.invoice_date ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {row.due_date ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-blue-400 font-medium">
                      {row.revenue != null ? fmtCurrency(row.revenue) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-amber-400 font-medium">
                      {row.cost != null ? fmtCurrency(row.cost) : "—"}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {fmtCurrency(profit)}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span
                        className={`px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full ${
                          row.paid === true
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : row.paid === false
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-slate-700/50 text-slate-400 border border-slate-600/50"
                        }`}
                      >
                        {row.paid === true
                          ? "Paid"
                          : row.paid === false
                            ? "Pending"
                            : "Unk"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

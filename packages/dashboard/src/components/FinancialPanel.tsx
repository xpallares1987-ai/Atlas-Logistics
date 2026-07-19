"use client";

import { useMemo } from "react";
import { TrendingUp, DollarSign, FileText, BarChart2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { FinancialRow } from "../types/dashboard";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);
const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), {
  ssr: false,
});
const Area = dynamic(() => import("recharts").then((m) => m.Area), {
  ssr: false,
});
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);

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

const CHART_STYLE = {
  contentStyle: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
  },
  labelStyle: { color: "#e2e8f0", fontWeight: 600 },
  itemStyle: { color: "#94a3b8" },
};

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`;
  return `€${n.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
}

export function FinancialPanel({ data }: FinancialPanelProps) {
  if (data.length === 0) {
    return (
      <div className="panel-empty">
        <BarChart2 size={48} className="panel-empty__icon" />
        <h3>No financial data loaded</h3>
        <p>
          Upload a <strong>Financial</strong> report to see revenue, cost, and
          profit analytics.
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
    { label: "Paid", count: paidCount, color: "#10b981" },
    { label: "Pending", count: unpaidCount, color: "#f59e0b" },
    { label: "Unknown", count: unknownCount, color: "#64748b" },
  ].filter((s) => s.count > 0);

  // Totals
  const totalRevenue = data.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalCost = data.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalProfit = data.reduce(
    (s, r) => s + (r.profit ?? (r.revenue ?? 0) - (r.cost ?? 0)),
    0,
  );
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="financial-panel">
      {/* Summary row */}
      <div className="financial-summary">
        <div className="fin-stat fin-stat--revenue">
          <DollarSign size={20} />
          <div>
            <span className="fin-stat__label">Total Revenue</span>
            <span className="fin-stat__value">{fmtCurrency(totalRevenue)}</span>
          </div>
        </div>
        <div className="fin-stat fin-stat--cost">
          <TrendingUp size={20} />
          <div>
            <span className="fin-stat__label">Total Cost</span>
            <span className="fin-stat__value">{fmtCurrency(totalCost)}</span>
          </div>
        </div>
        <div className="fin-stat fin-stat--profit">
          <TrendingUp size={20} />
          <div>
            <span className="fin-stat__label">Total Profit</span>
            <span className="fin-stat__value">{fmtCurrency(totalProfit)}</span>
          </div>
        </div>
        <div className="fin-stat fin-stat--margin">
          <FileText size={20} />
          <div>
            <span className="fin-stat__label">Margin</span>
            <span className="fin-stat__value">{margin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="financial-charts">
        {/* Revenue / Cost / Profit over time */}
        {monthlyData.length > 0 && (
          <div className="fin-chart-card">
            <div className="card-header">
              <h3>Revenue vs Cost vs Profit</h3>
              <p>Monthly trend</p>
            </div>
            <div className="card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyData}
                  margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="gradRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
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
                    fill="url(#gradRevenue)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    name="Cost"
                    stroke="#f59e0b"
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#10b981"
                    fill="url(#gradProfit)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Invoice status */}
        <div className="fin-chart-card">
          <div className="card-header">
            <h3>Invoice Status</h3>
            <p>{data.length} invoices total</p>
          </div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={invoiceStatus}
                layout="vertical"
                margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  {...CHART_STYLE}
                  formatter={(v: any) => [v, "Invoices"]}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  {invoiceStatus.map((s, i) => (
                    <Bar key={i} dataKey="count" fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed table */}
      <div className="fin-table-card">
        <div className="card-header">
          <h3>Invoice Detail</h3>
          <p>
            Showing {Math.min(data.length, 50)} of {data.length}
          </p>
        </div>
        <div className="table-container">
          <table className="logistics-table">
            <thead>
              <tr>
                <th>Shipment Ref</th>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Due</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row, i) => {
                const profit =
                  row.profit ?? (row.revenue ?? 0) - (row.cost ?? 0);
                return (
                  <tr key={i}>
                    <td className="font-mono text-xs">{row.shipment_ref}</td>
                    <td className="text-slate-400 text-xs">
                      {row.invoice_number ?? "—"}
                    </td>
                    <td className="text-xs">{row.invoice_date ?? "—"}</td>
                    <td className="text-xs">{row.due_date ?? "—"}</td>
                    <td className="text-right text-xs text-blue-400">
                      {row.revenue != null ? fmtCurrency(row.revenue) : "—"}
                    </td>
                    <td className="text-right text-xs text-amber-400">
                      {row.cost != null ? fmtCurrency(row.cost) : "—"}
                    </td>
                    <td
                      className={`text-right text-xs font-semibold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {fmtCurrency(profit)}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${row.paid === true ? "status-badge--success" : row.paid === false ? "status-badge--warning" : "status-badge--muted"}`}
                      >
                        {row.paid === true
                          ? "Paid"
                          : row.paid === false
                            ? "Pending"
                            : "—"}
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

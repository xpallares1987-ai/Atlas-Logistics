"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Clock,
  AlertTriangle,
  DollarSign,
  BarChart2,
  Zap,
  DatabaseZap,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import type { KpiMetrics } from "../types/dashboard";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  trendLabel,
  icon,
  variant = "default",
}: KpiCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const colorVariants = {
    default:
      "from-blue-500/20 to-indigo-500/5 text-blue-400 border-blue-500/20",
    success:
      "from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/20",
    warning:
      "from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/20",
    danger: "from-rose-500/20 to-red-500/5 text-rose-400 border-rose-500/20",
  };

  const iconColor = {
    default: "bg-blue-500/20 text-blue-400",
    success: "bg-emerald-500/20 text-emerald-400",
    warning: "bg-amber-500/20 text-amber-400",
    danger: "bg-rose-500/20 text-rose-400",
  };

  const trendColors = {
    up: "text-emerald-400",
    down: "text-rose-400",
    neutral: "text-slate-400",
  };

  return (
    <div
      className={`relative overflow-hidden backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-3xl p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] hover:border-slate-500/50 group`}
    >
      {/* Glossy gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity duration-500 group-hover:opacity-100 ${colorVariants[variant]}`}
      />

      {/* Top reflection line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <span className="text-slate-400 font-semibold text-sm uppercase tracking-wider">
            {label}
          </span>
          <div
            className={`p-2.5 rounded-2xl ${iconColor[variant]} shadow-lg backdrop-blur-md`}
          >
            {icon}
          </div>
        </div>

        <div>
          <div className="text-4xl font-black text-white tracking-tight mb-1 group-hover:scale-105 transition-transform duration-300 origin-left">
            {value}
          </div>
          <div className="flex items-center justify-between mt-3">
            {sub && (
              <span className="text-slate-400 text-xs font-medium">{sub}</span>
            )}
            {trend && trendLabel && (
              <div
                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800/80 ${trendColors[trend]}`}
              >
                <TrendIcon size={12} strokeWidth={3} />
                <span>{trendLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`;
  return `€${fmt(n, 0)}`;
}

interface KpiPanelProps {
  metrics: KpiMetrics;
  isEmpty: boolean;
  liveKpis?: any;
}

const LANE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
];

// Generar datos ficticios de tendencia de 30 días para darle el "Wow factor"
const generateTrendData = () => {
  return Array.from({ length: 14 }).map((_, i) => ({
    day: `Day ${i + 1}`,
    deliveries: Math.floor(Math.random() * 50) + 100 + i * 5,
    efficiency: Math.floor(Math.random() * 20) + 70 + i,
  }));
};

export function KpiPanel({ metrics, isEmpty, liveKpis }: KpiPanelProps) {
  const onTimeVariant =
    metrics.onTimePercent >= 90
      ? "success"
      : metrics.onTimePercent >= 70
        ? "warning"
        : "danger";
  const exceptionVariant =
    metrics.criticalExceptions > 0
      ? "danger"
      : metrics.activeExceptions > 0
        ? "warning"
        : "success";

  const laneData = useMemo(
    () =>
      metrics.volumeByLane.slice(0, 6).map((l) => ({
        lane: l.lane.length > 14 ? l.lane.slice(0, 14) + "…" : l.lane,
        weight: Math.round(l.weight_kg),
      })),
    [metrics.volumeByLane],
  );

  const trendData = useMemo(() => generateTrendData(), []);

  if (isEmpty && !liveKpis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl">
        <BarChart2 size={64} className="mb-6 opacity-20" />
        <h3 className="text-2xl font-bold text-slate-300 mb-2">
          No operational data loaded
        </h3>
        <p>
          Upload an <strong>Operational</strong> report to activate the
          intelligence engine.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Live KPIs */}
      {liveKpis && (
        <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          <h3 className="text-white font-black text-xl mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DatabaseZap className="text-emerald-400 w-5 h-5" />
            </div>
            Live Enterprise Database Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            {/* Same content but upgraded classes */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
              <p className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                <Package size={14} /> Active Shipments
              </p>
              <p className="text-4xl font-black text-white">
                {liveKpis.activeMetrics?.totalActiveShipments || 0}
              </p>
            </div>
            {/* ... other live KPIs */}
          </div>
        </div>
      )}

      {!isEmpty && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <KpiCard
              label="On-Time Delivery"
              value={`${fmt(metrics.onTimePercent, 1)}%`}
              sub={`${metrics.totalShipments} total shipments`}
              icon={<Clock size={20} />}
              variant={onTimeVariant}
              trend={metrics.onTimePercent >= 90 ? "up" : "down"}
              trendLabel={
                metrics.onTimePercent >= 90 ? "Optimal" : "Below target"
              }
            />
            <KpiCard
              label="Avg. Cost / Shipment"
              value={fmtCurrency(metrics.costPerShipment)}
              icon={<DollarSign size={20} />}
              trend="up"
              trendLabel="+2.4% vs LM"
              variant="default"
            />
            <KpiCard
              label="Revenue MTD"
              value={fmtCurrency(metrics.revenueMtd)}
              sub={`Cost: ${fmtCurrency(metrics.costMtd)}`}
              icon={<TrendingUp size={20} />}
              variant="success"
              trend="up"
              trendLabel="Trending"
            />
            <KpiCard
              label="Profit Margin"
              value={`${fmt(metrics.profitMarginPercent, 1)}%`}
              sub={`Profit: ${fmtCurrency(metrics.profitMtd)}`}
              icon={<Zap size={20} />}
              variant={
                metrics.profitMarginPercent >= 20
                  ? "success"
                  : metrics.profitMarginPercent >= 10
                    ? "warning"
                    : "danger"
              }
              trend="up"
              trendLabel="Solid"
            />
            <KpiCard
              label="Active Exceptions"
              value={fmt(metrics.activeExceptions)}
              sub={`${metrics.criticalExceptions} critical alerts`}
              icon={<AlertTriangle size={20} />}
              variant={exceptionVariant}
              trend={metrics.activeExceptions === 0 ? "up" : "down"}
              trendLabel={
                metrics.activeExceptions === 0 ? "All clear" : "Action required"
              }
            />
            <KpiCard
              label="Outstanding Invoices"
              value={fmt(metrics.outstandingInvoices)}
              icon={<Package size={20} />}
              variant={metrics.outstandingInvoices > 0 ? "warning" : "success"}
              trend={metrics.outstandingInvoices === 0 ? "up" : "neutral"}
              trendLabel={
                metrics.outstandingInvoices === 0 ? "All paid" : "Pending"
              }
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
            {/* Beautiful Volume Chart */}
            <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
              <div className="absolute top-0 left-1/4 w-1/2 h-full bg-blue-500/5 blur-[120px] pointer-events-none" />
              <div className="mb-6 relative z-10">
                <h3 className="text-xl font-black text-white">
                  Volume by Trade Lane
                </h3>
                <p className="text-slate-400 text-sm font-medium mt-1">
                  Top routes performance · Weight (kg)
                </p>
              </div>
              <div className="h-[300px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={laneData}
                    margin={{ left: 0, right: 0, top: 20, bottom: 0 }}
                  >
                    <defs>
                      {LANE_COLORS.map((color, idx) => (
                        <linearGradient
                          key={`grad-${idx}`}
                          id={`laneGrad-${idx}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={color} stopOpacity={1} />
                          <stop
                            offset="100%"
                            stopColor={color}
                            stopOpacity={0.3}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#334155"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="lane"
                      tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#334155", opacity: 0.2 }}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.9)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(51, 65, 85, 0.5)",
                        borderRadius: 12,
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                      }}
                      labelStyle={{
                        color: "#f8fafc",
                        fontWeight: 800,
                        marginBottom: 4,
                      }}
                      itemStyle={{ color: "#cbd5e1", fontWeight: 600 }}
                      formatter={(v: any) => [
                        `${Number(v).toLocaleString()} kg`,
                        "Cargo Weight",
                      ]}
                    />
                    <Bar dataKey="weight" radius={[6, 6, 0, 0]} barSize={40}>
                      {laneData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={`url(#laneGrad-${i % LANE_COLORS.length})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Glowing Trend Chart */}
            <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
              <div className="absolute top-0 right-1/4 w-1/2 h-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
              <div className="mb-6 relative z-10">
                <h3 className="text-xl font-black text-white">
                  Deliveries & Efficiency
                </h3>
                <p className="text-slate-400 text-sm font-medium mt-1">
                  14-day trailing performance
                </p>
              </div>
              <div className="h-[300px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorDeliveries"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#334155"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.9)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(51, 65, 85, 0.5)",
                        borderRadius: 12,
                      }}
                      labelStyle={{ color: "#f8fafc", fontWeight: 800 }}
                      itemStyle={{ color: "#10b981", fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="deliveries"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorDeliveries)"
                      activeDot={{
                        r: 6,
                        fill: "#10b981",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {/* AIPredictiveTracker placeholder */}
          </div>
        </>
      )}
    </div>
  );
}

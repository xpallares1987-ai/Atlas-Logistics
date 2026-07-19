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
  UploadCloud,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { KpiMetrics } from "../types/dashboard";
import { MilestoneStepper, getStandardOceanMilestones } from "@atlas/ui";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);
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
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), {
  ssr: false,
});

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
  const trendClass =
    trend === "up"
      ? "kpi-trend--up"
      : trend === "down"
        ? "kpi-trend--down"
        : "kpi-trend--neutral";

  return (
    <div className={`kpi-card kpi-card--${variant}`}>
      <div className="kpi-card__header">
        <span className="kpi-card__label">{label}</span>
        <span className="kpi-card__icon">{icon}</span>
      </div>
      <div className="kpi-card__value">{value}</div>
      {sub && <div className="kpi-card__sub">{sub}</div>}
      {trend && trendLabel && (
        <div className={`kpi-trend ${trendClass}`}>
          <TrendIcon size={11} />
          <span>{trendLabel}</span>
        </div>
      )}
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
  "#ef4444",
  "#ec4899",
  "#84cc16",
];

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

  const mockMilestones = useMemo(
    () => getStandardOceanMilestones("Shanghai", "Rotterdam", "2026-07-15"),
    [],
  );

  const laneData = useMemo(
    () =>
      metrics.volumeByLane.slice(0, 8).map((l) => ({
        lane: l.lane.length > 14 ? l.lane.slice(0, 14) + "…" : l.lane,
        weight: Math.round(l.weight_kg),
      })),
    [metrics.volumeByLane],
  );

  if (isEmpty && !liveKpis) {
    return (
      <div className="panel-empty">
        <BarChart2 size={48} className="panel-empty__icon" />
        <h3>No operational data loaded</h3>
        <p>
          Upload an <strong>Operational</strong> or <strong>Financial</strong>{" "}
          report to see KPIs.
        </p>
      </div>
    );
  }

  return (
    <div className="kpi-panel">
      {/* Live Database KPIs */}
      {liveKpis && (
        <div className="mb-8 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
          <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <DatabaseZap className="text-emerald-400 w-5 h-5" />
            Live Enterprise Database Metrics (PostgreSQL)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
              <p className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                <Package size={14} /> Active Shipments
              </p>
              <p className="text-3xl font-black text-white">
                {liveKpis.activeMetrics?.totalActiveShipments || 0}
              </p>
            </div>
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
              <p className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                <DollarSign size={14} /> Total Spend
              </p>
              <p className="text-3xl font-black text-emerald-400">
                ${(liveKpis.activeMetrics?.totalSpend || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
              <p className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                <BarChart2 size={14} /> Total Volume (TEU)
              </p>
              <p className="text-3xl font-black text-indigo-400">
                {liveKpis.activeMetrics?.totalVolume || 0}
              </p>
            </div>
            <div className="bg-slate-800 p-5 rounded-xl border border-red-900/50 flex flex-col justify-between">
              <p className="text-red-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Demurrage Risk
              </p>
              <p className="text-3xl font-black text-red-500">
                {liveKpis.demurrageRisks?.riskCount || 0} Shipments
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Upload KPIs (only if not empty) */}
      {!isEmpty && (
        <>
          <div className="mb-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <UploadCloud className="text-blue-400 w-5 h-5" />
              Report-based Analytics
            </h3>
          </div>
          <div className="kpi-grid">
            <KpiCard
              label="On-Time Delivery"
              value={`${fmt(metrics.onTimePercent, 1)}%`}
              sub={`${metrics.totalShipments} total shipments`}
              icon={<Clock size={18} />}
              variant={onTimeVariant}
              trend={metrics.onTimePercent >= 90 ? "up" : "down"}
              trendLabel={
                metrics.onTimePercent >= 90 ? "On target" : "Below target"
              }
            />
            <KpiCard
              label="Avg. Cost / Shipment"
              value={fmtCurrency(metrics.costPerShipment)}
              icon={<DollarSign size={18} />}
            />
            <KpiCard
              label="Revenue MTD"
              value={fmtCurrency(metrics.revenueMtd)}
              sub={`Cost: ${fmtCurrency(metrics.costMtd)}`}
              icon={<TrendingUp size={18} />}
              variant="success"
            />
            <KpiCard
              label="Profit Margin"
              value={`${fmt(metrics.profitMarginPercent, 1)}%`}
              sub={`Profit: ${fmtCurrency(metrics.profitMtd)} MTD`}
              icon={<Zap size={18} />}
              variant={
                metrics.profitMarginPercent >= 20
                  ? "success"
                  : metrics.profitMarginPercent >= 10
                    ? "warning"
                    : "danger"
              }
            />
            <KpiCard
              label="Outstanding Invoices"
              value={fmt(metrics.outstandingInvoices)}
              icon={<Package size={18} />}
              variant={metrics.outstandingInvoices > 0 ? "warning" : "success"}
              trend={metrics.outstandingInvoices === 0 ? "up" : "neutral"}
              trendLabel={
                metrics.outstandingInvoices === 0
                  ? "All paid"
                  : "Awaiting payment"
              }
            />
            <KpiCard
              label="Active Exceptions"
              value={fmt(metrics.activeExceptions)}
              sub={`${metrics.criticalExceptions} critical`}
              icon={<AlertTriangle size={18} />}
              variant={exceptionVariant}
              trend={metrics.activeExceptions === 0 ? "up" : "down"}
              trendLabel={
                metrics.activeExceptions === 0 ? "All clear" : "Needs attention"
              }
            />
          </div>

          {/* Volume by lane chart */}
          {laneData.length > 0 && (
            <div className="kpi-chart-card">
              <div className="card-header">
                <h3>Volume by Trade Lane</h3>
                <p>Top {laneData.length} lanes · weight (kg)</p>
              </div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={1}
                  minHeight={1}
                >
                  <BarChart
                    data={laneData}
                    margin={{ left: 0, right: 8, top: 8, bottom: 40 }}
                  >
                    <XAxis
                      dataKey="lane"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                      itemStyle={{ color: "#94a3b8" }}
                      formatter={(v: any) => [
                        `${Number(v).toLocaleString()} kg`,
                        "Weight",
                      ]}
                    />
                    <Bar
                      dataKey="weight"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    >
                      {laneData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={LANE_COLORS[i % LANE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Mock Shipment Milestones */}
          <div className="kpi-chart-card" style={{ marginTop: "1.5rem" }}>
            <div className="card-header">
              <h3>Sample Shipment Tracking</h3>
              <p>Shanghai to Rotterdam</p>
            </div>
            <div
              className="card-body"
              style={{ padding: "1.5rem", overflowX: "auto" }}
            >
              <MilestoneStepper
                milestones={mockMilestones}
                currentStepIndex={2}
                orientation="horizontal"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

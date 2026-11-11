import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Package } from "lucide-react";
import { useDashboardVolumeChart } from "../context/DashboardContext";

const COLORS: Record<string, string> = {
  "In Transit": "#f59e0b", // amber
  Confirmed: "#3b82f6", // blue
  Pending: "#8b5cf6", // purple
  Completed: "#10b981", // emerald
};

export const ShipmentVolumeChart: React.FC = () => {
  const { data: volumeData } = useDashboardVolumeChart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const data =
    volumeData.length > 0
      ? volumeData
      : [
          { name: "In Transit", value: 0 },
          { name: "Confirmed", value: 0 },
          { name: "Pending", value: 0 },
          { name: "Completed", value: 0 },
        ];

  return (
    <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-xl h-full flex flex-col relative overflow-hidden group">
      <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-2xl pointer-events-none" />

      <div className="flex justify-between items-center mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Package className="w-5 h-5" strokeWidth={2} />
            </div>
            Pipeline Distribution
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Status Breakdown Across Fleet
          </p>
        </div>
      </div>

      <div
        className="flex-1 w-full z-10"
        style={{ minHeight: 280, height: 280 }}
      >
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.02)" }}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                itemStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name] || "#6366f1"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

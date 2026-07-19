"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { month: "Ene", TEUs: 420, HBLs: 180 },
  { month: "Feb", TEUs: 380, HBLs: 160 },
  { month: "Mar", TEUs: 550, HBLs: 210 },
  { month: "Abr", TEUs: 610, HBLs: 230 },
  { month: "May", TEUs: 720, HBLs: 280 },
  { month: "Jun", TEUs: 850, HBLs: 320 },
];

export default function DashboardCharts() {
  return (
    <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 w-full h-[400px] flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white">Tendencias Mensuales</h3>
        <p className="text-xs text-gray-500 mt-1">
          Evolución de TEUs en Tránsito vs HBLs Emitidos
        </p>
      </div>
      <div className="flex-1 w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTeus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorHbls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2d3748"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="#a0aec0"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#a0aec0"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111114",
                border: "1px solid rgba(31, 41, 55, 0.4)",
                borderRadius: "8px",
                color: "#fff",
              }}
              itemStyle={{ color: "#e2e8f0" }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "12px", color: "#a0aec0" }}
            />
            <Area
              type="monotone"
              dataKey="TEUs"
              name="TEUs en Tránsito"
              stroke="#818cf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTeus)"
            />
            <Area
              type="monotone"
              dataKey="HBLs"
              name="HBLs Emitidos"
              stroke="#fbbf24"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorHbls)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

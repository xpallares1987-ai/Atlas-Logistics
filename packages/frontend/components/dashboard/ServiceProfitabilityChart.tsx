"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { month: "Ene", FCL: 45000, LCL: 15000, Air: 25000, Road: 10000 },
  { month: "Feb", FCL: 42000, LCL: 18000, Air: 22000, Road: 12000 },
  { month: "Mar", FCL: 52000, LCL: 20000, Air: 28000, Road: 15000 },
  { month: "Abr", FCL: 58000, LCL: 25000, Air: 30000, Road: 18000 },
  { month: "May", FCL: 65000, LCL: 28000, Air: 35000, Road: 20000 },
  { month: "Jun", FCL: 70000, LCL: 32000, Air: 38000, Road: 22000 },
];

export default function ServiceProfitabilityChart() {
  const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}k`;

  return (
    <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 w-full flex flex-col h-[350px]">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white flex items-center justify-between">
          Rentabilidad Bruta por Servicio
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Margen consolidado desglosado (FCL, LCL, Air, Road)
        </p>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
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
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111114",
                border: "1px solid rgba(31, 41, 55, 0.4)",
                borderRadius: "8px",
                color: "#fff",
              }}
              itemStyle={{ color: "#e2e8f0" }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "12px", color: "#a0aec0" }}
            />
            <Bar
              dataKey="FCL"
              stackId="a"
              fill="#3b82f6"
              radius={[0, 0, 4, 4]}
            />
            <Bar dataKey="LCL" stackId="a" fill="#10b981" />
            <Bar dataKey="Air" stackId="a" fill="#8b5cf6" />
            <Bar
              dataKey="Road"
              stackId="a"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function TransportShareChart({
  data,
  colors,
}: {
  data: any[];
  colors: Record<string, string>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[entry.name] || "#666"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#111114",
            borderColor: "#333",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: "bold",
          }}
          itemStyle={{ color: "#fff" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

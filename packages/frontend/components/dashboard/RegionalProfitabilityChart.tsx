'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

// Datos simulados de rentabilidad total por mes y región
const data = [
  { month: 'Ene', LATAM: 25000, 'EE.UU': 45000, Europa: 30000, Asia: 50000 },
  { month: 'Feb', LATAM: 28000, 'EE.UU': 42000, Europa: 35000, Asia: 48000 },
  { month: 'Mar', LATAM: 32000, 'EE.UU': 48000, Europa: 40000, Asia: 60000 },
  { month: 'Abr', LATAM: 29000, 'EE.UU': 52000, Europa: 42000, Asia: 55000 },
  { month: 'May', LATAM: 35000, 'EE.UU': 58000, Europa: 45000, Asia: 65000 },
  { month: 'Jun', LATAM: 40000, 'EE.UU': 65000, Europa: 50000, Asia: 75000 },
];

export default function RegionalProfitabilityChart() {
  const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}k`;

  return (
    <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 w-full flex flex-col h-[350px]">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white flex items-center justify-between">
          Rentabilidad Mensual por Región
        </h3>
        <p className="text-xs text-gray-500 mt-1">Comparativa de márgenes entre las principales regiones operativas</p>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
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
                backgroundColor: '#111114', 
                border: '1px solid rgba(31, 41, 55, 0.4)', 
                borderRadius: '8px', 
                color: '#fff' 
              }} 
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', color: '#a0aec0' }}
            />
            <Bar dataKey="Asia" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="EE.UU" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Europa" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="LATAM" fill="#ec4899" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

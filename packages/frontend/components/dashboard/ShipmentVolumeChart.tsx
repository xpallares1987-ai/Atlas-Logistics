'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const data = [
  { month: 'Ene', volumen: 320, volumenAnterior: 280 },
  { month: 'Feb', volumen: 400, volumenAnterior: 310 },
  { month: 'Mar', volumen: 550, volumenAnterior: 400 },
  { month: 'Abr', volumen: 650, volumenAnterior: 450 },
  { month: 'May', volumen: 780, volumenAnterior: 500 },
  { month: 'Jun', volumen: 820, volumenAnterior: 550 },
  { month: 'Jul', volumen: 900, volumenAnterior: 600 },
  { month: 'Ago', volumen: 920, volumenAnterior: 650 },
];

export default function ShipmentVolumeChart() {
  return (
    <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 w-full flex flex-col h-[350px]">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white flex items-center justify-between">
          Volumen Mensual de Embarques
        </h3>
        <p className="text-xs text-gray-500 mt-1">Comparativa año actual vs año anterior (TEUs)</p>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#111114', 
                border: '1px solid rgba(31, 41, 55, 0.4)', 
                borderRadius: '8px', 
                color: '#fff' 
              }} 
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', color: '#a0aec0' }}
            />
            <Line 
              type="monotone" 
              dataKey="volumen" 
              name="Año Actual" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#16161A', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="volumenAnterior" 
              name="Año Anterior" 
              stroke="#9ca3af" 
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: '#16161A', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

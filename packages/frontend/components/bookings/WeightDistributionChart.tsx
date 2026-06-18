'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface WeightDistributionChartProps {
  grossWeight: number;
  equipmentType: string;
}

export default function WeightDistributionChart({ grossWeight, equipmentType }: WeightDistributionChartProps) {
  const getCapacity = (type: string) => {
    switch(type) {
      case '20DC': return 28000;
      case '40HC': return 28500;
      case 'LCL': return 10000; // arbitrary metric for groupage max check
      case 'AIR': return 5000;
      default: return 28000;
    }
  };

  const capacity = getCapacity(equipmentType);
  const safeWeight = grossWeight > capacity ? capacity : grossWeight;
  const overflowWeight = grossWeight > capacity ? grossWeight - capacity : 0;
  const remaining = grossWeight >= capacity ? 0 : capacity - grossWeight;

  const data = grossWeight > capacity ? [
    { name: 'Cargado (Ok)', value: capacity, color: '#3b82f6' },
    { name: 'Exceso', value: overflowWeight, color: '#ef4444' }
  ] : [
    { name: 'Cargado', value: safeWeight, color: '#3b82f6' },
    { name: 'Disponible', value: remaining, color: '#1f2937' }
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="w-[80px] h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={25}
              outerRadius={35}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#111114', border: '1px solid #1f2937', borderRadius: '4px', fontSize: '10px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`${value} KG`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase">Distribución de Capacidad</p>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-xs text-gray-300">Cargado: <span className="font-mono">{safeWeight} KG</span></span>
        </div>
        {overflowWeight > 0 ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 hover:animate-pulse"></span>
            <span className="text-xs text-red-400 font-bold">Exceso: <span className="font-mono">{overflowWeight} KG</span></span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-700"></span>
            <span className="text-xs text-gray-500">Disp.: <span className="font-mono">{remaining} KG</span> <span className="text-[10px]">({Math.round(remaining/capacity*100)}%)</span></span>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MonthlyOperationsChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" vertical={false} />
        <XAxis 
          dataKey="month" 
          stroke="#666" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          tick={{fill: '#888'}}
        />
        <YAxis 
          stroke="#666" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          tick={{fill: '#888'}}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111114', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
          cursor={{fill: '#1a1a24'}}
        />
        <Bar dataKey="completed" name="Completados" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="in_progress" name="En Tránsito" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

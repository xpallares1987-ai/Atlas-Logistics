import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package } from 'lucide-react';
import { useApiQuery } from '../../../hooks/useApiQuery';

const COLORS: Record<string, string> = {
  'PENDING': '#8b5cf6',        // purple
  'IN_TRANSIT': '#3b82f6',     // blue
  'CUSTOMS': '#f59e0b',        // amber
  'DELIVERED': '#10b981',      // emerald
};

export function ShipmentVolumeChart() {
  const { data: rawData } = useApiQuery<any>(['dashboard-charts'], '/dashboard-charts');
  
  const data = rawData?.volumeByStatus || [
    { status: 'In Transit', count: 420 },
    { status: 'Customs Hold', count: 35 },
    { status: 'Pending', count: 150 },
    { status: 'Completed', count: 850 },
  ];

  return (
    <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-xl h-full flex flex-col relative overflow-hidden group">
      <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-2xl" />
      
      <div className="flex justify-between items-center mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Package className="w-5 h-5" strokeWidth={2} />
            </div>
            Shipment Volume
          </h2>
          <p className="text-slate-400 text-sm mt-1">Active distribution by status</p>
        </div>
      </div>

      <div className="flex-1 w-full z-10" style={{ minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="status" 
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
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                borderColor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
              }} 
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.status] || '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign } from 'lucide-react';
import { useApiQuery } from '../../../hooks/useApiQuery';

export function RevenueChart() {
  const { data: rawData } = useApiQuery<any>(['dashboard-charts'], '/dashboard-charts');
  
  // Use backend data or fallback if not loaded
  const data = rawData?.revenueTrend || [
    { name: 'Jan', revenue: 4000, costs: 2400 },
    { name: 'Feb', revenue: 3000, costs: 1398 },
    { name: 'Mar', revenue: 2000, costs: 9800 },
    { name: 'Apr', revenue: 2780, costs: 3908 },
    { name: 'May', revenue: 1890, costs: 4800 },
    { name: 'Jun', revenue: 2390, costs: 3800 },
  ];

  return (
    <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-xl h-full flex flex-col relative overflow-hidden group">
      <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-2xl" />
      
      <div className="flex justify-between items-center mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
              <DollarSign className="w-5 h-5" strokeWidth={2} />
            </div>
            Financial Pulse
          </h2>
          <p className="text-slate-400 text-sm mt-1">Revenue vs Costs (YTD)</p>
        </div>
      </div>

      <div className="flex-1 w-full z-10" style={{ minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
              tickFormatter={(value) => `$${value/1000}k`}
            />
            <Tooltip 
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
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#34d399" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
              activeDot={{ r: 6, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area 
              type="monotone" 
              dataKey="costs" 
              stroke="#f43f5e" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCosts)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

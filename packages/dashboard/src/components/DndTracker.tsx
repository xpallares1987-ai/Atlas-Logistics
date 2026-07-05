import { useState, useMemo } from 'react';
import { Clock, AlertCircle, Truck, CheckCircle2, AlertTriangle, Ship, Info } from 'lucide-react';

interface DndRecord {
  id: string;
  containerId: string;
  type: 'Demurrage' | 'Detention';
  status: 'Safe' | 'Warning' | 'Critical';
  location: string;
  freeDaysTotal: number;
  daysConsumed: number;
  dailyRate: number;
  dischargeDate: string;
}

const MOCK_DND_DATA: DndRecord[] = [
  { id: '1', containerId: 'MSKU1092834', type: 'Demurrage', status: 'Safe', location: 'Port of Rotterdam', freeDaysTotal: 14, daysConsumed: 3, dailyRate: 150, dischargeDate: '2026-07-02' },
  { id: '2', containerId: 'HLXU4829102', type: 'Demurrage', status: 'Warning', location: 'Port of Hamburg', freeDaysTotal: 7, daysConsumed: 6, dailyRate: 200, dischargeDate: '2026-06-29' },
  { id: '3', containerId: 'CMAU9821734', type: 'Detention', status: 'Critical', location: 'Customer Warehouse (Madrid)', freeDaysTotal: 5, daysConsumed: 8, dailyRate: 180, dischargeDate: '2026-06-20' },
  { id: '4', containerId: 'TGHU8273615', type: 'Demurrage', status: 'Safe', location: 'Port of Valencia', freeDaysTotal: 14, daysConsumed: 10, dailyRate: 120, dischargeDate: '2026-06-25' },
];

export const DndTracker = () => {
  const [filter, setFilter] = useState<'All' | 'Demurrage' | 'Detention'>('All');

  const filteredData = useMemo(() => {
    if (filter === 'All') return MOCK_DND_DATA;
    return MOCK_DND_DATA.filter(item => item.type === filter);
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Safe': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getProgressColor = (daysConsumed: number, freeDays: number) => {
    const ratio = daysConsumed / freeDays;
    if (ratio >= 1) return 'bg-red-500';
    if (ratio >= 0.8) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Calculate projected costs
  const totalAccruedCost = useMemo(() => {
    return MOCK_DND_DATA.reduce((acc, curr) => {
      if (curr.daysConsumed > curr.freeDaysTotal) {
        return acc + ((curr.daysConsumed - curr.freeDaysTotal) * curr.dailyRate);
      }
      return acc;
    }, 0);
  }, []);

  return (
    <div 
      className="bg-[#16161A] border border-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-xl"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800/60 bg-[#111114]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">D&D Tracker</h2>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                Demurrage & Detention Control
              </p>
            </div>
          </div>
          
          {/* Cost Alert Badge */}
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">Accrued Fees</span>
              <span className="text-sm font-black text-red-400 leading-none">${totalAccruedCost.toLocaleString()}</span>
            </div>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['All', 'Demurrage', 'Detention'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-[#1C1C21] text-gray-400 hover:text-white hover:bg-[#25252A]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {filteredData.map((record) => {
          const ratio = record.daysConsumed / record.freeDaysTotal;
          const percentage = Math.min(Math.round(ratio * 100), 100);
          const isOverdue = record.daysConsumed > record.freeDaysTotal;
          const daysOverdue = isOverdue ? record.daysConsumed - record.freeDaysTotal : 0;
          const currentFees = daysOverdue * record.dailyRate;

          return (
            <div key={record.id} className="bg-[#1C1C21] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${record.type === 'Demurrage' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {record.type === 'Demurrage' ? <Ship className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200 font-mono tracking-wider">{record.containerId}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{record.type}</span>
                      <span className="text-gray-700 text-[10px]">•</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{record.location}</span>
                    </div>
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${getStatusColor(record.status)}`}>
                  {record.status === 'Safe' && <CheckCircle2 className="w-3 h-3" />}
                  {record.status === 'Warning' && <AlertTriangle className="w-3 h-3" />}
                  {record.status === 'Critical' && <AlertCircle className="w-3 h-3" />}
                  {record.status}
                </div>
              </div>

              {/* Progress Bar Area */}
              <div className="space-y-2 bg-[#111114] rounded-lg p-3 border border-gray-800/50">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-medium">Free Time Usage</span>
                  <span className={`font-mono font-bold ${isOverdue ? 'text-red-400' : 'text-gray-300'}`}>
                    {record.daysConsumed} / {record.freeDaysTotal} days
                  </span>
                </div>
                
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden flex relative">
                  {/* Free days section */}
                  <div className="h-full bg-gray-700 w-full absolute opacity-30"></div>
                  <div 
                    className={`h-full relative transition-all duration-500 rounded-r-full ${getProgressColor(record.daysConsumed, record.freeDaysTotal)}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                {isOverdue && (
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-red-500/10">
                    <span className="text-[10px] text-red-400/80 uppercase font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {daysOverdue} days overdue
                    </span>
                    <span className="text-xs font-black text-red-500 font-mono">
                      +${currentFees.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {filteredData.length === 0 && (
          <div className="py-10 text-center flex flex-col items-center">
            <Info className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 font-medium">No containers found in this status.</p>
          </div>
        )}
      </div>
    </div>
  );
};

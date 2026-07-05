/**
 * RatesContent — the freight comparer content area without the standalone sidebar/shell.
 * Used when this package is embedded inside a host app that already provides navigation
 * (e.g. @atlas/frontend AppLayout). App.tsx retains the full-page standalone version.
 */
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store';
import { setCurrency } from './store/slices/currencySlice';
import { MOCK_RATES } from './data/mockRates';
import RateTable from './components/RateTable';

export default function RatesContent() {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.currency.current);
  const [rates] = React.useState<typeof MOCK_RATES>(MOCK_RATES);

  return (
    <div className="flex flex-col h-full bg-slate-100/50">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-200/40 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-blue-200/30 blur-[120px]" />
      </div>

      {/* Toolbar */}
      <header className="h-[70px] bg-white/60 backdrop-blur-md border-b border-white flex items-center justify-between px-8 shrink-0 z-10 relative">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Freight Comparer</h2>
        <div className="flex items-center gap-2 bg-white/80 p-1 rounded-lg border border-slate-200 shadow-sm">
          <button
            onClick={() => dispatch(setCurrency('USD'))}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${currency === 'USD' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            USD
          </button>
          <button
            onClick={() => dispatch(setCurrency('EUR'))}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${currency === 'EUR' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            EUR
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative z-10 space-y-8">
        {/* Bento Grid Header */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Average Rate (Asia-EU)</p>
            <h3 className="text-3xl font-black text-slate-800 font-mono">$1,850</h3>
            <p className="text-xs text-emerald-500 font-bold mt-2">↓ 5.2% vs Last Week</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Cheapest Route</p>
            <h3 className="text-3xl font-black text-indigo-600 font-mono">$1,780</h3>
            <p className="text-xs text-slate-500 font-semibold mt-2">MSC (CNSHA → NLRTM)</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Surcharge Avg %</p>
            <h3 className="text-3xl font-black text-slate-800 font-mono">28%</h3>
            <p className="text-xs text-amber-500 font-bold mt-2">High BAF impact</p>
          </div>
        </div>

        <RateTable rates={rates} />
      </div>
    </div>
  );
}

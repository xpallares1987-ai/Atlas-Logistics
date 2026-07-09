/**
 * RatesContent — the freight comparer content area without the standalone sidebar/shell.
 * Used when this package is embedded inside a host app that already provides navigation
 * (e.g. @atlas/frontend AppLayout). App.tsx retains the full-page standalone version.
 */
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "./store";
import { setCurrency } from "./store/slices/currencySlice";
import { MOCK_RATES } from "./data/mockRates";
import RateTable from "./components/RateTable";
import { TrendingDown, Zap, BarChart3 } from "lucide-react";

export default function RatesContent() {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.currency.current);
  const [rates] = React.useState<typeof MOCK_RATES>(MOCK_RATES);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 relative overflow-hidden">
      {/* Decorative background gradients (Dark Premium) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[800px] h-[800px] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      {/* Toolbar */}
      <header className="h-[75px] bg-slate-900/60 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-8 shrink-0 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Freight Comparer
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
          <button
            onClick={() => dispatch(setCurrency("USD"))}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${currency === "USD" ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}
          >
            USD
          </button>
          <button
            onClick={() => dispatch(setCurrency("EUR"))}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${currency === "EUR" ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}
          >
            EUR
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative z-10 space-y-8">
        {/* Bento Grid Header - Premium Dark Mode */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group relative bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.2)] hover:border-indigo-500/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Average Rate (Asia-EU)
              </p>
              <BarChart3 className="w-5 h-5 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-4xl font-black text-white font-mono group-hover:scale-105 transition-transform origin-left inline-block">
              $1,850
            </h3>
            <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
              <TrendingDown className="w-3 h-3 text-emerald-400" />
              <p className="text-xs text-emerald-400 font-bold">
                5.2% vs Last Week
              </p>
            </div>
          </div>
          
          <div className="group relative bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)] hover:border-blue-500/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Cheapest Route
              </p>
              <Zap className="w-5 h-5 text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-4xl font-black text-blue-400 font-mono group-hover:scale-105 transition-transform origin-left inline-block">
              $1,780
            </h3>
            <div className="mt-3 text-xs font-bold text-slate-300 uppercase tracking-wider bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 w-fit">
              MSC (CNSHA → NLRTM)
            </div>
          </div>
          
          <div className="group relative bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.2)] hover:border-amber-500/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Surcharge Avg %
              </p>
              <TrendingDown className="w-5 h-5 text-amber-400 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-4xl font-black text-white font-mono group-hover:scale-105 transition-transform origin-left inline-block">
              28%
            </h3>
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-bold w-fit">
              High BAF impact
            </div>
          </div>
        </div>

        <RateTable rates={rates} />
      </div>
    </div>
  );
}

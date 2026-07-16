// @ts-nocheck
import React from "react";
import { Ship, Anchor, LayoutDashboard, Settings } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "./components";
import { useTranslation } from "react-i18next";
import RatesContent from "./RatesContent";

export default function App() {
  const { language } = useSelector((state: RootState) => state.app);
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* LEFT SIDEBAR */}
      <aside className="w-[280px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-white relative z-20 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.4)]">
              <Ship className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                ATLAS<span className="text-indigo-400 font-light">RATES</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
                Freight Comparer
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Main Menu
          </div>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg font-medium shadow-inner border border-indigo-500/20 transition-all"
          >
            <Anchor className="w-4 h-4" />
            {t("market_rates")}
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            {t("analytics")}
          </a>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2 hover:text-slate-200 cursor-pointer transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </span>
            <span className="font-mono bg-slate-800 px-2 py-1 rounded-md text-[10px] font-bold">
              v2.0
            </span>
          </div>
        </div>
      </aside>

      {/* RIGHT WORKSPACE AREA - Delegate entirely to RatesContent */}
      <main className="flex-1 min-h-0 relative">
        <RatesContent />
      </main>
    </div>
  );
}


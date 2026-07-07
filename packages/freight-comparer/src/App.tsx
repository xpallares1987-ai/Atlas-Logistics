import React, { useState } from "react";
import { Ship, Anchor, LayoutDashboard, Settings } from "lucide-react";
import { DynamicRateEngine, RateTable } from "@atlas/ui";
import { useSelector } from "react-redux";
import type { RootState } from "@atlas/ui";
import { useTranslation } from "react-i18next";

export default function App() {
  const { currency, language } = useSelector((state: RootState) => state.app);
  const { t, i18n } = useTranslation();

  const [rates, setRates] = useState<any[]>([]);

  React.useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  React.useEffect(() => {
    async function loadRates() {
      try {
        const { listQuotes } = await import("@dataconnect/generated");
        const res = await listQuotes();
        if (res.data?.quotes) {
          const mapped = res.data.quotes.map((q: any) => {
            const baseRate = q.totalCost * 0.7;
            const surcharges = q.totalCost * 0.3;
            return {
              id: q.quoteNumber,
              carrier: q.carrier?.name || "Atlas Carrier",
              route: `${q.origin}->${q.destination}`,
              transitTime: "30 days",
              baseRate: Math.round(baseRate),
              baf: Math.round(surcharges * 0.6),
              pss: Math.round(surcharges * 0.4),
              sellMargin: 15,
            };
          });
          setRates(mapped);
        }
      } catch (e) {
        console.error("Failed to load Data Connect quotes:", e);
      }
    }
    loadRates();
  }, []);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      {/* LEFT SIDEBAR - Glassmorphism Dark */}
      <aside className="w-[280px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-white relative z-20">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Ship className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                ATLAS<span className="text-indigo-400 font-light">RATES</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">
                Freight Forwarding UI
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
            className="flex items-center gap-3 px-3 py-2.5 bg-white/10 text-white rounded-lg font-medium shadow-sm border border-white/5 transition-all"
          >
            <Anchor className="w-4 h-4 text-indigo-400" />
            {t("market_rates")}
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            {t("analytics")}
          </a>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </span>
            <span className="font-mono bg-slate-800 px-2 py-1 rounded text-[10px]">
              v2.0
            </span>
          </div>
        </div>
      </aside>

      {/* RIGHT WORKSPACE AREA */}
      <main className="flex-1 flex flex-col min-h-0 bg-slate-100/50 relative">
        {/* Decorative background gradients for Glassmorphism */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-200/40 blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-blue-200/30 blur-[120px]"></div>
        </div>

        {/* Toolbar */}
        <header className="h-[70px] bg-white/60 backdrop-blur-md border-b border-white flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Freight Comparer
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/80 p-1 rounded-lg border border-slate-200 shadow-sm">
              <button
                onClick={() => {}}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${currency === "USD" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800"}`}
              >
                USD
              </button>
              <button
                onClick={() => {}}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${currency === "EUR" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800"}`}
              >
                EUR
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white/80 p-1 rounded-lg border border-slate-200 shadow-sm">
              <button
                onClick={() => i18n.changeLanguage("en")}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${language === "en" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-slate-800"}`}
              >
                EN
              </button>
              <button
                onClick={() => i18n.changeLanguage("es")}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${language === "es" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-slate-800"}`}
              >
                ES
              </button>
            </div>

            <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-sm">
              XP
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10 space-y-8">
          
          {/* Rate Table Section */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <RateTable rates={rates} onSelectRate={(rate, sell) => console.log("Selected rate:", rate, sell)} />
          </div>

          {/* Rate Engine Component */}
          <div className="h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <DynamicRateEngine />
          </div>
        </div>
      </main>
    </div>
  );
}

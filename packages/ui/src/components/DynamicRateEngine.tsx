"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  TrendingUp,
  DollarSign,
  Clock,
  Percent,
  CheckCircle2,
  Shield,
  ChevronRight,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { useOpenExchangeRates } from "./hooks/useOpenExchangeRates";
import { motion, AnimatePresence } from "framer-motion";

export interface DynamicRateItem {
  id: string;
  carrier: string;
  serviceLine: string;
  transitTime: number; // days
  validTo: string;
  baseOceanFreight: number;
  baf: number; // Bunker Adjustment Factor
  pss: number; // Peak Season Surcharge
  thc: number; // Terminal Handling Charge Origin + Dest
}

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL || "/api";

export function DynamicRateEngine() {
  const [ratesData, setRatesData] = useState<DynamicRateItem[]>([]);
  const [_loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState("CNSHA (Shanghai)");
  const [destination, setDestination] = useState("NLRTM (Rotterdam)");
  const [containerSize, setContainerSize] = useState("40HC");

  const [marginType, setMarginType] = useState<"flat" | "percentage">("flat");
  const [marginValue, setMarginValue] = useState<number>(300);

  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const { rates, loading: ratesLoading } = useOpenExchangeRates("USD");

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/rates`);
      const data = await res.json();
      setRatesData(data);
    } catch (err) {
      console.error("Failed to fetch rates", err);
    } finally {
      setLoading(false);
    }
  };

  const calculatedRates = useMemo(() => {
    const exchangeRate = currency === "USD" ? 1 : rates["EUR"] || 0.9; // fallback 0.9

    return ratesData
      .map((rate) => {
        // Convert base costs to selected currency
        const baseOceanFreight = rate.baseOceanFreight * exchangeRate;
        const baf = rate.baf * exchangeRate;
        const pss = rate.pss * exchangeRate;
        const thc = rate.thc * exchangeRate;

        const buyRateTotal = baseOceanFreight + baf + pss + thc;

        let sellMargin = 0;
        if (marginType === "flat") {
          sellMargin = marginValue;
        } else {
          sellMargin = buyRateTotal * (marginValue / 100);
        }

        const sellRateTotal = buyRateTotal + sellMargin;

        return {
          ...rate,
          baseOceanFreight,
          baf,
          pss,
          thc,
          buyRateTotal,
          sellMargin,
          sellRateTotal,
        };
      })
      .sort((a, b) => a.sellRateTotal - b.sellRateTotal); // Sort cheapest first
  }, [ratesData, marginType, marginValue, currency, rates]);

  const generateQuote = async (rate: any) => {
    try {
      const quoteData = {
        quoteNumber: `QT-2026-${Math.floor(Math.random() * 100000)}`,
        customer: "Client From Portal",
        origin,
        destination,
        equipment: containerSize,
        buyRateTotal: rate.buyRateTotal,
        sellMargin: rate.sellMargin,
        sellRateTotal: rate.sellRateTotal,
        status: "DRAFT",
        validTo: rate.validTo,
      };

      const res = await fetch(`${API_URL}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteData),
      });
      if (res.ok) {
        alert("Quote saved to DB successfully!");
      } else {
        alert("Error generating quote");
      }
    } catch (err) {
      console.error("Error saving quote", err);
    }
  };

  const tableVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full min-h-[calc(100vh-4rem)] flex-1 bg-slate-950 text-slate-200"
    >
      {/* Top Panel: Search & Pricing Strategy */}
      <div className="p-6 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          {/* Search Criteria */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              Routing Engine Parameters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">
                  Port of Loading (POL)
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">
                  Port of Discharge (POD)
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">
                  Equipment Type
                </label>
                <select
                  value={containerSize}
                  onChange={(e) => setContainerSize(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner appearance-none"
                >
                  <option value="20DC">20' Dry Container</option>
                  <option value="40DC">40' Dry Container</option>
                  <option value="40HC">40' High Cube</option>
                  <option value="40NOR">40' Non-Op Reefer</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                <Search className="w-4 h-4" /> Fetch Live Rates
              </motion.button>
            </div>
          </motion.div>

          {/* Pricing Strategy (Markup) */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-[400px] bg-gradient-to-br from-indigo-900/40 to-slate-900/40 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
              <TrendingUp className="w-32 h-32 text-indigo-400" />
            </div>

            <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-5 flex items-center gap-2 relative z-10">
              <SlidersHorizontal className="w-4 h-4" />
              Dynamic Margin Strategy
            </h2>

            <div className="space-y-5 relative z-10">
              <div className="flex p-1 bg-slate-950/60 rounded-xl border border-slate-700/80 w-fit shadow-inner">
                <button
                  onClick={() => {
                    setMarginType("flat");
                    setMarginValue(300);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${marginType === "flat" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <DollarSign className="w-3.5 h-3.5" /> Flat Value
                </button>
                <button
                  onClick={() => {
                    setMarginType("percentage");
                    setMarginValue(15);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${marginType === "percentage" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Percent className="w-3.5 h-3.5" /> Percentage
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-indigo-200/70 font-semibold">
                    Target Markup Value
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded">
                    {marginType === "flat" ? `$${marginValue}` : `${marginValue}%`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={marginType === "flat" ? 0 : 0}
                    max={marginType === "flat" ? 2000 : 100}
                    step={marginType === "flat" ? 50 : 1}
                    value={marginValue}
                    onChange={(e) => setMarginValue(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-indigo-500/20">
                <label className="block text-xs text-indigo-200/70 mb-2 font-semibold">
                  Live FX Currency (Frankfurter API)
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrency("USD")}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${currency === "USD" ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "bg-slate-950/50 border-slate-700 text-slate-500 hover:text-slate-300"}`}
                  >
                    USD ($)
                  </button>
                  <button
                    onClick={() => setCurrency("EUR")}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${currency === "EUR" ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "bg-slate-950/50 border-slate-700 text-slate-500 hover:text-slate-300"}`}
                  >
                    EUR (€)
                    {ratesLoading && (
                      <Globe className="w-3.5 h-3.5 animate-pulse text-indigo-200" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Panel: Results Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-between items-end mb-4"
          >
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                Live Freight Marketplace
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  {calculatedRates.length} Results
                </span>
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                Routing:{" "}
                <span className="text-slate-200 font-semibold bg-slate-800 px-2 py-0.5 rounded mx-1">
                  {origin}
                </span>{" "}
                <ChevronRight className="inline w-3 h-3 text-slate-500" />{" "}
                <span className="text-slate-200 font-semibold bg-slate-800 px-2 py-0.5 rounded mx-1">
                  {destination}
                </span>
              </p>
            </div>
          </motion.div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-700/50 text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                  <th className="py-5 px-6">Carrier / Network</th>
                  <th className="py-5 px-6 text-right">Base O/F</th>
                  <th className="py-5 px-6 text-right group relative cursor-help">
                    <span className="border-b border-dashed border-slate-500 pb-0.5">
                      Surcharges
                    </span>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-slate-800/95 backdrop-blur text-slate-200 text-xs p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none border border-slate-700">
                      Includes BAF (Bunker), PSS (Peak Season) and Origin/Dest THC.
                    </div>
                  </th>
                  <th className="py-5 px-6 text-right text-indigo-400 bg-indigo-900/10">
                    Calculated Margin
                  </th>
                  <th className="py-5 px-6 text-right font-bold text-white bg-blue-900/20">
                    Total Sell Rate
                  </th>
                  <th className="py-5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <motion.tbody 
                variants={tableVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-slate-800/50"
              >
                <AnimatePresence>
                  {calculatedRates.map((rate, idx) => (
                    <motion.tr
                      variants={rowVariants}
                      layout
                      key={rate.id}
                      className={`hover:bg-slate-800/40 transition-colors ${idx === 0 ? "bg-emerald-900/10" : ""}`}
                    >
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg ${
                              rate.carrier === "Maersk"
                                ? "bg-gradient-to-br from-blue-500 to-blue-700"
                                : rate.carrier === "MSC"
                                  ? "bg-gradient-to-br from-yellow-500 to-yellow-700"
                                  : rate.carrier === "Hapag-Lloyd"
                                    ? "bg-gradient-to-br from-orange-500 to-orange-700"
                                    : "bg-gradient-to-br from-red-500 to-red-700"
                            }`}
                          >
                            {rate.carrier?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-2 text-base">
                              {rate.carrier || "Unknown Carrier"}
                              {idx === 0 && (
                                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" /> Best Choice
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                              <span className="bg-slate-800 px-2 py-0.5 rounded">{rate.serviceLine}</span>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-1 text-slate-300">
                                <Clock className="w-3.5 h-3.5 text-slate-500" /> {rate.transitTime}{" "}
                                Days Transit
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 px-6 text-right font-mono text-sm text-slate-300 font-medium">
                        {currency === "USD" ? "$" : "€"}
                        {rate.baseOceanFreight.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </td>

                      <td className="py-5 px-6 text-right">
                        <div className="font-mono text-sm text-slate-400 font-medium">
                          +{currency === "USD" ? "$" : "€"}
                          {(rate.baf + rate.pss + rate.thc).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 },
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5 uppercase tracking-widest flex justify-end gap-2 font-semibold">
                          <span title={`BAF: ${rate.baf}`} className="bg-slate-800 px-1.5 rounded">BAF</span>
                          <span title={`PSS: ${rate.pss}`} className="bg-slate-800 px-1.5 rounded">PSS</span>
                          <span title={`THC: ${rate.thc}`} className="bg-slate-800 px-1.5 rounded">THC</span>
                        </div>
                      </td>

                      <td className="py-5 px-6 text-right bg-indigo-900/10">
                        <div className="font-mono text-base font-bold text-indigo-400">
                          +{currency === "USD" ? "$" : "€"}
                          {rate.sellMargin.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-indigo-400/60 mt-1 uppercase tracking-widest font-semibold">
                          {marginType === "percentage"
                            ? `${marginValue}% markup`
                            : "Flat margin"}
                        </div>
                      </td>

                      <td className="py-5 px-6 text-right bg-blue-900/20">
                        <div className="font-mono text-xl font-black text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                          {currency === "USD" ? "$" : "€"}
                          {rate.sellRateTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-blue-300/70 mt-1 uppercase tracking-widest font-semibold">
                          Valid: {rate.validTo}
                        </div>
                      </td>

                      <td className="py-5 px-6 text-center">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => generateQuote(rate)}
                          className="p-3 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-xl transition-colors shadow-lg"
                          title="Generate Official PDF Quote"
                        >
                          <Shield className="w-5 h-5" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

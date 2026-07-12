import React, { useState, useMemo } from "react";
import {
  Ship,
  AlertCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Search,
  Filter,
  Globe,
  DollarSign as DollarSignIcon,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import RfqGeneratorModal from "./RfqGeneratorModal";
import { useSelector, useDispatch } from "react-redux";
import { type RootState, setCurrency, setLanguage, addToCart } from "@/components";

interface RateTableProps {
  rates: any[];
  isLoading?: boolean;
  error?: any;
}

export default function RateTable({ rates, isLoading, error }: RateTableProps) {
  const {
    currency: activeCurrency,
    language,
    quoteCart: bookedRates,
  } = useSelector((state: RootState) => state.app);
  const dispatch = useDispatch();
  const exchangeRates = { EUR: 0.92, USD: 1.0 }; // Hardcoded mock exchange rates

  const [filterPol, setFilterPol] = useState("");
  const [filterPod, setFilterPod] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");

  const [sortKey, setSortKey] = useState<"total" | "transitTimeDays">("total");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState<string | null>(null);
  const [rfqRate, setRfqRate] = useState<any | null>(null);

  const handleBooking = async (rate: any) => {
    if (bookedRates.find((r) => r.id === rate.id)) return;
    setIsBooking(rate.id);
    try {
      dispatch(addToCart(rate as any));
    } catch (error) {
      console.error("Failed to book shipment:", error);
    } finally {
      setIsBooking(null);
    }
  };

  const convertAmount = (amount: number, baseCurrency: string) => {
    if (baseCurrency === activeCurrency) return amount;
    const rate = activeCurrency === "EUR" ? exchangeRates.EUR : 1 / exchangeRates.EUR;
    return Math.round(amount * rate);
  };

  const filteredAndSortedRates = useMemo(() => {
    let result = (rates || []).map((r) => {
      // Map DataConnect 'Quote' to table fields and add some pseudo-random visual flair
      const numId = parseInt(r.id?.substring(0,8) || "0", 16) || 0;
      const transitTimeDays = 20 + (numId % 20);
      const isDirect = (numId % 3) === 0;
      const carrierName = r.carrier?.name || "Unknown Carrier";
      
      const diff = (r.totalCost || 0) - (r.baseFreightCost || 0);
      const surcharges = [
        { name: "BAF (Bunker)", amount: diff * 0.5 },
        { name: "THC (Terminal)", amount: diff * 0.3 },
        { name: "Doc Fee", amount: diff * 0.2 },
      ].filter(s => s.amount > 0);

      return {
        ...r,
        pol: r.origin,
        pod: r.destination,
        carrierName,
        transitTimeDays,
        isDirect,
        surcharges,
      };
    }).filter(
      (r) =>
        r.pol?.toLowerCase().includes(filterPol.toLowerCase()) &&
        r.pod?.toLowerCase().includes(filterPod.toLowerCase()) &&
        r.carrierName?.toLowerCase().includes(filterCarrier.toLowerCase()),
    );

    result.sort((a, b) => {
      let aVal = sortKey === "total" ? convertAmount(a.totalCost, a.currency) : a[sortKey];
      let bVal = sortKey === "total" ? convertAmount(b.totalCost, b.currency) : b[sortKey];

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [rates, filterPol, filterPod, filterCarrier, sortKey, sortOrder, activeCurrency, exchangeRates]);

  const toggleSort = (key: "total" | "transitTimeDays") => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 shadow-2xl rounded-3xl overflow-hidden flex flex-col relative z-10">
      {/* Top reflection line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400/20 to-transparent pointer-events-none" />

      {/* Header & Filters */}
      <div className="px-8 py-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                <Ship className="w-5 h-5 text-indigo-400" />
              </div>
              Live Market Rates
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
              Freight Forwarding Analytics Engine
            </p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-slate-900/80 border border-slate-700/50 rounded-xl flex items-center gap-2 backdrop-blur-md">
              <DollarSignIcon className="w-4 h-4 text-indigo-400" />
              <select
                value={activeCurrency}
                onChange={(e) => dispatch(setCurrency(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="USD" className="bg-slate-800">USD</option>
                <option value="EUR" className="bg-slate-800">EUR</option>
              </select>
            </div>
            <div className="px-4 py-2 bg-slate-900/80 border border-slate-700/50 rounded-xl flex items-center gap-2 backdrop-blur-md">
              <Globe className="w-4 h-4 text-indigo-400" />
              <select
                value={language}
                onChange={(e) => dispatch(setLanguage(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-slate-800">EN</option>
                <option value="de" className="bg-slate-800">DE</option>
              </select>
            </div>
            <div className="px-5 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl backdrop-blur-md flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest block mb-0.5 leading-none">
                  Booked
                </span>
                <span className="text-sm font-black text-emerald-400 leading-none">
                  {bookedRates.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 bg-slate-950/50 p-2.5 rounded-2xl border border-slate-700/50 shadow-inner">
          <Filter className="w-5 h-5 text-slate-500 ml-3 shrink-0" />
          <input
            type="text"
            placeholder="Origin (POL)..."
            value={filterPol}
            onChange={(e) => setFilterPol(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-semibold text-slate-200 placeholder-slate-500 flex-1 px-3 focus:ring-0"
          />
          <div className="w-px h-6 bg-slate-700"></div>
          <input
            type="text"
            placeholder="Destination (POD)..."
            value={filterPod}
            onChange={(e) => setFilterPod(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-semibold text-slate-200 placeholder-slate-500 flex-1 px-3 focus:ring-0"
          />
          <div className="w-px h-6 bg-slate-700"></div>
          <input
            type="text"
            placeholder="Carrier..."
            value={filterCarrier}
            onChange={(e) => setFilterCarrier(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-semibold text-slate-200 placeholder-slate-500 flex-1 px-3 focus:ring-0"
          />
        </div>
      </div>

      {/* Table container */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700/50 text-[11px] uppercase tracking-widest text-slate-400 font-bold">
              <th className="py-5 px-8 whitespace-nowrap">Carrier & Lane</th>
              <th
                className="py-5 px-6 whitespace-nowrap cursor-pointer hover:bg-slate-700/50 transition-colors group"
                onClick={() => toggleSort("transitTimeDays")}
              >
                <div className="flex items-center gap-2 group-hover:text-slate-300">
                  Schedule{" "}
                  {sortKey === "transitTimeDays" &&
                    (sortOrder === "asc" ? (
                      <ChevronUp className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-indigo-400" />
                    ))}
                </div>
              </th>
              <th className="py-5 px-6 whitespace-nowrap">Base Ocean</th>
              <th className="py-5 px-6 whitespace-nowrap">Surcharges</th>
              <th
                className="py-5 px-6 whitespace-nowrap text-right cursor-pointer hover:bg-slate-700/50 transition-colors group"
                onClick={() => toggleSort("total")}
              >
                <div className="flex items-center justify-end gap-2 group-hover:text-slate-300">
                  Total Net{" "}
                  {sortKey === "total" &&
                    (sortOrder === "asc" ? (
                      <ChevronUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-emerald-400" />
                    ))}
                </div>
              </th>
              <th className="py-5 px-8 whitespace-nowrap text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filteredAndSortedRates.map((rate) => {
              const isExpanded = expandedRowId === rate.id;
              const isBooked = !!bookedRates.find((r) => r.id === rate.id);

              return (
                <React.Fragment key={rate.id}>
                  <tr
                    onClick={() => setExpandedRowId(isExpanded ? null : rate.id)}
                    className={`group hover:bg-slate-800/60 transition-all duration-300 ease-out cursor-pointer relative ${isExpanded ? 'bg-slate-800/40' : ''}`}
                  >
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-slate-800 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.15)] shrink-0 group-hover:scale-105 transition-transform">
                          <span className="text-indigo-400 font-black text-sm">
                            {rate.carrierName.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base tracking-tight group-hover:text-indigo-300 transition-colors">
                            {rate.carrierName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-400">
                            <span className="truncate max-w-[120px]" title={rate.pol}>
                              {rate.pol?.split(",")[0]}
                            </span>
                            <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[120px]" title={rate.pod}>
                              {rate.pod?.split(",")[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-6 px-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-slate-200">
                          {rate.transitTimeDays} days
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md w-fit border border-indigo-500/20">
                          {rate.isDirect ? "DIRECT" : "TRANSSHIPMENT"}
                        </span>
                      </div>
                    </td>

                    <td className="py-6 px-6">
                      <span className="text-sm font-bold text-slate-300 font-mono bg-slate-900/80 border border-slate-700/50 px-3 py-1.5 rounded-lg shadow-inner block w-fit">
                        {activeCurrency} {convertAmount(rate.baseFreightCost, rate.currency).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-6 px-6">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-lg w-fit group-hover:bg-slate-700/50 transition-colors">
                        <span>{rate.surcharges.length} Surcharges</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                    </td>

                    <td className="py-6 px-6 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xl font-black text-emerald-400 font-mono drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform origin-right">
                          {activeCurrency} {convertAmount(rate.totalCost, rate.currency).toLocaleString()}
                        </span>
                        {rate.isDirect && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                            <AlertCircle className="w-3 h-3" /> Best Route
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-6 px-8 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-3 items-center">
                        <button
                          onClick={() => handleBooking(rate)}
                          disabled={isBooked || isBooking === rate.id}
                          className={`w-32 px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all duration-300 ${
                            isBooked
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] hover:-translate-y-0.5"
                          }`}
                        >
                          {isBooked ? "Booked ✓" : isBooking === rate.id ? "Saving..." : "Book Now"}
                        </button>
                        <button
                          onClick={() => setRfqRate(rate)}
                          className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                        >
                          PDF Quote
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row - Premium Styling */}
                  {isExpanded && (
                    <tr className="bg-slate-900/80 border-b border-slate-700/50 shadow-inner">
                      <td colSpan={6} className="py-8 px-12">
                        <div className="flex gap-16 relative">
                          {/* Inner glow */}
                          <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/5 blur-[50px] pointer-events-none" />
                          
                          <div className="flex-1 relative z-10">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                              Surcharge Breakdown
                            </h4>
                            <div className="space-y-4">
                              {rate.surcharges.map((s: any, i: number) => {
                                const amount = convertAmount(s.amount, rate.currency);
                                const total = convertAmount(rate.totalCost, rate.currency);
                                const percentage = Math.round((amount / total) * 100) || 0;

                                return (
                                  <div key={i} className="flex items-center gap-5">
                                    <span className="w-24 text-[11px] font-bold text-slate-300 uppercase">
                                      {s.name}
                                    </span>
                                    <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                                      <div
                                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)] relative"
                                        style={{ width: `${percentage}%` }}
                                      >
                                        <div className="absolute top-0 left-0 right-0 h-px bg-white/30" />
                                      </div>
                                    </div>
                                    <span className="w-28 text-right text-sm font-mono font-black text-slate-200">
                                      {activeCurrency} {amount.toLocaleString()}{" "}
                                      <span className="text-slate-500 text-[10px] font-bold ml-1">
                                        ({percentage}%)
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="w-[350px] border-l border-slate-700/50 pl-12 flex flex-col justify-center relative z-10">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                              Quote Summary
                            </h4>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 shadow-lg backdrop-blur-md">
                              <p className="text-sm text-slate-300 mb-2 flex justify-between">
                                <span className="font-semibold text-slate-400">Valid Until:</span>{" "}
                                <span className="font-mono font-bold">{rate.validityDate}</span>
                              </p>
                              <p className="text-sm text-slate-300 flex justify-between">
                                <span className="font-semibold text-slate-400">Reference ID:</span>{" "}
                                <span className="font-mono font-bold text-indigo-400">{rate.quoteNumber}</span>
                              </p>
                            </div>
                            <div className="mt-5 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] font-semibold text-amber-500/80 leading-relaxed shadow-inner">
                              "This rate is subject to space and equipment availability. Peak Season Surcharge (PSS) may vary at time of sailing."
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {isLoading && (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                    <p className="text-lg font-bold text-slate-300">Searching global network...</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Contacting 40+ carriers via API</p>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && filteredAndSortedRates.length === 0 && (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-4 shadow-inner">
                      <Search className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-lg font-bold text-slate-300">No rates found</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Try adjusting your filters or search terms</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rfqRate && (
        <RfqGeneratorModal rate={rfqRate} onClose={() => setRfqRate(null)} />
      )}
    </div>
  );
}

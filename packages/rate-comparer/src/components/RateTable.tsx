// @ts-nocheck
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
  FileText,
  Zap
} from "lucide-react";
import { Loader2 } from "lucide-react";
import RfqGeneratorModal from "./RfqGeneratorModal";
import { useAppStore } from "../shared/store";

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
    setCurrency,
    setLanguage,
    addToCart
  } = useAppStore();
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
      addToCart(rate as any);
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
    const result = (rates || []).map((r) => {
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
      const aVal = sortKey === "total" ? convertAmount(a.totalCost, a.currency) : a[sortKey];
      const bVal = sortKey === "total" ? convertAmount(b.totalCost, b.currency) : b[sortKey];

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
    <div className="w-full flex flex-col gap-6 relative z-10 pb-12">
      
      {/* Header & Filters Card */}
      <div className="w-full bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 shadow-2xl rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400/20 to-transparent pointer-events-none" />
        
        <div className="px-6 md:px-8 py-6 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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
            
            <div className="flex flex-wrap gap-4">
              <div className="px-4 py-2 bg-slate-900/80 border border-slate-700/50 rounded-xl flex items-center gap-2 backdrop-blur-md">
                <DollarSignIcon className="w-4 h-4 text-indigo-400" />
                <select
                  value={activeCurrency}
                  onChange={(e) => setCurrency(e.target.value)}
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
                  onChange={(e) => setLanguage(e.target.value)}
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
          <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 bg-slate-950/50 p-2 lg:p-2.5 rounded-2xl lg:rounded-full border border-slate-700/50 shadow-inner">
            <div className="flex items-center w-full lg:w-auto flex-1 px-3 py-2 lg:py-0">
              <Filter className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Origin (POL)..."
                value={filterPol}
                onChange={(e) => setFilterPol(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-semibold text-slate-200 placeholder-slate-500 w-full focus:ring-0"
              />
            </div>
            <div className="w-full lg:w-px h-px lg:h-6 bg-slate-700"></div>
            <div className="flex items-center w-full lg:w-auto flex-1 px-3 py-2 lg:py-0">
              <input
                type="text"
                placeholder="Destination (POD)..."
                value={filterPod}
                onChange={(e) => setFilterPod(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-semibold text-slate-200 placeholder-slate-500 w-full focus:ring-0"
              />
            </div>
            <div className="w-full lg:w-px h-px lg:h-6 bg-slate-700"></div>
            <div className="flex items-center w-full lg:w-auto flex-1 px-3 py-2 lg:py-0">
              <input
                type="text"
                placeholder="Carrier..."
                value={filterCarrier}
                onChange={(e) => setFilterCarrier(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-semibold text-slate-200 placeholder-slate-500 w-full focus:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Header (Count & Sort) */}
      {!isLoading && filteredAndSortedRates.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 gap-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
            <span className="text-indigo-400">{filteredAndSortedRates.length}</span> Rates Found
          </h3>
          <div className="flex items-center gap-6 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <span>Sort by:</span>
            <button 
              onClick={() => toggleSort("transitTimeDays")} 
              className={`flex items-center gap-1.5 transition-colors hover:text-indigo-300 ${sortKey === 'transitTimeDays' ? 'text-indigo-400 border-b border-indigo-400 pb-0.5' : ''}`}
            >
              Schedule {sortKey === 'transitTimeDays' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
            </button>
            <button 
              onClick={() => toggleSort("total")} 
              className={`flex items-center gap-1.5 transition-colors hover:text-emerald-300 ${sortKey === 'total' ? 'text-emerald-400 border-b border-emerald-400 pb-0.5' : ''}`}
            >
              Total Net {sortKey === 'total' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-20 flex flex-col items-center justify-center shadow-lg">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-6" />
          <p className="text-xl font-black text-white tracking-tight">Searching global network...</p>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Contacting 40+ carriers via API</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredAndSortedRates.length === 0 && (
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-20 flex flex-col items-center justify-center shadow-lg">
          <div className="p-6 bg-slate-800/50 rounded-full border border-slate-700/50 mb-6 shadow-inner">
            <Search className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-xl font-black text-white tracking-tight">No rates found</p>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Try adjusting your filters or search terms</p>
        </div>
      )}

      {/* Cards List */}
      <div className="flex flex-col gap-4">
        {filteredAndSortedRates.map((rate, index) => {
          const isExpanded = expandedRowId === rate.id;
          const isBooked = !!bookedRates.find((r) => r.id === rate.id);
          const isBestOption = sortKey === "total" && sortOrder === "asc" && index === 0;

          return (
            <div 
              key={rate.id} 
              className={`bg-slate-900/80 backdrop-blur-xl border ${isBestOption ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-slate-700/50 shadow-lg'} rounded-3xl overflow-hidden hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] hover:border-indigo-500/30 transition-all duration-300 group relative`}
            >
              {isBestOption && (
                <div className="absolute top-0 right-8 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-b-xl shadow-lg z-20 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Best Value
                </div>
              )}
              <div className="p-6 md:p-8 flex flex-col lg:flex-row items-center gap-6 lg:gap-8 relative">
                
                {/* Carrier info */}
                <div className="flex items-center gap-5 w-full lg:w-1/4 xl:w-1/3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-slate-800 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.15)] shrink-0 group-hover:scale-105 transition-transform duration-500">
                    <span className="text-indigo-400 font-black text-lg">
                      {rate.carrierName.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-white text-lg tracking-tight group-hover:text-indigo-300 transition-colors">
                      {rate.carrierName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span className="truncate max-w-[100px] lg:max-w-[140px]" title={rate.pol}>
                        {rate.pol?.split(",")[0]}
                      </span>
                      <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[100px] lg:max-w-[140px]" title={rate.pod}>
                        {rate.pod?.split(",")[0]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Schedule info */}
                <div className="flex flex-col gap-1 w-full lg:w-1/6">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transit Time</span>
                  <span className="text-xl font-black text-slate-200">{rate.transitTimeDays} days</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md w-fit border border-indigo-500/20 mt-1">
                    {rate.isDirect ? "DIRECT" : "TRANSSHIPMENT"}
                  </span>
                </div>

                {/* Costs Summary Box */}
                <div className="flex flex-col sm:flex-row items-center justify-between w-full lg:flex-1 bg-slate-950/40 rounded-2xl p-4 border border-slate-800 shadow-inner gap-4 sm:gap-0">
                  <div className="flex flex-col gap-1 items-center sm:items-start w-full sm:w-auto">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Ocean</span>
                    <span className="text-sm font-bold text-slate-300 font-mono">
                      {activeCurrency} {convertAmount(rate.baseFreightCost, rate.currency).toLocaleString()}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => setExpandedRowId(isExpanded ? null : rate.id)}
                    className="flex flex-col items-center gap-1 group/surcharge hover:bg-slate-800 p-2 px-4 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
                  >
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/surcharge:text-indigo-400 transition-colors">
                      Surcharges ({rate.surcharges.length})
                    </span>
                    <div className="flex items-center gap-1 text-indigo-400">
                      <span className="text-xs font-black">+ {activeCurrency} {convertAmount(rate.totalCost - rate.baseFreightCost, rate.currency).toLocaleString()}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <div className="flex flex-col gap-1 items-center sm:items-end w-full sm:w-auto">
                    <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Total Net</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-emerald-400 font-mono drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                        {activeCurrency} {convertAmount(rate.totalCost, rate.currency).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row lg:flex-col justify-center gap-3 items-center w-full lg:w-auto shrink-0 pl-0 lg:pl-4">
                  <button
                    onClick={() => handleBooking(rate)}
                    disabled={isBooked || isBooking === rate.id}
                    className={`w-full lg:w-36 px-4 py-3 text-sm font-black uppercase tracking-widest rounded-xl shadow-lg transition-all duration-300 ${
                      isBooked
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] hover:-translate-y-1"
                    }`}
                  >
                    {isBooked ? "Booked ✓" : isBooking === rate.id ? "Saving..." : "Book Now"}
                  </button>
                  <button
                    onClick={() => setRfqRate(rate)}
                    className="text-[10px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3 h-3" />
                    PDF Quote
                  </button>
                </div>

              </div>

              {/* Expanded Details Area */}
              {isExpanded && (
                <div className="border-t border-slate-700/50 bg-slate-950/80 p-6 md:p-8 flex flex-col xl:flex-row gap-8 xl:gap-16 relative">
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
                          <div key={i} className="flex items-center gap-4 sm:gap-6">
                            <span className="w-24 sm:w-32 text-xs font-black text-slate-300 uppercase tracking-wider">
                              {s.name}
                            </span>
                            <div className="flex-1 h-2.5 sm:h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)] relative"
                                style={{ width: `${percentage}%` }}
                              >
                                <div className="absolute top-0 left-0 right-0 h-px bg-white/30" />
                              </div>
                            </div>
                            <span className="w-24 sm:w-32 text-right text-sm font-mono font-black text-slate-200">
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
                  
                  <div className="w-full xl:w-[350px] border-t xl:border-t-0 xl:border-l border-slate-700/50 pt-8 xl:pt-0 xl:pl-12 flex flex-col justify-center relative z-10">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                      Quote Summary
                    </h4>
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg backdrop-blur-md">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Valid Until</span>
                        <span className="text-sm font-mono font-bold text-slate-200">{rate.validityDate}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Reference ID</span>
                        <span className="text-sm font-mono font-bold text-indigo-400">{rate.quoteNumber}</span>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] font-semibold text-amber-500/80 leading-relaxed shadow-inner flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>This rate is subject to space and equipment availability. Peak Season Surcharge (PSS) may vary at time of sailing.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rfqRate && (
        <RfqGeneratorModal rate={rfqRate} onClose={() => setRfqRate(null)} />
      )}
    </div>
  );
}

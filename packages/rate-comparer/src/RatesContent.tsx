// @ts-nocheck
/**
 * RatesContent — the freight comparer content area without the standalone sidebar/shell.
 * Used when this package is embedded inside a host app that already provides navigation
 * (e.g. @atlas/frontend AppLayout). App.tsx retains the full-page standalone version.
 */
import React, { useState } from "react";
import { useAppStore } from "./shared/store";
import RateTable from "./components/RateTable";
import LocationAutocomplete from "./components/LocationAutocomplete";
import {
  Search,
  Ship,
  Plane,
  CalendarDays,
  Box,
  ArrowRightLeft,
  MapPin,
  Zap,
  ChevronDown,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "./components";

const CarrierSelect = ({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full md:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900/80 hover:bg-slate-800 text-sm text-slate-200 w-full min-w-[220px] px-4 py-2.5 rounded-xl border border-slate-700/60 flex justify-between items-center transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] focus:ring-2 focus:ring-indigo-500/50"
      >
        <span className="truncate font-medium">
          {selected.length === 0
            ? "All Carriers"
            : selected.length === 1
              ? selected[0]
              : `${selected.length} Carriers Selected`}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 py-2 max-h-60 overflow-y-auto">
            {available.map((c) => (
              <label
                key={c}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 cursor-pointer transition-colors group"
              >
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    selected.includes(c)
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-slate-500 bg-slate-900/50 group-hover:border-slate-400"
                  }`}
                >
                  {selected.includes(c) && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
                <span className="text-sm font-medium text-slate-200">{c}</span>
                {/* visually hidden input for accessibility / standard HTML interaction */}
                <input 
                   type="checkbox"
                   className="sr-only"
                   checked={selected.includes(c)}
                   onChange={(e) => {
                     if (e.target.checked) onChange([...selected, c]);
                     else onChange(selected.filter(x => x !== c));
                   }}
                />
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function RatesContent() {
  const { currency, setCurrency } = useAppStore();
  const { tenantId } = useAuth();

  // Search state
  const [transportMode, setTransportMode] = useState<"FCL" | "LCL" | "AIR">(
    "FCL",
  );
  const [origin, setOrigin] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [date, setDate] = useState<string>("");
  const [equipment, setEquipment] = useState<string>("40HC");

  // Camunda Backend API State
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // Filter State
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [maxTransitTime, setMaxTransitTime] = useState<number | null>(null);

  // Derived filter logic
  const availableCarriers = Array.from(new Set(quotes.map((q) => q.carrier)));
  const maxAvailableTransit =
    quotes.length > 0 ? Math.max(...quotes.map((q) => q.transit)) : 60;
  const currentMaxTransit =
    maxTransitTime !== null ? maxTransitTime : maxAvailableTransit;

  const filteredQuotes = quotes.filter((q) => {
    if (selectedCarriers.length > 0 && !selectedCarriers.includes(q.carrier))
      return false;
    if (q.transit > currentMaxTransit) return false;
    return true;
  });

  const handleSearch = async () => {
    if (!origin || !destination) return;

    setIsLoading(true);
    setError(null);
    setQuotes([]);
    setSelectedCarriers([]);
    setMaxTransitTime(null);

    try {
      // Import the service dynamically or rely on top-level import
      const { drizzleRateService } =
        await import("./services/drizzleRateService");

      const rates = await drizzleRateService.fetchRates(
        origin.locode || origin.name,
        destination.locode || destination.name,
        equipment,
      );

      if (rates && rates.length > 0) {
        // Map Drizzle Rate schema to match the expected RateTable format
        const mappedQuotes = rates.map((r) => ({
          carrier: r.carrier || "Unknown",
          rate: r.baseOceanFreight + r.baf + r.pss + r.thc,
          transit: r.transitTime,
          currency: "USD",
          origin: origin.locode || origin.name,
          destination: destination.locode || destination.name,
          containerType: r.containerType,
        }));
        setQuotes(mappedQuotes);
      } else {
        setError("No rates found for the selected route.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch from Drizzle API");
    } finally {
      setIsLoading(false);
    }
  };

  const swapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 relative overflow-hidden">
      {/* Decorative background gradients (Dark Premium) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[800px] h-[800px] rounded-full bg-blue-500/10 blur-[140px]" />
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
            onClick={() => setCurrency("USD")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${currency === "USD" ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}
          >
            USD
          </button>
          <button
            onClick={() => setCurrency("EUR")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${currency === "EUR" ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}
          >
            EUR
          </button>
        </div>
      </header>

      {/* Skyscanner-like Search Header */}
      <div className="relative z-20 pt-8 pb-6 px-4 md:px-8 flex justify-center">
        <div className="w-full">
          <div className="bg-slate-900/80 backdrop-blur-3xl border border-slate-700/50 rounded-[2rem] p-6 md:p-8 shadow-2xl flex flex-col gap-6">
            {/* Transport Mode Tabs */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setTransportMode("FCL")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all ${transportMode === "FCL" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}
              >
                <Ship className="w-4 h-4" />
                Ocean FCL
              </button>
              <button
                onClick={() => setTransportMode("LCL")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all ${transportMode === "LCL" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}
              >
                <Ship className="w-4 h-4" />
                Ocean LCL
              </button>
              <button
                onClick={() => setTransportMode("AIR")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all ${transportMode === "AIR" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}
              >
                <Plane className="w-4 h-4" />
                Air Freight
              </button>
            </div>

            {/* Main Search Row */}
            <div className="flex flex-col xl:flex-row items-end gap-6">
              {/* Origin and Destination Group */}
              <div className="flex flex-col md:flex-row items-center w-full xl:w-[55%] gap-4 relative z-30 bg-slate-900/60 p-3 rounded-3xl border border-slate-700/50 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 hover:border-slate-600/60">
                <div className="flex-1 w-full relative z-40 group">
                  <div className="absolute inset-0 bg-indigo-500/0 group-focus-within:bg-indigo-500/10 rounded-2xl transition-colors duration-300 pointer-events-none" />
                  <LocationAutocomplete
                    label="Origin"
                    placeholder="Where from? (e.g. Shanghai)"
                    value={origin}
                    onChange={setOrigin}
                  />
                </div>

                {/* Swap Button */}
                <button
                  onClick={swapLocations}
                  className="z-40 h-12 w-12 shrink-0 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center hover:bg-slate-700 hover:scale-110 transition-all duration-300 shadow-xl mx-auto md:absolute md:left-1/2 md:-ml-6 group"
                >
                  <ArrowRightLeft className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </button>

                <div className="flex-1 w-full relative z-20 group">
                  <div className="absolute inset-0 bg-indigo-500/0 group-focus-within:bg-indigo-500/10 rounded-2xl transition-colors duration-300 pointer-events-none" />
                  <LocationAutocomplete
                    label="Destination"
                    placeholder="Where to? (e.g. Rotterdam)"
                    value={destination}
                    onChange={setDestination}
                    icon={<MapPin className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Date & Equipment Group */}
              <div className="flex flex-row items-center w-full xl:w-auto gap-4 relative z-20">
                <div className="flex-1 bg-slate-900/60 p-3 rounded-3xl border border-slate-700/50 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center h-[76px] transition-all duration-300 hover:border-slate-600/60">
                  <div className="px-4 flex items-center gap-3 w-full border-r border-slate-700/60 group">
                    <CalendarDays className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                    <div className="flex flex-col w-full relative">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Departure
                      </span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent text-sm text-slate-200 outline-none w-full placeholder-slate-600 font-medium cursor-pointer transition-colors"
                      />
                    </div>
                  </div>

                  <div className="px-4 flex items-center gap-3 w-full group">
                    <Box className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                    <div className="flex flex-col w-full">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Equipment
                      </span>
                      <select
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value)}
                        className="bg-transparent text-sm text-slate-200 outline-none w-full appearance-none cursor-pointer font-medium transition-colors"
                      >
                        {transportMode === "FCL" ? (
                          <>
                            <option value="20GP" className="bg-slate-900">
                              1 x 20' Standard
                            </option>
                            <option value="40GP" className="bg-slate-900">
                              1 x 40' Standard
                            </option>
                            <option value="40HC" className="bg-slate-900">
                              1 x 40' High Cube
                            </option>
                            <option value="45HC" className="bg-slate-900">
                              1 x 45' High Cube
                            </option>
                            <option value="20RF" className="bg-slate-900">
                              1 x 20' Reefer
                            </option>
                            <option value="40RF" className="bg-slate-900">
                              1 x 40' Reefer
                            </option>
                          </>
                        ) : transportMode === "LCL" ? (
                          <option value="CBM" className="bg-slate-900">
                            Volume (CBM)
                          </option>
                        ) : (
                          <option value="KG" className="bg-slate-900">
                            Weight (KG)
                          </option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSearch}
                  className="h-[76px] px-10 bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-400 hover:via-indigo-500 hover:to-blue-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-lg shadow-[0_0_25px_rgba(79,70,229,0.5)] hover:shadow-[0_0_35px_rgba(79,70,229,0.8)] hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 shrink-0 ring-1 ring-white/20"
                >
                  <Search className="w-6 h-6 animate-pulse" />
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 relative z-10 space-y-6 w-full">
        {/* Filters Bar */}
        {quotes.length > 0 && (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-lg relative z-20">
            <div className="flex items-center gap-2 text-slate-300 shrink-0">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
              <span className="font-bold tracking-wide">Filters</span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto flex-1">
              {/* Carrier Filter */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap hidden md:block">
                  Carriers
                </span>
                <CarrierSelect
                  available={availableCarriers}
                  selected={selectedCarriers}
                  onChange={setSelectedCarriers}
                />
              </div>

              {/* Transit Time Filter */}
              <div className="flex items-center gap-4 w-full md:max-w-md xl:ml-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap hidden md:block">
                  Max Transit
                </span>
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max={maxAvailableTransit}
                    value={currentMaxTransit}
                    onChange={(e) => setMaxTransitTime(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                  />
                  <span className="text-sm font-black text-indigo-400 w-16 text-right shrink-0">
                    {currentMaxTransit} d
                  </span>
                </div>
              </div>
            </div>

            {/* Results Count Pill */}
            <div className="shrink-0 text-sm font-medium text-slate-400 flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] w-full xl:w-auto justify-center">
              <span className="text-white font-black text-base">
                {filteredQuotes.length}
              </span>{" "}
              / {quotes.length} Results
            </div>
          </div>
        )}

        <RateTable rates={filteredQuotes} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
}

/**
 * RatesContent — the freight comparer content area without the standalone sidebar/shell.
 * Used when this package is embedded inside a host app that already provides navigation
 * (e.g. @atlas/frontend AppLayout). App.tsx retains the full-page standalone version.
 */
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "./store";
import { setCurrency } from "./store/slices/currencySlice";
import RateTable from "./components/RateTable";
import LocationAutocomplete from "./components/LocationAutocomplete";
import { Zap, MapPin, Search, Ship, Plane, CalendarDays, Box, ArrowRightLeft } from "lucide-react";
import { useListQuotes } from "@dataconnect/generated/react";

import { useAuth } from "@/components";

export default function RatesContent() {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.currency.current);
  const { tenantId } = useAuth();
  
  // Search state
  const [transportMode, setTransportMode] = useState<"FCL" | "LCL" | "AIR">("FCL");
  const [origin, setOrigin] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [date, setDate] = useState<string>("");
  const [equipment, setEquipment] = useState<string>("40HC");

  const [submittedOrigin, setSubmittedOrigin] = useState<string | null>(null);
  const [submittedDestination, setSubmittedDestination] = useState<string | null>(null);

  // Fetch from Data Connect
  const { data, isLoading, error } = useListQuotes({
    tenantId: tenantId || "atlas-default-tenant",
    origin: submittedOrigin || undefined,
    destination: submittedDestination || undefined
  });
  
  const quotes = data?.quotes || [];

  const handleSearch = () => {
    setSubmittedOrigin(origin ? origin.locode : null);
    setSubmittedDestination(destination ? destination.locode : null);
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

      {/* Skyscanner-like Search Header */}
      <div className="relative z-20 pt-8 pb-6 px-4 md:px-8 flex justify-center">
        <div className="w-full max-w-6xl">
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
            <div className="flex flex-col xl:flex-row items-end gap-4">
              
              {/* Origin and Destination Group */}
              <div className="flex flex-col md:flex-row items-center w-full xl:w-1/2 gap-2 relative bg-slate-950/50 p-2 rounded-3xl border border-slate-800">
                <div className="flex-1 w-full relative z-30">
                  <LocationAutocomplete 
                    label="Origin" 
                    placeholder="Where from? (e.g. Shanghai)" 
                    value={origin} 
                    onChange={setOrigin} 
                  />
                </div>
                
                {/* Swap Button (Absolute center on desktop, inline on mobile) */}
                <button 
                  onClick={swapLocations}
                  className="z-40 h-10 w-10 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 hover:scale-110 transition-all shadow-lg mx-auto md:absolute md:left-1/2 md:-ml-5"
                >
                  <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                </button>

                <div className="flex-1 w-full relative z-20">
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
              <div className="flex flex-row items-center w-full xl:w-auto gap-2">
                <div className="flex-1 bg-slate-950/50 p-2 rounded-3xl border border-slate-800 flex items-center h-[72px]">
                  <div className="px-4 flex items-center gap-3 w-full border-r border-slate-800/60">
                    <CalendarDays className="w-5 h-5 text-slate-400" />
                    <div className="flex flex-col w-full">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Departure</span>
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent text-sm text-slate-200 outline-none w-full placeholder-slate-600 font-medium"
                      />
                    </div>
                  </div>
                  
                  <div className="px-4 flex items-center gap-3 w-full">
                    <Box className="w-5 h-5 text-slate-400" />
                    <div className="flex flex-col w-full">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Equipment</span>
                      <select 
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value)}
                        className="bg-transparent text-sm text-slate-200 outline-none w-full appearance-none cursor-pointer font-medium"
                      >
                        {transportMode === "FCL" ? (
                          <>
                            <option value="20GP">1 x 20' Standard</option>
                            <option value="40GP">1 x 40' Standard</option>
                            <option value="40HC">1 x 40' High Cube</option>
                            <option value="45HC">1 x 45' High Cube</option>
                            <option value="20RF">1 x 20' Reefer</option>
                            <option value="40RF">1 x 40' Reefer</option>
                          </>
                        ) : transportMode === "LCL" ? (
                          <option value="CBM">Volume (CBM)</option>
                        ) : (
                          <option value="KG">Weight (KG)</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSearch}
                  className="h-[72px] px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 shrink-0"
                >
                  Search
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 relative z-10 space-y-8 max-w-6xl w-full mx-auto">
        <RateTable rates={quotes} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
}

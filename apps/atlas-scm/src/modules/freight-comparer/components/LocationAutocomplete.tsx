import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Plane, Anchor, Loader2 } from "lucide-react";
import { useSearchLocations } from "@dataconnect/generated/react";

interface Location {
  locode: string;
  name: string;
  countryCode: string;
  countryName: string;
  type: string;
}

interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  icon?: React.ReactNode;
}

export default function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  icon
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce the input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Sync external value
  useEffect(() => {
    if (value) {
      setQuery(`${value.name}, ${value.countryCode}`);
    } else {
      setQuery("");
    }
  }, [value]);

  const { data, isLoading, error } = useSearchLocations({ query: debouncedQuery });
  const locations = data?.locations || [];

  const handleSelect = (loc: Location) => {
    onChange(loc);
    setQuery(`${loc.name}, ${loc.countryCode}`);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
    if (value && e.target.value !== `${value.name}, ${value.countryCode}`) {
      onChange(null);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex flex-col relative group">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
          {label}
        </label>
        <div className={`flex items-center gap-3 bg-slate-900/80 border ${isOpen ? 'border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'border-slate-700/50'} rounded-2xl px-4 py-3.5 backdrop-blur-xl transition-all`}>
          <div className="text-indigo-400">
            {icon || <MapPin className="w-5 h-5" />}
          </div>
          <input
            type="text"
            className="bg-transparent border-none outline-none text-base font-semibold text-white placeholder-slate-500 w-full"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
          />
          {isLoading && query === debouncedQuery && (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          )}
        </div>
      </div>

      {isOpen && debouncedQuery.length > 1 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-slate-800/95 backdrop-blur-3xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
          {isLoading && !locations.length && (
            <div className="p-6 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              Searching global ports...
            </div>
          )}
          
          {error && (
            <div className="p-4 text-center text-rose-400 text-sm bg-rose-500/10">
              Error fetching locations
            </div>
          )}

          {!isLoading && locations.length === 0 && debouncedQuery.length > 1 && (
            <div className="p-6 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <Search className="w-6 h-6 text-slate-500" />
              No locations found matching "{debouncedQuery}"
            </div>
          )}

          {locations.map((loc: any) => (
            <div
              key={loc.locode}
              onClick={() => handleSelect(loc)}
              className="flex items-center gap-4 p-4 hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-700/30 last:border-0"
            >
              <div className={`p-2 rounded-xl ${loc.type === 'AIRPORT' ? 'bg-sky-500/10 text-sky-400' : loc.type === 'INLAND_PORT' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {loc.type === 'AIRPORT' ? <Plane className="w-4 h-4" /> : loc.type === 'INLAND_PORT' ? <MapPin className="w-4 h-4" /> : <Anchor className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">{loc.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mt-0.5">
                  <span className="text-slate-500">{loc.locode}</span>
                  <span>•</span>
                  <span>{loc.countryName || loc.countryCode}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

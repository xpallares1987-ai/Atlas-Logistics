import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Button, Switch } from "@atlas/ui";

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableCarriers: string[];
  selectedCarriers: string[];
  maxAvailableTransit: number;
  maxTransitTime: number | null;
  maxAvailableCO2: number;
  maxCO2: number | null;
  requireDirect: boolean;
  maxAvailablePrice: number;
  maxPrice: number | null;
  onApplyFilters: (filters: {
    selectedCarriers: string[];
    maxTransitTime: number | null;
    maxCO2: number | null;
    requireDirect: boolean;
    maxPrice: number | null;
  }) => void;
}

export default function AdvancedFiltersDrawer({
  isOpen,
  onClose,
  availableCarriers,
  selectedCarriers,
  maxAvailableTransit,
  maxTransitTime,
  maxAvailableCO2,
  maxCO2,
  requireDirect,
  maxAvailablePrice,
  maxPrice,
  onApplyFilters,
}: AdvancedFiltersDrawerProps) {
  // Local Draft State
  const [draftCarriers, setDraftCarriers] = useState<string[]>([]);
  const [draftTransit, setDraftTransit] = useState<number | null>(null);
  const [draftCO2, setDraftCO2] = useState<number | null>(null);
  const [draftDirect, setDraftDirect] = useState<boolean>(false);
  const [draftPrice, setDraftPrice] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftCarriers(selectedCarriers);
      setDraftTransit(maxTransitTime);
      setDraftCO2(maxCO2);
      setDraftDirect(requireDirect);
      setDraftPrice(maxPrice);
    }
  }, [
    isOpen,
    selectedCarriers,
    maxTransitTime,
    maxCO2,
    requireDirect,
    maxPrice,
  ]);

  const currentTransit =
    draftTransit !== null ? draftTransit : maxAvailableTransit;
  const currentCO2 = draftCO2 !== null ? draftCO2 : maxAvailableCO2;
  const currentPrice = draftPrice !== null ? draftPrice : maxAvailablePrice;

  const handleApply = () => {
    onApplyFilters({
      selectedCarriers: draftCarriers,
      maxTransitTime: draftTransit,
      maxCO2: draftCO2,
      requireDirect: draftDirect,
      maxPrice: draftPrice,
    });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-indigo-500/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 transform transition-all duration-500 ease-out flex flex-col ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Advanced Filters
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          {/* Direct Route */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-200">
                Direct Routes Only
              </h3>
              <p className="text-xs text-slate-500">
                Show only direct sailings (no transshipment)
              </p>
            </div>
            <Switch
              checked={draftDirect}
              onChange={(e) => setDraftDirect(e.target.checked)}
            />
          </div>

          <div className="h-px bg-slate-800" />

          {/* Price Range */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-200">Max Price (USD)</h3>
              <span className="text-sm font-black text-emerald-400">
                ${currentPrice.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={maxAvailablePrice}
              step="50"
              value={currentPrice}
              onChange={(e) => setDraftPrice(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(52,211,153,0.5)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
            />
          </div>

          <div className="h-px bg-slate-800" />

          {/* Transit Time */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-200">Max Transit Time</h3>
              <span className="text-sm font-black text-indigo-400">
                {currentTransit} Days
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={maxAvailableTransit}
              value={currentTransit}
              onChange={(e) => setDraftTransit(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(129,140,248,0.5)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
            />
          </div>

          <div className="h-px bg-slate-800" />

          {/* CO2 Emissions */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-200">
                Max CO₂ Emissions
              </h3>
              <span className="text-sm font-black text-rose-400">
                {currentCO2.toLocaleString()} kg
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={maxAvailableCO2}
              step="10"
              value={currentCO2}
              onChange={(e) => setDraftCO2(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(251,113,133,0.5)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
            />
          </div>

          <div className="h-px bg-slate-800" />

          {/* Carriers */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-200">Carriers</h3>
              <button
                onClick={() => setDraftCarriers([])}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
              {availableCarriers.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-3 py-1 cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      draftCarriers.includes(c)
                        ? "bg-indigo-500 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-110"
                        : "border-slate-500 bg-slate-800 group-hover:border-slate-400 group-hover:bg-slate-700"
                    }`}
                  >
                    {draftCarriers.includes(c) && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                    {c}
                  </span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={draftCarriers.includes(c)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setDraftCarriers([...draftCarriers, c]);
                      else
                        setDraftCarriers(draftCarriers.filter((x) => x !== c));
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <Button
            variant="default"
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/25 border-0"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}

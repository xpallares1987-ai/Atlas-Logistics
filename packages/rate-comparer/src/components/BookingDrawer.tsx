import React, { useState } from "react";
import { X, Package, Hash, Scale, AlertCircle, Loader2 } from "lucide-react";

interface BookingDrawerProps {
  rate: any;
  onClose: () => void;
  onBook: (bookingData: any) => Promise<void>;
}

export default function BookingDrawer({ rate, onClose, onBook }: BookingDrawerProps) {
  const [commodity, setCommodity] = useState("General Cargo");
  const [weight, setWeight] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onBook({
        ...rate,
        commodity,
        weight: Number(weight),
        poNumber,
      });
      // The parent will handle the success toast and closing the drawer (or we can just close it here)
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving the booking.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700/50 shadow-[auto_-5px_50px_rgba(0,0,0,0.5)] z-[101] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/80 backdrop-blur-xl relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            Book Shipment
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Rate Summary */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 shadow-inner">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Selected Route</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="font-bold text-white text-sm">{rate.carrierName}</div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="text-indigo-400 text-sm font-black">{rate.transitTimeDays} Days</div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="truncate max-w-[120px]">{rate.pol?.split(",")[0]}</span>
              <span className="text-emerald-400">→</span>
              <span className="truncate max-w-[120px]">{rate.pod?.split(",")[0]}</span>
            </div>
          </div>

          <form id="booking-form" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                Commodity Description
              </label>
              <input 
                type="text" 
                required
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                placeholder="e.g. Electronics, Garments, Auto Parts"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                Total Weight (KG)
              </label>
              <input 
                type="number" 
                required
                min="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
                PO / Reference Number
              </label>
              <input 
                type="text" 
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Optional"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
            </div>
          </form>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
          <button 
            type="submit"
            form="booking-form"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </div>
    </>
  );
}

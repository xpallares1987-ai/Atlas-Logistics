import React, { useState } from "react";
import { X, Package, Scale, Box, Loader2, AlertCircle } from "lucide-react";

interface Schedule {
  id: string;
  carrier: string;
  vessel: string;
  voyage: string;
  departure: string;
  arrival: string;
  transitTime: number;
}

interface ScheduleBookingModalProps {
  schedule: Schedule;
  price: number;
  origin: string;
  destination: string;
  onClose: () => void;
  onSuccess: (scheduleId: string) => void;
}

export function ScheduleBookingModal({ 
  schedule, 
  price, 
  origin, 
  destination,
  onClose, 
  onSuccess 
}: ScheduleBookingModalProps) {
  const [commodity, setCommodity] = useState("General Cargo");
  const [weight, setWeight] = useState("");
  const [equipment, setEquipment] = useState("40HC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        bookingReference: `BKG-SCH-${Date.now()}`,
        carrier: schedule.carrier,
        vessel: schedule.vessel,
        voyage: schedule.voyage,
        origin,
        destination,
        equipment,
        commodity,
        weight: Number(weight),
        status: "DRAFT",
        totalCost: price,
      };

      const response = await fetch("/api/operations/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save booking to database");
      }
      onSuccess(schedule.id);
    } catch (err: any) {
      setError(err.message || "An error occurred while saving the booking.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-700/50 shadow-2xl z-[101] flex flex-col overflow-hidden rounded-3xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/80 backdrop-blur-xl relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            Book Schedule
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Schedule Summary */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 shadow-inner">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Vessel / Voyage</h3>
                <div className="font-bold text-white text-sm">{schedule.carrier} • {schedule.vessel} ({schedule.voyage})</div>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Live Rate</h3>
                <div className="font-bold text-indigo-400 text-sm">${price.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
              <span className="truncate">{origin.split(",")[0]}</span>
              <span className="text-emerald-400 mx-2">→</span>
              <span className="truncate">{destination.split(",")[0]}</span>
            </div>
          </div>

          <form id="schedule-booking-form" onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
            </div>

            <div className="flex gap-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-indigo-400" />
                  Equipment
                </label>
                <select 
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none cursor-pointer"
                >
                  <option value="20GP">1 x 20' Standard</option>
                  <option value="40GP">1 x 40' Standard</option>
                  <option value="40HC">1 x 40' High Cube</option>
                  <option value="45HC">1 x 45' High Cube</option>
                  <option value="20RF">1 x 20' Reefer</option>
                  <option value="40RF">1 x 40' Reefer</option>
                </select>
              </div>

              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-indigo-400" />
                  Weight (KG)
                </label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
          <button 
            type="submit"
            form="schedule-booking-form"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300 flex items-center justify-center gap-2"
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

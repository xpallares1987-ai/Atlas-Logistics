import React, { useState, useEffect } from "react";
import {
  X,
  Package,
  Hash,
  Scale,
  AlertCircle,
  Loader2,
  CheckCircle,
  Truck,
} from "lucide-react";
import { drizzleRateService } from "../services/drizzleRateService";

interface BookingDrawerProps {
  rate: any;
  onClose: () => void;
  onBook: (bookingData: any) => Promise<any>;
}

export default function BookingDrawer({
  rate,
  onClose,
  onBook,
}: BookingDrawerProps) {
  const [customerName, setCustomerName] = useState("Atlas Global Imports S.L.");
  const [incoterm, setIncoterm] = useState("FOB");
  const [commodity, setCommodity] = useState("General Cargo");
  const [weight, setWeight] = useState("18500");
  const [poNumber, setPoNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const [hauliers, setHauliers] = useState<any[]>([]);
  const [selectedHaulierId, setSelectedHaulierId] = useState<string>("");

  useEffect(() => {
    async function loadHauliers() {
      try {
        const list = await drizzleRateService.fetchHauliers();
        if (list && list.length > 0) {
          setHauliers(list);
          setSelectedHaulierId(list[0].id);
        }
      } catch (e) {
        console.error("Error loading hauliers:", e);
      }
    }
    loadHauliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const saved = await onBook({
        ...rate,
        customerName,
        incoterm,
        commodity,
        weight: Number(weight),
        poNumber,
        drayageQuote: rate.drayageQuote || null,
        haulierAddressId: selectedHaulierId || null,
        drayageDestinationAddressId:
          rate.destinationAddressId ||
          rate.drayageQuote?.destinationAddressId ||
          null,
      });

      const serverRef =
        saved?.referenceNumber ||
        `BKG-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      setBookingRef(serverRef);
      setIsSuccess(true);
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
        {isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white text-center">
              Booking Request Created!
            </h3>
            <p className="text-slate-400 text-center text-sm">
              Your booking request has been queued in the Operations Inbox.
              Confirm the carrier booking number in{" "}
              <span className="text-indigo-400 font-bold">/bookings</span> to
              generate the active shipment and Draft Bill of Lading.
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 w-full text-center mt-4 shadow-inner space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Booking Reference
              </p>
              <p className="text-lg font-mono font-bold text-indigo-400">
                {bookingRef}
              </p>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Status: PENDING CARRIER CONFIRMATION
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Rate Summary */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 shadow-inner">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                Selected Route
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="font-bold text-white text-sm">
                  {rate.carrierName}
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="text-indigo-400 text-sm font-black">
                  {rate.transitTimeDays} Days
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="truncate max-w-[120px]">
                  {rate.pol?.split(",")[0]}
                </span>
                <span className="text-emerald-400">→</span>
                <span className="truncate max-w-[120px]">
                  {rate.pod?.split(",")[0]}
                </span>
              </div>
            </div>

            {/* Drayage Leg Preview if present */}
            {rate.drayageQuote && (
              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5" />
                    Tramo Terrestre Port-to-Door
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +€
                    {rate.drayageQuote.totalGrossCost ||
                      rate.drayageQuote.totalGross}{" "}
                    EUR
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  {rate.pod || "ESBCN"} ➔{" "}
                  {rate.drayageQuote.destinationName || "Almacén Interior"} (
                  {rate.drayageQuote.distanceKm} km · ~
                  {rate.drayageQuote.estimatedTransitMinutes || 48} min)
                </div>

                {hauliers.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Transportista Terrestre (Haulier)
                    </label>
                    <select
                      value={selectedHaulierId}
                      onChange={(e) => setSelectedHaulierId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {hauliers.map((h) => (
                        <option
                          key={h.id}
                          value={h.id}
                          className="bg-slate-900"
                        >
                          {h.companyName} ({h.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <form
              id="booking-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Shipper / Customer
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer company"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Incoterm
                  </label>
                  <select
                    value={incoterm}
                    onChange={(e) => setIncoterm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="FOB">FOB</option>
                    <option value="CIF">CIF</option>
                    <option value="EXW">EXW</option>
                    <option value="DAP">DAP</option>
                    <option value="DDP">DDP</option>
                  </select>
                </div>
              </div>

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
        )}

        {/* Footer / Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
          {isSuccess ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Done
              </button>
              <button
                onClick={() => {
                  onClose();
                  window.dispatchEvent(
                    new CustomEvent("app-navigate", {
                      detail: { path: "/bookings" },
                    }),
                  );
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-colors"
              >
                View Bookings
              </button>
            </div>
          ) : (
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
                "Confirm Booking"
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

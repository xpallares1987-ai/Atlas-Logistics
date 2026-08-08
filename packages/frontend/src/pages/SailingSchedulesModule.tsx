import { useState, useMemo } from "react";
import {
  Calendar,
  Search,
  MapPin,
  Ship,
  Clock,
  CalendarCheck,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ScheduleBookingModal } from "../components/ScheduleBookingModal";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface Schedule {
  id: string;
  carrier: string;
  vessel: string;
  voyage: string;
  departure: string;
  arrival: string;
  transitTime: number;
  cutOffVgm: string;
  cutOffSi: string;
  cutOffCy: string;
  status: "On Time" | "Delayed" | "Advanced";
}

function DynamicPriceButton({
  schedule,
  onOpenBooking,
  isBooked,
}: {
  schedule: Schedule;
  onOpenBooking: (schedule: Schedule, price: number) => void;
  isBooked: boolean;
}) {
  const [showPrice, setShowPrice] = useState(false);

  const { data: priceData, isLoading } = useQuery({
    queryKey: ["schedulePrice", schedule.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/schedules/${schedule.id}/pricing`);
      return res.json();
    },
    enabled: showPrice,
  });

  if (!showPrice) {
    return (
      <button
        onClick={() => setShowPrice(true)}
        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium rounded-xl transition-all border border-white/10 hover:border-white/20 shadow-lg"
      >
        Check Spot Rate
      </button>
    );
  }

  if (isLoading) {
    return (
      <button className="px-5 py-2.5 bg-indigo-500/10 text-indigo-400 text-sm font-medium rounded-xl border border-indigo-500/20 min-w-[140px] animate-pulse">
        Calculating...
      </button>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4"
    >
      <div className="text-right">
        <p className="text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest leading-none">
          Live Rate
        </p>
        <p className="text-xl font-black text-white leading-none mt-1.5 drop-shadow-md">
          ${priceData?.price?.toLocaleString()}
        </p>
      </div>
      <button
        onClick={() => onOpenBooking(schedule, priceData?.price || 0)}
        disabled={isBooked}
        className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-lg ${
          isBooked
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
            : "bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40 border border-white/10"
        }`}
      >
        {isBooked ? "Booked ✓" : "Book Now"}
      </button>
    </motion.div>
  );
}

export default function SailingSchedulesModule() {
  const [origin, setOrigin] = useState("Shanghai");
  const [destination, setDestination] = useState("Rotterdam");
  const [date, setDate] = useState("2026-08-15");
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<"departure" | "transit">("departure");
  const [bookingState, setBookingState] = useState<{
    schedule: Schedule;
    price: number;
  } | null>(null);
  const [bookedSchedules, setBookedSchedules] = useState<Set<string>>(
    new Set(),
  );

  const handleOpenBooking = (schedule: Schedule, price: number) => {
    setBookingState({ schedule, price });
  };

  const handleBookingSuccess = (scheduleId: string) => {
    setBookedSchedules((prev) => new Set([...prev, scheduleId]));
    setBookingState(null);
  };

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ["schedules", origin, destination, date],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        origin,
        destination,
        date
      }).toString();
      const res = await fetch(`${API_URL}/schedules?${queryParams}`);
      return res.json();
    },
    enabled: hasSearched,
  });

  const handleSearch = () => {
    setHasSearched(true);
  };

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      if (sortBy === "transit") {
        return a.transitTime - b.transitTime;
      }
      return new Date(a.departure).getTime() - new Date(b.departure).getTime();
    });
  }, [schedules, sortBy]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Header & Search Bar */}
      <div className="relative z-10 p-6 md:p-10 border-b border-white/10 bg-slate-900/50 backdrop-blur-2xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1400px] mx-auto"
        >
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-emerald-200 mb-2 tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-400" />
            Sailing Schedules
          </h1>
          <p className="text-slate-400 font-medium max-w-2xl">
            Compare live dynamic spot rates, optimize transit times, and securely book ocean freight across the global alliance network.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4 bg-white/5 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex-1 min-w-[200px] relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <MapPin className="w-5 h-5 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
              </div>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Origin Port (e.g. Shanghai)"
                className="w-full bg-slate-950/50 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/5 focus:border-indigo-500/50 text-white placeholder-slate-500 rounded-xl py-3.5 pl-12 pr-4 outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center justify-center text-slate-500 px-2 hidden md:block">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-[200px] relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <MapPin className="w-5 h-5 text-emerald-400 group-focus-within:text-emerald-300 transition-colors" />
              </div>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination Port (e.g. Rotterdam)"
                className="w-full bg-slate-950/50 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/5 focus:border-emerald-500/50 text-white placeholder-slate-500 rounded-xl py-3.5 pl-12 pr-4 outline-none transition-all"
              />
            </div>

            <div className="flex-1 min-w-[180px] relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <CalendarCheck className="w-5 h-5 text-slate-400 group-focus-within:text-white transition-colors" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950/50 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/5 focus:border-slate-500/50 text-white placeholder-slate-500 rounded-xl py-3.5 pl-12 pr-4 outline-none transition-all [color-scheme:dark]"
              />
            </div>

            <button
              onClick={handleSearch}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 border border-white/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Search className="w-5 h-5" />
              Find Routes
            </button>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 md:p-10 relative">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {!hasSearched ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col items-center justify-center text-slate-400 z-10 relative"
          >
            <div className="w-24 h-24 mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
              <Ship className="w-10 h-10 text-indigo-400/50" />
            </div>
            <p className="text-xl font-medium text-slate-300">Ready to explore global shipping routes?</p>
            <p className="text-slate-500 mt-2 max-w-md text-center">Enter your origin, destination, and preferred date to discover the most efficient and cost-effective sailing schedules.</p>
          </motion.div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 z-10 relative gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-indigo-400"></div>
            <p className="text-indigo-400 font-medium animate-pulse">Scanning alliance networks...</p>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto z-10 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  Available Routings
                  <span className="bg-indigo-500/20 text-indigo-300 text-sm py-1 px-3 rounded-full border border-indigo-500/30">
                    {schedules.length} options
                  </span>
                </h3>
              </div>

              {schedules.length > 0 && (
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                  <button
                    onClick={() => setSortBy("departure")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      sortBy === "departure"
                        ? "bg-indigo-500 text-white shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Earliest Departure
                  </button>
                  <button
                    onClick={() => setSortBy("transit")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      sortBy === "transit"
                        ? "bg-indigo-500 text-white shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Fastest Transit
                  </button>
                </div>
              )}
            </div>

            {schedules.length === 0 ? (
              <div className="text-center p-12 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Schedules Found</h3>
                <p className="text-slate-400">Try adjusting your search criteria or port locations.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <AnimatePresence>
                  {sortedSchedules.map((sch, i) => (
                    <motion.div
                      key={sch.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group shadow-xl"
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-5">
                          <div
                            className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-inner ${
                              sch.carrier.includes("Maersk")
                                ? "bg-gradient-to-br from-blue-500 to-blue-700"
                                : sch.carrier.includes("MSC")
                                  ? "bg-gradient-to-br from-yellow-500 to-amber-700"
                                  : sch.carrier.includes("CMA")
                                    ? "bg-gradient-to-br from-indigo-600 to-blue-900"
                                    : "bg-gradient-to-br from-slate-600 to-slate-800"
                            }`}
                          >
                            {sch.carrier.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xl flex items-center gap-3">
                              {sch.carrier}
                              {sch.status === "Delayed" && (
                                <span className="flex items-center gap-1 text-[10px] bg-rose-500/20 border border-rose-500/30 text-rose-300 px-2.5 py-1 rounded-md font-mono uppercase tracking-wider shadow-sm">
                                  <AlertCircle className="w-3.5 h-3.5" /> Delayed
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-slate-400 flex items-center gap-2 mt-1 font-medium">
                              <Ship className="w-4 h-4 text-slate-500" /> {sch.vessel} 
                              <span className="text-slate-600">•</span> Voy: {sch.voyage}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                            {sch.transitTime}
                            <span className="text-base font-medium text-slate-500 ml-1">Days</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">
                            Transit Time
                          </p>
                        </div>
                      </div>

                      {/* Bottom Info Grid */}
                      <div className="p-5 md:p-6 flex flex-col lg:flex-row gap-8 items-center justify-between">
                        
                        {/* Timeline */}
                        <div className="flex items-center gap-6 md:gap-10 w-full lg:w-auto flex-1">
                          <div className="w-24 md:w-32">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                              Departure
                            </p>
                            <p className="text-lg font-bold text-white">
                              {sch.departure}
                            </p>
                            <p className="text-xs text-indigo-300 mt-0.5 truncate">{origin.split(' ')[0]}</p>
                          </div>
                          
                          <div className="flex-1 flex items-center justify-center relative min-w-[100px]">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t-2 border-dashed border-white/20"></div>
                            </div>
                            <div className="bg-slate-950 px-3 relative z-10 text-slate-500 group-hover:text-indigo-400 transition-colors">
                              <Ship className="w-5 h-5" />
                            </div>
                          </div>
                          
                          <div className="text-right w-24 md:w-32">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                              Arrival
                            </p>
                            <p className="text-lg font-bold text-white">
                              {sch.arrival}
                            </p>
                            <p className="text-xs text-emerald-300 mt-0.5 truncate">{destination.split(' ')[0]}</p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px lg:w-px lg:h-16 bg-white/10"></div>

                        {/* Cut-offs */}
                        <div className="flex justify-between lg:justify-start gap-6 md:gap-8 w-full lg:w-auto">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" /> VGM
                            </p>
                            <p className="text-sm font-medium text-slate-300">
                              {sch.cutOffVgm}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" /> SI
                            </p>
                            <p className="text-sm font-medium text-slate-300">
                              {sch.cutOffSi}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-rose-400/70" /> CY
                            </p>
                            <p className="text-sm font-bold text-rose-300">
                              {sch.cutOffCy}
                            </p>
                          </div>
                        </div>

                        {/* Booking Action */}
                        <div className="w-full lg:w-auto mt-4 lg:mt-0 flex justify-end">
                          <DynamicPriceButton
                            schedule={sch}
                            onOpenBooking={handleOpenBooking}
                            isBooked={bookedSchedules.has(sch.id)}
                          />
                        </div>

                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {bookingState && (
        <ScheduleBookingModal
          schedule={bookingState.schedule}
          price={bookingState.price}
          origin={origin}
          destination={destination}
          onClose={() => setBookingState(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Calendar,
  Search,
  MapPin,
  Ship,
  Clock,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ScheduleBookingModal } from "../components/ScheduleBookingModal";
import { Input } from "@atlas/ui";

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
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-300"
      >
        Check Spot Rate
      </button>
    );
  }

  if (isLoading) {
    return (
      <button className="px-4 py-2 bg-indigo-50 text-indigo-400 text-sm font-medium rounded-lg border border-indigo-200 min-w-[120px]">
        Loading...
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          Live Rate
        </p>
        <p className="text-lg font-black text-indigo-600 leading-none mt-1">
          ${priceData?.price?.toLocaleString()}
        </p>
      </div>
      <button
        onClick={() => onOpenBooking(schedule, priceData?.price || 0)}
        disabled={isBooked}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
          isBooked
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default"
            : "bg-indigo-600 hover:bg-indigo-700 text-white"
        }`}
      >
        {isBooked ? "Booked ✓" : "Book Now"}
      </button>
    </div>
  );
}

export default function SailingSchedulesModule() {
  const [origin, setOrigin] = useState("Shanghai (CNSHA)");
  const [destination, setDestination] = useState("Rotterdam (NLRTM)");
  const [date, setDate] = useState("2026-08-15");
  const [hasSearched, setHasSearched] = useState(false);
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
        date,
      });
      const res = await fetch(`${API_URL}/schedules?${queryParams}`);
      return res.json();
    },
    enabled: hasSearched,
  });

  const handleSearch = () => {
    setHasSearched(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-600" />
          Sailing Schedules & Dynamic Pricing
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Search and plan your future maritime shipments across all major
          alliances with real-time spot rates.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Origin Port (POL)
            </label>
            <Input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. CNSHA"
              leftIcon={<MapPin size={16} />}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Destination Port (POD)
            </label>
            <Input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. NLRTM"
              leftIcon={<MapPin size={16} />}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Date from
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              leftIcon={<CalendarCheck size={16} />}
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" />
            Search Schedules
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {!hasSearched ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Ship className="w-16 h-16 mb-4 text-slate-300" />
            <p>Enter your route and click Search to see available vessels.</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Available Routings
                </h3>
                <p className="text-sm text-slate-500">
                  Found {schedules.length} schedules
                </p>
              </div>
            </div>

            {schedules.map((sch) => (
              <div
                key={sch.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                        sch.carrier.includes("Maersk")
                          ? "bg-blue-600"
                          : sch.carrier.includes("MSC")
                            ? "bg-yellow-600"
                            : sch.carrier.includes("CMA")
                              ? "bg-indigo-800"
                              : "bg-slate-600"
                      }`}
                    >
                      {sch.carrier.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {sch.carrier}
                        {sch.status === "Delayed" && (
                          <span className="flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> Delayed
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <Ship className="w-3 h-3" /> {sch.vessel} • Voy:{" "}
                        {sch.voyage}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-800">
                      {sch.transitTime}{" "}
                      <span className="text-sm font-medium text-slate-500">
                        Days
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                      Transit Time
                    </p>
                  </div>
                </div>

                <div className="p-5 flex flex-wrap gap-8 items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-8 flex-1">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Departure
                      </p>
                      <p className="font-medium text-slate-800">
                        {sch.departure}
                      </p>
                      <p className="text-xs text-slate-500">{origin}</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-dashed border-slate-300"></div>
                      </div>
                      <div className="bg-slate-50 px-3 relative z-10 text-slate-400">
                        <Ship className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Arrival
                      </p>
                      <p className="font-medium text-slate-800">
                        {sch.arrival}
                      </p>
                      <p className="text-xs text-slate-500">{destination}</p>
                    </div>
                  </div>

                  <div className="w-px h-12 bg-slate-200 hidden lg:block"></div>

                  <div className="flex gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> VGM Cut-off
                      </p>
                      <p className="text-xs font-medium text-slate-700">
                        {sch.cutOffVgm}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> SI Cut-off
                      </p>
                      <p className="text-xs font-medium text-slate-700">
                        {sch.cutOffSi}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> CY Cut-off
                      </p>
                      <p className="text-xs font-medium text-rose-600">
                        {sch.cutOffCy}
                      </p>
                    </div>
                  </div>

                  <DynamicPriceButton
                    schedule={sch}
                    onOpenBooking={handleOpenBooking}
                    isBooked={bookedSchedules.has(sch.id)}
                  />
                </div>
              </div>
            ))}
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

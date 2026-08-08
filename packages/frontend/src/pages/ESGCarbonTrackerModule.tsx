import { useMemo, useState } from "react";
import {
  ESGCarbonTracker,
  ShipmentCarbon,
} from "@atlas/ui/src/components/ESGCarbonTracker";
import { useApiQuery } from "../hooks/useApiQuery";
import { Search, RefreshCw } from "lucide-react";
import { Input, Button } from "@atlas/ui";

export default function ESGCarbonTrackerModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMode, setActiveMode] = useState<
    "All" | "Ocean" | "Air" | "Road"
  >("All");

  // Fetch carbon data from the real backend endpoint
  const { data, isLoading, refetch } = useApiQuery<ShipmentCarbon[]>(
    ["esg-carbon"],
    "/operations/esg/carbon",
  );

  const rawData = Array.isArray(data) ? data : [];

  const filteredData = useMemo(() => {
    return rawData.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.reference?.toLowerCase().includes(q) ||
        s.origin?.toLowerCase().includes(q) ||
        s.destination?.toLowerCase().includes(q);

      const matchesMode = activeMode === "All" || s.mode === activeMode;

      return matchesSearch && matchesMode;
    });
  }, [rawData, searchQuery, activeMode]);

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Toolbar / Filters */}
      <div className="px-6 pt-6 pb-2 shrink-0 z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
        <div className="w-full md:w-80 relative">
          <Input
            placeholder="Search shipments, origin, destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            className="bg-slate-900 border-slate-800 text-sm focus:border-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(["All", "Ocean", "Air", "Road"] as const).map((mode) => (
              <Button
                key={mode}
                onClick={() => setActiveMode(mode)}
                variant="ghost"
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeMode === mode
                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {mode}
              </Button>
            ))}
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            className="w-10 h-10 p-0 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center shadow-lg"
            title="Refresh Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Main Dashboard Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar z-10">
        <ESGCarbonTracker
          data={
            filteredData.length > 0 ||
            searchQuery !== "" ||
            activeMode !== "All"
              ? filteredData
              : undefined
          }
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  Truck,
  Box,
  Layers,
  BarChart,
  ArrowRightLeft,
  Anchor,
  BoxSelect,
} from "lucide-react";
import { WarehouseTrafficControl } from "@atlas/ui/src/components/WarehouseTrafficControl";
import { WarehouseInboundOutbound } from "@atlas/ui/src/components/WarehouseInboundOutbound";
import { Warehouse3D } from "@atlas/ui/src/components/Warehouse3D";
import { Button } from "@atlas/ui";
import { useApiQuery } from "../hooks/useApiQuery";

interface TrafficRecord {
  id: string;
  status: string;
  type: string;
  expectedQuantity: number;
  assignedDock: string | null;
}

const TOTAL_DOCKS = 8;

export default function WarehouseOpsModule() {
  const [activeTab, setActiveTab] = useState<
    "traffic" | "inbound" | "outbound" | "3d"
  >("traffic");
  const [kpis, setKpis] = useState({ activeVehicles: 0, inboundPallets: 0, docksAvailable: "0 / 0", loadEfficiency: "0%" });

  useEffect(() => {
    async function fetchKpis() {
      try {
        const [trafficRes, inventoryRes] = await Promise.all([
          fetch("/api/warehouse/traffic"),
          fetch("/api/warehouse/inventory"),
        ]);
        const traffic = trafficRes.ok ? await trafficRes.json() : [];
        const inventory = inventoryRes.ok ? await inventoryRes.json() : [];
        const activeVehicles = Array.isArray(traffic) ? traffic.filter((v: any) => v.status !== "DISPATCHED").length : 0;
        const inboundPallets = Array.isArray(inventory) ? inventory.reduce((sum: number, i: any) => sum + (i.expectedQuantity || 0), 0) : 0;
        const totalDocks = 8;
        const usedDocks = Array.isArray(traffic) ? traffic.filter((v: any) => v.assignedDock).length : 0;
        const available = totalDocks - usedDocks;
        const efficiency = Array.isArray(traffic) && traffic.length > 0
          ? Math.round((traffic.filter((v: any) => v.status === "DISPATCHED").length / traffic.length) * 100)
          : 0;
        setKpis({
          activeVehicles,
          inboundPallets,
          docksAvailable: `${available} / ${totalDocks}`,
          loadEfficiency: `${efficiency}%`,
        });
      } catch { /* keep defaults */ }
    }
    fetchKpis();
  }, []);

  const { data: trafficData } = useApiQuery<{ data: TrafficRecord[] }>(
    ["warehouse-traffic"],
    "/warehouse/traffic",
  );

  const traffic: TrafficRecord[] = useMemo(
    () => trafficData?.data ?? [],
    [trafficData],
  );

  const activeVehicles = useMemo(
    () => traffic.filter((t) => t.status !== "DEPARTED").length,
    [traffic],
  );
  const inboundPallets = useMemo(
    () =>
      traffic
        .filter((t) => t.type === "INBOUND" && t.status !== "DEPARTED")
        .reduce((acc, t) => acc + (t.expectedQuantity ?? 0), 0),
    [traffic],
  );
  const occupiedDocks = useMemo(
    () => traffic.filter((t) => t.assignedDock && t.status !== "DEPARTED").length,
    [traffic],
  );
  const availableDocks = Math.max(0, TOTAL_DOCKS - occupiedDocks);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 min-h-full flex flex-col">
      {/* Header & KPI Summary */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Layers className="text-indigo-500" /> Warehouse Operations (WMS)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Rule-based Dock Management, Cross-Docking, and Load Optimization.
          </p>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Truck size={18} />{" "}
              <span className="font-bold text-xs uppercase tracking-wider">
                Active Vehicles
              </span>
            </div>
            <span className="text-4xl font-black text-white">{activeVehicles}</span>
            <span className="text-emerald-400 text-xs font-semibold">
              {activeVehicles === 0 ? "No active vehicles" : "On-site now"}
            </span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Box size={18} />{" "}
              <span className="font-bold text-xs uppercase tracking-wider">
                Inbound Pallets
              </span>
            </div>
            <span className="text-4xl font-black text-white">{inboundPallets}</span>
            <span className="text-blue-400 text-xs font-semibold">
              {inboundPallets === 0 ? "No inbound" : "Expected today"}
            </span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Anchor size={18} />{" "}
              <span className="font-bold text-xs uppercase tracking-wider">
                Docks Available
              </span>
            </div>
            <span className="text-4xl font-black text-white">{availableDocks} / {TOTAL_DOCKS}</span>
            <span className={`text-xs font-semibold ${availableDocks === 0 ? "text-rose-400" : availableDocks < 3 ? "text-amber-400" : "text-emerald-400"}`}>
              {availableDocks === 0 ? "All docks occupied" : `${occupiedDocks} occupied`}
            </span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <BarChart size={18} />{" "}
              <span className="font-bold text-xs uppercase tracking-wider">
                Load Efficiency
              </span>
            </div>
            <span className="text-4xl font-black text-white">
              {TOTAL_DOCKS > 0
                ? `${Math.round(((TOTAL_DOCKS - availableDocks) / TOTAL_DOCKS) * 100)}%`
                : "0%"}
            </span>
            <span className="text-emerald-400 text-xs font-semibold">
              Dock utilization
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700/50 pb-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <Button
          onClick={() => setActiveTab("traffic")}
          variant={activeTab === "traffic" ? "default" : "ghost"}
          className={`px-6 py-3 font-bold text-sm rounded-t-xl rounded-b-none transition-colors h-auto ${activeTab === "traffic" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
        >
          <div className="flex items-center gap-2">
            <Truck size={16} /> Traffic Control
          </div>
        </Button>
        <Button
          onClick={() => setActiveTab("inbound")}
          variant={activeTab === "inbound" ? "default" : "ghost"}
          className={`px-6 py-3 font-bold text-sm rounded-t-xl rounded-b-none transition-colors h-auto ${activeTab === "inbound" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} /> Inbound (Receiving)
          </div>
        </Button>
        <Button
          onClick={() => setActiveTab("outbound")}
          variant={activeTab === "outbound" ? "default" : "ghost"}
          className={`px-6 py-3 font-bold text-sm rounded-t-xl rounded-b-none transition-colors h-auto ${activeTab === "outbound" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
        >
          <div className="flex items-center gap-2">
            <Layers size={16} /> Outbound (Heuristic Allocation)
          </div>
        </Button>
        <Button
          onClick={() => setActiveTab("3d")}
          variant={activeTab === "3d" ? "default" : "ghost"}
          className={`px-6 py-3 font-bold text-sm rounded-t-xl rounded-b-none transition-colors h-auto ${activeTab === "3d" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
        >
          <div className="flex items-center gap-2">
            <BoxSelect size={16} /> 3D View
          </div>
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-[500px]">
        {activeTab === "traffic" && <WarehouseTrafficControl />}
        {activeTab === "inbound" && <WarehouseInboundOutbound mode="inbound" />}
        {activeTab === "outbound" && (
          <WarehouseInboundOutbound mode="outbound" />
        )}
        {activeTab === "3d" && <Warehouse3D />}
      </div>
    </div>
  );
}

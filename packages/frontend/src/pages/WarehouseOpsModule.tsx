import { useState } from "react";
import {
  Truck,
  Box,
  Layers,
  BarChart,
  ArrowRightLeft,
  Anchor,
} from "lucide-react";
import { WarehouseTrafficControl } from "@atlas/ui/src/components/WarehouseTrafficControl";
import { WarehouseInboundOutbound } from "@atlas/ui/src/components/WarehouseInboundOutbound";

export default function WarehouseOpsModule() {
  const [activeTab, setActiveTab] = useState<
    "traffic" | "inbound" | "outbound"
  >("traffic");

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 min-h-full flex flex-col">
      {/* Header & KPI Summary */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Layers className="text-indigo-500" /> Warehouse Operations (WMS)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            AI-driven Dock Management, Cross-Docking, and Load Optimization.
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
            <span className="text-4xl font-black text-white">12</span>
            <span className="text-emerald-400 text-xs font-semibold">
              +3 expected in 1h
            </span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Box size={18} />{" "}
              <span className="font-bold text-xs uppercase tracking-wider">
                Inbound Pallets
              </span>
            </div>
            <span className="text-4xl font-black text-white">450</span>
            <span className="text-blue-400 text-xs font-semibold">
              92% processing rate
            </span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Anchor size={18} />{" "}
              <span className="font-bold text-xs uppercase tracking-wider">
                Docks Available
              </span>
            </div>
            <span className="text-4xl font-black text-white">2 / 8</span>
            <span className="text-amber-400 text-xs font-semibold">
              High congestion
            </span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <BarChart size={18} />{" "}
              <span className="font-bold text-xs uppercase tracking-wider">
                Load Efficiency
              </span>
            </div>
            <span className="text-4xl font-black text-white">96%</span>
            <span className="text-emerald-400 text-xs font-semibold">
              Optimized by AI
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700/50 pb-2">
        <button
          onClick={() => setActiveTab("traffic")}
          className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors ${activeTab === "traffic" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
        >
          <div className="flex items-center gap-2">
            <Truck size={16} /> Traffic Control
          </div>
        </button>
        <button
          onClick={() => setActiveTab("inbound")}
          className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors ${activeTab === "inbound" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} /> Inbound (Receiving)
          </div>
        </button>
        <button
          onClick={() => setActiveTab("outbound")}
          className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors ${activeTab === "outbound" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
        >
          <div className="flex items-center gap-2">
            <Layers size={16} /> Outbound (AI Allocation)
          </div>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-[500px]">
        {activeTab === "traffic" && <WarehouseTrafficControl />}
        {activeTab === "inbound" && <WarehouseInboundOutbound mode="inbound" />}
        {activeTab === "outbound" && (
          <WarehouseInboundOutbound mode="outbound" />
        )}
      </div>
    </div>
  );
}

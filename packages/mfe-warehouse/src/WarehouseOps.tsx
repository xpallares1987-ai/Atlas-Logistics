import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Truck,
  Box,
  Anchor,
  BarChart,
  ArrowRightLeft,
  PackageCheck,
  PackageOpen,
  MapIcon,
  ClipboardList,
} from "lucide-react";
import KanbanBoard from "./components/KanbanBoard";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || "";

// Custom Isometric Grid View
const IsometricWarehouse = ({
  traffic,
  docks = 8,
}: {
  traffic: any[];
  docks?: number;
}) => {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center overflow-hidden bg-slate-950/50 rounded-3xl border border-white/10 group perspective-[1200px]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [transform:rotateX(60deg)_rotateZ(-45deg)_scale(2)] opacity-50 transition-transform duration-1000 group-hover:[transform:rotateX(55deg)_rotateZ(-40deg)_scale(2)]" />

      <div className="relative w-full h-full [transform:rotateX(60deg)_rotateZ(-45deg)] transition-transform duration-1000 group-hover:[transform:rotateX(55deg)_rotateZ(-40deg)] flex flex-col justify-center items-center">
        {/* Main Warehouse Building */}
        <div className="relative w-[400px] h-[300px] bg-slate-800/80 border border-slate-600/50 rounded-xl shadow-[20px_20px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between p-4">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-xl pointer-events-none" />

          {/* Top section: Racks */}
          <div className="flex justify-between w-full h-2/3">
            {[1, 2, 3].map((rack) => (
              <div
                key={rack}
                className="w-16 h-full bg-slate-700/50 border border-slate-600/30 rounded-lg flex flex-col justify-around p-1"
              >
                {[1, 2, 3, 4].map((shelf) => (
                  <div
                    key={shelf}
                    className="w-full h-3 bg-emerald-500/20 rounded shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]"
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Bottom section: Docks */}
          <div className="flex justify-between w-full h-1/4 pt-4 border-t border-slate-700/50 gap-2">
            {Array.from({ length: docks }).map((_, i) => {
              const dockNum = `DOCK-${String(i + 1).padStart(2, "0")}`;
              const assignedTraffic = traffic?.find(
                (t) => t.assignedDock === dockNum && t.status !== "Completed",
              );
              const isOccupied = !!assignedTraffic;

              return (
                <div
                  key={i}
                  className="relative w-full h-full flex items-end justify-center"
                >
                  <div
                    className={`w-8 h-8 border-2 rounded ${isOccupied ? "border-amber-500 bg-amber-500/20" : "border-emerald-500 bg-emerald-500/10"}`}
                  >
                    {isOccupied && (
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute -bottom-8 w-12 h-16 bg-slate-200 rounded shadow-lg border border-slate-300 flex items-center justify-center z-10"
                      >
                        <div className="w-8 h-12 bg-indigo-500 rounded-sm shadow-inner flex items-center justify-center">
                          <div className="w-6 h-6 bg-indigo-600 border border-indigo-400 rounded-sm" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <span className="absolute -top-4 text-[8px] font-mono text-slate-400 [transform:rotateZ(45deg)]">
                    {dockNum}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function WarehouseOpsModule() {
  const [activeTab, setActiveTab] = useState<
    "traffic" | "inventory" | "map" | "fulfillment"
  >("traffic");

  const { data: trafficRes, isLoading: loadingTraffic } = useQuery({
    queryKey: ["warehouse-traffic"],
    queryFn: async () => {
      const token = localStorage.getItem("atlas_token");
      const res = await fetch(`${API_URL}/api/warehouse/traffic`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load traffic");
      return res.json();
    },
  });

  const { data: inventoryRes, isLoading: loadingInventory } = useQuery({
    queryKey: ["warehouse-inventory"],
    queryFn: async () => {
      const token = localStorage.getItem("atlas_token");
      const res = await fetch(`${API_URL}/api/warehouse/inventory`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load inventory");
      return res.json();
    },
  });

  const traffic = trafficRes?.data || [];
  const inventory = inventoryRes?.data || [];

  const activeVehicles = traffic.filter(
    (t: any) => t.status !== "Completed",
  ).length;
  const totalPallets = inventory.reduce(
    (acc: number, curr: any) => acc + (curr.quantity || 0),
    0,
  );

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-auto">
      {/* Background glow effects */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="relative z-10 p-6 md:p-10 pb-4">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-300 mb-2 tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-emerald-400" />
              Warehouse & Terminal Ops
            </h1>
            <p className="text-slate-400 font-medium max-w-2xl">
              Real-time Traffic Control, Cross-Docking Management, and Live
              Inventory Tracking.
            </p>
          </div>

          {/* Global KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 text-slate-400 mb-2 z-10">
                <Truck className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  Active Vehicles
                </span>
              </div>
              <span className="text-5xl font-black text-white z-10 tracking-tighter">
                {activeVehicles}
              </span>
              <span className="text-emerald-400 text-xs font-bold z-10">
                +3 expected in 1h
              </span>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 text-slate-400 mb-2 z-10">
                <Box className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  Total Inventory
                </span>
              </div>
              <span className="text-5xl font-black text-white z-10 tracking-tighter">
                {totalPallets}
              </span>
              <span className="text-teal-400 text-xs font-bold z-10">
                Pallets / SKUs
              </span>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 text-slate-400 mb-2 z-10">
                <Anchor className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  Docks Available
                </span>
              </div>
              <span className="text-5xl font-black text-white z-10 tracking-tighter">
                {8 - activeVehicles}{" "}
                <span className="text-2xl text-slate-500">/ 8</span>
              </span>
              <span className="text-amber-400 text-xs font-bold z-10">
                Moderate congestion
              </span>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 text-slate-400 mb-2 z-10">
                <BarChart className="w-5 h-5 text-rose-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  Load Efficiency
                </span>
              </div>
              <span className="text-5xl font-black text-white z-10 tracking-tighter">
                94%
              </span>
              <span className="text-rose-400 text-xs font-bold z-10">
                Optimized via AI
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-max mb-6">
            <button
              onClick={() => setActiveTab("traffic")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === "traffic"
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" /> Traffic Control
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === "inventory"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <PackageCheck className="w-4 h-4" /> Live Inventory
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === "map"
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <MapIcon className="w-4 h-4" /> Terminal Map
            </button>
            <button
              onClick={() => setActiveTab("fulfillment")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === "fulfillment"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Fulfillment
            </button>
          </div>

          {/* Main Content Area */}
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === "traffic" && (
                <motion.div
                  key="traffic"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                      Inbound & Outbound Traffic
                    </h2>
                  </div>

                  {loadingTraffic ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="p-4 font-semibold">
                              Vehicle / Driver
                            </th>
                            <th className="p-4 font-semibold">Type</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">
                              ETA / Assigned Dock
                            </th>
                            <th className="p-4 font-semibold">
                              Cargo Expected
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {traffic.map((t: any) => (
                            <tr
                              key={t.id}
                              className="hover:bg-white/5 transition-colors group"
                            >
                              <td className="p-4">
                                <div className="font-bold text-white">
                                  {t.deviceNumber || "Unknown"}
                                </div>
                                <div className="text-sm text-slate-400">
                                  {t.driverName}
                                </div>
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                                    t.type === "INBOUND"
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                  }`}
                                >
                                  {t.type}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      t.status === "Arriving"
                                        ? "bg-amber-400"
                                        : t.status === "At Dock"
                                          ? "bg-emerald-400"
                                          : "bg-slate-400"
                                    }`}
                                  />
                                  <span className="text-sm text-slate-300 font-medium">
                                    {t.status}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="font-mono text-sm text-amber-400 font-bold">
                                  {t.assignedDock || "PENDING"}
                                </div>
                                {t.eta && (
                                  <div className="text-xs text-slate-500">
                                    {new Date(t.eta).toLocaleTimeString()}
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-white font-medium">
                                  {t.expectedQuantity} Units
                                </div>
                                <div className="text-xs text-slate-400 truncate max-w-[200px]">
                                  {t.cargoDescription}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {traffic.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-8 text-center text-slate-500"
                              >
                                No active traffic recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "inventory" && (
                <motion.div
                  key="inventory"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                      Live Inventory
                    </h2>
                  </div>

                  {loadingInventory ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {inventory.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 hover:border-emerald-500/50 transition-colors group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                              <PackageOpen className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-300">
                              {inv.zone || "GEN-Z1"}
                            </span>
                          </div>
                          <h3
                            className="font-bold text-white text-base mb-1 truncate"
                            title={inv.sku}
                          >
                            SKU: {inv.sku}
                          </h3>
                          <p className="text-sm text-slate-400 mb-4">
                            {inv.customer || "Unknown Customer"}
                          </p>
                          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                            <div>
                              <div className="text-xs text-slate-500 mb-0.5">
                                Quantity
                              </div>
                              <div className="font-bold text-emerald-400">
                                {inv.quantity}{" "}
                                <span className="text-slate-400 font-normal text-xs">
                                  {inv.uom}
                                </span>
                              </div>
                            </div>
                            {inv.weight && (
                              <div className="text-right">
                                <div className="text-xs text-slate-500 mb-0.5">
                                  Weight
                                </div>
                                <div className="font-bold text-white">
                                  {inv.weight} kg
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "map" && (
                <motion.div
                  key="map"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-white">
                      Terminal Isometric View
                    </h2>
                    <p className="text-sm text-slate-400">
                      Live visualization of dock utilization and warehouse
                      zoning.
                    </p>
                  </div>
                  <IsometricWarehouse traffic={traffic} docks={8} />
                </motion.div>
              )}

              {activeTab === "fulfillment" && (
                <motion.div
                  key="fulfillment"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <KanbanBoard />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

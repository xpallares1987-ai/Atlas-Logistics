import { useState, useEffect } from "react";
import { Truck, ShieldCheck, Box, Anchor } from "lucide-react";
import { WarehouseTraffic, DeviceType, db, syncManager } from "@atlas/shared";

// Mock Shipment Data representing an incoming operation
const mockIncomingShipment = {
  id: "SHP-99120",
  description: "4 Reels (Paper Rolls)",
  totalWeight: 100000,
  equipment: "4x40' HC",
  hsCode: "4802.55",
  customer: "PrintSolutions Corp",
};

function inferTrafficFromShipment(
  shipment: typeof mockIncomingShipment,
): WarehouseTraffic[] {
  const qty = 4;
  const weightPerTruck = shipment.totalWeight / qty;

  return Array.from({ length: qty }).map((_, i) => ({
    id: `TRK-INF-${100 + i}`,
    shipmentId: shipment.id,
    driverName: `Pending Driver ${i + 1}`,
    deviceNumber: `TBD-PLATE-${i + 1}`,
    deviceType: "TRUCK" as DeviceType,
    status: i === 0 ? "WAITING" : "DISPATCHED",
    eta: i === 0 ? "-5 min" : `+${i * 45} min`,
    cargoDescription: `1 Reel (${shipment.hsCode})`,
    totalWeightExpected: weightPerTruck,
    expectedQuantity: 1,
    type: "INBOUND",
    createdAt: new Date().toISOString(),
  }));
}

const initialTraffic: WarehouseTraffic[] = [
  ...inferTrafficFromShipment(mockIncomingShipment),
  {
    id: "TRK-902",
    deviceNumber: "7892-LMX",
    deviceType: "TRUCK",
    status: "DOCK_ASSIGNED",
    eta: "Now",
    assignedDock: "Dock 3",
    cargoDescription: "Steel Coils",
    type: "INBOUND",
    totalWeightExpected: 22000,
    expectedQuantity: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "WGN-104",
    deviceNumber: "WGN-9901A",
    deviceType: "WAGON",
    status: "WAITING",
    eta: "-15 min",
    cargoDescription: "Mixed Retail",
    type: "OUTBOUND",
    totalWeightExpected: 45000,
    expectedQuantity: 24,
    createdAt: new Date().toISOString(),
  },
];

export function WarehouseTrafficControl() {
  const [traffic, setTraffic] = useState<WarehouseTraffic[]>([]);
  const docks = ["Dock 1", "Dock 2", "Dock 3", "Dock 4"];

  useEffect(() => {
    const loadData = async () => {
      let data = await db.warehouseTraffic.toArray();
      if (data.length === 0) {
        // Seed Dexie if empty for demo
        await db.warehouseTraffic.bulkAdd(initialTraffic);
        data = initialTraffic;
      }
      setTraffic(data);
    };
    loadData();
  }, []);

  const assignNextAvailableDock = async () => {
    const freeDocks = docks.filter(
      (d) => !traffic.some((t) => t.assignedDock === d),
    );
    if (freeDocks.length === 0) return alert("No hay muelles disponibles.");

    const nextVehicleIndex = traffic.findIndex((t) => t.status === "WAITING");
    if (nextVehicleIndex === -1) return alert("No hay vehículos en espera.");

    const updatedVehicle = {
      ...traffic[nextVehicleIndex],
      status: "DOCK_ASSIGNED" as const,
      assignedDock: freeDocks[0],
      eta: "Now",
    };

    const newTraffic = [...traffic];
    newTraffic[nextVehicleIndex] = updatedVehicle;

    // Optimistic UI Update
    setTraffic(newTraffic);

    try {
      // 1. Update local database
      await db.warehouseTraffic.update(updatedVehicle.id, {
        status: updatedVehicle.status,
        assignedDock: updatedVehicle.assignedDock,
        eta: updatedVehicle.eta,
      });
      // 2. Queue for backend sync
      await syncManager.addToQueue(
        "warehouseTraffic",
        "UPDATE",
        updatedVehicle,
      );
    } catch (err) {
      console.error("Failed to persist offline", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Incoming Traffic List */}
      <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-white">
              Live Traffic Board
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Inferred from active Shipments
            </p>
          </div>
          <button
            onClick={assignNextAvailableDock}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold uppercase rounded-xl transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Anchor size={16} /> Auto-assign FCFS
          </button>
        </div>

        <div className="space-y-4 flex-1">
          {traffic.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-2xl hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl ${v.status === "WAITING" ? "bg-rose-500/10 text-rose-400" : "bg-slate-700/50 text-slate-400"}`}
                >
                  {v.deviceType === "WAGON" ? (
                    <Box size={24} />
                  ) : (
                    <Truck size={24} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-lg">{v.id}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded ${
                        v.status === "WAITING"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : v.status === "LOADING"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : v.status === "DOCK_ASSIGNED"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-slate-700/50 text-slate-400 border border-slate-600"
                      }`}
                    >
                      {v.status}
                    </span>
                    <span className="text-xs text-slate-500 font-bold ml-2">
                      Device: {v.deviceNumber}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    Shipment: {v.shipmentId || "N/A"} • {v.type}
                  </p>
                  <p className="text-xs text-indigo-300 font-semibold mt-1">
                    Cargo: {v.expectedQuantity}x {v.cargoDescription} (
                    {v.totalWeightExpected.toLocaleString()} Kgs)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-slate-200">
                  {String(v.eta)}
                </div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {v.assignedDock || "Unassigned"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dock Status Map */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 shadow-2xl flex flex-col">
        <h3 className="text-xl font-black text-white mb-6">
          Dock Availability (FCFS)
        </h3>

        <div className="flex-1 space-y-3">
          {docks.map((dock) => {
            const vehicle = traffic.find((v) => v.assignedDock === dock);
            return (
              <div
                key={dock}
                className={`p-4 rounded-2xl border ${vehicle ? "bg-slate-800/80 border-slate-600" : "bg-slate-900/30 border-slate-700/50 border-dashed"} flex flex-col relative overflow-hidden`}
              >
                <div className="flex justify-between items-center mb-2 z-10">
                  <span className="font-bold text-slate-300">{dock}</span>
                  {vehicle ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <ShieldCheck size={14} /> Occupied
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Available
                    </span>
                  )}
                </div>
                {vehicle && (
                  <div className="z-10 bg-slate-900/50 p-2 rounded-xl border border-slate-700/50 flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-white">
                      {vehicle.id}
                    </span>
                    <span className="text-xs text-slate-400">
                      {vehicle.deviceNumber}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

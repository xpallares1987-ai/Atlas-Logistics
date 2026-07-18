import { useState } from "react";
import { ArrowDown, ArrowUp, Zap, Search, Filter, Truck } from "lucide-react";
import type { WarehouseInventoryItem } from "@atlas/shared";

interface Props {
  mode: "inbound" | "outbound";
}

const mockData: WarehouseInventoryItem[] = [
  {
    id: "WHR-101",
    warehouseId: "WH-BCN-01",
    ownership: "INTERNAL",
    customer: "PrintSolutions Corp",
    productCode: "PAPER-RLL-80",
    description: "Offset Paper Roll 80gsm",
    quantity: 1,
    zone: "DRY",
    metadata: {
      grammage: 80,
      diameter: 120,
      rollWidth: 100,
      rollLength: 5000,
      netWeight: 1500,
      grossWeight: 1520,
      customerOrder: "CO-9001",
      purchaseOrder: "PO-888",
    },
    receivedAt: new Date().toISOString(),
    status: "IN_STOCK",
  },
  {
    id: "WHR-102",
    warehouseId: "WH-EXT-VAL",
    ownership: "EXTERNAL",
    customer: "Global Packaging",
    productCode: "KRAFT-RLL-120",
    description: "Kraft Paper Roll 120gsm",
    quantity: 1,
    zone: "CROSS_DOCK",
    metadata: {
      grammage: 120,
      diameter: 140,
      rollWidth: 120,
      rollLength: 4500,
      netWeight: 2100,
      grossWeight: 2150,
      customerOrder: "CO-9045",
    },
    receivedAt: new Date().toISOString(),
    status: "IN_STOCK",
  },
];

export function WarehouseInboundOutbound({ mode }: Props) {
  const [items] = useState<WarehouseInventoryItem[]>(mockData);
  const [deviceNumber, setDeviceNumber] = useState(
    mode === "inbound" ? "1234-ABC (Truck)" : "HLXU1234567 (Container)",
  );

  const runAiOptimization = () => {
    alert(
      mode === "inbound"
        ? "IA: Asignando ubicaciones según ZONAS PREDEFINIDAS estáticas."
        : "IA: Calculando secuencia de carga LIFO para maximizar cubicaje.",
    );
  };

  return (
    <div className="h-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 shadow-2xl flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 relative z-10 gap-4">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-3">
            {mode === "inbound" ? (
              <ArrowDown className="text-emerald-400" />
            ) : (
              <ArrowUp className="text-blue-400" />
            )}
            {mode === "inbound"
              ? "Inbound Receipt & Putaway"
              : "Outbound AI Load Optimization"}
          </h3>
          <p className="text-slate-400 text-sm font-medium mt-2 max-w-2xl">
            {mode === "inbound"
              ? "Registra la entrada real del stock corrigiendo la previsión del embarque. La IA sugiere la zona estática."
              : "Selecciona el inventario a expedir. La IA generará la secuencia de carga LIFO."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-2 flex items-center gap-3">
            <Truck className="text-indigo-400" size={18} />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Device Number
              </div>
              <input
                type="text"
                value={deviceNumber}
                onChange={(e) => setDeviceNumber(e.target.value)}
                className="bg-transparent border-none text-white font-bold text-sm outline-none w-48"
              />
            </div>
          </div>
          <button
            onClick={runAiOptimization}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            <Zap size={18} />{" "}
            {mode === "inbound" ? "Run Putaway AI" : "Run LIFO Optimizer"}
          </button>
        </div>
      </div>

      {/* Advanced Data Grid */}
      <div className="flex-1 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 relative z-10 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar por Customer, PO, CO..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-bold flex items-center gap-2">
            <Filter size={16} /> Filters
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 sticky top-0 text-xs uppercase font-black text-slate-400 tracking-wider">
              <tr>
                <th className="p-4">Owner</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Product / Item</th>
                <th className="p-4 text-center">Qty</th>
                <th className="p-4">GM / Diam / W / L</th>
                <th className="p-4">Weight (N/G)</th>
                <th className="p-4">PO / CO</th>
                {mode === "inbound" ? (
                  <th className="p-4">Target Zone</th>
                ) : (
                  <th className="p-4">Load Sequence</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-800/30">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider border ${
                        item.ownership === "INTERNAL"
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {item.ownership === "INTERNAL" ? "PROPIO" : "EXTERNO"}
                    </span>
                    <div className="text-xs mt-1 text-slate-500">
                      {item.warehouseId}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-white">{item.customer}</td>
                  <td className="p-4">
                    <div className="font-bold text-slate-200">
                      {item.productCode}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]">
                      {item.description}
                    </div>
                  </td>
                  <td className="p-4 text-center font-black text-white text-lg">
                    {item.quantity}
                  </td>
                  <td className="p-4 text-xs font-mono text-slate-400">
                    <div className="flex gap-2">
                      <span className="text-emerald-400">
                        {item.metadata.grammage}g
                      </span>
                      <span className="text-blue-400">
                        Ø{item.metadata.diameter}
                      </span>
                    </div>
                    <div>
                      {item.metadata.rollWidth}x{item.metadata.rollLength}
                    </div>
                  </td>
                  <td className="p-4 text-xs font-mono">
                    <span className="text-white">
                      {item.metadata.netWeight}
                    </span>{" "}
                    /{" "}
                    <span className="text-slate-500">
                      {item.metadata.grossWeight} kg
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-400">
                    <div>{item.metadata.purchaseOrder || "-"}</div>
                    <div className="text-indigo-400">
                      {item.metadata.customerOrder || "-"}
                    </div>
                  </td>
                  <td className="p-4">
                    {mode === "inbound" ? (
                      <span className="px-3 py-1 bg-slate-900/50 border border-slate-600 rounded text-xs font-bold text-slate-300">
                        {item.zone}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-slate-500">
                        Pending LIFO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

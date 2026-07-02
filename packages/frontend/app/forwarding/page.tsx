"use client";

import React, { useEffect, useState } from "react";
import { fetchConsolidationData, consolidateShipment, calculatePnL } from "@/app/actions/actions";
import { Boxes, PackagePlus, DollarSign, Loader2, ChevronDown, ChevronRight, Activity, ArrowRight } from "lucide-react";
import { Shipment } from "@/types/scm";

export default function ForwardingDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMbl, setExpandedMbl] = useState<number | string | null>(null);
  
  // P&L State
  const [pnlData, setPnlData] = useState<any>(null);
  const [pnlLoading, setPnlLoading] = useState(false);

  // Consolidation State
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [selectedMblId, setSelectedMblId] = useState<number | string | null>(null);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");
  const [consolidateLoading, setConsolidateLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchConsolidationData();
    setShipments(data);
    setLoading(false);
  };

  const handleExpandMbl = async (id: number | string) => {
    if (expandedMbl === id) {
      setExpandedMbl(null);
      setPnlData(null);
    } else {
      setExpandedMbl(id);
      setPnlLoading(true);
      const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      const data = await calculatePnL(numericId);
      setPnlData(data);
      setPnlLoading(false);
    }
  };

  const handleConsolidate = async () => {
    if (!selectedMblId || !selectedHouseId) return;
    setConsolidateLoading(true);
    try {
      const masterId = typeof selectedMblId === 'string' ? parseInt(selectedMblId, 10) : selectedMblId;
      await consolidateShipment(masterId, parseInt(selectedHouseId));
      setShowConsolidateModal(false);
      await loadData();
    } catch (e) {
      alert("Error al consolidar: " + (e as Error).message);
    }
    setConsolidateLoading(false);
  };

  // Derived datasets
  const mbls = shipments.filter(s => s.type === "MBL" || s.type === "Direct");
  const availableHbls = shipments.filter(s => s.type !== "MBL" && !s.parent_shipment_id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-500" />
            Consolidación & NVOCC
          </h1>
          <p className="text-gray-400 mt-1">
            Gestión de Master Bills (MBL) y asignación de House Bills (HBL) con análisis de rentabilidad.
          </p>
        </div>
      </div>

      <div className="bg-[#111114] border border-gray-800/40 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#1A1A1D] text-gray-400 border-b border-gray-800">
            <tr>
              <th className="px-6 py-4 font-medium w-12"></th>
              <th className="px-6 py-4 font-medium">MBL / Ref</th>
              <th className="px-6 py-4 font-medium">Origen / Destino</th>
              <th className="px-6 py-4 font-medium">Incoterm</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Cargando embarques...
                </td>
              </tr>
            ) : mbls.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No hay embarques MBL registrados.
                </td>
              </tr>
            ) : (
              mbls.map((mbl) => {
                const isExpanded = expandedMbl === mbl.id;
                const hbls = shipments.filter(s => s.parent_shipment_id === mbl.id);

                return (
                  <React.Fragment key={mbl.id}>
                    <tr className={`hover:bg-gray-800/20 transition-colors ${isExpanded ? 'bg-gray-800/10' : ''}`}>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleExpandMbl(mbl.id)}
                          className="p-1 rounded bg-gray-800/50 hover:bg-gray-700 text-gray-400"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                        {mbl.tracking_number}
                        <span className="px-2 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-bold">
                          {mbl.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-400 font-mono text-xs">
                          {mbl.origin_port}
                          <ArrowRight className="w-3 h-3 text-gray-600" />
                          {mbl.destination_port}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {mbl.incoterm ? (
                          <span className="px-2 py-1 text-xs bg-gray-800 rounded border border-gray-700 text-gray-300">
                            {mbl.incoterm}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedMblId(mbl.id);
                            setShowConsolidateModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-colors"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          Consolidar HBL
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Section */}
                    {isExpanded && (
                      <tr className="bg-gray-900/40">
                        <td colSpan={5} className="p-0 border-b border-gray-800/60">
                          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Nested HBL List */}
                            <div className="md:col-span-2 space-y-4">
                              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Boxes className="w-4 h-4 text-gray-500" />
                                House Bills of Lading ({hbls.length})
                              </h3>
                              {hbls.length > 0 ? (
                                <div className="space-y-2">
                                  {hbls.map(hbl => (
                                    <div key={hbl.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-800/60 bg-black/20">
                                      <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full font-bold">
                                          HBL
                                        </span>
                                        <span className="font-medium text-sm text-gray-200">{hbl.tracking_number}</span>
                                      </div>
                                      <span className="text-xs text-gray-500">{hbl.status}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 p-4 border border-dashed border-gray-800 rounded-lg text-center">
                                  No hay House Bills asignados a este Master.
                                </div>
                              )}
                            </div>

                            {/* P&L Analytics */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                P&L Analytics
                              </h3>
                              {pnlLoading ? (
                                <div className="h-24 flex items-center justify-center border border-gray-800/60 rounded-lg bg-black/20">
                                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                                </div>
                              ) : pnlData ? (
                                <div className="p-4 border border-gray-800/60 rounded-lg bg-black/20 space-y-4">
                                  <div className="flex justify-between items-end">
                                    <span className="text-xs text-gray-400">Revenue (AR)</span>
                                    <span className="text-sm text-green-400 font-medium">
                                      ${pnlData.totalRevenue.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                                    <span className="text-xs text-gray-400">Cost (AP)</span>
                                    <span className="text-sm text-red-400 font-medium">
                                      ${pnlData.totalCost.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-end pt-1">
                                    <span className="text-sm font-medium text-white">Profit</span>
                                    <div className="text-right">
                                      <div className={`text-lg font-bold ${pnlData.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        ${pnlData.profit.toLocaleString()}
                                      </div>
                                      <div className="text-[10px] text-gray-500 font-mono">
                                        Margin: {pnlData.marginPercentage}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Consolidate Modal */}
      {showConsolidateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111114] border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Consolidar Embarque</h2>
            <p className="text-sm text-gray-400 mb-4">
              Seleccione un embarque existente (Directo/HBL) para adjuntarlo como hijo de este Master Bill.
            </p>
            
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-400 mb-2">Seleccionar Embarque</label>
              <select 
                value={selectedHouseId} 
                onChange={e => setSelectedHouseId(e.target.value)}
                className="w-full bg-[#1A1A1D] border border-gray-800 text-white rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccione un embarque...</option>
                {availableHbls.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.tracking_number} - {h.origin_port} a {h.destination_port}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConsolidateModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConsolidate}
                disabled={!selectedHouseId || consolidateLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {consolidateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
                Consolidar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { wmsService } from '../../services/wmsService';
import { Warehouse, Plus, ArrowDownCircle, ArrowUpCircle, X, History } from 'lucide-react';

export default function WmsPage() {
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showDispatch, setShowDispatch] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState<any | null>(null);

  // Form state
  const [whName, setWhName] = useState('');
  const [whAddress, setWhAddress] = useState('');
  
  const [recSku, setRecSku] = useState('');
  const [recDesc, setRecDesc] = useState('');
  const [recQty, setRecQty] = useState('');
  const [recWh, setRecWh] = useState('');

  const [dispQty, setDispQty] = useState('');
  const [dispNote, setDispNote] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stockData, warehouseData] = await Promise.all([
        wmsService.getStock(),
        wmsService.getWarehouses()
      ]);
      setStockItems(stockData);
      setWarehouses(warehouseData);
      if (warehouseData.length > 0 && !recWh) {
        setRecWh(warehouseData[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await wmsService.createWarehouse({
        name: whName,
        location_address: whAddress,
        capacity_m2: null
      });
      setShowCreateWarehouse(false);
      setWhName('');
      setWhAddress('');
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error al crear warehouse');
    }
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recWh) return alert('Selecciona una bodega');
    try {
      await wmsService.receiveStock({
        warehouse_id: parseInt(recWh),
        sku: recSku,
        description: recDesc,
        quantity: parseInt(recQty),
        reference_note: 'Ingreso manual UI'
      });
      setShowReceive(false);
      setRecSku('');
      setRecDesc('');
      setRecQty('');
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error recibiendo stock');
    }
  };

  const handleDispatchStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDispatch) return;
    try {
      await wmsService.dispatchStock({
        stock_item_id: showDispatch,
        quantity: parseInt(dispQty),
        reference_note: dispNote || 'Despacho manual UI'
      });
      setShowDispatch(null);
      setDispQty('');
      setDispNote('');
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error en despacho');
    }
  };

  const ModalWrapper = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#16161A]">
          <h2 className="font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-orange-500" />
            WMS & Inventario
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Control de stock, ingresos y despachos físicos.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowReceive(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-orange-900/20"
          >
            <ArrowDownCircle className="w-5 h-5" />
            Recibir Carga
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Warehouses Sidebar */}
        <div className="bg-[#111114]/80 backdrop-blur border border-gray-800/80 rounded-2xl overflow-hidden h-fit flex flex-col shadow-xl">
          <div className="p-5 border-b border-gray-800/80 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Bodegas</h2>
            <button onClick={() => setShowCreateWarehouse(true)} className="text-orange-400 hover:text-orange-300 transition bg-orange-500/10 p-1.5 rounded-lg">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {warehouses.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No hay bodegas registradas.</div>
            ) : (
              warehouses.map(w => (
                <div key={w.id} className="p-4 bg-gray-900/50 hover:bg-gray-800/50 transition rounded-xl border border-gray-800 cursor-default">
                  <h3 className="font-bold text-gray-200 text-sm">{w.name}</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed truncate" title={w.location_address}>{w.location_address}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="lg:col-span-3 bg-[#111114]/80 backdrop-blur border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-gray-800/80 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Stock Actual</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-4">
               <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
               Cargando inventario...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-[#16161A]/80 text-xs uppercase font-medium text-gray-500">
                  <tr>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Descripción</th>
                    <th className="px-6 py-4">Bodega ID</th>
                    <th className="px-6 py-4 text-right">Cantidad</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {stockItems.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No hay stock disponible. Registra un ingreso de carga.</td></tr>
                  ) : (
                    stockItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-800/30 transition group">
                        <td className="px-6 py-4 font-mono text-gray-300">{item.sku}</td>
                        <td className="px-6 py-4 text-gray-300">{item.description}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.warehouse_id}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                            item.quantity_on_hand > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {item.quantity_on_hand}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-3 opacity-60 group-hover:opacity-100 transition">
                            <button 
                              onClick={() => setShowDispatch(item.id)}
                              disabled={item.quantity_on_hand <= 0}
                              className="text-gray-400 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed bg-gray-800 p-2 rounded-lg hover:bg-orange-500/10 transition"
                              title="Despachar Stock"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setShowHistory(item)}
                              className="text-gray-400 hover:text-blue-400 bg-gray-800 p-2 rounded-lg hover:bg-blue-500/10 transition"
                              title="Historial de Movimientos"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showCreateWarehouse && (
        <ModalWrapper title="Nueva Bodega" onClose={() => setShowCreateWarehouse(false)}>
          <form onSubmit={handleCreateWarehouse} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre</label>
              <input required value={whName} onChange={e => setWhName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition" placeholder="Ej. Bodega Central" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dirección / Ubicación</label>
              <input required value={whAddress} onChange={e => setWhAddress(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition" placeholder="Ej. Av. Principal 123" />
            </div>
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition mt-4">Guardar Bodega</button>
          </form>
        </ModalWrapper>
      )}

      {showReceive && (
        <ModalWrapper title="Recibir Carga" onClose={() => setShowReceive(false)}>
          {warehouses.length === 0 ? (
            <div className="text-center text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              Debes registrar al menos una bodega primero.
            </div>
          ) : (
            <form onSubmit={handleReceiveStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bodega Destino</label>
                <select required value={recWh} onChange={e => setRecWh(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">SKU</label>
                <input required value={recSku} onChange={e => setRecSku(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition font-mono" placeholder="PROD-001" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción</label>
                <input required value={recDesc} onChange={e => setRecDesc(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition" placeholder="Laptops Dell XPS" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cantidad</label>
                <input required type="number" min="1" value={recQty} onChange={e => setRecQty(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition" />
              </div>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition mt-4">Confirmar Ingreso</button>
            </form>
          )}
        </ModalWrapper>
      )}

      {showDispatch && (
        <ModalWrapper title="Despachar Carga" onClose={() => setShowDispatch(null)}>
          <form onSubmit={handleDispatchStock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cantidad a Despachar</label>
              <input required type="number" min="1" value={dispQty} onChange={e => setDispQty(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition" placeholder="Ej. 10" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Referencia / Nota</label>
              <input value={dispNote} onChange={e => setDispNote(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition" placeholder="Ej. Orden #4012" />
            </div>
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition mt-4">Confirmar Despacho</button>
          </form>
        </ModalWrapper>
      )}

      {showHistory && (
        <ModalWrapper title={`Auditoría: ${showHistory.sku}`} onClose={() => setShowHistory(null)}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {(!showHistory.movements || showHistory.movements.length === 0) ? (
              <div className="text-gray-500 text-center py-4">No hay movimientos registrados.</div>
            ) : (
              showHistory.movements.map((m: any) => (
                <div key={m.id} className="flex gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.movement_type === 'Receiving' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {m.movement_type === 'Receiving' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${m.movement_type === 'Receiving' ? 'text-green-400' : 'text-orange-400'}`}>
                        {m.movement_type === 'Receiving' ? '+' : '-'}{m.quantity_change}
                      </span>
                      <span className="text-gray-400 text-xs">({m.movement_type})</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-1">{m.reference_note}</p>
                    <p className="text-gray-600 text-xs mt-2">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalWrapper>
      )}
      
    </div>
  );
}

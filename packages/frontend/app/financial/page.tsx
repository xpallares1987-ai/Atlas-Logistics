"use client";

import React, { useState, useEffect } from 'react';
import { financialService } from '../../services/financialService';
import { DollarSign, Search, Plus } from 'lucide-react';

export default function FinancialPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipmentId, setShipmentId] = useState('');
  const [pnl, setPnl] = useState<any>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await financialService.getInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzePnl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentId) return;
    try {
      const data = await financialService.getShipmentPnL(Number(shipmentId));
      setPnl(data);
    } catch (e) {
      console.error(e);
      setPnl({ error: 'Failed to fetch P&L or Shipment not found' });
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            Finanzas & P&L
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Control de facturas (AR/AP) y rentabilidad por embarque.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
          <Plus className="w-4 h-4" />
          Nueva Factura
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* P&L Analyzer */}
        <div className="bg-[#111114] border border-gray-800 rounded-xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4">Analizador P&L</h2>
          <form onSubmit={handleAnalyzePnl} className="flex gap-2 mb-6">
            <input 
              type="number" 
              placeholder="Shipment ID..." 
              value={shipmentId}
              onChange={e => setShipmentId(e.target.value)}
              className="flex-1 bg-[#0A0A0B] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-white">
              <Search className="w-4 h-4" />
            </button>
          </form>

          {pnl && !pnl.error && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <span className="text-sm text-emerald-400">Total Revenue (AR)</span>
                <span className="font-bold text-white">${pnl.total_revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <span className="text-sm text-red-400">Total Costs (AP)</span>
                <span className="font-bold text-white">${pnl.total_costs.toFixed(2)}</span>
              </div>
              <div className="pt-4 border-t border-gray-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-300">Profit</span>
                  <span className={`font-bold ${pnl.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${pnl.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Margin</span>
                  <span className={`font-bold ${pnl.margin_percentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pnl.margin_percentage}%
                  </span>
                </div>
              </div>
            </div>
          )}
          {pnl && pnl.error && (
            <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {pnl.error}
            </div>
          )}
        </div>

        {/* Invoices Table */}
        <div className="lg:col-span-2 bg-[#111114] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Últimas Facturas</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-[#16161A] text-xs uppercase font-medium text-gray-500">
                <tr>
                  <th className="px-6 py-4">Factura</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {invoices.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center">No hay facturas registradas.</td></tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-800/20 transition group">
                      <td className="px-6 py-4 font-mono text-gray-300">#{inv.invoice_number}</td>
                      <td className="px-6 py-4">SHP-{inv.shipment_id}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inv.type === 'AR' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">${inv.total_amount ? Number(inv.total_amount).toFixed(2) : '0.00'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                          inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-300'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

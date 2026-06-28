"use client";

import React, { useState, useEffect } from 'react';
import { customsService } from '../../services/customsService';
import { ShieldCheck, Plus, Search, CheckCircle } from 'lucide-react';

export default function CustomsPage() {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [hsCodes, setHsCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [declData, hsData] = await Promise.all([
        customsService.getDeclarations(),
        customsService.getHsCodes()
      ]);
      setDeclarations(declData);
      setHsCodes(hsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      'Pending': 'Submitted',
      'Submitted': 'UnderReview',
      'UnderReview': 'Cleared'
    };
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    try {
      await customsService.updateDeclarationStatus(id, nextStatus, nextStatus === 'Cleared' ? new Date().toISOString() : undefined);
      fetchData(); // refresh
    } catch (e) {
      console.error('Update failed', e);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            Aduanas & Compliance
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Gestión de declaraciones aduaneras y catálogo HS Codes.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
          <Plus className="w-4 h-4" />
          Nueva Declaración
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Declarations Table */}
        <div className="lg:col-span-2 bg-[#111114] border border-gray-800 rounded-xl overflow-hidden h-fit">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Declaraciones Activas</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-[#16161A] text-xs uppercase font-medium text-gray-500">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Broker</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {declarations.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center">No hay declaraciones registradas.</td></tr>
                ) : (
                  declarations.map(dec => (
                    <tr key={dec.id} className="hover:bg-gray-800/20 transition group">
                      <td className="px-6 py-4 font-mono text-gray-300">#{dec.id}</td>
                      <td className="px-6 py-4">SHP-{dec.shipment_id}</td>
                      <td className="px-6 py-4">{dec.broker_name || '-'}</td>
                      <td className="px-6 py-4">{dec.items?.length || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                          dec.status === 'Cleared' ? 'bg-emerald-500/20 text-emerald-400' : 
                          dec.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {dec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {dec.status !== 'Cleared' && dec.status !== 'Rejected' && (
                          <button 
                            onClick={() => handleUpdateStatus(dec.id, dec.status)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Avanzar estado"
                          >
                            <CheckCircle className="w-4 h-4 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* HS Codes Catalog */}
        <div className="bg-[#111114] border border-gray-800 rounded-xl overflow-hidden h-fit flex flex-col max-h-[600px]">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white mb-4">Catálogo HS Codes</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar código o descripción..." 
                className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Cargando...</div>
            ) : hsCodes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Catálogo vacío.</div>
            ) : (
              <div className="space-y-1">
                {hsCodes.map(code => (
                  <div key={code.id} className="p-3 hover:bg-gray-800/30 rounded-lg transition border border-transparent hover:border-gray-700/50">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-sm text-blue-400">{code.code}</span>
                      <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">Duty: {code.duty_rate}%</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{code.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-800 bg-[#16161A]">
            <button className="w-full bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium py-2 rounded-lg transition">
              + Añadir Código HS
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

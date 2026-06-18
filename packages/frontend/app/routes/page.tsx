"use client";

import React, { useState } from "react";
import { Map, Plus, Search, Edit, Trash, ArrowRight } from "lucide-react";
import { Route } from "@/types/scm";

// Mock data
const MOCK_ROUTES: Route[] = [
  {
    id: '1',
    originCode: 'ESBCN',
    destinationCode: 'USLAX',
    interimNodes: ['DEHAM', 'SGSIN'],
    mode: 'FCL_40',
    estimatedTransitTimeDays: 35
  },
  {
    id: '2',
    originCode: 'ESVLC',
    destinationCode: 'CNSHA',
    interimNodes: ['AEJEA'],
    mode: 'FCL_20',
    estimatedTransitTimeDays: 28
  }
];

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>(MOCK_ROUTES);
  const [search, setSearch] = useState('');

  const filtered = routes.filter(r => 
    r.originCode.toLowerCase().includes(search.toLowerCase()) || 
    r.destinationCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-gray-200">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Map className="w-6 h-6 mr-3 text-blue-400" />
          Gestión de Rutas
        </h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Nueva Ruta
        </button>
      </div>

      <div className="bg-[#16161A] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex items-center bg-[#111114]">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input 
            type="text" 
            placeholder="Buscar por código de puerto..." 
            className="bg-transparent text-sm w-full outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-[#111114] text-gray-400">
            <tr>
              <th className="px-6 py-4">Ruta</th>
              <th className="px-6 py-4">Nodos Intermedios</th>
              <th className="px-6 py-4">Modo</th>
              <th className="px-6 py-4">Transit Time</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(route => (
              <tr key={route.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                <td className="px-6 py-4 font-mono text-white flex items-center">
                  {route.originCode} <ArrowRight className="w-4 h-4 mx-2 text-gray-500" /> {route.destinationCode}
                </td>
                <td className="px-6 py-4 text-xs font-mono text-gray-400">
                  {route.interimNodes.join(' → ') || '-'}
                </td>
                <td className="px-6 py-4 text-xs text-gray-300">
                  <span className="bg-gray-800 px-2 py-1 rounded">{route.mode}</span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">{route.estimatedTransitTimeDays} días</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-500 hover:text-white mr-3"><Edit className="w-4 h-4" /></button>
                  <button className="text-gray-500 hover:text-red-400"><Trash className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

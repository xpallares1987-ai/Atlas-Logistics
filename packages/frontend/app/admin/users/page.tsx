"use client";

import React, { useState } from "react";
import { User, Plus, Search, Shield, Trash, Edit2 } from "lucide-react";
import { User as UserInterface } from "@/types/scm";

// Mock data
const MOCK_USERS: UserInterface[] = [
  { id: '1', name: 'Admin Principal', email: 'admin@scm.internal', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-01' },
  { id: '2', name: 'Operador Logístico', email: 'op@scm.internal', role: 'OPERATOR', status: 'ACTIVE', createdAt: '2026-02-15' },
  { id: '3', name: 'Comercial Ventas', email: 'sales@scm.internal', role: 'SALES', status: 'ACTIVE', createdAt: '2026-03-10' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserInterface[]>(MOCK_USERS);
  const [search, setSearch] = useState('');

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-gray-200">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Shield className="w-6 h-6 mr-3 text-emerald-400" />
          Gestión de Usuarios y Roles
        </h1>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-[#16161A] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex items-center bg-[#111114]">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            className="bg-transparent text-sm w-full outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-[#111114] text-gray-400">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                <td className="px-6 py-4">
                  <div className="font-bold text-white">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 font-mono text-xs">{user.role}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-500 hover:text-white mr-3"><Edit2 className="w-4 h-4" /></button>
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

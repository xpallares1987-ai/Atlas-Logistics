"use client";

import React, { useState } from "react";
import { User, Plus, Search, Mail, Phone, MapPin, Edit, Trash } from "lucide-react";
import { Customer } from "@/types/scm";

// Mock data
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    name: 'Barcelona Logistics S.A.',
    taxId: 'B-12345678',
    contactPerson: 'Maria Garcia',
    email: 'maria@bcnlog.es',
    phone: '+34 931 234 567',
    address: { street: 'Passeig de la Zona Franca, 10', city: 'Barcelona', state: 'BCN', country: 'Spain', zipCode: '08004' },
    status: 'ACTIVE'
  },
  {
    id: '2',
    name: 'Valencia Import-Export S.L.',
    taxId: 'B-87654321',
    contactPerson: 'Juan Sanchez',
    email: 'juan@valimp.es',
    phone: '+34 963 876 543',
    address: { street: 'Av. Puerto, 50', city: 'Valencia', state: 'VLC', country: 'Spain', zipCode: '46024' },
    status: 'ACTIVE'
  }
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-gray-200">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <User className="w-6 h-6 mr-3 text-blue-400" />
          Gestión de Clientes
        </h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
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
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Dirección</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(customer => (
              <tr key={customer.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                <td className="px-6 py-4 font-medium text-white">{customer.name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-xs text-gray-400 mb-1"><Mail className="w-3 h-3 mr-1" />{customer.email}</div>
                  <div className="flex items-center text-xs text-gray-400"><Phone className="w-3 h-3 mr-1" />{customer.phone}</div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">
                  <div className="flex items-start"><MapPin className="w-3 h-3 mr-1 mt-0.5" />{customer.address.street}, {customer.address.city}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${customer.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {customer.status}
                  </span>
                </td>
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

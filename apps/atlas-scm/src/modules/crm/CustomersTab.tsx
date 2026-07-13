import React, { useState } from "react";
import { useListCustomers } from "@/dataconnect-generated/react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Search, Plus, Building, Mail, Phone, MoreVertical } from "lucide-react";

export function CustomersTab() {
  const { tenantId } = useAuth();
  const { data, loading, error } = useListCustomers({ tenantId: tenantId || "atlas-default-tenant" });
  
  if (loading) return <div className="text-gray-500">Cargando clientes...</div>;
  if (error) return <div className="text-red-500">Error al cargar clientes</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empresa, contacto o ciudad..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-96 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Añadir Cliente
        </button>
      </div>

      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Empresa</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contacto</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ubicación</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Crédito</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.companies.map((customer) => (
              <tr key={customer.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Building className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-gray-500 text-xs">Clasificación: {customer.rating ? `${customer.rating}/5` : 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <div className="text-gray-900">{customer.contactPerson || "Sin contacto"}</div>
                  <div className="text-gray-500 text-xs flex items-center mt-1">
                    <Mail className="h-3 w-3 mr-1" /> {customer.email || "-"}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {customer.city || "Ciudad Desconocida"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <div className="font-medium">{customer.creditLimit ? `$${customer.creditLimit.toLocaleString()}` : "Sin Crédito"}</div>
                  <div className="text-xs">{customer.paymentTerms || "PREPAID"}</div>
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <button className="text-indigo-600 hover:text-indigo-900">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
            {data?.companies.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No hay clientes registrados. Prueba a añadir el primero.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

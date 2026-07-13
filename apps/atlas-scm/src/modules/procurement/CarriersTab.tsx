import React from "react";
import { useListCarriers } from "@/dataconnect-generated/react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Search, Plus, Ship, MapPin } from "lucide-react";

export function CarriersTab() {
  const { tenantId } = useAuth();
  const { data, loading, error } = useListCarriers({ tenantId: tenantId || "atlas-default-tenant" });
  
  if (loading) return <div className="text-gray-500">Cargando Navieras...</div>;
  if (error) return <div className="text-red-500">Error al cargar datos</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Buscar Naviera por nombre o SCAC..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-96 focus:ring-emerald-500 focus:border-emerald-500" />
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center">
          <Plus className="h-4 w-4 mr-2" /> Añadir Naviera
        </button>
      </div>

      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Naviera</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">SCAC Code</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contacto</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ubicación principal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.companies.map((carrier) => (
              <tr key={carrier.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Ship className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">{carrier.name}</div>
                      <div className="text-gray-500 text-xs">Rating: {carrier.rating || 'N/A'}/5</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                  {carrier.scacCode || "---"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <div className="text-gray-900">{carrier.contactPerson || "Sin contacto"}</div>
                  <div className="text-gray-500 text-xs">{carrier.email || "-"}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-gray-400" /> {carrier.city || "Sede Desconocida"}
                </td>
              </tr>
            ))}
            {data?.companies.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">No hay Navieras registradas en este Tenant.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

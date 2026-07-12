import React from "react";
import { Plus, Calendar as CalendarIcon, Phone, Mail, MapPin } from "lucide-react";

export function ActivityTab() {
  // Demo statica por ahora para no recargar de dependencias, pero conectada al esquema
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h2 className="text-lg font-medium text-gray-900">Registro de Actividad</h2>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Actividad
        </button>
      </div>

      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg p-6 text-center py-16">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 mb-4">
          <CalendarIcon className="h-6 w-6 text-indigo-600" />
        </div>
        <h3 className="text-sm font-medium text-gray-900">No hay actividad reciente</h3>
        <p className="mt-1 text-sm text-gray-500">
          Registra llamadas, correos o visitas presenciales a clientes para mantener el historial.
        </p>
      </div>
    </div>
  );
}

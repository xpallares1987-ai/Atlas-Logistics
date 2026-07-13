import React, { useState } from "react";
import { useListSchedules, useCreateSchedule } from "@/dataconnect-generated/react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Plus, Search, MapPin, Calendar, Anchor } from "lucide-react";

export function SchedulesTab() {
  const { tenantId } = useAuth();
  // El tenantId nunca debería ser null en esta ruta, pero tipamos de forma segura
  const { data, loading, error } = useListSchedules({ tenantId: tenantId || "atlas-default-tenant" });
  
  const [createSchedule] = useCreateSchedule();
  const [isAdding, setIsAdding] = useState(false);

  // Formulario mock para demo rápida
  const [form, setForm] = useState({
    vesselImoNumber: "",
    voyageNumber: "",
    polLocode: "",
    podLocode: "",
    etd: "",
    eta: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSchedule({
        ...form,
      });
      setIsAdding(false);
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Error al guardar Itinerario");
    }
  };

  if (loading) return <div className="text-gray-500">Cargando itinerarios...</div>;
  if (error) return <div className="text-red-500">Error al cargar datos</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por buque, viaje, origen o destino..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-96"
          />
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Añadir Itinerario</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-4 gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Vessel IMO</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm uppercase" value={form.vesselImoNumber} onChange={e => setForm({...form, vesselImoNumber: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Número de Viaje</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm uppercase" value={form.voyageNumber} onChange={e => setForm({...form, voyageNumber: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Puerto Origen (LOCODE)</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm uppercase" value={form.polLocode} onChange={e => setForm({...form, polLocode: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Puerto Destino (LOCODE)</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm uppercase" value={form.podLocode} onChange={e => setForm({...form, podLocode: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">ETD (Salida Estimada)</label>
            <input required type="date" className="w-full border-gray-300 rounded-md text-sm" value={form.etd} onChange={e => setForm({...form, etd: e.target.value})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">ETA (Llegada Estimada)</label>
            <input required type="date" className="w-full border-gray-300 rounded-md text-sm" value={form.eta} onChange={e => setForm({...form, eta: e.target.value})} />
          </div>
          
          <div className="col-span-2 flex justify-end space-x-2 mt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Guardar Itinerario</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.schedules.map((schedule) => (
          <div key={schedule.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <Anchor className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{schedule.vessel.name}</h3>
                  <p className="text-xs text-gray-500">Viaje: {schedule.voyageNumber}</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {schedule.status}
              </span>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center space-x-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-gray-500 text-xs uppercase">Pol</p>
                  <p className="font-medium text-gray-900">{schedule.pol.name} ({schedule.pol.locode})</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs uppercase">ETD</p>
                  <p className="font-medium text-gray-900">{schedule.etd.toString()}</p>
                </div>
              </div>

              <div className="relative pl-2 py-1">
                <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
              </div>

              <div className="flex items-center space-x-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-gray-500 text-xs uppercase">Pod</p>
                  <p className="font-medium text-gray-900">{schedule.pod.name} ({schedule.pod.locode})</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs uppercase">ETA</p>
                  <p className="font-medium text-gray-900">{schedule.eta.toString()}</p>
                </div>
              </div>
            </div>

          </div>
        ))}
        {data?.schedules.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500">No hay itinerarios programados para este Tenant.</p>
          </div>
        )}
      </div>
    </div>
  );
}

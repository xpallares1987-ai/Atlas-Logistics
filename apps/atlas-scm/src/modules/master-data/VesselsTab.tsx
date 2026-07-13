import React, { useState } from "react";
import { useListVessels, useCreateVessel } from "@/dataconnect-generated/react";
import { Plus, Search, Anchor } from "lucide-react";

export function VesselsTab() {
  const { data, loading, error } = useListVessels();
  // TODO: Obtener lista de carriers para el select
  const [createVessel] = useCreateVessel();
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState({
    imoNumber: "",
    name: "",
    flag: "",
    capacityTeu: 0,
    carrierId: "00000000-0000-0000-0000-000000000000", // Falso default para UI test
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVessel(form);
      setIsAdding(false);
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Error al guardar Buque");
    }
  };

  if (loading) return <div className="text-gray-500">Cargando buques...</div>;
  if (error) return <div className="text-red-500">Error al cargar datos</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o IMO..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
          />
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Buque</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-5 gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">IMO Number</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm" value={form.imoNumber} onChange={e => setForm({...form, imoNumber: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Buque</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm uppercase" value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Bandera</label>
            <input type="text" maxLength={2} className="w-full border-gray-300 rounded-md text-sm uppercase" value={form.flag} onChange={e => setForm({...form, flag: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Capacidad (TEUs)</label>
            <input type="number" className="w-full border-gray-300 rounded-md text-sm" value={form.capacityTeu} onChange={e => setForm({...form, capacityTeu: parseInt(e.target.value)})} />
          </div>
          <div className="col-span-5 flex justify-end space-x-2 mt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Guardar</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IMO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Buque</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naviera</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bandera</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacidad</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.vessels.map((item) => (
              <tr key={item.imoNumber} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                  <Anchor className="h-4 w-4 text-gray-400 mr-2" />
                  {item.imoNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.carrier?.name || 'Desconocido'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.flag || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.capacityTeu ? `${item.capacityTeu} TEUs` : '-'}</td>
              </tr>
            ))}
            {data?.vessels.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay buques registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

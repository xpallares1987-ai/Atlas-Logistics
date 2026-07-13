import React, { useState } from "react";
import { useListHsCodes, useCreateHsCode } from "@/dataconnect-generated/react";
import { Plus, Search, Tag, AlertTriangle } from "lucide-react";

export function HsCodesTab() {
  const { data, loading, error } = useListHsCodes();
  const [createHsCode] = useCreateHsCode();
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState({
    code: "",
    description: "",
    dutyRate: 0,
    isHazardous: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHsCode(form);
      setIsAdding(false);
      // Idealmente, se debe forzar recarga (mutate/refetch)
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Error al guardar HS Code");
    }
  };

  if (loading) return <div className="text-gray-500">Cargando códigos arancelarios...</div>;
  if (error) return <div className="text-red-500">Error al cargar datos</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código o descripción..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
          />
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Añadir HS Code</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-5 gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Código (Ej: 0901.11)</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Arancel Base (%)</label>
            <input type="number" step="0.01" className="w-full border-gray-300 rounded-md text-sm" value={form.dutyRate} onChange={e => setForm({...form, dutyRate: parseFloat(e.target.value)})} />
          </div>
          <div className="col-span-1 flex items-center space-x-2 pb-2">
            <input type="checkbox" id="hazard" checked={form.isHazardous} onChange={e => setForm({...form, isHazardous: e.target.checked})} className="rounded text-red-500" />
            <label htmlFor="hazard" className="text-xs font-medium text-red-600 flex items-center"><AlertTriangle className="h-3 w-3 mr-1" /> Peligroso (IMO)</label>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HS Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arancel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restricciones</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.hsCodes.map((item) => (
              <tr key={item.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                  <Tag className="h-4 w-4 text-gray-400 mr-2" />
                  {item.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.dutyRate}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.isHazardous && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" /> IMO / HAZMAT</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {data?.hsCodes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay códigos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

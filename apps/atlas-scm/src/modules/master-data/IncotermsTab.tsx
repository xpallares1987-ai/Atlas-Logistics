import React, { useState } from "react";
import { useListIncoterms, useCreateIncoterm } from "../../dataconnect-generated";
import { Plus, Search, Globe } from "lucide-react";

export function IncotermsTab() {
  const { data, loading, error } = useListIncoterms();
  const [createIncoterm] = useCreateIncoterm();
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState({
    code: "",
    description: "",
    freightPayer: "BUYER",
    originCustomsPayer: "SELLER",
    destCustomsPayer: "BUYER",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createIncoterm(form);
      setIsAdding(false);
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Error al guardar Incoterm");
    }
  };

  if (loading) return <div className="text-gray-500">Cargando Incoterms...</div>;
  if (error) return <div className="text-red-500">Error al cargar datos</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar Incoterm..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
          />
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Añadir Incoterm</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-4 gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Código (Ej: EXW, FOB)</label>
            <input required type="text" maxLength={3} className="w-full border-gray-300 rounded-md text-sm uppercase" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <input required type="text" className="w-full border-gray-300 rounded-md text-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Paga Flete Principal</label>
            <select className="w-full border-gray-300 rounded-md text-sm" value={form.freightPayer} onChange={e => setForm({...form, freightPayer: e.target.value})}>
              <option value="BUYER">Comprador (BUYER)</option>
              <option value="SELLER">Vendedor (SELLER)</option>
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Despacho Origen</label>
            <select className="w-full border-gray-300 rounded-md text-sm" value={form.originCustomsPayer} onChange={e => setForm({...form, originCustomsPayer: e.target.value})}>
              <option value="BUYER">Comprador (BUYER)</option>
              <option value="SELLER">Vendedor (SELLER)</option>
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Despacho Destino</label>
            <select className="w-full border-gray-300 rounded-md text-sm" value={form.destCustomsPayer} onChange={e => setForm({...form, destCustomsPayer: e.target.value})}>
              <option value="BUYER">Comprador (BUYER)</option>
              <option value="SELLER">Vendedor (SELLER)</option>
            </select>
          </div>
          <div className="col-span-1 flex justify-end space-x-2 mt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Guardar</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incoterm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flete</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aduana Origen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aduana Destino</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.incoterms.map((item) => (
              <tr key={item.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 flex items-center">
                  <Globe className="h-4 w-4 text-gray-400 mr-2" />
                  {item.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${item.freightPayer === 'BUYER' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{item.freightPayer}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${item.originCustomsPayer === 'BUYER' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{item.originCustomsPayer}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${item.destCustomsPayer === 'BUYER' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{item.destCustomsPayer}</span>
                </td>
              </tr>
            ))}
            {data?.incoterms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay Incoterms registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

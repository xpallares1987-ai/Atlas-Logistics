import React, { useState } from 'react';
import { useListDictionaryTerms, useUpsertDictionaryTerm } from '@/dataconnect-generated/react';
import { Search, Plus, Save, Edit2, X, AlertCircle, BookOpen } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export function DictionaryTab() {
  const { user } = useAuth();
  const isAdminOrIct = user?.role === 'EXECUTIVE' || user?.role === 'ICT' || user?.role === 'SUPERADMIN';

  const { data, refetch } = useListDictionaryTerms();
  const [upsertTerm] = useUpsertDictionaryTerm();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    acronym: '',
    meaning: '',
    description: '',
    category: 'GENERAL',
    subCategory: '',
    region: '',
    moduleScope: [] as string[],
    isActive: true
  });

  const terms = data?.dictionaryTerms || [];
  
  const filteredTerms = terms.filter(t => 
    t.acronym.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.meaning.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertTerm({
        acronym: formData.acronym.toUpperCase(),
        meaning: formData.meaning,
        description: formData.description || null,
        category: formData.category,
        subCategory: formData.subCategory || null,
        region: formData.region || null,
        moduleScope: formData.moduleScope.length > 0 ? formData.moduleScope : null,
        isActive: formData.isActive
      });
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error("Error saving term", error);
      alert("Error al guardar el término. Asegúrate de que no haya duplicados de acrónimo+categoría.");
    }
  };

  const handleEdit = (term: any) => {
    setFormData({
      acronym: term.acronym,
      meaning: term.meaning,
      description: term.description || '',
      category: term.category || 'GENERAL',
      subCategory: term.subCategory || '',
      region: term.region || '',
      moduleScope: term.moduleScope || [],
      isActive: term.isActive
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    setFormData({ 
      acronym: '', meaning: '', description: '', 
      category: 'GENERAL', subCategory: '', region: '', moduleScope: [], isActive: true 
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar acrónimo o significado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {isAdminOrIct ? (
          <button
            onClick={handleNew}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Acrónimo
          </button>
        ) : (
          <div className="text-sm text-gray-500 flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <AlertCircle className="h-4 w-4 mr-2 text-gray-400" />
            Solo lectura
          </div>
        )}
      </div>

      {isEditing && isAdminOrIct && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 ring-1 ring-black/5">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {formData.acronym ? 'Editar Acrónimo' : 'Nuevo Acrónimo'}
            </h3>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acrónimo *</label>
              <input
                required
                type="text"
                value={formData.acronym}
                onChange={e => setFormData({...formData, acronym: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                placeholder="Ej. CA"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Significado *</label>
              <input
                required
                type="text"
                value={formData.meaning}
                onChange={e => setFormData({...formData, meaning: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Customs Agent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría Principal *</label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="GENERAL">General</option>
                <option value="SHIPPING">Shipping (Marítimo)</option>
                <option value="AIR">Air (Aéreo)</option>
                <option value="CUSTOMS">Customs (Aduanas)</option>
                <option value="FINANCE">Finance (Finanzas)</option>
                <option value="WAREHOUSE">Warehouse (Almacén)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
              <input
                type="text"
                value={formData.subCategory}
                onChange={e => setFormData({...formData, subCategory: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej. Surcharges"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Región / País (Opcional)</label>
              <input
                type="text"
                value={formData.region}
                onChange={e => setFormData({...formData, region: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej. EU, USA, ES"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Notas Adicionales</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>

            <div className="flex items-end justify-end mt-4 md:col-span-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Término
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista de Tarjetas (Kardex) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTerms.map((term) => (
          <div 
            key={`${term.acronym}-${term.category}`} 
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative group"
          >
            {isAdminOrIct && (
              <button 
                onClick={() => handleEdit(term)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Editar acrónimo"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-xl font-bold text-gray-900 tracking-tight font-mono">
                  {term.acronym}
                </h4>
                {term.region && (
                  <span className="inline-block px-2 py-0.5 mt-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    🌍 {term.region}
                  </span>
                )}
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {term.category}
              </span>
            </div>
            
            <p className="text-sm font-semibold text-gray-800 mb-2 leading-tight">
              {term.meaning}
            </p>
            
            <p className="text-xs text-gray-500 line-clamp-3">
              {term.description || 'Sin descripción'}
            </p>
            
            {term.subCategory && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                  Sub-Categoría
                </span>
                <p className="text-xs text-gray-600 font-medium">
                  {term.subCategory}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No se encontraron acrónimos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta buscar con otros términos o añade uno nuevo.
          </p>
        </div>
      )}
    </div>
  );
}

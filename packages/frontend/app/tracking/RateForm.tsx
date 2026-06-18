'use client';

import React, { useState } from 'react';
import { createRate } from '@/app/actions/actions';
import { Rate, Surcharge, TransportMode, ChargeType } from '@/types/scm';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function RateForm({ onSaved }: { onSaved: (r: Rate) => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Rate>>({
    carrier: '', origin: '', destination: '', mode: 'FCL_40', basePrice: 0, currency: 'USD', transitTimeDays: 0, validity: '', surcharges: []
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addSurcharge = () => {
    setFormData({
      ...formData,
      surcharges: [
        ...(formData.surcharges || []),
        { id: generateId(), code: '', name: '', amount: 0, chargeType: 'PER_UNIT', currency: 'USD' }
      ]
    });
  };

  const removeSurcharge = (id: string) => {
    setFormData({
      ...formData,
      surcharges: (formData.surcharges || []).filter(s => s.id !== id)
    });
  };

  const updateSurcharge = (id: string, field: keyof Surcharge, value: string | number) => {
    setFormData({
      ...formData,
      surcharges: (formData.surcharges || []).map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Basic validation...
    if (!formData.carrier || !formData.origin || !formData.destination) {
      alert("Por favor rellena Carrier, Origen y Destino.");
      setLoading(false);
      return;
    }

    try {
      // Create server side logic mock
      const res = await createRate(formData as Rate);
      if (res.success) {
         onSaved({ ...formData, id: res.rateId } as Rate);
      }
    } catch (e) {
      console.error(e);
      alert("Error guardando.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-[#16161A] border text-sm border-gray-800/40 rounded-xl p-6 shadow-2xl space-y-6">
      
      {/* Route & Core Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Transportista (Carrier)</label>
           <input required type="text" className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 focus:border-blue-600 focus:outline-none text-white" value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value})} placeholder="Ej. Maersk" />
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Modo / Equipo</label>
           <select required className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 focus:border-blue-600 focus:outline-none text-white" value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value as TransportMode})}>
             <option value="FCL_20">FCL 20&apos;</option>
             <option value="FCL_40">FCL 40&apos; / HC</option>
             <option value="LCL">LCL</option>
             <option value="AIR">Aéreo</option>
           </select>
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Puerto Origen (UNLOCODE)</label>
           <input required type="text" className="w-full bg-[#0A0A0B] border border-gray-800 uppercase rounded p-2 focus:border-blue-600 focus:outline-none text-white" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} placeholder="CNSHA" />
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Puerto Destino (UNLOCODE)</label>
           <input required type="text" className="w-full bg-[#0A0A0B] border border-gray-800 uppercase rounded p-2 focus:border-blue-600 focus:outline-none text-white" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} placeholder="ESBCN" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Flete Base (Rate)</label>
           <input required type="number" step="0.01" className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 focus:border-blue-600 focus:outline-none text-white" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: Number(e.target.value)})} />
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Moneda Flete Base</label>
           <select required className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 focus:border-blue-600 focus:outline-none text-white" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
             <option value="USD">USD</option>
             <option value="EUR">EUR</option>
           </select>
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Tiempo Tránsito (Días)</label>
           <input required type="number" min="0" className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 focus:border-blue-600 focus:outline-none text-white" value={formData.transitTimeDays} onChange={e => setFormData({...formData, transitTimeDays: Number(e.target.value)})} />
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Válido Hasta</label>
           <input required type="date" className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 focus:border-blue-600 focus:outline-none text-white" value={formData.validity} onChange={e => setFormData({...formData, validity: e.target.value})} />
        </div>
      </div>

      <hr className="border-gray-800/50" />

      {/* Surcharges Section */}
      <div>
        <div className="flex items-center justify-between text-white font-medium mb-4">
           <h4>Estructura de Recargos</h4>
           <button type="button" onClick={addSurcharge} className="text-[10px] uppercase font-bold tracking-widest text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded inline-flex items-center">
             <Plus className="w-3 h-3 mr-1" /> Nuevo Recargo
           </button>
        </div>
        
        <div className="space-y-3">
          {(formData.surcharges || []).length === 0 ? (
            <div className="text-gray-500 text-sm italic text-center py-4 bg-[#0A0A0B] border border-gray-800 border-dashed rounded">
              Sin recargos adicionales registrados para esta tarifa.
            </div>
          ) : (
            (formData.surcharges || []).map(sc => (
              <div key={sc.id} className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-[#0A0A0B] p-3 rounded-lg border border-gray-800">
                <div className="w-full md:w-24">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Código</label>
                  <input placeholder="BAF" className="w-full bg-[#111114] border border-gray-800 uppercase rounded p-2 text-xs focus:border-blue-600 focus:outline-none text-white" value={sc.code} onChange={e => updateSurcharge(sc.id, 'code', e.target.value)} />
                </div>
                <div className="w-full md:w-48">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Descripción</label>
                  <input placeholder="Bunker Adj..." className="w-full bg-[#111114] border border-gray-800 rounded p-2 text-xs focus:border-blue-600 focus:outline-none text-white" value={sc.name} onChange={e => updateSurcharge(sc.id, 'name', e.target.value)} />
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Cuantía</label>
                  <input type="number" step="0.01" className="w-full bg-[#111114] border border-gray-800 rounded p-2 text-xs font-mono focus:border-blue-600 focus:outline-none text-white" value={sc.amount} onChange={e => updateSurcharge(sc.id, 'amount', Number(e.target.value))} />
                </div>
                <div className="w-full md:w-20">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Divisa</label>
                  <select className="w-full bg-[#111114] border border-gray-800 rounded p-2 text-xs focus:border-blue-600 focus:outline-none text-gray-300" value={sc.currency} onChange={e => updateSurcharge(sc.id, 'currency', e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="w-full md:flex-1">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Aplicación</label>
                  <select className="w-full bg-[#111114] border border-gray-800 rounded p-2 text-xs focus:border-blue-600 focus:outline-none text-gray-300" value={sc.chargeType} onChange={e => updateSurcharge(sc.id, 'chargeType', e.target.value as ChargeType)}>
                    <option value="PER_UNIT">Por Unidad/Contenedor</option>
                    <option value="PER_BL">Por B/L o Expediente</option>
                    <option value="PER_CBM">Por CBM/Ton</option>
                    <option value="PER_KG">Por KG (Aéreo)</option>
                    <option value="FIXED">Fijo</option>
                  </select>
                </div>
                <div>
                  <button type="button" onClick={() => removeSurcharge(sc.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-800/50">
        <button type="submit" disabled={loading} className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Condiciones'}
        </button>
      </div>

    </form>
  );
}

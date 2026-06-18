'use client';

import React, { useEffect, useState } from 'react';
import { fetchMilestones, createMilestone } from '@/app/actions/trackingActions';
import { TrackingMilestone, MilestoneType } from '@/types/schema';
import { Route, MapPin, Calendar, Plus } from 'lucide-react';

export function MilestonesView({ shipmentId }: { shipmentId: string }) {
  const [milestones, setMilestones] = useState<TrackingMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<MilestoneType>('GATE_IN');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const data = await fetchMilestones(shipmentId);
    setMilestones(data);
    setLoading(false);
  }, [shipmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if(!newLocation || !newDate) return;
    await createMilestone(shipmentId, newType, newLocation, new Date(newDate).toISOString(), newDesc);
    
    // Trigger SCM Notification dynamically
    try {
      const { triggerScmNotification } = require('@/lib/notifications');
      let notifType: 'ETD' | 'ETA' | 'CUSTOMS' | 'BOOKING' | 'GENERAL' = 'GENERAL';
      if (newType === 'ETD') notifType = 'ETD';
      else if (newType === 'ETA') notifType = 'ETA';
      else if (newType === 'BOOKING_CONFIRMED') notifType = 'BOOKING';
      else if (newType === 'DISCHARGED') notifType = 'ETA';
      
      triggerScmNotification(
        notifType,
        `Nuevo Hito Registrado: ${newType}`,
        `Se ha asentado el hito ${newType} en la terminal de ${newLocation.toUpperCase()}. Detalle: ${newDesc || 'Confirmado por operador en sistema.'}`,
        shipmentId
      );
    } catch (err) {
      console.error("Notification trigger bypass in server scenario:", err);
    }

    setShowAdd(false);
    setNewLocation('');
    setNewDesc('');
    await loadData();
  };

  return (
    <div className="bg-[#16161A] border border-gray-800 rounded-lg p-5 w-full h-full">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-gray-300 flex items-center">
          <Route className="w-4 h-4 mr-2" />
          Hitos de Seguimiento (Tracking Milestones)
        </h4>
        <button 
          onClick={() => setShowAdd(!showAdd)} 
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded flex items-center transition"
        >
          <Plus className="w-3 h-3 mr-1" />
          Registrar Hito
        </button>
      </div>

      {showAdd && (
        <div className="bg-[#1a1a24] p-4 rounded-lg border border-blue-500/30 mb-6 flex flex-col gap-3">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             <div>
               <label className="block text-[10px] text-gray-400 mb-1">Tipo de Hito</label>
               <select value={newType} onChange={e => setNewType(e.target.value as MilestoneType)} className="w-full bg-[#0A0A0B] border border-gray-700 rounded p-2 text-xs text-white">
                 <option value="BOOKING_CONFIRMED">BOOKING_CONFIRMED</option>
                 <option value="EMPTY_PICKUP">EMPTY_PICKUP</option>
                 <option value="GATE_IN">GATE_IN</option>
                 <option value="LOADED_ON_VESSEL">LOADED_ON_VESSEL</option>
                 <option value="ETD">ETD</option>
                 <option value="TRANSSHIPMENT">TRANSSHIPMENT</option>
                 <option value="ETA">ETA</option>
                 <option value="DISCHARGED">DISCHARGED</option>
                 <option value="GATE_OUT">GATE_OUT</option>
                 <option value="DELIVERED">DELIVERED</option>
               </select>
             </div>
             <div>
               <label className="block text-[10px] text-gray-400 mb-1">Ubicación</label>
               <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Ej. ESBCN" className="w-full bg-[#0A0A0B] border border-gray-700 rounded p-2 text-xs text-white uppercase" />
             </div>
             <div>
               <label className="block text-[10px] text-gray-400 mb-1">Fecha y Hora</label>
               <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-[#0A0A0B] border border-gray-700 rounded p-2 text-xs text-white" />
             </div>
             <div>
               <label className="block text-[10px] text-gray-400 mb-1">Descripción</label>
               <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Opcional" className="w-full bg-[#0A0A0B] border border-gray-700 rounded p-2 text-xs text-white" />
             </div>
           </div>
           <div className="flex justify-end mt-2 gap-2">
              <button onClick={() => setShowAdd(false)} className="text-xs text-gray-400 hover:text-white px-3 py-1">Cancelar</button>
              <button onClick={handleAdd} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded transition">Guardar Hito</button>
           </div>
        </div>
      )}

      {loading ? (
         <div className="text-xs text-gray-500">Cargando hitos...</div>
      ) : milestones.length === 0 ? (
         <div className="text-xs text-gray-500 italic bg-[#16161A] p-4 rounded border border-gray-800 text-center">No hay hitos registrados para este embarque.</div>
      ) : (
         <div className="relative border-l border-gray-700 ml-3 space-y-6">
           {milestones.map((m, idx) => (
             <div key={m.id} className="relative pl-6">
               <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-1.5 top-1 border-2 border-[#111114]"></div>
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                 <span className="text-sm font-bold text-blue-400">{m.type}</span>
                 <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(m.date).toLocaleString()}
                 </div>
               </div>
               <div className="text-xs text-gray-300 flex items-center gap-4">
                 <span className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-gray-500" /> {m.location}</span>
                 {m.description && <span className="text-gray-500">&mdash; {m.description}</span>}
                 <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                   {m.status}
                 </span>
               </div>
             </div>
           ))}
         </div>
      )}
    </div>
  );
}

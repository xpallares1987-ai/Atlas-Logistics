'use client';

import React, { useState } from 'react';
import { Package, Ship, Plane, Truck, Clock, CheckCircle2 } from 'lucide-react';

import { useFirebase } from '@xpallares1987-ai/control-tower-ui';
import { getShipments, updateShipment, Shipment, Stage } from '@/lib/services/forwardingService';

const stages: { key: Stage; label: string; color: string }[] = [
  { key: 'QUOTE', label: 'Cotización', color: 'border-gray-500' },
  { key: 'BOOKING', label: 'Reserva', color: 'border-blue-500' },
  { key: 'AT_ORIGIN', label: 'En Origen', color: 'border-yellow-500' },
  { key: 'IN_TRANSIT', label: 'En Tránsito', color: 'border-purple-500' },
  { key: 'CUSTOMS', label: 'Aduana', color: 'border-orange-500' },
  { key: 'DELIVERED', label: 'Entregado', color: 'border-green-500' },
];

export default function PipelinePage() {
  const { db } = useFirebase();
  const [items, setItems] = React.useState<Shipment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!db) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getShipments(db);
        setItems(data);
      } catch (err) {
        console.error("Failed to load shipments", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db]);

  const moveItem = async (id: string, direction: 'NEXT' | 'PREV') => {
    if (!db) return;
    
    // Optimistic UI update
    let newStage: Stage | null = null;
    let oldStage: Stage | null = null;
    
    setItems(current => current.map(item => {
      if (item.id === id) {
        oldStage = item.stage;
        const currentIndex = stages.findIndex(s => s.key === item.stage);
        if (direction === 'NEXT' && currentIndex < stages.length - 1) {
          newStage = stages[currentIndex + 1].key;
          return { ...item, stage: newStage };
        }
        if (direction === 'PREV' && currentIndex > 0) {
          newStage = stages[currentIndex - 1].key;
          return { ...item, stage: newStage };
        }
      }
      return item;
    }));

    if (newStage) {
      try {
        await updateShipment(db, id, { stage: newStage });
      } catch (err) {
        console.error("Failed to update shipment stage", err);
        // Rollback on failure
        setItems(current => current.map(item => {
          if (item.id === id && oldStage) {
            return { ...item, stage: oldStage };
          }
          return item;
        }));
      }
    }
  };

  const getIcon = (mode: string) => {
    if (mode === 'FCL' || mode === 'LCL') return <Ship className="w-4 h-4 text-blue-400" />;
    if (mode === 'AIR') return <Plane className="w-4 h-4 text-purple-400" />;
    if (mode === 'ROAD') return <Truck className="w-4 h-4 text-yellow-400" />;
    return <Package className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto overflow-x-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Pipeline Operativo</h1>
        <p className="text-gray-400">Panel Kanban interactivo para gestionar el ciclo de vida de los embarques.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex space-x-4 min-w-max pb-4">
        {stages.map((stage) => {
          const columnItems = items.filter(i => i.stage === stage.key);
          
          return (
            <div key={stage.key} className="w-80 flex-shrink-0 flex flex-col bg-[#111114] border border-gray-800 rounded-xl max-h-[75vh]">
              <div className={`p-4 border-t-2 ${stage.color} rounded-t-xl bg-[#16161A] flex justify-between items-center`}>
                <h3 className="font-semibold text-gray-200">{stage.label}</h3>
                <span className="bg-gray-800 text-gray-300 text-xs py-0.5 px-2 rounded-full font-medium">
                  {columnItems.length}
                </span>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {columnItems.map(item => {
                  const now = new Date();
                  const isClosingSoon = item.expectedClose && new Date(item.expectedClose).getTime() - now.getTime() < 3 * 24 * 3600 * 1000;
                  
                  return (
                  <div key={item.id} className="bg-[#1A1A20] border border-gray-700/50 p-4 rounded-lg shadow-sm hover:border-gray-500 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-mono text-blue-400 font-medium">{item.ref}</span>
                       {getIcon(item.mode)}
                    </div>
                    <div className="font-medium text-white text-sm mb-1">{item.client}</div>
                    <div className="text-xs text-gray-500 mb-3 flex items-center">
                       {item.origin} <span className="mx-1">→</span> {item.dest}
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Probabilidad</span>
                        <span className="text-gray-300">{item.probability}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${item.probability}%` }}></div>
                      </div>
                      {item.expectedClose && (
                        <div className={`text-[10px] mt-2 font-medium ${isClosingSoon ? 'text-amber-500 flex items-center' : 'text-gray-500'}`}>
                          {isClosingSoon && <Clock className="w-3 h-3 mr-1" />}
                          Cierre Esperado: {item.expectedClose}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between border-t border-gray-800 pt-3">
                       <button 
                         onClick={() => moveItem(item.id, 'PREV')}
                         disabled={stage.key === stages[0].key}
                         className="text-xs text-gray-500 hover:text-white disabled:opacity-30 flex items-center"
                       >
                         ← Atrás
                       </button>
                       <button 
                         onClick={() => moveItem(item.id, 'NEXT')}
                         disabled={stage.key === stages[stages.length - 1].key}
                         className="text-xs text-blue-500 hover:text-blue-400 disabled:opacity-30 pr-1"
                       >
                         Avanzar →
                       </button>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  );
}

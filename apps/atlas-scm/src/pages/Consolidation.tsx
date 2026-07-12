import React, { useState } from 'react';
import { LclConsolidationEngine, ContainerPlanner, INITIAL_POOL } from '@/components';
import type { LclCargoItem, MasterContainer } from '@/components';
import { Package } from 'lucide-react';

export default function Consolidation() {
  const [cargoPool] = useState<LclCargoItem[]>(INITIAL_POOL);
  const [masterContainers, setMasterContainers] = useState<MasterContainer[]>([
    { id: 'mc-1', specId: '40ft', route: 'Shanghai -> Rotterdam', assignedCargoIds: [] }
  ]);
  const [activeContainerId, setActiveContainerId] = useState('mc-1');
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedPoolIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const assignSelected = () => {
    if (!activeContainerId || selectedPoolIds.size === 0) return;
    setMasterContainers(prev => prev.map(c => {
      if (c.id === activeContainerId) {
        return { ...c, assignedCargoIds: [...c.assignedCargoIds, ...Array.from(selectedPoolIds)] };
      }
      return c;
    }));
    setSelectedPoolIds(new Set());
  };

  const removeAssigned = (cargoId: string) => {
    setMasterContainers(prev => prev.map(c => ({
      ...c,
      assignedCargoIds: c.assignedCargoIds.filter(id => id !== cargoId)
    })));
  };

  const createNewContainer = () => {
    const newId = `mc-${masterContainers.length + 1}`;
    setMasterContainers(prev => [...prev, {
      id: newId, specId: '20ft', route: 'New Route', assignedCargoIds: []
    }]);
    setActiveContainerId(newId);
  };

  const activeContainer = masterContainers.find(c => c.id === activeContainerId);


  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden">
      <div className="p-6 bg-slate-900 border-b border-slate-800 shrink-0">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Package className="text-emerald-400" />
          Advanced NVOCC Consolidation
        </h1>
        <p className="text-slate-400 mt-1">Plan LCL cargo loading and optimize 3D container space.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-emerald-400">Step 1: Cargo Allocation</h2>
            </div>
            <LclConsolidationEngine
              cargoPool={cargoPool}
              masterContainers={masterContainers}
              activeContainerId={activeContainerId}
              selectedPoolIds={selectedPoolIds}
              toggleSelection={toggleSelection}
              assignSelected={assignSelected}
              removeAssigned={removeAssigned}
              createNewContainer={createNewContainer}
              setActiveContainerId={setActiveContainerId}
            />
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-blue-400">Step 2: 3D Container Planning (Active: {activeContainer?.id})</h2>
            </div>
            <div className="h-[600px]">
              <ContainerPlanner />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

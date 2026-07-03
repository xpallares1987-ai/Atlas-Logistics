'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const LclConsolidationEngine = dynamic(
  () => import('@xpallares1987-ai/control-tower-ui').then(mod => mod.LclConsolidationEngine),
  { ssr: false }
);

// We need to import the types statically though, wait, we can't easily dynamically import types in the same way for state initialization.
// But we can import them from the module.
import { INITIAL_POOL, LclCargoItem, MasterContainer } from '@xpallares1987-ai/control-tower-ui';

export default function LclConsolidationClient() {
  const [cargoPool] = useState<LclCargoItem[]>(INITIAL_POOL);
  const [masterContainers, setMasterContainers] = useState<MasterContainer[]>([
    { id: 'mc-1', specId: '20ft', route: 'Shanghai -> Rotterdam', assignedCargoIds: [] }
  ]);
  const [activeContainerId, setActiveContainerId] = useState<string>('mc-1');
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set());

  // Toggle selection in pool
  const handleToggleSelection = (id: string) => {
    const next = new Set(selectedPoolIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPoolIds(next);
  };

  // Assign selected to active container
  const handleAssignSelected = () => {
    if (!activeContainerId || selectedPoolIds.size === 0) return;
    setMasterContainers(prev => prev.map(c => {
      if (c.id === activeContainerId) {
        return { ...c, assignedCargoIds: [...c.assignedCargoIds, ...Array.from(selectedPoolIds)] };
      }
      return c;
    }));
    setSelectedPoolIds(new Set());
  };

  // Remove item from active container
  const handleRemoveAssigned = (cargoId: string) => {
    setMasterContainers(prev => prev.map(c => {
      if (c.id === activeContainerId) {
        return { ...c, assignedCargoIds: c.assignedCargoIds.filter(id => id !== cargoId) };
      }
      return c;
    }));
  };

  const handleCreateNewContainer = () => {
    const id = `mc-${Date.now()}`;
    setMasterContainers(prev => [...prev, { id, specId: '40ft', route: 'New Route', assignedCargoIds: [] }]);
    setActiveContainerId(id);
  };

  return (
    <LclConsolidationEngine 
      cargoPool={cargoPool}
      masterContainers={masterContainers}
      activeContainerId={activeContainerId}
      selectedPoolIds={selectedPoolIds}
      toggleSelection={handleToggleSelection}
      assignSelected={handleAssignSelected}
      removeAssigned={handleRemoveAssigned}
      createNewContainer={handleCreateNewContainer}
      setActiveContainerId={setActiveContainerId}
    />
  );
}

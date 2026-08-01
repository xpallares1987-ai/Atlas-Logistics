import { useState, useEffect } from 'react';
import { LclConsolidationEngine, INITIAL_POOL } from '@atlas/ui/src/components/LclConsolidationEngine';
import { motion } from 'framer-motion';

export default function LclConsolidationModule() {
  const [cargoPool, setCargoPool] = useState(INITIAL_POOL);
  const [masterContainers, _setMasterContainers] = useState([{ id: 'c-1', specId: '40ft', route: 'CNSHA -> ESBCN', assignedCargoIds: [] }]);
  const [activeContainerId, setActiveContainerId] = useState('c-1');
  const [selectedPoolIds, _setSelectedPoolIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Reemplazando Mocks estáticos por datos del backend SQLite real
    fetch('/api/shipments')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          // Adaptamos la data del API al formato que espera el UI
          const adaptedCargo = data.map((s: any) => ({
            id: s.id,
            destination: s.destination,
            volume: 5, // Asumimos volumetría base para demostración
            weight: 2000,
            description: 'General Cargo',
            priority: 'Normal'
          })).slice(0, 10);
          
          if(adaptedCargo.length > 0) {
             setCargoPool(adaptedCargo);
          }
        }
      })
      .catch(console.error);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full h-full bg-slate-950 overflow-y-auto"
    >
      <LclConsolidationEngine 
        cargoPool={cargoPool}
        masterContainers={masterContainers}
        activeContainerId={activeContainerId}
        selectedPoolIds={selectedPoolIds}
        toggleSelection={() => {}}
        assignSelected={() => {}}
        removeAssigned={() => {}}
        createNewContainer={() => {}}
        setActiveContainerId={setActiveContainerId}
      />
    </motion.div>
  );
}

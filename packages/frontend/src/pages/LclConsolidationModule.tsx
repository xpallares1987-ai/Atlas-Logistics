import { useState } from 'react';
import { LclConsolidationEngine, INITIAL_POOL } from '@atlas/ui/src/components/LclConsolidationEngine';
import { motion } from 'framer-motion';

export default function LclConsolidationModule() {
  const [cargoPool, _setCargoPool] = useState(INITIAL_POOL);
  const [masterContainers, _setMasterContainers] = useState([{ id: 'c-1', specId: '40ft', route: 'CNSHA -> ESBCN', assignedCargoIds: [] }]);
  const [activeContainerId, setActiveContainerId] = useState('c-1');
  const [selectedPoolIds, _setSelectedPoolIds] = useState<Set<string>>(new Set());

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

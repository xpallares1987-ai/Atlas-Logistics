import { useState, useEffect } from "react";
import {
  LclConsolidationEngine,
  LclCargoItem,
  MasterContainer,
  INITIAL_POOL,
} from "@atlas/ui/src/components/LclConsolidationEngine";
import { motion } from "framer-motion";

export default function LclConsolidationModule() {
  const [cargoPool, setCargoPool] = useState<LclCargoItem[]>(INITIAL_POOL);
  const [masterContainers, setMasterContainers] = useState<MasterContainer[]>([
    {
      id: "c-1",
      specId: "40ft",
      route: "CNSHA -> ESBCN",
      assignedCargoIds: [],
    },
  ]);
  const [activeContainerId, setActiveContainerId] = useState("c-1");
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    fetch("/api/operations/lcl/cargo")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setCargoPool(data);
        }
      })
      .catch(console.error);
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedPoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const assignSelected = () => {
    if (selectedPoolIds.size === 0) return;

    setMasterContainers((prev) =>
      prev.map((c) => {
        if (c.id === activeContainerId) {
          const newAssigned = new Set([
            ...c.assignedCargoIds,
            ...Array.from(selectedPoolIds),
          ]);
          return { ...c, assignedCargoIds: Array.from(newAssigned) };
        }
        return c;
      }),
    );

    setSelectedPoolIds(new Set());

    // Fire off async save to backend
    fetch("/api/operations/lcl/consolidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        masterContainerId: activeContainerId,
        assignedCargoIds: Array.from(selectedPoolIds),
      }),
    }).catch(console.error);
  };

  const removeAssigned = (cargoId: string) => {
    setMasterContainers((prev) =>
      prev.map((c) => {
        if (c.id === activeContainerId) {
          return {
            ...c,
            assignedCargoIds: c.assignedCargoIds.filter((id) => id !== cargoId),
          };
        }
        return c;
      }),
    );
  };

  const autoOptimize = (cargoIds: string[]) => {
    if (cargoIds.length === 0) return;

    setMasterContainers((prev) =>
      prev.map((c) => {
        if (c.id === activeContainerId) {
          const newAssigned = new Set([...c.assignedCargoIds, ...cargoIds]);
          return { ...c, assignedCargoIds: Array.from(newAssigned) };
        }
        return c;
      }),
    );

    // Fire off async save to backend
    fetch("/api/operations/lcl/consolidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        masterContainerId: activeContainerId,
        assignedCargoIds: cargoIds,
      }),
    }).catch(console.error);
  };

  const createNewContainer = () => {
    const newId = `c-${masterContainers.length + 1}`;
    setMasterContainers((prev) => [
      ...prev,
      { id: newId, specId: "20ft", route: "New Route", assignedCargoIds: [] },
    ]);
    setActiveContainerId(newId);
  };

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
        toggleSelection={toggleSelection}
        assignSelected={assignSelected}
        removeAssigned={removeAssigned}
        createNewContainer={createNewContainer}
        setActiveContainerId={setActiveContainerId}
        autoOptimize={autoOptimize}
      />
    </motion.div>
  );
}

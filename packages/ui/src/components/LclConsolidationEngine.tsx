"use client";

import { useState, useMemo } from "react";
import {
  Box,
  AlertTriangle,
  Truck,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";

export interface PackedItem {
  id: string;
  clientId: string;
  clientName: string;
  color: string;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  isStacked: boolean;
}

interface ContainerSpec {
  id: string;
  name: string;
  length: number; // meters
  width: number;
  height: number;
  maxWeight: number; // tons
  volume: number; // cubic meters
}

export interface CargoType {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  color: string;
}

export interface LclCargoItem {
  id: string;
  clientId: string;
  clientName: string;
  typeId: string;
}

export interface MasterContainer {
  id: string;
  specId: string;
  route: string;
  assignedCargoIds: string[];
}

export const CONTAINER_SPECS: ContainerSpec[] = [
  {
    id: "20ft",
    name: "20ft Dry Van",
    length: 5.9,
    width: 2.35,
    height: 2.39,
    maxWeight: 28.0,
    volume: 33.2,
  },
  {
    id: "40ft",
    name: "40ft Dry Van",
    length: 12.03,
    width: 2.35,
    height: 2.39,
    maxWeight: 26.5,
    volume: 67.7,
  },
];

export const CARGO_TYPES: Record<string, CargoType> = {
  "euro-pallet": {
    id: "euro-pallet",
    name: "Palet Euro",
    length: 1.2,
    width: 0.8,
    height: 1.4,
    weight: 0.8,
    color: "#3b82f6",
  },
  "ind-pallet": {
    id: "ind-pallet",
    name: "Palet Industrial",
    length: 1.2,
    width: 1.0,
    height: 1.4,
    weight: 1.0,
    color: "#f59e0b",
  },
  "paper-roll": {
    id: "paper-roll",
    name: "Bobina Papel",
    length: 1.2,
    width: 1.2,
    height: 1.5,
    weight: 1.6,
    color: "#10b981",
  },
  "heavy-box": {
    id: "heavy-box",
    name: "Caja Pesada",
    length: 1.0,
    width: 1.0,
    height: 1.0,
    weight: 2.0,
    color: "#ec4899",
  },
};

export const INITIAL_POOL: LclCargoItem[] = [
  {
    id: "itm-1",
    clientId: "c1",
    clientName: "TechCorp",
    typeId: "euro-pallet",
  },
  {
    id: "itm-2",
    clientId: "c1",
    clientName: "TechCorp",
    typeId: "euro-pallet",
  },
  {
    id: "itm-3",
    clientId: "c1",
    clientName: "TechCorp",
    typeId: "euro-pallet",
  },
  {
    id: "itm-4",
    clientId: "c2",
    clientName: "GlobalMach",
    typeId: "heavy-box",
  },
  {
    id: "itm-5",
    clientId: "c2",
    clientName: "GlobalMach",
    typeId: "heavy-box",
  },
  {
    id: "itm-6",
    clientId: "c3",
    clientName: "PrintSolutions",
    typeId: "paper-roll",
  },
  {
    id: "itm-7",
    clientId: "c3",
    clientName: "PrintSolutions",
    typeId: "paper-roll",
  },
  {
    id: "itm-8",
    clientId: "c4",
    clientName: "RetailPlus",
    typeId: "ind-pallet",
  },
  {
    id: "itm-9",
    clientId: "c4",
    clientName: "RetailPlus",
    typeId: "ind-pallet",
  },
  {
    id: "itm-10",
    clientId: "c4",
    clientName: "RetailPlus",
    typeId: "ind-pallet",
  },
  {
    id: "itm-11",
    clientId: "c4",
    clientName: "RetailPlus",
    typeId: "ind-pallet",
  },
];

export interface LclConsolidationEngineProps {
  cargoPool: LclCargoItem[];
  masterContainers: MasterContainer[];
  activeContainerId: string;
  selectedPoolIds: Set<string>;
  toggleSelection: (id: string) => void;
  assignSelected: () => void;
  removeAssigned: (cargoId: string) => void;
  createNewContainer: () => void;
  setActiveContainerId: (id: string) => void;
  autoOptimize?: (cargoIds: string[]) => void;
}

export function LclConsolidationEngine({
  cargoPool,
  masterContainers,
  activeContainerId,
  selectedPoolIds,
  toggleSelection,
  assignSelected,
  removeAssigned,
  createNewContainer,
  setActiveContainerId,
  autoOptimize,
}: LclConsolidationEngineProps) {
  const [viewMode, setViewMode] = useState<"3d" | "top" | "side">("3d");
  const [isOptimizing, setIsOptimizing] = useState(false);

  const activeContainer = masterContainers.find(
    (c) => c.id === activeContainerId,
  );
  const activeSpec = activeContainer
    ? CONTAINER_SPECS.find((s) => s.id === activeContainer.specId)!
    : CONTAINER_SPECS[0];

  // Derive assigned and unassigned items
  const allAssignedIds = new Set(
    masterContainers.flatMap((c) => c.assignedCargoIds),
  );
  const unassignedPool = cargoPool.filter((c) => !allAssignedIds.has(c.id));
  const activeAssignedItems = cargoPool.filter((c) =>
    activeContainer?.assignedCargoIds.includes(c.id),
  );

  // Handlers are passed in via props

  // Packing Logic for the active container
  const packingResult = useMemo(() => {
    const packedItems: PackedItem[] = [];
    let currentX = 0.1;
    let currentY = 0.1;
    let rowMaxLength = 0;
    let totalWeight = 0;
    let itemsPacked = 0;

    for (const item of activeAssignedItems) {
      const type = CARGO_TYPES[item.typeId];
      if (totalWeight + type.weight > activeSpec.maxWeight) continue; // Exceeds weight

      let zPos = 0;
      let isStacked = false;
      let underItem: PackedItem | undefined = undefined;

      // Try Double Stacking
      if (type.height * 2 <= activeSpec.height) {
        underItem = packedItems.find(
          (p) =>
            p.z === 0 &&
            p.length >= type.length &&
            p.width >= type.width &&
            p.height + type.height <= activeSpec.height &&
            !packedItems.some(
              (top) =>
                Math.abs(top.x - p.x) < 0.01 &&
                Math.abs(top.y - p.y) < 0.01 &&
                top.z > 0,
            ),
        );
        if (underItem) {
          zPos = underItem.height;
          isStacked = true;
        }
      }

      let placeX = currentX;
      let placeY = currentY;

      if (!isStacked) {
        if (packedItems.length > 0) {
          if (currentY + type.width > activeSpec.width) {
            currentX += rowMaxLength;
            currentY = 0.1;
            rowMaxLength = 0;
            placeX = currentX;
            placeY = currentY;
          }
        }
        if (currentX + type.length > activeSpec.length) {
          continue; // Won't fit
        }
      } else {
        placeX = underItem!.x;
        placeY = underItem!.y;
      }

      packedItems.push({
        id: item.id,
        clientId: item.clientId,
        clientName: item.clientName,
        color: type.color,
        x: placeX,
        y: placeY,
        z: zPos,
        length: type.length,
        width: type.width,
        height: type.height,
        weight: type.weight,
        isStacked,
      });

      totalWeight += type.weight;
      itemsPacked++;

      if (!isStacked) {
        currentY += type.width;
        rowMaxLength = Math.max(rowMaxLength, type.length);
      }
    }

    const packedVolume = packedItems.reduce(
      (acc, p) => acc + p.length * p.width * p.height,
      0,
    );
    const volUtilPercent = Math.min(
      (packedVolume / activeSpec.volume) * 100,
      100,
    );
    const weightUtilPercent = (totalWeight / activeSpec.maxWeight) * 100;

    // COG Calculation
    let sumWeightedX = 0;
    packedItems.forEach(
      (p) => (sumWeightedX += (p.x + p.length / 2) * p.weight),
    );
    const cogX =
      itemsPacked > 0 ? sumWeightedX / totalWeight : activeSpec.length / 2;
    const cogDeviationPercent =
      ((cogX - activeSpec.length / 2) / (activeSpec.length / 2)) * 100;

    return {
      items: packedItems,
      totalWeight,
      itemsPacked,
      leftOut: activeAssignedItems.length - itemsPacked,
      volUtilPercent,
      weightUtilPercent,
      cogDeviationPercent,
      isCenterHeavy: Math.abs(cogDeviationPercent) > 15,
    };
  }, [activeAssignedItems, activeSpec]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            LCL Consolidation Engine
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Cross-dock staging & Master Container packing
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* LEFT PANEL: Unassigned Pool */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            height: "600px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>
              Cross-Dock Pool
            </h3>
            <span
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
                padding: "0.2rem 0.6rem",
                borderRadius: "99px",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
            >
              {unassignedPool.length} Items
            </span>
          </div>

          <div
            style={{
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              paddingRight: "0.5rem",
            }}
          >
            {unassignedPool.map((item) => {
              const type = CARGO_TYPES[item.typeId];
              const isSelected = selectedPoolIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    background: isSelected
                      ? "var(--accent-soft)"
                      : "var(--bg-tertiary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: type.color,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                      {item.clientName}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {type.name} • {type.weight}T
                    </span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 size={16} className="text-accent" />
                  )}
                </div>
              );
            })}
            {unassignedPool.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                No cargo left in pool.
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
            <button
              className="btn btn-primary"
              disabled={
                selectedPoolIds.size === 0 || !activeContainerId || isOptimizing
              }
              onClick={assignSelected}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                flex: 1,
              }}
            >
              Mover ({selectedPoolIds.size}) <ArrowRight size={16} />
            </button>
            <button
              onClick={async () => {
                if (
                  !autoOptimize ||
                  unassignedPool.length === 0 ||
                  !activeContainer
                )
                  return;
                setIsOptimizing(true);
                try {
                  const { getApp } = await import("firebase/app");
                  const { getFunctions, httpsCallable } =
                    await import("firebase/functions");
                  const app = getApp();
                  const functions = getFunctions(app, "europe-west1");
                  const optimizeLCL = httpsCallable(functions, "optimizeLCL");
                  const result = await optimizeLCL({
                    containerSpec: activeSpec,
                    cargoPool: unassignedPool.map((c) => ({
                      ...CARGO_TYPES[c.typeId],
                      id: c.id,
                    })),
                  });
                  const data = result.data as any;
                  if (data.success && data.data && data.data.selectedCargoIds) {
                    autoOptimize(data.data.selectedCargoIds);
                  }
                } catch (e) {
                  console.error(e);
                  // Fallback mock optimization
                  autoOptimize(
                    unassignedPool
                      .slice(0, Math.min(3, unassignedPool.length))
                      .map((c) => c.id),
                  );
                } finally {
                  setIsOptimizing(false);
                }
              }}
              disabled={
                !activeContainerId ||
                unassignedPool.length === 0 ||
                isOptimizing
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor:
                  isOptimizing || unassignedPool.length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity: isOptimizing || unassignedPool.length === 0 ? 0.5 : 1,
              }}
              title="Bin-Packing IA (Gemini)"
            >
              <Sparkles
                size={16}
                className={isOptimizing ? "animate-pulse" : ""}
              />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Master Containers */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Container Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto",
              paddingBottom: "0.5rem",
            }}
          >
            {masterContainers.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveContainerId(c.id)}
                style={{
                  padding: "0.75rem 1.25rem",
                  borderRadius: "8px",
                  background:
                    activeContainerId === c.id
                      ? "var(--accent)"
                      : "var(--bg-secondary)",
                  color:
                    activeContainerId === c.id ? "#fff" : "var(--text-primary)",
                  border: `1px solid ${activeContainerId === c.id ? "var(--accent)" : "var(--border)"}`,
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                <Truck size={16} />
                {c.route} ({c.specId})
              </button>
            ))}
            <button
              onClick={createNewContainer}
              style={{
                padding: "0.75rem",
                borderRadius: "8px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px dashed var(--border)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Plus size={16} /> Nuevo Master
            </button>
          </div>

          {activeContainer && (
            <div className="card" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1.5rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Box className="text-accent" /> {activeContainer.route}
                  </h3>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                      marginTop: "0.2rem",
                    }}
                  >
                    {activeSpec.name} ({activeSpec.volume}m³ /{" "}
                    {activeSpec.maxWeight}T max)
                  </p>
                </div>
                <div className="tabs" style={{ padding: "0.2rem" }}>
                  <button
                    className={`tab-btn ${viewMode === "3d" ? "active" : ""}`}
                    onClick={() => setViewMode("3d")}
                  >
                    3D
                  </button>
                  <button
                    className={`tab-btn ${viewMode === "top" ? "active" : ""}`}
                    onClick={() => setViewMode("top")}
                  >
                    Top
                  </button>
                </div>
              </div>

              {/* 3D Visualizer */}
              <div
                style={{
                  width: "100%",
                  height: "350px",
                  background: "var(--bg-tertiary)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div className="flex items-center justify-center h-full text-slate-500 font-bold uppercase tracking-widest">
                  Visualización 3D Deshabilitada
                </div>

                {packingResult.leftOut > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "rgba(239,68,68,0.9)",
                      color: "#fff",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <AlertTriangle size={16} />
                    {packingResult.leftOut} bultos no caben
                  </div>
                )}
              </div>

              {/* KPIs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "1rem",
                  marginTop: "1.5rem",
                }}
              >
                <div
                  style={{
                    padding: "1rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Uso Volumen
                  </span>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "var(--accent)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {packingResult.volUtilPercent.toFixed(1)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Uso Peso
                  </span>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color:
                        packingResult.weightUtilPercent > 95
                          ? "#ef4444"
                          : "#10b981",
                      marginTop: "0.2rem",
                    }}
                  >
                    {packingResult.weightUtilPercent.toFixed(1)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Bultos Estibados
                  </span>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      marginTop: "0.2rem",
                    }}
                  >
                    {packingResult.itemsPacked}
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Balance COG
                  </span>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      color: packingResult.isCenterHeavy
                        ? "#f59e0b"
                        : "#10b981",
                      marginTop: "0.4rem",
                    }}
                  >
                    {packingResult.isCenterHeavy ? "Inestable" : "Estable"}
                  </div>
                </div>
              </div>

              {/* Assigned Items List */}
              {activeAssignedItems.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <h4
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      color: "var(--text-secondary)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Carga Asignada ({activeAssignedItems.length})
                  </h4>
                  <div
                    style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                  >
                    {activeAssignedItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.4rem 0.75rem",
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border)",
                          borderRadius: "99px",
                          fontSize: "0.8rem",
                        }}
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: CARGO_TYPES[item.typeId].color,
                          }}
                        />
                        {item.clientName}
                        <button
                          onClick={() => removeAssigned(item.id)}
                          style={{
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            display: "flex",
                          }}
                        >
                          <Trash2 size={14} className="hover:text-danger" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

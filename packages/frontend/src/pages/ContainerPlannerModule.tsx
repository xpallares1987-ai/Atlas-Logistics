import React, { Suspense, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Box,
  Environment,
  Text,
  TransformControls,
  Line,
  Sphere,
} from "@react-three/drei";
import {
  Package,
  Layers,
  Scale,
  Activity,
  Flame,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Truck,
  RotateCw,
  Eye,
  Info,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import {
  EQUIPMENT_CATALOG,
  ContainerTypeKey,
  ContainerSpecification,
  CargoItemInput,
  PlacedCargoItem,
  STOWAGE_DEMO_PRESETS,
  optimizeStowage3D,
  StowageOptimizationResult,
} from "@atlas/shared";

// =========================================================================
// 3D SCENE OBJECTS
// =========================================================================

interface CargoBoxProps {
  item: PlacedCargoItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  mode: "translate" | "rotate";
  container: ContainerSpecification;
  isConflicting?: boolean;
}

const CargoBox3D: React.FC<CargoBoxProps> = ({
  item,
  isSelected,
  onSelect,
  mode,
  container,
  isConflicting,
}) => {
  // Convert from corner origin (0, 0, 0) to centered Three.js coordinates
  const threeX = item.x + item.effectiveWidthM / 2 - container.internalWidthM / 2;
  const threeY = item.z + item.effectiveHeightM / 2;
  const threeZ = item.y + item.effectiveLengthM / 2 - container.internalLengthM / 2;

  const boxColor = isConflicting ? "#ef4444" : item.color || "#3b82f6";

  const boxMesh = (
    <group
      position={[threeX, threeY, threeZ]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      <Box args={[item.effectiveWidthM, item.effectiveHeightM, item.effectiveLengthM]}>
        <meshStandardMaterial
          color={boxColor}
          roughness={0.4}
          metalness={0.1}
          opacity={isSelected ? 0.95 : 0.85}
          transparent
        />
      </Box>

      {/* Edge Wireframe */}
      <lineSegments>
        <edgesGeometry
          args={[
            // @ts-ignore
            new (window as any).THREE.BoxGeometry(
              item.effectiveWidthM,
              item.effectiveHeightM,
              item.effectiveLengthM
            ),
          ]}
        />
        <lineBasicMaterial color={isSelected ? "#ffffff" : "#0f172a"} linewidth={1} />
      </lineSegments>

      {/* Item Label */}
      <Text
        position={[0, item.effectiveHeightM / 2 + 0.08, 0]}
        fontSize={Math.min(0.25, item.effectiveWidthM * 0.25)}
        color="white"
        anchorX="center"
        anchorY="bottom"
      >
        {item.name.slice(0, 18)}
      </Text>
    </group>
  );

  if (isSelected) {
    return (
      <TransformControls mode={mode} position={[threeX, threeY, threeZ]}>
        {boxMesh}
      </TransformControls>
    );
  }

  return boxMesh;
};

interface ContainerShellProps {
  container: ContainerSpecification;
  showWalls: boolean;
}

const ContainerShell3D: React.FC<ContainerShellProps> = ({ container, showWalls }) => {
  const halfW = container.internalWidthM / 2;
  const halfL = container.internalLengthM / 2;
  const h = container.internalHeightM;

  return (
    <group>
      {/* Floor Deck */}
      <Box args={[container.internalWidthM, 0.08, container.internalLengthM]} position={[0, -0.04, 0]}>
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </Box>

      {/* Front Nose Bulkhead */}
      <Box args={[container.internalWidthM, h, 0.08]} position={[0, h / 2, -halfL - 0.04]}>
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </Box>

      {/* Transparent Walls with Wireframe Outline */}
      {showWalls && (
        <>
          {/* Left Wall */}
          <Box args={[0.04, h, container.internalLengthM]} position={[-halfW - 0.02, h / 2, 0]}>
            <meshStandardMaterial color="#3b82f6" opacity={0.12} transparent wireframe={false} />
          </Box>
          {/* Right Wall */}
          <Box args={[0.04, h, container.internalLengthM]} position={[halfW + 0.02, h / 2, 0]}>
            <meshStandardMaterial color="#3b82f6" opacity={0.12} transparent wireframe={false} />
          </Box>
        </>
      )}

      {/* 4 Corner Posts (Pillars) */}
      {[
        [-halfW, h / 2, -halfL],
        [halfW, h / 2, -halfL],
        [-halfW, h / 2, halfL],
        [halfW, h / 2, halfL],
      ].map((pos, idx) => (
        <Box key={idx} args={[0.1, h, 0.1]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#475569" />
        </Box>
      ))}

      {/* Top Outer Rails */}
      <Box args={[container.internalWidthM, 0.08, 0.08]} position={[0, h + 0.04, -halfL]}>
        <meshStandardMaterial color="#475569" />
      </Box>
      <Box args={[container.internalWidthM, 0.08, 0.08]} position={[0, h + 0.04, halfL]}>
        <meshStandardMaterial color="#475569" />
      </Box>
      <Box args={[0.08, 0.08, container.internalLengthM]} position={[-halfW, h + 0.04, 0]}>
        <meshStandardMaterial color="#475569" />
      </Box>
      <Box args={[0.08, 0.08, container.internalLengthM]} position={[halfW, h + 0.04, 0]}>
        <meshStandardMaterial color="#475569" />
      </Box>
    </group>
  );
};

interface CenterOfGravityMarkerProps {
  cogX: number;
  cogY: number;
  cogZ: number;
  container: ContainerSpecification;
  status: "OPTIMAL" | "ACCEPTABLE" | "HAZARDOUS";
}

const CenterOfGravityMarker3D: React.FC<CenterOfGravityMarkerProps> = ({
  cogX,
  cogY,
  cogZ,
  container,
  status,
}) => {
  const threeX = cogX - container.internalWidthM / 2;
  const threeY = cogZ;
  const threeZ = cogY - container.internalLengthM / 2;

  const color = status === "OPTIMAL" ? "#10b981" : status === "ACCEPTABLE" ? "#f59e0b" : "#ef4444";

  return (
    <group position={[threeX, threeY, threeZ]}>
      {/* Floating Center of Gravity Sphere */}
      <Sphere args={[0.22, 16, 16]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} />
      </Sphere>

      {/* Vertical plumb line connecting to container floor */}
      <Line
        points={[
          [0, 0, 0],
          [0, -threeY, 0],
        ]}
        color={color}
        lineWidth={2}
        dashed
      />

      <Text position={[0, 0.35, 0]} fontSize={0.22} color="white" anchorX="center" anchorY="bottom">
        CoG
      </Text>
    </group>
  );
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function ContainerPlannerModule() {
  const [selectedContainerKey, setSelectedContainerKey] = useState<ContainerTypeKey>("40ft_hc");
  const activeContainer = useMemo(
    () => EQUIPMENT_CATALOG[selectedContainerKey],
    [selectedContainerKey]
  );

  // Active Manifest Items
  const [cargoList, setCargoList] = useState<CargoItemInput[]>(
    STOWAGE_DEMO_PRESETS.balanced_40hc.items
  );

  // Optimization Result
  const [optResult, setOptResult] = useState<StowageOptimizationResult>(() =>
    optimizeStowage3D(EQUIPMENT_CATALOG["40ft_hc"], STOWAGE_DEMO_PRESETS.balanced_40hc.items)
  );

  // 3D Canvas View Controls
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<"translate" | "rotate">("translate");
  const [showCogMarker, setShowCogMarker] = useState(true);
  const [showWalls, setShowWalls] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeTab, setActiveTab] = useState<"AXLE" | "IMDG" | "MANIFEST">("AXLE");

  // Add Item Modal / Form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemWidth, setNewItemWidth] = useState(1.2);
  const [newItemLength, setNewItemLength] = useState(1.0);
  const [newItemHeight, setNewItemHeight] = useState(1.2);
  const [newItemWeight, setNewItemWeight] = useState(800);
  const [newItemStackable, setNewItemStackable] = useState(true);
  const [newItemHazard, setNewItemHazard] = useState("");

  // Handler: Optimize load
  const handleRunOptimizer = (itemsToPack: CargoItemInput[] = cargoList) => {
    const result = optimizeStowage3D(activeContainer, itemsToPack, { centerPayload: true });
    setOptResult(result);
  };

  // Handler: Switch container type
  const handleSelectContainer = (key: ContainerTypeKey) => {
    setSelectedContainerKey(key);
    const newContainer = EQUIPMENT_CATALOG[key];
    const result = optimizeStowage3D(newContainer, cargoList, { centerPayload: true });
    setOptResult(result);
  };

  // Handler: Load Preset
  const handleLoadPreset = (presetKey: string) => {
    const preset = STOWAGE_DEMO_PRESETS[presetKey];
    if (!preset) return;
    setSelectedContainerKey(preset.containerType);
    setCargoList(preset.items);
    const container = EQUIPMENT_CATALOG[preset.containerType];
    const result = optimizeStowage3D(container, preset.items, { centerPayload: true });
    setOptResult(result);
  };

  // Handler: Add custom item
  const handleAddCargoItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
    const newItem: CargoItemInput = {
      id: `item_${Date.now()}`,
      name: newItemName.trim(),
      widthM: Number(newItemWidth),
      lengthM: Number(newItemLength),
      heightM: Number(newItemHeight),
      weightKg: Number(newItemWeight),
      stackable: newItemStackable,
      hazardClass: newItemHazard.trim() || undefined,
      color: colors[cargoList.length % colors.length],
    };

    const updatedList = [...cargoList, newItem];
    setCargoList(updatedList);
    handleRunOptimizer(updatedList);
    setNewItemName("");
  };

  // Handler: Remove item
  const handleRemoveCargoItem = (id: string) => {
    const updatedList = cargoList.filter((item) => item.id !== id);
    setCargoList(updatedList);
    handleRunOptimizer(updatedList);
  };

  // Conflicting IMDG IDs
  const conflictingItemIds = useMemo(() => {
    const ids = new Set<string>();
    if (optResult.imoSegregation?.hasIncompatibleHazard) {
      for (const check of optResult.imoSegregation.checks) {
        if (!check.isCompliant) {
          ids.add(check.itemAId);
          ids.add(check.itemBId);
        }
      }
    }
    return ids;
  }, [optResult]);

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-slate-950 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Package size={22} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-0.5 rounded-full border border-indigo-500/20">
              Multimodal 3D Bin Packing & Axle Load Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Motor de Estiba 3D & Reparto de Pesos por Eje
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            Optimización heurística 3D de cubicaje para contenedores ISO, furgones y megatrailers con cálculo del Centro de Gravedad (CoG), análisis de sobrecarga de ejes (Directiva 96/53/CE) y segregación de mercancías peligrosas IMDG 7.2.4.
          </p>
        </div>

        {/* 1-Click Demo Presets & Optimizer Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleLoadPreset("balanced_40hc")}
            variant="ghost"
            className="text-xs text-slate-300 hover:text-white border border-slate-800 rounded-xl px-3 py-1.5"
          >
            40' HC Balanceado
          </Button>
          <Button
            onClick={() => handleLoadPreset("heavy_axle_warning")}
            variant="ghost"
            className="text-xs text-amber-300 hover:text-white border border-amber-500/30 bg-amber-500/10 rounded-xl px-3 py-1.5"
          >
            Alerta Sobrecarga Eje
          </Button>
          <Button
            onClick={() => handleLoadPreset("imdg_segregation_alert")}
            variant="ghost"
            className="text-xs text-rose-300 hover:text-white border border-rose-500/30 bg-rose-500/10 rounded-xl px-3 py-1.5"
          >
            Conflicto IMDG
          </Button>
          <Button
            onClick={() => handleLoadPreset("megatrailer_eu_33pallets")}
            variant="ghost"
            className="text-xs text-indigo-300 hover:text-white border border-indigo-500/30 bg-indigo-500/10 rounded-xl px-3 py-1.5"
          >
            Megatrailer 33 Europallets
          </Button>
          <Button
            onClick={() => handleRunOptimizer()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Optimizar Estiba 3D
          </Button>
        </div>
      </div>

      {/* Equipment Selector & Real-Time KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Equipment Selector (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={15} className="text-indigo-400" />
              Equipo de Transporte:
            </span>
            <span className="text-[10px] font-mono text-indigo-400 uppercase">
              {activeContainer.category}
            </span>
          </div>

          <select
            value={selectedContainerKey}
            onChange={(e) => handleSelectContainer(e.target.value as ContainerTypeKey)}
            className="w-full bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
          >
            {Object.values(EQUIPMENT_CATALOG).map((spec) => (
              <option key={spec.key} value={spec.key}>
                {spec.name} ({spec.internalLengthM}m × {spec.internalWidthM}m × {spec.internalHeightM}m)
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center font-mono text-[11px]">
            <div className="bg-slate-950/60 p-2 rounded-xl">
              <div className="text-[9px] text-slate-500 uppercase">Volumen</div>
              <div className="font-bold text-white">{activeContainer.internalVolumeCbm} m³</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl">
              <div className="text-[9px] text-slate-500 uppercase">Carga Máx</div>
              <div className="font-bold text-emerald-400">{(activeContainer.maxPayloadKg / 1000).toFixed(1)} t</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl">
              <div className="text-[9px] text-slate-500 uppercase">Tara</div>
              <div className="font-bold text-slate-300">{activeContainer.tareWeightKg} kg</div>
            </div>
          </div>
        </div>

        {/* 4 Live KPI Cards (8 Cols) */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* KPI 1: Volumen */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Cubicaje Utilizado</span>
            <div>
              <div className="text-xl font-black text-white">
                {optResult.totalCargoVolumeCbm.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ {activeContainer.internalVolumeCbm} m³</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, optResult.volumeUtilizationPercent)}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-indigo-400 font-mono mt-1">
              {optResult.volumeUtilizationPercent}% de ocupación
            </span>
          </div>

          {/* KPI 2: Payload */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Carga Útil Total</span>
            <div>
              <div className="text-xl font-black text-white">
                {(optResult.totalCargoWeightKg / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-400">/ {(activeContainer.maxPayloadKg / 1000).toFixed(1)} t</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    optResult.weightUtilizationPercent > 100 ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, optResult.weightUtilizationPercent)}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono mt-1">
              {optResult.weightUtilizationPercent}% de masa máxima
            </span>
          </div>

          {/* KPI 3: Stability CoG */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Score Estabilidad CoG</span>
            <div>
              <div className="text-xl font-black text-white flex items-center gap-1.5">
                <span>{optResult.centerOfGravity.stabilityScore}</span>
                <span className="text-xs font-normal text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    optResult.centerOfGravity.stabilityScore >= 80
                      ? "bg-emerald-500"
                      : optResult.centerOfGravity.stabilityScore >= 60
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${optResult.centerOfGravity.stabilityScore}%` }}
                />
              </div>
            </div>
            <span
              className={`text-[10px] font-bold uppercase ${
                optResult.centerOfGravity.lateralStatus === "OPTIMAL"
                  ? "text-emerald-400"
                  : optResult.centerOfGravity.lateralStatus === "ACCEPTABLE"
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {optResult.centerOfGravity.lateralStatus === "OPTIMAL"
                ? "Óptimo Balanceado"
                : optResult.centerOfGravity.lateralStatus === "ACCEPTABLE"
                ? "Aceptable"
                : "Riesgo de Escora"}
            </span>
          </div>

          {/* KPI 4: Axle Compliance */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Cargas por Eje</span>
            <div>
              <div className="text-xl font-black text-white flex items-center gap-1.5">
                {optResult.axleDistribution.isLegal ? (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={20} className="text-rose-400" />
                )}
                <span className="text-sm font-bold">
                  {optResult.axleDistribution.isLegal ? "Conforme" : "Sobrecarga"}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-300 mt-2">
                MMA: {(optResult.axleDistribution.grossCombinedWeightKg / 1000).toFixed(1)} t
              </div>
            </div>
            <span
              className={`text-[10px] font-bold ${
                optResult.axleDistribution.isLegal ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {optResult.axleDistribution.isLegal ? "Directiva 96/53/CE OK" : "Infracción Legal"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Center Area: 3D Canvas (Left 7 Cols) + Diagnostics & Controls (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left: 3D Interactive Canvas */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col min-h-[460px]">
          {/* Top Controls Overlay */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <Button
              onClick={() => setShowWalls(!showWalls)}
              variant="ghost"
              className={`text-[11px] px-2.5 py-1.5 rounded-xl border ${
                showWalls
                  ? "bg-slate-800 text-white border-slate-700"
                  : "bg-slate-950/70 text-slate-400 border-slate-800"
              }`}
            >
              <Eye size={13} className="mr-1 inline" />
              {showWalls ? "Ocultar Paredes" : "Ver Paredes"}
            </Button>
            <Button
              onClick={() => setShowCogMarker(!showCogMarker)}
              variant="ghost"
              className={`text-[11px] px-2.5 py-1.5 rounded-xl border ${
                showCogMarker
                  ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40"
                  : "bg-slate-950/70 text-slate-400 border-slate-800"
              }`}
            >
              <Activity size={13} className="mr-1 inline" />
              {showCogMarker ? "CoG Visible" : "Ocultar CoG"}
            </Button>
            <Button
              onClick={() => setAutoRotate(!autoRotate)}
              variant="ghost"
              className={`text-[11px] px-2.5 py-1.5 rounded-xl border ${
                autoRotate
                  ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-950/70 text-slate-400 border-slate-800"
              }`}
            >
              <RotateCw size={13} className="mr-1 inline" />
              Giro 3D
            </Button>

            {selectedId && (
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 ml-2">
                <button
                  onClick={() => setTransformMode("translate")}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                    transformMode === "translate" ? "bg-indigo-600 text-white" : "text-slate-400"
                  }`}
                >
                  Mover
                </button>
                <button
                  onClick={() => setTransformMode("rotate")}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                    transformMode === "rotate" ? "bg-indigo-600 text-white" : "text-slate-400"
                  }`}
                >
                  Girar
                </button>
              </div>
            )}
          </div>

          {/* 3D Canvas */}
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-mono">
                Cargando Renderizador 3D WebGL...
              </div>
            }
          >
            <Canvas
              camera={{ position: [5, 4, 9], fov: 42 }}
              className="w-full h-full"
            >
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={1.2} />
              <pointLight position={[-10, 5, -10]} intensity={0.5} />
              <Environment preset="city" />

              <ContainerShell3D container={activeContainer} showWalls={showWalls} />

              {optResult.packedItems.map((item) => (
                <CargoBox3D
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onSelect={setSelectedId}
                  mode={transformMode}
                  container={activeContainer}
                  isConflicting={conflictingItemIds.has(item.id)}
                />
              ))}

              {showCogMarker && (
                <CenterOfGravityMarker3D
                  cogX={optResult.centerOfGravity.cogX}
                  cogY={optResult.centerOfGravity.cogY}
                  cogZ={optResult.centerOfGravity.cogZ}
                  container={activeContainer}
                  status={optResult.centerOfGravity.lateralStatus}
                />
              )}

              <OrbitControls
                makeDefault
                autoRotate={autoRotate && !selectedId}
                autoRotateSpeed={0.8}
              />
            </Canvas>
          </Suspense>

          {/* CoG 2D Top-Down Radar HUD (Bottom Right of Canvas) */}
          <div className="absolute bottom-4 right-4 bg-slate-950/90 p-3 rounded-2xl border border-slate-800 text-white z-10 w-44 shadow-2xl">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
              <span className="flex items-center gap-1">
                <Scale size={12} className="text-amber-400" />
                Radar CoG 2D
              </span>
              <span className="font-mono text-[9px] text-slate-400">±5% Tolerancia</span>
            </div>

            <div className="w-36 h-28 mx-auto relative border border-slate-700 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden">
              {/* Center Crosshair */}
              <div className="absolute inset-x-0 h-px bg-slate-800" style={{ top: "50%" }} />
              <div className="absolute inset-y-0 w-px bg-slate-800" style={{ left: "50%" }} />

              {/* Safety Boundary Box (±5% deviation) */}
              <div
                className="absolute border border-dashed border-emerald-500/40 w-10 h-16 rounded"
                style={{ top: "calc(50% - 32px)", left: "calc(50% - 20px)" }}
              />

              <span className="absolute top-1 left-1.5 text-[8px] font-mono text-slate-500">FRONT (Nose)</span>
              <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-slate-500">DOOR</span>

              {/* Floating CoG Dot */}
              <div
                className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                  optResult.centerOfGravity.lateralStatus === "OPTIMAL"
                    ? "bg-emerald-500 ring-2 ring-emerald-400/40 animate-pulse"
                    : optResult.centerOfGravity.lateralStatus === "ACCEPTABLE"
                    ? "bg-amber-500 ring-2 ring-amber-400/40"
                    : "bg-rose-500 ring-2 ring-rose-400/40 animate-bounce"
                }`}
                style={{
                  left: `${Math.min(90, Math.max(10, 50 + optResult.centerOfGravity.lateralDeviationPercent * 3))}%`,
                  top: `${Math.min(90, Math.max(10, 50 + optResult.centerOfGravity.longitudinalDeviationPercent * 1.5))}%`,
                }}
              >
                G
              </div>
            </div>

            <div className="mt-2 flex justify-between text-[9px] text-slate-400 font-mono">
              <span>Lat: {optResult.centerOfGravity.lateralDeviationPercent}%</span>
              <span>Long: {optResult.centerOfGravity.longitudinalDeviationPercent}%</span>
            </div>
          </div>
        </div>

        {/* Right: Technical Workbench (Axle Load, IMDG, Manifest) (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            {/* Tab Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-4">
              <button
                onClick={() => setActiveTab("AXLE")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "AXLE"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Scale size={14} />
                Cargas por Eje
              </button>
              <button
                onClick={() => setActiveTab("IMDG")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "IMDG"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Flame size={14} />
                Segregación IMDG
              </button>
              <button
                onClick={() => setActiveTab("MANIFEST")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "MANIFEST"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers size={14} />
                Manifiesto ({cargoList.length})
              </button>
            </div>

            {/* TAB 1: ROAD AXLE WEIGHT DISTRIBUTION */}
            {activeTab === "AXLE" && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Distribución Estática por Eje (Directiva 96/53/CE)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      optResult.axleDistribution.isLegal
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {optResult.axleDistribution.isLegal ? "LEGAL / APTO" : "SOBREPESO"}
                  </span>
                </div>

                {/* Steer Axle */}
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">Eje Directriz Tractor (Eje 1)</span>
                    <span className="font-mono font-bold text-white">
                      {optResult.axleDistribution.steerAxleLoadKg.toLocaleString()} / 7,000 kg
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        optResult.axleDistribution.steerOverloadKg > 0 ? "bg-rose-500" : "bg-indigo-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (optResult.axleDistribution.steerAxleLoadKg / 7000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Drive Axle */}
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">Eje Motriz Tractor (Quinta Rueda)</span>
                    <span className="font-mono font-bold text-white">
                      {optResult.axleDistribution.driveAxleLoadKg.toLocaleString()} / 11,500 kg
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        optResult.axleDistribution.driveOverloadKg > 0 ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (optResult.axleDistribution.driveAxleLoadKg / 11500) * 100)}%`,
                      }}
                    />
                  </div>
                  {optResult.axleDistribution.driveOverloadKg > 0 && (
                    <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Sobrecarga en eje motriz: +{optResult.axleDistribution.driveOverloadKg} kg sobre el límite legal.
                    </div>
                  )}
                </div>

                {/* Trailer Tridem */}
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">Tridem Semirremolque (Bogie Trasero)</span>
                    <span className="font-mono font-bold text-white">
                      {optResult.axleDistribution.trailerTridemLoadKg.toLocaleString()} / 24,000 kg
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        optResult.axleDistribution.trailerOverloadKg > 0 ? "bg-rose-500" : "bg-indigo-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (optResult.axleDistribution.trailerTridemLoadKg / 24000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Diagnostic summary */}
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Info size={14} className="text-indigo-400" />
                    Diagnóstico de Estiba:
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {optResult.axleDistribution.legalComplianceSummary}
                  </p>
                  {optResult.centerOfGravity.safetyRecommendations.map((rec, idx) => (
                    <p key={idx} className="text-[11px] text-amber-400/90">
                      • {rec}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: IMDG HAZMAT SEGREGATION */}
            {activeTab === "IMDG" && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Segregación IMDG 7.2.4 en Unidad de Carga (CTU)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      optResult.imoSegregation.hasIncompatibleHazard
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {optResult.imoSegregation.hasIncompatibleHazard ? "INCOMPATIBLE" : "CONFORME"}
                  </span>
                </div>

                {optResult.imoSegregation.checks.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No hay mercancías peligrosas declaradas en este contenedor. Carga clasificada como carga general.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {optResult.imoSegregation.checks.map((chk, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                          chk.isCompliant
                            ? "bg-slate-950/70 border-emerald-500/30 text-slate-200"
                            : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            {chk.itemAName} <span className="text-amber-400 font-mono">(Clase {chk.classA})</span> vs {chk.itemBName} <span className="text-amber-400 font-mono">(Clase {chk.classB})</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              chk.isCompliant ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {chk.isCompliant ? "CUMPLE" : "VIOLACIÓN"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 flex justify-between">
                          <span>Distancia 3D: <strong className="font-mono text-white">{chk.actualDistanceM}m</strong></span>
                          <span>Requerimiento IMDG: <strong className="font-mono text-indigo-400">Código {chk.imdgRequirementCode}</strong></span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          {chk.statusMessage}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MANIFEST & ADD CARGO */}
            {activeTab === "MANIFEST" && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Bultos del Manifiesto ({cargoList.length})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {optResult.packedItems.length} estibados • {optResult.unpackedItems.length} pendientes
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cargoList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                        selectedId === item.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color || "#3b82f6" }}
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.lengthM}m × {item.widthM}m × {item.heightM}m • {item.weightKg} kg
                            {item.hazardClass && (
                              <span className="text-amber-400 font-bold ml-1.5">
                                [IMO {item.hazardClass}]
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCargoItem(item.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Eliminar Bulto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick Add Form */}
                <form
                  onSubmit={handleAddCargoItem}
                  className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs"
                >
                  <div className="font-bold text-white text-[11px] uppercase tracking-wider">
                    Añadir Bulto al Manifiesto
                  </div>
                  <Input
                    placeholder="Descripción (ej. Pallet Repuestos A)"
                    value={newItemName}
                    onChange={(e: any) => setNewItemName(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-xs py-1"
                  />
                  <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Largo (m)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={newItemLength}
                        onChange={(e) => setNewItemLength(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block">Ancho (m)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={newItemWidth}
                        onChange={(e) => setNewItemWidth(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block">Alto (m)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={newItemHeight}
                        onChange={(e) => setNewItemHeight(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block">Peso (kg)</span>
                      <input
                        type="number"
                        step="50"
                        value={newItemWeight}
                        onChange={(e) => setNewItemWeight(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={newItemStackable}
                        onChange={(e) => setNewItemStackable(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-800"
                      />
                      Apilable
                    </label>
                    <Input
                      placeholder="IMO Clase (ej. 3, 5.1)"
                      value={newItemHazard}
                      onChange={(e: any) => setNewItemHazard(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-[10px] w-32 py-0.5"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 mt-1"
                  >
                    <Plus size={13} /> Añadir y Re-optimizar
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Footer of Right Panel: Heuristic Status Banner */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              Tiempo de cálculo heurístico: <strong className="font-mono text-emerald-400">{optResult.executionTimeMs} ms</strong>
            </span>
            <Button
              onClick={() => handleRunOptimizer()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1"
            >
              <RefreshCw size={13} />
              Re-calcular CoG
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

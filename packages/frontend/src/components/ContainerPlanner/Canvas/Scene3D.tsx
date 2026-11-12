/**
 * @file Scene3D.tsx
 * @description Interactive Three.js / React Three Fiber 3D container stowage viewport with CoG marker, wireframe shell, and 2D Top-Down CoG Radar HUD.
 * @module @atlas/frontend/components/ContainerPlanner/Canvas
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React, { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Box,
  Text,
  TransformControls,
  Line,
  Sphere,
} from "@react-three/drei";
import { Eye, Activity, RotateCw, Scale } from "lucide-react";
import { Button } from "@atlas/ui";
import {
  ContainerSpecification,
  PlacedCargoItem,
  StowageOptimizationResult,
} from "@atlas/shared";
import { TransformMode } from "../../../types/container-planner.types";

// ============================================================================
// 1. ERROR BOUNDARY FOR 3D WEBGL CANVAS
// ============================================================================

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.warn("3D Canvas error caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300 bg-slate-950/90 z-20">
          <p className="text-sm font-bold text-rose-400 mb-2">
            No se pudo inicializar la vista 3D WebGL
          </p>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {this.state.error?.message || "Error interno del renderizador 3D"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
          >
            Reintentar Render
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// 2. 3D SCENE PRIMITIVES
// ============================================================================

interface CargoBoxProps {
  item: PlacedCargoItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  mode: TransformMode;
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
  const threeX =
    item.x + item.effectiveWidthM / 2 - container.internalWidthM / 2;
  const threeY = item.z + item.effectiveHeightM / 2;
  const threeZ =
    item.y + item.effectiveLengthM / 2 - container.internalLengthM / 2;

  const boxColor = isConflicting ? "#ef4444" : item.color || "#3b82f6";

  const boxGeometry = useMemo(
    () =>
      new THREE.BoxGeometry(
        item.effectiveWidthM,
        item.effectiveHeightM,
        item.effectiveLengthM,
      ),
    [item.effectiveWidthM, item.effectiveHeightM, item.effectiveLengthM],
  );

  const boxMesh = (
    <group
      position={[threeX, threeY, threeZ]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      <Box
        args={[
          item.effectiveWidthM,
          item.effectiveHeightM,
          item.effectiveLengthM,
        ]}
      >
        <meshStandardMaterial
          color={boxColor}
          roughness={0.4}
          metalness={0.1}
          opacity={isSelected ? 0.95 : 0.85}
          transparent
        />
      </Box>

      <lineSegments>
        <edgesGeometry args={[boxGeometry]} />
        <lineBasicMaterial
          color={isSelected ? "#ffffff" : "#0f172a"}
          linewidth={1}
        />
      </lineSegments>

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

const ContainerShell3D: React.FC<ContainerShellProps> = ({
  container,
  showWalls,
}) => {
  const halfW = container.internalWidthM / 2;
  const halfL = container.internalLengthM / 2;
  const h = container.internalHeightM;

  return (
    <group>
      <Box
        args={[container.internalWidthM, 0.08, container.internalLengthM]}
        position={[0, -0.04, 0]}
      >
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </Box>

      <Box
        args={[container.internalWidthM, h, 0.08]}
        position={[0, h / 2, -halfL - 0.04]}
      >
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </Box>

      {showWalls && (
        <>
          <Box
            args={[0.04, h, container.internalLengthM]}
            position={[-halfW - 0.02, h / 2, 0]}
          >
            <meshStandardMaterial
              color="#3b82f6"
              opacity={0.12}
              transparent
              wireframe={false}
            />
          </Box>
          <Box
            args={[0.04, h, container.internalLengthM]}
            position={[halfW + 0.02, h / 2, 0]}
          >
            <meshStandardMaterial
              color="#3b82f6"
              opacity={0.12}
              transparent
              wireframe={false}
            />
          </Box>
        </>
      )}

      {[
        [-halfW, h / 2, -halfL],
        [halfW, h / 2, -halfL],
        [-halfW, h / 2, halfL],
        [halfW, h / 2, halfL],
      ].map((pos, idx) => (
        <Box
          key={idx}
          args={[0.1, h, 0.1]}
          position={pos as [number, number, number]}
        >
          <meshStandardMaterial color="#475569" />
        </Box>
      ))}

      <Box
        args={[container.internalWidthM, 0.08, 0.08]}
        position={[0, h + 0.04, -halfL]}
      >
        <meshStandardMaterial color="#475569" />
      </Box>
      <Box
        args={[container.internalWidthM, 0.08, 0.08]}
        position={[0, h + 0.04, halfL]}
      >
        <meshStandardMaterial color="#475569" />
      </Box>
      <Box
        args={[0.08, 0.08, container.internalLengthM]}
        position={[-halfW, h + 0.04, 0]}
      >
        <meshStandardMaterial color="#475569" />
      </Box>
      <Box
        args={[0.08, 0.08, container.internalLengthM]}
        position={[halfW, h + 0.04, 0]}
      >
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

  const color =
    status === "OPTIMAL"
      ? "#10b981"
      : status === "ACCEPTABLE"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <group position={[threeX, threeY, threeZ]}>
      <Sphere args={[0.22, 16, 16]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.2}
        />
      </Sphere>

      <Line
        points={[
          [0, 0, 0],
          [0, -threeY, 0],
        ]}
        color={color}
        lineWidth={2}
        dashed
      />

      <Text
        position={[0, 0.35, 0]}
        fontSize={0.22}
        color="white"
        anchorX="center"
        anchorY="bottom"
      >
        CoG
      </Text>
    </group>
  );
};

// ============================================================================
// 3. MAIN 3D VIEWPORT COMPONENT
// ============================================================================

export interface Scene3DProps {
  activeContainer: ContainerSpecification;
  optResult: StowageOptimizationResult;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  transformMode: TransformMode;
  onChangeTransformMode: (mode: TransformMode) => void;
  showWalls: boolean;
  onToggleWalls: () => void;
  showCogMarker: boolean;
  onToggleCogMarker: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  conflictingItemIds: Set<string>;
}

export const Scene3D: React.FC<Scene3DProps> = ({
  activeContainer,
  optResult,
  selectedId,
  onSelectId,
  transformMode,
  onChangeTransformMode,
  showWalls,
  onToggleWalls,
  showCogMarker,
  onToggleCogMarker,
  autoRotate,
  onToggleAutoRotate,
  conflictingItemIds,
}) => {
  return (
    <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col min-h-[460px]">
      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Button
          onClick={onToggleWalls}
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
          onClick={onToggleCogMarker}
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
          onClick={onToggleAutoRotate}
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
              onClick={() => onChangeTransformMode("translate")}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                transformMode === "translate"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400"
              }`}
            >
              Mover
            </button>
            <button
              onClick={() => onChangeTransformMode("rotate")}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                transformMode === "rotate"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400"
              }`}
            >
              Girar
            </button>
          </div>
        )}
      </div>

      {/* 3D Canvas */}
      <CanvasErrorBoundary>
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
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 15, 10]} intensity={1.5} />
            <directionalLight position={[-10, 8, -10]} intensity={0.6} />
            <hemisphereLight intensity={0.3} groundColor="#0f172a" />

            <ContainerShell3D
              container={activeContainer}
              showWalls={showWalls}
            />

            {optResult.packedItems.map((item) => (
              <CargoBox3D
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onSelect={onSelectId}
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
      </CanvasErrorBoundary>

      {/* CoG 2D Top-Down Radar HUD (Bottom Right of Canvas) */}
      <div className="absolute bottom-4 right-4 bg-slate-950/90 p-3 rounded-2xl border border-slate-800 text-white z-10 w-44 shadow-2xl">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
          <span className="flex items-center gap-1">
            <Scale size={12} className="text-amber-400" />
            Radar CoG 2D
          </span>
          <span className="font-mono text-[9px] text-slate-400">
            ±5% Tolerancia
          </span>
        </div>

        <div className="w-36 h-28 mx-auto relative border border-slate-700 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-x-0 h-px bg-slate-800"
            style={{ top: "50%" }}
          />
          <div
            className="absolute inset-y-0 w-px bg-slate-800"
            style={{ left: "50%" }}
          />
          <div
            className="absolute border border-dashed border-emerald-500/40 w-10 h-16 rounded"
            style={{ top: "calc(50% - 32px)", left: "calc(50% - 20px)" }}
          />
          <span className="absolute top-1 left-1.5 text-[8px] font-mono text-slate-500">
            FRONT (Nose)
          </span>
          <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-slate-500">
            DOOR
          </span>

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
          <span>
            Long: {optResult.centerOfGravity.longitudinalDeviationPercent}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default Scene3D;

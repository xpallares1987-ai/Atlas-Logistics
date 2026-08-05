import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Environment, Text } from "@react-three/drei";
import {
  Package,
  Box as BoxIcon,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface CargoItem {
  id: string;
  label: string;
  color: string;
  width: number;
  height: number;
  depth: number;
  weight: number;
  x: number;
  y: number;
  z: number;
}

// Single Box Component
const CargoBox = ({ position, color, size, label }: any) => {
  return (
    <group position={position}>
      <Box args={size}>
        <meshStandardMaterial color={color} roughness={0.7} />
      </Box>
      <Text position={[0, size[1] / 2 + 0.1, 0]} fontSize={0.2} color="black">
        {label}
      </Text>
    </group>
  );
};

// Container Component (40ft HQ representation)
const SeaContainer = ({ cargo }: { cargo: CargoItem[] }) => {
  return (
    <group>
      {/* Floor */}
      <Box args={[2.4, 0.1, 12]} position={[0, -0.05, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      {/* Back Wall */}
      <Box args={[2.4, 2.9, 0.1]} position={[0, 1.45, -6]}>
        <meshStandardMaterial color="#8b0000" />
      </Box>
      {/* Side Walls (Wireframe to see inside) */}
      <Box args={[0.1, 2.9, 12]} position={[-1.2, 1.45, 0]}>
        <meshStandardMaterial
          color="#8b0000"
          wireframe
          opacity={0.2}
          transparent
        />
      </Box>
      <Box args={[0.1, 2.9, 12]} position={[1.2, 1.45, 0]}>
        <meshStandardMaterial
          color="#8b0000"
          wireframe
          opacity={0.2}
          transparent
        />
      </Box>

      {/* Cargo Payload */}
      {cargo.map((item) => (
        <CargoBox
          key={item.id}
          position={[item.x, item.y, item.z]}
          color={item.color}
          size={[item.width, item.height, item.depth]}
          label={item.label}
        />
      ))}
    </group>
  );
};

export default function ContainerPlannerModule() {
  const queryClient = useQueryClient();
  const [suggestion, setSuggestion] = useState<string>(
    "Weight distribution is sub-optimal. Run AI optimization to balance the axle load.",
  );

  // Fetch the first available container to plan
  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/operations/containers`);
      return res.json();
    },
  });

  const activeContainerId = containers?.[0]?.id;

  const { data: cargo = [], isLoading } = useQuery({
    queryKey: ["cargo", activeContainerId],
    queryFn: async () => {
      if (!activeContainerId) return [];
      const res = await fetch(
        `${API_URL}/operations/containers/${activeContainerId}/cargo`,
      );
      return res.json();
    },
    enabled: !!activeContainerId,
  });

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!activeContainerId) return;
      const res = await fetch(
        `${API_URL}/operations/containers/${activeContainerId}/optimize-load`,
        {
          method: "POST",
        },
      );
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["cargo", activeContainerId], data.items);
      setSuggestion(data.suggestion);
    },
  });

  const totalCbm = cargo.reduce(
    (acc: number, item: CargoItem) =>
      acc + item.width * item.height * item.depth,
    0,
  );
  const totalWeight = cargo.reduce(
    (acc: number, item: CargoItem) => acc + item.weight,
    0,
  );

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Package className="text-indigo-600" size={32} />
            LCL Container Planner 3D
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            AI-driven 3D load optimization for less-than-container load (LCL)
            shipments.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => optimizeMutation.mutate()}
            disabled={optimizeMutation.isPending || !activeContainerId}
            className="flex items-center gap-2 bg-indigo-600 border border-transparent text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
          >
            {optimizeMutation.isPending ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              "Auto Optimize (AI)"
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-[500px]">
        {/* Left Side: 3D Canvas */}
        <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden relative shadow-inner">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                Cargando Motor 3D...
              </div>
            }
          >
            <Canvas camera={{ position: [5, 4, 8], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <Environment preset="city" />
              {!isLoading && <SeaContainer cargo={cargo} />}
              <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
            </Canvas>
          </Suspense>

          <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur-md text-white p-4 rounded-2xl">
            <p className="font-bold text-sm">
              {containers?.[0]?.containerType || "40ft High Cube"}
            </p>
            <p className="text-xs text-slate-300">
              Total Volume: {totalCbm.toFixed(1)} CBM
            </p>
            <p className="text-xs text-slate-300">
              Total Weight: {totalWeight.toFixed(0)} kg
            </p>
          </div>
        </div>

        {/* Right Side: Payload Stats */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm flex-1 overflow-y-auto">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <BoxIcon size={18} /> Cargo List
            </h3>
            <div className="flex flex-col gap-3">
              {cargo.map((item: CargoItem) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-sm p-3 rounded-xl border"
                  style={{
                    backgroundColor: `${item.color}15`,
                    borderColor: `${item.color}30`,
                  }}
                >
                  <span className="font-bold" style={{ color: item.color }}>
                    {item.label}
                  </span>
                  <span className="text-slate-600 font-mono">
                    {(item.width * item.height * item.depth).toFixed(1)} CBM
                  </span>
                </div>
              ))}
              {cargo.length === 0 && !isLoading && (
                <p className="text-sm text-slate-500">
                  No cargo items found for this container.
                </p>
              )}
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-600/30 flex items-start gap-4">
            <AlertTriangle className="shrink-0" />
            <div>
              <h4 className="font-bold text-indigo-50">AI Suggestion</h4>
              <p className="text-indigo-200 text-sm mt-1 leading-relaxed">
                {suggestion}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Environment, Text } from "@react-three/drei";
import { Package, Box as BoxIcon, AlertTriangle } from "lucide-react";

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
const SeaContainer = () => {
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
      <CargoBox
        position={[-0.6, 0.5, -5]}
        color="#4ade80"
        size={[1, 1, 1]}
        label="ORD-01"
      />
      <CargoBox
        position={[0.6, 0.5, -5]}
        color="#f43f5e"
        size={[1, 1, 1]}
        label="ORD-02"
      />
      <CargoBox
        position={[-0.6, 1.5, -5]}
        color="#60a5fa"
        size={[1, 1, 1]}
        label="ORD-03"
      />

      {/* More payload in front */}
      <CargoBox
        position={[0, 0.5, -3.5]}
        color="#fbbf24"
        size={[1.5, 1, 1.5]}
        label="Heavy"
      />
    </group>
  );
};

export default function ContainerPlannerModule() {
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
          <button className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
            Auto Optimize (AI)
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
              <SeaContainer />
              <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
            </Canvas>
          </Suspense>

          <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur-md text-white p-4 rounded-2xl">
            <p className="font-bold text-sm">40ft High Cube</p>
            <p className="text-xs text-slate-300">Volumen utilizado: 68%</p>
          </div>
        </div>

        {/* Right Side: Payload Stats */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <BoxIcon size={18} /> Cargo List
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-800">ORD-01</span>
                <span className="text-emerald-600 font-mono">1.0 CBM</span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-rose-50 rounded-xl border border-rose-100">
                <span className="font-bold text-rose-800">ORD-02</span>
                <span className="text-rose-600 font-mono">1.0 CBM</span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="font-bold text-amber-800">Heavy</span>
                <span className="text-amber-600 font-mono">2.2 CBM</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-600/30 flex items-start gap-4">
            <AlertTriangle className="shrink-0" />
            <div>
              <h4 className="font-bold text-indigo-50">AI Suggestion</h4>
              <p className="text-indigo-200 text-sm mt-1 leading-relaxed">
                El peso en el eje trasero excede el límite recomendado. Mueve el
                paquete "Heavy" hacia el centro del contenedor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

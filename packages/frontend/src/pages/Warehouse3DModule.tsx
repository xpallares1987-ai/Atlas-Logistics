import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Box, Text, Plane, Html } from '@react-three/drei';
import { Package, Activity, Boxes } from 'lucide-react';
import * as THREE from 'three';

// Rack component
function Rack({ position, id, fill }: { position: [number, number, number], id: string, fill: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group position={position}>
      {/* Rack structure */}
      <Box args={[1, 4, 3]} position={[0, 2, 0]}>
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </Box>
      {/* Visual representation of fill level */}
      <Box args={[0.9, 3.8 * (fill / 100), 2.9]} position={[0, 0.1 + (1.9 * (fill / 100)), 0]}>
        <meshStandardMaterial 
          color={fill > 80 ? '#ef4444' : fill > 50 ? '#eab308' : '#3b82f6'} 
          transparent 
          opacity={0.8}
        />
      </Box>
      <Html position={[0, 4.5, 0]} center>
        <div className="bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-slate-200 border border-slate-700 pointer-events-none whitespace-nowrap">
          {id} ({fill}%)
        </div>
      </Html>
    </group>
  );
}

function MovingForklift() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      // Simple path animation
      groupRef.current.position.x = Math.sin(t * 0.5) * 5;
      groupRef.current.position.z = Math.cos(t * 0.5) * 2 + 2;
      groupRef.current.rotation.y = (t * 0.5) + Math.PI / 2;
    }
  });

  return (
    <group ref={groupRef}>
      <Box args={[1, 0.8, 1.5]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#f59e0b" />
      </Box>
      <Box args={[0.8, 1, 0.8]} position={[0, 1.3, -0.2]}>
        <meshStandardMaterial color="#1e293b" transparent opacity={0.6} />
      </Box>
    </group>
  );
}

export default function Warehouse3DModule() {
  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-200">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl z-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Boxes className="w-7 h-7 text-indigo-400" />
            Warehouse Digital Twin
          </h2>
          <p className="text-sm text-slate-400 mt-1">Real-time 3D inventory visualization and utilization tracking.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 px-5 flex items-center gap-3 shadow-lg">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Overall Capacity</p>
              <p className="text-lg font-bold text-white">76.4%</p>
            </div>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 px-5 flex items-center gap-3 shadow-lg">
            <Package className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Movements</p>
              <p className="text-lg font-bold text-white">12 ops/hr</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative cursor-move">
        <Canvas camera={{ position: [10, 8, 10], fov: 45 }}>
          <color attach="background" args={['#020617']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          
          <Suspense fallback={
            <Html center>
              <div className="text-blue-400 font-mono text-sm tracking-widest animate-pulse">LOADING TWIN...</div>
            </Html>
          }>
            <Environment preset="night" />
            
            {/* Floor */}
            <Plane args={[30, 30]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </Plane>
            
            <gridHelper args={[30, 30, '#1e293b', '#0f172a']} />

            {/* Aisles & Racks */}
            <Rack position={[-4, 0, -4]} id="A1-01" fill={85} />
            <Rack position={[-4, 0, 0]} id="A1-02" fill={92} />
            <Rack position={[-4, 0, 4]} id="A1-03" fill={40} />

            <Rack position={[0, 0, -4]} id="A2-01" fill={60} />
            <Rack position={[0, 0, 0]} id="A2-02" fill={20} />
            <Rack position={[0, 0, 4]} id="A2-03" fill={75} />

            <Rack position={[4, 0, -4]} id="A3-01" fill={10} />
            <Rack position={[4, 0, 0]} id="A3-02" fill={95} />
            <Rack position={[4, 0, 4]} id="A3-03" fill={55} />

            <MovingForklift />
            <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
          </Suspense>
        </Canvas>

        {/* Legend Overlay */}
        <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">Capacity Heatmap</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500 opacity-80"></div>
              <span className="text-xs text-slate-400">&gt; 80% (Critical)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500 opacity-80"></div>
              <span className="text-xs text-slate-400">50 - 80% (Moderate)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500 opacity-80"></div>
              <span className="text-xs text-slate-400">&lt; 50% (Available)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

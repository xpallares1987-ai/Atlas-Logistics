import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Globe2 } from 'lucide-react';
import { useShipments } from '../../../hooks/useShipments';

function WireframeGlobe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere args={[2, 64, 64]}>
        <meshBasicMaterial color="#1e293b" transparent opacity={0.8} />
      </Sphere>
      
      {/* Wireframe outer shell */}
      <Sphere args={[2.02, 32, 32]}>
        <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.15} />
      </Sphere>
      
      {/* Some glowing nodes to simulate active ports/ships */}
      <mesh position={[1.5, 0.5, 1.2]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>
      <mesh position={[-1.2, 0.8, -1.4]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[0.5, -1.2, 1.5]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#f472b6" />
      </mesh>
      
      {/* Connecting curves */}
      <Line
        points={[[1.5, 0.5, 1.2], [0.5, -1.2, 1.5]]}
        color="#34d399"
        lineWidth={2}
        transparent
        opacity={0.5}
      />
      <Line
        points={[[-1.2, 0.8, -1.4], [1.5, 0.5, 1.2]]}
        color="#6366f1"
        lineWidth={1.5}
        transparent
        opacity={0.3}
      />
    </group>
  );
}

export function GlobeWidget() {
  const { data: shipments = [] } = useShipments();
  const activeCount = shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'Departed').length;
  const displayCount = activeCount;
  const portCalls = Math.floor(activeCount / 10);

  return (
    <div className="rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 overflow-hidden shadow-xl h-full flex flex-col relative group">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none" />
      <div className="absolute top-6 left-6 z-20">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Globe2 className="w-5 h-5" />
          </div>
          Global Operations
        </h2>
        <p className="text-slate-400 text-sm mt-1">Live tracking of fleet & cargo</p>
      </div>
      
      <div className="absolute bottom-6 left-6 z-20 flex gap-4">
        <div className="flex flex-col">
          <span className="text-3xl font-bold text-white">{displayCount}</span>
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Vessels at Sea</span>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="flex flex-col">
          <span className="text-3xl font-bold text-emerald-400">{portCalls}</span>
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Port Calls Today</span>
        </div>
      </div>

      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <WireframeGlobe />
        </Canvas>
      </div>
    </div>
  );
}

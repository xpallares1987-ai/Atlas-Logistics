import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

interface GlobeProps {
  shipments: any[];
}

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.001; // rotación lenta
    }
  });

  return (
    <Sphere ref={earthRef} args={[2, 64, 64]}>
      <meshStandardMaterial
        color="#0f172a"
        roughness={0.7}
        metalness={0.1}
        wireframe={true} // Wireframe style to match dark glassmorphism
        transparent={true}
        opacity={0.3}
      />
    </Sphere>
  );
}

function Markers({ shipments }: { shipments: any[] }) {
  // Convert lat/long to 3D spherical coordinates
  // For this mock, we'll place some random dots
  const points = useMemo(() => {
    return shipments.map((s, i) => {
      const phi = Math.acos(-1 + (2 * i) / shipments.length);
      const theta = Math.sqrt(shipments.length * Math.PI) * phi;
      const x = 2.1 * Math.cos(theta) * Math.sin(phi);
      const y = 2.1 * Math.sin(theta) * Math.sin(phi);
      const z = 2.1 * Math.cos(phi);
      return { position: [x, y, z] as [number, number, number], data: s };
    });
  }, [shipments]);

  return (
    <>
      {points.map((p, i) => (
        <group key={i} position={p.position}>
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          {/* Opcional: Html de react-three/drei para tooltips */}
          <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div className="bg-slate-900/80 backdrop-blur border border-sky-500/30 text-sky-300 text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
              {p.data.shipment_ref || `SHP-${i}`}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

export function InteractiveGlobe({ shipments = [] }: GlobeProps) {
  return (
    <div className="w-full h-full min-h-[400px] relative bg-slate-950/50 rounded-2xl overflow-hidden border border-slate-800">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 pointer-events-none" />
      <div className="absolute top-4 left-4 z-20">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Global Tracking
        </h3>
        <p className="text-slate-400 text-xs">Interactive WebGL 3D Globe</p>
      </div>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#38bdf8" />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#818cf8" />
        <Earth />
        <Markers shipments={shipments} />
        <OrbitControls enableZoom={true} enablePan={false} autoRotate={true} autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}

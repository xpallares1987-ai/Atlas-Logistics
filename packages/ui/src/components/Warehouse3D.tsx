import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";

interface PalletProps {
  position: [number, number, number];
  color: string;
  data: {
    sku: string;
    weight: number;
    destination: string;
  };
}

const Pallet = ({ position, color, data }: PalletProps) => {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          setClicked(!clicked);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={hovered ? "white" : color} />
      </mesh>

      {/* Wooden pallet base */}
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[1.1, 0.2, 1.1]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>

      {(clicked || hovered) && (
        <Html position={[0, 1.2, 0]} center>
          <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-lg shadow-xl border border-slate-700 pointer-events-none min-w-[150px]">
            <h4 className="font-bold text-sm text-indigo-400 mb-1 border-b border-slate-700 pb-1">
              {data.sku}
            </h4>
            <div className="flex justify-between text-xs my-1">
              <span className="text-slate-400">Weight:</span>
              <span className="font-mono">{data.weight} kg</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Dest:</span>
              <span className="font-semibold text-emerald-400">
                {data.destination}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

const Rack = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Vertical posts */}
      <mesh position={[-2, 0, -0.5]}>
        <boxGeometry args={[0.2, 6, 0.2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[2, 0, -0.5]}>
        <boxGeometry args={[0.2, 6, 0.2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[-2, 0, 0.5]}>
        <boxGeometry args={[0.2, 6, 0.2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[2, 0, 0.5]}>
        <boxGeometry args={[0.2, 6, 0.2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Horizontal beams */}
      {[-2, 0, 2].map((y, idx) => (
        <group key={`beam-${idx}`} position={[0, y, 0]}>
          <mesh position={[0, 0, -0.5]}>
            <boxGeometry args={[4.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[0, 0, 0.5]}>
            <boxGeometry args={[4.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          {/* Depth supports */}
          <mesh position={[-2, 0, 0]}>
            <boxGeometry args={[0.2, 0.2, 1.2]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.2, 0.2, 1.2]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[2, 0, 0]}>
            <boxGeometry args={[0.2, 0.2, 1.2]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Warehouse3D = () => {
  const [pallets, setPallets] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/operations/warehouse/inventory")
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !json.data) return;
        
        // Map backend data to 3D pallets, generating random positions for racks
        const mappedPallets = json.data.map((item: any, i: number) => {
          // simple logic to place pallets across 3 racks (z: -4, 0, 4), and random heights
          const rackZ = [-4, 0, 4][i % 3];
          const rackX = -2 + (i % 3) * 2; // -2, 0, 2
          const rackY = 0.5 + Math.floor(i / 3) * 2; // stacking up
          
          return {
            pos: [rackX, rackY, rackZ],
            color: item.zone === "DRY" ? "#ef4444" : "#3b82f6",
            sku: item.productCode || item.id,
            weight: item.metadata?.grossWeight || item.quantity || 100,
            destination: item.customer || "Unknown",
          };
        });
        
        setPallets(mappedPallets);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="w-full h-full min-h-[400px] md:min-h-[600px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-700/50 shadow-2xl">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-lg border border-slate-700 text-sm">
        <span className="font-bold text-indigo-400">Interactive 3D View</span>
        <p className="text-xs text-slate-300 mt-1">
          Drag to rotate • Scroll to zoom • Click pallets for details
        </p>
      </div>

      <Canvas camera={{ position: [8, 5, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#1e293b" />
          <gridHelper
            args={[30, 30, "#334155", "#0f172a"]}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, 0.01]}
          />
        </mesh>

        {/* Racks */}
        <Rack position={[0, 0, 0]} />
        <Rack position={[0, 0, 4]} />
        <Rack position={[0, 0, -4]} />

        {/* Pallets */}
        {pallets.map((p, i) => (
          <Pallet
            key={i}
            position={p.pos as [number, number, number]}
            color={p.color}
            data={p}
          />
        ))}

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera from going below floor
        />
      </Canvas>
    </div>
  );
};

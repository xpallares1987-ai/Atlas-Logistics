import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";
import { PackedItem } from "./LclConsolidationEngine";

interface Lcl3DVisualizerProps {
  containerSpec: {
    length: number;
    width: number;
    height: number;
    name: string;
  };
  packedItems: PackedItem[];
}

export function Lcl3DVisualizer({
  containerSpec,
  packedItems,
}: Lcl3DVisualizerProps) {
  // We want the container centered at (0,0,0) in Three.js space.
  // Three.js coordinates: Y is UP (height), X is RIGHT (width), Z is OUT/DEPTH (length).
  const cWidth = containerSpec.width;
  const cHeight = containerSpec.height;
  const cLength = containerSpec.length;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#0f172a",
      }}
    >
      <Canvas
        camera={{
          position: [cWidth * 1.5, cHeight * 1.5, cLength * 1.2],
          fov: 45,
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

        <OrbitControls
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2 + 0.1}
        />

        {/* Container Floor */}
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cWidth, cLength]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Container Wireframe */}
        <mesh position={[0, cHeight / 2, 0]}>
          <boxGeometry args={[cWidth, cHeight, cLength]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.05} />
          <Edges scale={1} color="#64748b" />
        </mesh>

        {/* Cargo Items */}
        {packedItems.map((item) => {
          // item.x is along container length (depth)
          // item.y is along container width (right/left)
          // item.z is along container height (up/down)

          // Map to Three.js coords (Center is 0,0,0)
          // For width (Three.x): from -cWidth/2 to cWidth/2
          const posX = item.y + item.width / 2 - cWidth / 2;

          // For height (Three.y): from 0 to cHeight
          const posY = item.z + item.height / 2;

          // For length (Three.z): from -cLength/2 to cLength/2
          const posZ = item.x + item.length / 2 - cLength / 2;

          return (
            <mesh key={item.id} position={[posX, posY, posZ]}>
              <boxGeometry args={[item.width, item.height, item.length]} />
              <meshStandardMaterial color={item.color} roughness={0.7} />
              <Edges scale={1} color="#ffffff" opacity={0.5} transparent />
            </mesh>
          );
        })}
      </Canvas>
    </div>
  );
}

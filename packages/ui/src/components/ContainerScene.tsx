import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";
import * as THREE from "three";

export interface PackedItem {
  id: string;
  clientId?: string;
  clientName?: string;
  color?: string;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  isStacked: boolean;
}

interface ContainerSceneProps {
  container: {
    length: number;
    width: number;
    height: number;
  };
  packedItems: PackedItem[];
  viewMode: "3d" | "top" | "side";
}

export function ContainerScene({
  container,
  packedItems,
  viewMode,
}: ContainerSceneProps) {
  // Determine camera position based on view mode
  const cameraConfig = useMemo(() => {
    if (viewMode === "top") {
      return {
        position: [0, Math.max(container.length, container.width) * 1.5, 0],
        fov: 45,
      };
    }
    if (viewMode === "side") {
      return {
        position: [
          0,
          container.height / 2,
          Math.max(container.length, container.width) * 1.5,
        ],
        fov: 45,
      };
    }
    // Default 3D Isometric
    return {
      position: [
        container.length * 0.8,
        container.height * 1.5,
        container.width * 1.2,
      ],
      fov: 45,
    };
  }, [viewMode, container]);

  return (
    <Canvas
      camera={{
        position: cameraConfig.position as [number, number, number],
        fov: cameraConfig.fov,
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 5, -10]} intensity={0.5} />

      {/* OrbitControls adapts to allow rotation in 3D, but locks rotation in Top/Side views */}
      <OrbitControls
        makeDefault
        enableRotate={viewMode === "3d"}
        target={[0, container.height / 2, 0]}
      />

      {/* Main Group centered around the origin */}
      <group position={[-container.length / 2, 0, -container.width / 2]}>
        {/* Container Wireframe Box */}
        <mesh
          position={[
            container.length / 2,
            container.height / 2,
            container.width / 2,
          ]}
        >
          <boxGeometry
            args={[container.length, container.height, container.width]}
          />
          <meshBasicMaterial
            color="#a0aec0"
            transparent
            opacity={0.05}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
          <Edges scale={1} threshold={15} color="#cbd5e1" />
        </mesh>

        {/* Floor Grid representing Container floor */}
        <gridHelper
          args={[
            Math.max(container.length, container.width) * 2,
            Math.max(container.length, container.width) * 2,
            "#475569",
            "#334155",
          ]}
          position={[container.length / 2, 0.01, container.width / 2]}
        />

        {/* Packed Cargo Items */}
        {packedItems.map((item) => {
          // ThreeJS coordinates: Y is up. Container z maps to ThreeJS Y. Container y maps to ThreeJS Z.
          // Center of the box is at length/2, height/2, width/2 relative to its own corner.
          const px = item.x + item.length / 2;
          const py = item.z + item.height / 2;
          const pz = item.y + item.width / 2;

          return (
            <mesh key={item.id} position={[px, py, pz]}>
              <boxGeometry args={[item.length, item.height, item.width]} />
              <meshStandardMaterial
                color={item.color || "#3b82f6"}
                roughness={0.4}
                metalness={0.1}
              />
              <Edges scale={1} threshold={15} color="#ffffff" />
            </mesh>
          );
        })}
      </group>
    </Canvas>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";

export interface Marker {
  lat: number;
  lng: number;
  name: string;
  color?: string;
  size?: number;
}

export interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color?: string;
}

export interface GlobeTrackerProps {
  markers?: Marker[];
  arcs?: Arc[];
  width?: number;
  height?: number;
  className?: string;
  onGlobeReady?: (methods: GlobeMethods) => void;
  autoRotateSpeed?: number;
}

export function GlobeTracker({
  markers = [],
  arcs = [],
  width,
  height,
  className = "",
  onGlobeReady,
  autoRotateSpeed = 0.5,
}: GlobeTrackerProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: width || 800,
    height: height || 600,
  });

  useEffect(() => {
    setMounted(true);
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: width || clientWidth || 800,
          height: height || clientHeight || 600,
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [width, height]);

  useEffect(() => {
    if (mounted && globeRef.current) {
      // Auto-rotate
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = autoRotateSpeed;

      // Setup initial view
      if (markers.length > 0) {
        globeRef.current.pointOfView(
          { lat: markers[0].lat, lng: markers[0].lng, altitude: 2 },
          1000,
        );
      } else {
        globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
      }

      if (onGlobeReady) {
        onGlobeReady(globeRef.current);
      }
    }
  }, [mounted, markers, autoRotateSpeed, onGlobeReady]);

  if (!mounted) {
    return (
      <div
        className={`animate-pulse bg-slate-900/60 rounded-2xl w-full h-full min-h-[400px] flex items-center justify-center ${className}`}
      >
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Iniciando Motor 3D WebGL...
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative w-full h-full ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-slate-950/40 pointer-events-none z-10" />
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"

        // Markers
        labelsData={markers}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => d.name}
        labelSize={(d: any) => d.size || 1.5}
        labelDotRadius={(d: any) => (d.size || 1.5) / 2}
        labelColor={(d: any) => d.color || "#10b981"}
        labelResolution={2}

        // Arcs
        arcsData={arcs}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => [d.color || "#38bdf8", d.color || "#10b981"]}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1600}
        arcsTransitionDuration={1000}
      />
    </div>
  );
}

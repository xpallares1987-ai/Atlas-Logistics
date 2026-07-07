"use client";

import { useEffect, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";

interface Marker {
  lat: number;
  lng: number;
  name: string;
  color?: string;
  size?: number;
}

interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color?: string;
}

interface GlobeTrackerProps {
  markers?: Marker[];
  arcs?: Arc[];
  width?: number;
  height?: number;
}

export function GlobeTracker({ markers = [], arcs = [], width, height }: GlobeTrackerProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (globeRef.current) {
      // Auto-rotate
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      
      // Setup initial view
      if (markers.length > 0) {
        globeRef.current.pointOfView({ lat: markers[0].lat, lng: markers[0].lng, altitude: 2 }, 1000);
      } else {
        globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
      }
    }
  }, [markers]);

  if (!mounted) return <div className="animate-pulse bg-slate-800/50 rounded-2xl w-full h-full min-h-[400px]"></div>;

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl relative">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none z-10" />
      <Globe
        ref={globeRef}
        width={width}
        height={height || 400}
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
        arcColor={(d: any) => [d.color || "#3b82f6", d.color || "#10b981"]}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcsTransitionDuration={1000}
      />
    </div>
  );
}

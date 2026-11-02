import { useState, useRef, useMemo } from "react";
import {
  GlobeTracker,
  Marker,
  Arc,
} from "@atlas/ui/src/components/GlobeTracker";
// @ts-ignore
import type { GlobeMethods } from "react-globe.gl";
import {
  Ship,
  Compass,
  Navigation,
  Globe2,
  Anchor,
  Activity,
  Layers,
  ChevronRight,
  Maximize2,
} from "lucide-react";

interface FleetVessel {
  id: string;
  name: string;
  carrier: string;
  teu: string;
  corridor: string;
  lat: number;
  lng: number;
  speed: string;
  eta: string;
  status: "On Time" | "Delayed" | "Approaching";
}

const GLOBAL_PORTS: Marker[] = [
  {
    lat: 31.2304,
    lng: 121.4737,
    name: "Shanghai (CNSHA)",
    color: "#38bdf8",
    size: 2.2,
  },
  {
    lat: 51.9244,
    lng: 4.4777,
    name: "Rotterdam (NLRTM)",
    color: "#10b981",
    size: 2.2,
  },
  {
    lat: 1.3521,
    lng: 103.8198,
    name: "Singapore (SGSIN)",
    color: "#f59e0b",
    size: 2.2,
  },
  {
    lat: 33.7432,
    lng: -118.2673,
    name: "Los Angeles (USLAX)",
    color: "#818cf8",
    size: 2.2,
  },
  {
    lat: 39.4699,
    lng: -0.3763,
    name: "Valencia (ESVLC)",
    color: "#ec4899",
    size: 2.0,
  },
  {
    lat: 40.7128,
    lng: -74.006,
    name: "New York (USNYC)",
    color: "#06b6d4",
    size: 2.2,
  },
  {
    lat: 53.5511,
    lng: 9.9937,
    name: "Hamburg (DEHAM)",
    color: "#a855f7",
    size: 2.0,
  },
  {
    lat: 25.2048,
    lng: 55.2708,
    name: "Dubai (AEDXB)",
    color: "#f97316",
    size: 2.0,
  },
  {
    lat: 35.6762,
    lng: 139.6503,
    name: "Tokyo (JPTYO)",
    color: "#2dd4bf",
    size: 2.0,
  },
  {
    lat: -23.9618,
    lng: -46.3322,
    name: "Santos (BRSSZ)",
    color: "#eab308",
    size: 2.0,
  },
];

const SHIPPING_ARCS: Arc[] = [
  // Asia - Europe via Suez
  {
    startLat: 31.2304,
    startLng: 121.4737,
    endLat: 1.3521,
    endLng: 103.8198,
    color: "#38bdf8",
  },
  {
    startLat: 1.3521,
    startLng: 103.8198,
    endLat: 25.2048,
    endLng: 55.2708,
    color: "#f59e0b",
  },
  {
    startLat: 25.2048,
    startLng: 55.2708,
    endLat: 39.4699,
    endLng: -0.3763,
    color: "#10b981",
  },
  {
    startLat: 39.4699,
    startLng: -0.3763,
    endLat: 51.9244,
    endLng: 4.4777,
    color: "#10b981",
  },
  // Transpacific
  {
    startLat: 31.2304,
    startLng: 121.4737,
    endLat: 33.7432,
    endLng: -118.2673,
    color: "#818cf8",
  },
  {
    startLat: 35.6762,
    startLng: 139.6503,
    endLat: 33.7432,
    endLng: -118.2673,
    color: "#2dd4bf",
  },
  // Transatlantic
  {
    startLat: 51.9244,
    startLng: 4.4777,
    endLat: 40.7128,
    endLng: -74.006,
    color: "#06b6d4",
  },
  {
    startLat: 39.4699,
    startLng: -0.3763,
    endLat: 40.7128,
    endLng: -74.006,
    color: "#ec4899",
  },
  // Asia - Latin America
  {
    startLat: 31.2304,
    startLng: 121.4737,
    endLat: -23.9618,
    endLng: -46.3322,
    color: "#eab308",
  },
];

const FLEET_VESSELS: FleetVessel[] = [
  {
    id: "v-01",
    name: "MADRID MAERSK",
    carrier: "Maersk Line",
    teu: "20,568 TEU",
    corridor: "CNSHA → NLRTM",
    lat: 18.4522,
    lng: 62.1544,
    speed: "18.4 kts",
    eta: "In 4 Days",
    status: "On Time",
  },
  {
    id: "v-02",
    name: "MSC OSCAR",
    carrier: "MSC Mediterranean",
    teu: "19,224 TEU",
    corridor: "SGSIN → ESVLC",
    lat: 12.8341,
    lng: 48.2319,
    speed: "16.8 kts",
    eta: "In 6 Days",
    status: "Delayed",
  },
  {
    id: "v-03",
    name: "CMA CGM JACQUES SAADE",
    carrier: "CMA CGM",
    teu: "23,000 TEU LNG",
    corridor: "CNSHA → NLRTM",
    lat: 34.1205,
    lng: 24.5122,
    speed: "19.5 kts",
    eta: "In 2 Days",
    status: "Approaching",
  },
  {
    id: "v-04",
    name: "BERLIN EXPRESS",
    carrier: "Hapag-Lloyd",
    teu: "23,666 TEU",
    corridor: "NLRTM → USNYC",
    lat: 44.2311,
    lng: -32.8415,
    speed: "17.4 kts",
    eta: "In 5 Days",
    status: "On Time",
  },
  {
    id: "v-05",
    name: "COSCO SHIPPING TAURUS",
    carrier: "COSCO Shipping",
    teu: "20,119 TEU",
    corridor: "CNNGB → USLAX",
    lat: 28.5112,
    lng: -152.1245,
    speed: "18.0 kts",
    eta: "In 3 Days",
    status: "On Time",
  },
  {
    id: "v-06",
    name: "ONE STORK",
    carrier: "ONE Ocean Network",
    teu: "14,000 TEU",
    corridor: "JPTYO → USLAX",
    lat: 32.1892,
    lng: -168.4512,
    speed: "17.9 kts",
    eta: "In 4 Days",
    status: "On Time",
  },
];

export default function GlobeTrackerModule() {
  const globeInstanceRef = useRef<GlobeMethods | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<FleetVessel | null>(
    null,
  );
  const [showArcs, setShowArcs] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  // Combine Port Markers + Live Vessel Markers
  const activeMarkers = useMemo(() => {
    const vesselMarkers: Marker[] = FLEET_VESSELS.map((v) => ({
      lat: v.lat,
      lng: v.lng,
      name: `🚢 ${v.name} (${v.speed})`,
      color: v.status === "Delayed" ? "#f43f5e" : "#38bdf8",
      size: 2.8,
    }));
    return [...GLOBAL_PORTS, ...vesselMarkers];
  }, []);

  const handleSelectVessel = (vessel: FleetVessel) => {
    setSelectedVessel(vessel);
    if (globeInstanceRef.current) {
      globeInstanceRef.current.controls().autoRotate = false;
      setAutoRotate(false);
      globeInstanceRef.current.pointOfView(
        { lat: vessel.lat, lng: vessel.lng, altitude: 1.6 },
        1200,
      );
    }
  };

  const toggleAutoRotate = () => {
    const nextState = !autoRotate;
    setAutoRotate(nextState);
    if (globeInstanceRef.current) {
      globeInstanceRef.current.controls().autoRotate = nextState;
      if (nextState) {
        globeInstanceRef.current.controls().autoRotateSpeed = 0.5;
      }
    }
  };

  const resetGlobalView = () => {
    setSelectedVessel(null);
    setAutoRotate(true);
    if (globeInstanceRef.current) {
      globeInstanceRef.current.controls().autoRotate = true;
      globeInstanceRef.current.controls().autoRotateSpeed = 0.5;
      globeInstanceRef.current.pointOfView(
        { lat: 20, lng: 0, altitude: 2.5 },
        1200,
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Top Telemetry Bar */}
      <div className="z-20 px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              Radar Global 3D & Telemetría AIS de Flota
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-widest animate-pulse">
                EN VIVO
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Seguimiento geoespacial en tiempo real de buques oceánicos y
              corredores marítimos estratégicos
            </p>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center gap-6 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Buques Activos
              </div>
              <div className="font-mono font-bold text-white">42 en Ruta</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Corredores
              </div>
              <div className="font-mono font-bold text-white">8 Conectados</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Puertos Hub
              </div>
              <div className="font-mono font-bold text-white">
                10 Monitoreados
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Índice Puntualidad
              </div>
              <div className="font-mono font-bold text-emerald-400">
                98.6% OTP
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArcs(!showArcs)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showArcs
                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Rutas
          </button>
          <button
            onClick={toggleAutoRotate}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              autoRotate
                ? "bg-cyan-600/20 border-cyan-500/40 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <Navigation
              className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`}
            />
            {autoRotate ? "Auto-Giro ON" : "Auto-Giro OFF"}
          </button>
          <button
            onClick={resetGlobalView}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Restablecer Vista Global"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Container & Side Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Full 3D Globe Canvas */}
        <div className="flex-1 w-full h-full relative">
          <GlobeTracker
            markers={activeMarkers}
            arcs={showArcs ? SHIPPING_ARCS : []}
            onGlobeReady={(methods) => {
              globeInstanceRef.current = methods;
            }}
            className="w-full h-full"
            autoRotateSpeed={autoRotate ? 0.5 : 0}
          />

          {/* Floating Selected Vessel Detail Card */}
          {selectedVessel && (
            <div className="absolute top-6 left-6 z-30 max-w-sm w-full bg-slate-900/90 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-5 shadow-2xl shadow-cyan-950/50 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                    AIS TELEMETRÍA EN DIRECTO
                  </div>
                  <h3 className="text-base font-black text-white mt-0.5">
                    {selectedVessel.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedVessel.carrier} · {selectedVessel.teu}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    selectedVessel.status === "Delayed"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {selectedVessel.status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">
                    Corredor
                  </div>
                  <div className="font-mono font-bold text-slate-200 mt-0.5">
                    {selectedVessel.corridor}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">
                    Velocidad GPS
                  </div>
                  <div className="font-mono font-bold text-cyan-300 mt-0.5">
                    {selectedVessel.speed}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">
                    Posición Coords
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    {selectedVessel.lat.toFixed(2)}°N,{" "}
                    {selectedVessel.lng.toFixed(2)}°E
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">
                    Estimación Llegada
                  </div>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">
                    {selectedVessel.eta}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedVessel(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors w-full"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Fleet List */}
        <div className="w-80 border-l border-slate-800 bg-slate-900/90 backdrop-blur-2xl flex flex-col shrink-0 z-20">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Ship className="w-4 h-4 text-indigo-400" />
              Flota Oceánica Primaria
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              {FLEET_VESSELS.length} Buques
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2 space-y-1">
            {FLEET_VESSELS.map((v) => {
              const isSelected = selectedVessel?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => handleSelectVessel(v)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                    isSelected
                      ? "bg-indigo-600/20 border border-indigo-500/40 shadow-lg shadow-indigo-950/40"
                      : "hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs text-white group-hover:text-cyan-300 truncate transition-colors flex items-center gap-1.5">
                      <span>{v.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {v.corridor}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 font-mono">
                      <span>{v.speed}</span>
                      <span>•</span>
                      <span
                        className={
                          v.status === "Delayed"
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }
                      >
                        {v.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected
                        ? "text-cyan-400 translate-x-1"
                        : "text-slate-600 group-hover:text-slate-400"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

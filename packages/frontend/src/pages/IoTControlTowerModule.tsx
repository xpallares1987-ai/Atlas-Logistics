import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Satellite,
  Ship,
  Plane,
  Truck,
  TrainTrack,
  Thermometer,
  Droplets,
  Zap,
  Shield,
  ShieldAlert,
  Battery,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Navigation,
  Clock,
  Activity,
  Play,
  Pause,
  SkipForward,
  RefreshCw,
} from "lucide-react";
import { useApiQuery, useApiMutation } from "../hooks/useApiQuery";
import { Button } from "@atlas/ui";

export default function IoTControlTowerModule() {
  const [activeTab, setActiveTab] = useState<
    "MAP" | "SENSORS" | "ALERTS" | "PLAYBACK"
  >("MAP");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: summary, refetch: refetchSummary } = useApiQuery<any>(
    ["telemetry-summary"],
    "/telemetry/summary",
  );
  const { data: assets = [], refetch: refetchAssets } = useApiQuery<any[]>(
    ["telemetry-assets"],
    "/telemetry/assets",
  );
  const { data: geofences = [] } = useApiQuery<any[]>(
    ["telemetry-geofences"],
    "/telemetry/geofences",
  );
  const { data: assetDetail, refetch: refetchDetail } = useApiQuery<any>(
    ["telemetry-asset-detail", selectedAssetId],
    selectedAssetId ? `/telemetry/assets/${selectedAssetId}` : "",
    { enabled: !!selectedAssetId },
  );
  const { data: history = [] } = useApiQuery<any[]>(
    ["telemetry-history", selectedAssetId],
    selectedAssetId ? `/telemetry/assets/${selectedAssetId}/history` : "",
    { enabled: !!selectedAssetId && activeTab === "PLAYBACK" },
  );

  const simulateMutation = useApiMutation<any, any>(
    "/telemetry/simulate-anomaly",
    "POST",
  );

  // Auto-select first asset
  useEffect(() => {
    if (assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  // Playback timer
  useEffect(() => {
    if (isPlaying && history.length > 0) {
      playbackRef.current = setInterval(
        () => {
          setPlaybackIdx((prev) => {
            if (prev >= history.length - 1) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          });
        },
        Math.max(100, 500 / playbackSpeed),
      );
    } else if (playbackRef.current) {
      clearInterval(playbackRef.current);
    }
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, [isPlaying, playbackSpeed, history.length]);

  const handleSimulate = async (anomalyType: string, customValue?: number) => {
    if (!selectedAssetId) return;
    try {
      await simulateMutation.mutateAsync({
        assetId: selectedAssetId,
        anomalyType,
        customValue,
      });
      refetchSummary();
      refetchAssets();
      refetchDetail();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/telemetry/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("atlas_token") || ""}`,
        },
        body: JSON.stringify({ resolvedBy: "Control Tower Operator" }),
      });
      refetchDetail();
      refetchSummary();
    } catch (e) {}
  };

  const getAssetIcon = (type: string, size = 18) => {
    switch (type) {
      case "VESSEL":
        return <Ship size={size} />;
      case "CARGO_AIRCRAFT":
        return <Plane size={size} />;
      case "TRUCK_EV":
        return <Truck size={size} />;
      case "TRAIN_WAGON":
        return <TrainTrack size={size} />;
      default:
        return <Navigation size={size} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CRITICAL_ALERT":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "CUSTOMS_HOLD":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "IN_TRANSIT":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "WARNING":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      default:
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    }
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const liveReading = assetDetail?.readings?.[assetDetail.readings.length - 1];
  const activeAlerts = (assetDetail?.alerts || []).filter(
    (a: any) => a.status === "ACTIVE",
  );

  // Simple SVG map coordinates mapping (normalized 0-1 → SVG 0-800/400)
  const toSvgCoords = (lat: number, lng: number) => {
    const x = ((lng + 15) / 60) * 800;
    const y = ((55 - lat) / 30) * 400;
    return {
      x: Math.max(0, Math.min(800, x)),
      y: Math.max(0, Math.min(400, y)),
    };
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 p-8 border border-cyan-500/20 shadow-2xl"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                <Satellite size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-wider text-white">
                  TORRE DE CONTROL IoT
                </h1>
                <p className="text-xs font-medium text-cyan-300/80">
                  Tracking Satelital AIS · Telemetría Sensores en Vivo ·
                  Geocercas Activas · Predictor ETA
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Monitorización continua y en tiempo real de activos multimodales
              (marítimo, aéreo, terrestre y ferroviario) con detección
              automática de anomalías, alertas predictivas y reproductor de ruta
              histórica.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">LIVE</span>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-cyan-500/20">
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Activos Rastreados
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">
                {summary?.totalTrackedAssets ?? assets.length}
              </span>
              <span className="text-xs font-bold text-cyan-400">
                en tránsito
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Multimodal · AIS/GPS/Rail
            </span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Alertas Críticas
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-extrabold ${summary?.criticalAlertsCount > 0 ? "text-red-400" : "text-emerald-400"}`}
              >
                {summary?.criticalAlertsCount ?? 0}
              </span>
              <span className="text-xs text-amber-400">
                {summary?.warningAlertsCount ?? 0} warn
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Resolución en 1 clic
            </span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Salud Dispositivos IoT
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">
                {summary?.deviceHealthPercentage ?? 100}%
              </span>
              <span className="text-xs text-slate-400">
                {summary?.healthyDevicesCount ?? 0}/{summary?.totalDevices ?? 0}
              </span>
            </div>
            <span className="text-[11px] text-emerald-400/80">
              Batería y señal OK
            </span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Estado Flota
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-400">
                {summary?.inTransitCount ?? 0}
              </span>
              <span className="text-xs text-red-400">
                {summary?.criticalAssetsCount ?? 0} críticos
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              En ruta / Incidencias
            </span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3 flex-wrap">
        {(["MAP", "SENSORS", "ALERTS", "PLAYBACK"] as const).map((tab) => {
          const labels: Record<string, string> = {
            MAP: "🗺 Mapa Global",
            SENSORS: "📡 Telemetría en Vivo",
            ALERTS: `🚨 Alertas Activas (${activeAlerts.length})`,
            PLAYBACK: "⏱ Timeline Playback",
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                  : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Asset List Sidebar */}
        <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Navigation size={16} className="text-cyan-400" />
            Activos en Tiempo Real
          </h3>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1">
            {assets.map((asset) => {
              const isSelected = asset.id === selectedAssetId;
              const isCritical = asset.status === "CRITICAL_ALERT";
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500/50 shadow-lg"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                  } ${isCritical ? "ring-1 ring-red-500/50 animate-pulse-slow" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${isCritical ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400"}`}
                      >
                        {getAssetIcon(asset.assetType, 14)}
                      </div>
                      <span className="font-bold text-xs text-white truncate max-w-[120px]">
                        {asset.assetCode}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getStatusColor(asset.status)}`}
                    >
                      {asset.status === "IN_TRANSIT"
                        ? "EN RUTA"
                        : asset.status === "CRITICAL_ALERT"
                          ? "⚠ CRÍTICO"
                          : asset.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium truncate mb-1.5">
                    {asset.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={9} />{" "}
                      {asset.destinationName.split("(")[0].trim()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity size={9} /> {asset.currentSpeedKnots.toFixed(1)}{" "}
                      kn
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Panel */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-5 min-h-0">
          {/* Tab: MAP */}
          {activeTab === "MAP" && (
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin size={16} className="text-cyan-400" />
                  Mapa Satelital Mediterráneo / Atlántico Norte
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                  Actualización cada 15 min (AIS) · 3 min (GPS)
                </span>
              </div>

              {/* SVG Map Area */}
              <div
                className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden"
                style={{ height: "360px" }}
              >
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 800 400"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Ocean background */}
                  <rect width="800" height="400" fill="#020817" />
                  {/* Simple grid lines */}
                  {[...Array(8)].map((_, i) => (
                    <line
                      key={`vg-${i}`}
                      x1={i * 100}
                      y1="0"
                      x2={i * 100}
                      y2="400"
                      stroke="#1e2a3a"
                      strokeWidth="0.5"
                    />
                  ))}
                  {[...Array(5)].map((_, i) => (
                    <line
                      key={`hg-${i}`}
                      x1="0"
                      y1={i * 100}
                      x2="800"
                      y2={i * 100}
                      stroke="#1e2a3a"
                      strokeWidth="0.5"
                    />
                  ))}

                  {/* Geofence zones */}
                  {geofences.map((gf) => {
                    const c = toSvgCoords(gf.centerLat, gf.centerLng);
                    const r = (gf.radiusMeters / 111000) * (800 / 60) * 0.5;
                    return (
                      <g key={gf.id}>
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={Math.max(r, 12)}
                          fill="rgba(99,102,241,0.08)"
                          stroke="rgba(99,102,241,0.4)"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                        <text
                          x={c.x}
                          y={c.y + Math.max(r, 12) + 8}
                          fill="rgba(129,140,248,0.8)"
                          fontSize="7"
                          textAnchor="middle"
                        >
                          {gf.name.split(" ").slice(0, 2).join(" ")}
                        </text>
                      </g>
                    );
                  })}

                  {/* Breadcrumb trails */}
                  {assetDetail?.readings &&
                    assetDetail.readings.length > 1 &&
                    (() => {
                      const pts = assetDetail.readings.map((r: any) =>
                        toSvgCoords(r.lat, r.lng),
                      );
                      const d = pts
                        .map(
                          (p: any, i: number) =>
                            `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
                        )
                        .join(" ");
                      return (
                        <path
                          d={d}
                          fill="none"
                          stroke="rgba(34,211,238,0.4)"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                      );
                    })()}

                  {/* Asset markers */}
                  {assets.map((asset) => {
                    const pos = toSvgCoords(asset.currentLat, asset.currentLng);
                    const isSelected = asset.id === selectedAssetId;
                    const isCritical = asset.status === "CRITICAL_ALERT";
                    const color = isCritical
                      ? "#f87171"
                      : isSelected
                        ? "#22d3ee"
                        : "#64748b";

                    return (
                      <g
                        key={asset.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedAssetId(asset.id)}
                      >
                        {/* Pulse ring on selected */}
                        {isSelected && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="20"
                            fill="none"
                            stroke={color}
                            strokeWidth="1"
                            opacity="0.4"
                          />
                        )}
                        {isCritical && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="16"
                            fill="none"
                            stroke="#f87171"
                            strokeWidth="1.5"
                            opacity="0.5"
                          />
                        )}
                        {/* Marker */}
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="8"
                          fill={color}
                          fillOpacity="0.2"
                          stroke={color}
                          strokeWidth="1.5"
                        />
                        {/* Speed vector */}
                        <line
                          x1={pos.x}
                          y1={pos.y}
                          x2={
                            pos.x +
                            Math.sin(
                              (asset.currentHeadingDeg * Math.PI) / 180,
                            ) *
                              18
                          }
                          y2={
                            pos.y -
                            Math.cos(
                              (asset.currentHeadingDeg * Math.PI) / 180,
                            ) *
                              18
                          }
                          stroke={color}
                          strokeWidth="1.5"
                          markerEnd="url(#arrow)"
                        />
                        {/* Label */}
                        <text
                          x={pos.x + 12}
                          y={pos.y - 6}
                          fill={color}
                          fontSize="8"
                          fontWeight="bold"
                        >
                          {asset.assetCode}
                        </text>
                        <text
                          x={pos.x + 12}
                          y={pos.y + 5}
                          fill="rgba(148,163,184,0.8)"
                          fontSize="7"
                        >
                          {asset.currentSpeedKnots.toFixed(1)}kn
                        </text>
                      </g>
                    );
                  })}

                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrow"
                      markerWidth="6"
                      markerHeight="6"
                      refX="3"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M0,0 L0,6 L6,3 z" fill="#22d3ee" />
                    </marker>
                  </defs>
                </svg>

                {/* Legend overlay */}
                <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 bg-slate-950/80 backdrop-blur-sm p-2.5 rounded-xl border border-slate-800/60">
                  {[
                    { color: "#22d3ee", label: "Activo seleccionado" },
                    { color: "#f87171", label: "Alerta crítica" },
                    { color: "#4f46e5", label: "Geocercas" },
                    { color: "#64748b", label: "Otros activos" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <span
                        className="w-3 h-1.5 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      <span className="text-[10px] text-slate-400">
                        {l.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Asset Quick Info */}
              {selectedAsset && (
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 grid grid-cols-3 md:grid-cols-5 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">
                      Velocidad
                    </span>
                    <span className="font-bold text-white">
                      {selectedAsset.currentSpeedKnots.toFixed(1)} kn
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Rumbo</span>
                    <span className="font-bold text-white">
                      {selectedAsset.currentHeadingDeg.toFixed(0)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Altitud</span>
                    <span className="font-bold text-white">
                      {selectedAsset.currentAltitudeMeters.toFixed(0)} m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">
                      Lat / Lng
                    </span>
                    <span className="font-bold text-cyan-400">
                      {selectedAsset.currentLat.toFixed(3)}° /{" "}
                      {selectedAsset.currentLng.toFixed(3)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">
                      ETA Prevista
                    </span>
                    <span className="font-bold text-white">
                      {new Date(selectedAsset.predictedEta).toLocaleTimeString(
                        "es-ES",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: SENSORS (Live Telemetry HUD) */}
          {activeTab === "SENSORS" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  HUD de Telemetría en Vivo —{" "}
                  {selectedAsset?.name ?? "Selecciona un activo"}
                </h3>
                {liveReading && (
                  <span className="text-[10px] text-slate-400">
                    Última lectura:{" "}
                    {new Date(liveReading.timestamp).toLocaleTimeString(
                      "es-ES",
                    )}
                  </span>
                )}
              </div>

              {liveReading ? (
                <>
                  {/* Sensor Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Temperature */}
                    <div
                      className={`p-4 rounded-xl border ${
                        selectedAsset?.maxTempCelsius &&
                        liveReading.temperatureCelsius >
                          selectedAsset.maxTempCelsius
                          ? "bg-red-950/30 border-red-500/30"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Thermometer
                          size={16}
                          className={
                            selectedAsset?.maxTempCelsius &&
                            liveReading.temperatureCelsius >
                              selectedAsset.maxTempCelsius
                              ? "text-red-400"
                              : "text-cyan-400"
                          }
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Temperatura
                        </span>
                      </div>
                      <span
                        className={`text-3xl font-black ${
                          selectedAsset?.maxTempCelsius &&
                          liveReading.temperatureCelsius >
                            selectedAsset.maxTempCelsius
                            ? "text-red-400"
                            : "text-white"
                        }`}
                      >
                        {liveReading.temperatureCelsius?.toFixed(1)}°C
                      </span>
                      {selectedAsset?.minTempCelsius !== null && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                            <span>{selectedAsset.minTempCelsius}°C</span>
                            <span>{selectedAsset.maxTempCelsius}°C</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    ((liveReading.temperatureCelsius -
                                      selectedAsset.minTempCelsius) /
                                      (selectedAsset.maxTempCelsius -
                                        selectedAsset.minTempCelsius)) *
                                      100,
                                  ),
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 block">
                            Zona segura: [{selectedAsset.minTempCelsius}°C,{" "}
                            {selectedAsset.maxTempCelsius}°C]
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Humidity */}
                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Droplets size={16} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Humedad
                        </span>
                      </div>
                      <span className="text-3xl font-black text-white">
                        {liveReading.humidityPct?.toFixed(0)}%
                      </span>
                      <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${liveReading.humidityPct ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        Humedad relativa del interior
                      </span>
                    </div>

                    {/* G-Force */}
                    <div
                      className={`p-4 rounded-xl border ${liveReading.shockGForce >= 2.5 ? "bg-amber-950/30 border-amber-500/30" : "bg-slate-950/60 border-slate-800"}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Zap
                          size={16}
                          className={
                            liveReading.shockGForce >= 2.5
                              ? "text-amber-400"
                              : "text-slate-400"
                          }
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Impacto G-Force
                        </span>
                      </div>
                      <span
                        className={`text-3xl font-black ${liveReading.shockGForce >= 2.5 ? "text-amber-400" : "text-white"}`}
                      >
                        {liveReading.shockGForce?.toFixed(2)}G
                      </span>
                      <p className="text-[9px] text-slate-400 mt-2">
                        {liveReading.shockGForce < 1.0
                          ? "✓ Normal"
                          : liveReading.shockGForce < 2.5
                            ? "⚠ Turbulencia leve"
                            : "🚨 Impacto detectado"}
                      </p>
                    </div>

                    {/* Seal Status */}
                    <div
                      className={`p-4 rounded-xl border ${liveReading.sealTampered ? "bg-red-950/30 border-red-500/30" : "bg-slate-950/60 border-slate-800"}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {liveReading.sealTampered ? (
                          <ShieldAlert size={16} className="text-red-400" />
                        ) : (
                          <Shield size={16} className="text-emerald-400" />
                        )}
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Precinto Electrónico
                        </span>
                      </div>
                      <span
                        className={`text-xl font-black ${liveReading.sealTampered ? "text-red-400" : "text-emerald-400"}`}
                      >
                        {liveReading.sealTampered ? "VIOLADO" : "INTACTO"}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-2">
                        {liveReading.sealTampered
                          ? "🚨 Requiere inspección inmediata"
                          : "✓ Sin manipulaciones detectadas"}
                      </p>
                    </div>

                    {/* Battery */}
                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Battery
                          size={16}
                          className={
                            liveReading.batteryPct < 20
                              ? "text-red-400"
                              : "text-green-400"
                          }
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Batería Sensor
                        </span>
                      </div>
                      <span className="text-3xl font-black text-white">
                        {liveReading.batteryPct}%
                      </span>
                      <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${liveReading.batteryPct < 20 ? "bg-red-500" : liveReading.batteryPct < 50 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${liveReading.batteryPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={16} className="text-purple-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Posición GPS
                        </span>
                      </div>
                      <span className="text-base font-black text-cyan-400">
                        {liveReading.lat.toFixed(4)}°N
                      </span>
                      <span className="text-base font-black text-cyan-400 block">
                        {liveReading.lng.toFixed(4)}°E
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {liveReading.speedKnots.toFixed(1)} kn ·{" "}
                        {liveReading.altitudeMeters.toFixed(0)}m alt
                      </p>
                    </div>
                  </div>

                  {/* Anomaly Simulator Panel */}
                  <div className="bg-slate-950/40 rounded-xl border border-slate-700/50 p-5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Zap size={14} className="text-amber-400" />
                      Simulador de Anomalías — Panel QA & Demo
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button
                        onClick={() =>
                          handleSimulate("TEMPERATURE_EXCURSION", 14.8)
                        }
                        className="bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 text-red-300 text-[11px] font-bold py-2.5"
                      >
                        🌡 Excursión Térmica (+14.8°C)
                      </Button>
                      <Button
                        onClick={() => handleSimulate("SHOCK_IMPACT", 3.85)}
                        className="bg-amber-900/40 hover:bg-amber-800/60 border border-amber-500/30 text-amber-300 text-[11px] font-bold py-2.5"
                      >
                        💥 Impacto G-Force (3.85G)
                      </Button>
                      <Button
                        onClick={() => handleSimulate("SEAL_TAMPERED")}
                        className="bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-300 text-[11px] font-bold py-2.5"
                      >
                        🔓 Violación Precinto
                      </Button>
                      <Button
                        onClick={() => handleSimulate("NORMALIZE")}
                        className="bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold py-2.5 flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> Normalizar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <Satellite size={48} className="text-slate-700 mb-3" />
                  <h4 className="text-sm font-bold text-slate-300">
                    Selecciona un activo para ver la telemetría
                  </h4>
                </div>
              )}
            </div>
          )}

          {/* Tab: ALERTS */}
          {activeTab === "ALERTS" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  Matriz de Alertas —{" "}
                  {selectedAsset?.name ?? "Selecciona activo"}
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                  {activeAlerts.length} alertas activas
                </span>
              </div>

              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {assetDetail?.alerts?.length > 0 ? (
                    assetDetail.alerts.map((alert: any) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`p-4 rounded-xl border ${getSeverityColor(alert.severity)} ${alert.status === "RESOLVED" ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getSeverityColor(alert.severity)}`}
                              >
                                {alert.severity}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">
                                {alert.alertType.replace("_", " ")}
                              </span>
                              <span className="text-[9px] text-slate-500 ml-auto">
                                {new Date(alert.createdAt).toLocaleTimeString(
                                  "es-ES",
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-white font-medium leading-snug">
                              {alert.message}
                            </p>
                            {alert.metricValue && (
                              <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
                                <span>
                                  Valor:{" "}
                                  <strong className="text-white">
                                    {alert.metricValue}
                                  </strong>
                                </span>
                                <span>
                                  Umbral:{" "}
                                  <strong className="text-white">
                                    {alert.thresholdValue}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>
                          {alert.status === "ACTIVE" ? (
                            <Button
                              onClick={() => handleResolveAlert(alert.id)}
                              className="bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-3 py-1.5 flex items-center gap-1 shrink-0"
                            >
                              <CheckCircle2 size={12} /> Resolver
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Resuelto
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <CheckCircle2
                        size={40}
                        className="text-emerald-500/40 mb-3"
                      />
                      <h4 className="text-sm font-bold text-slate-300">
                        Sin alertas activas
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Todos los sensores dentro de parámetros normales
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Tab: PLAYBACK */}
          {activeTab === "PLAYBACK" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock size={16} className="text-cyan-400" />
                  Reproductor de Ruta Histórica —{" "}
                  {selectedAsset?.assetCode ?? ""}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {history.length} puntos registrados
                </span>
              </div>

              {history.length > 0 ? (
                <>
                  {/* Playback Controls */}
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 flex flex-col gap-4">
                    <input
                      type="range"
                      min={0}
                      max={history.length - 1}
                      value={playbackIdx}
                      onChange={(e) => setPlaybackIdx(parseInt(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {new Date(history[0].timestamp).toLocaleString("es-ES")}
                      </span>
                      <span>
                        {new Date(
                          history[history.length - 1].timestamp,
                        ).toLocaleString("es-ES")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2"
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        {isPlaying ? "Pausar" : "Reproducir"}
                      </Button>
                      <Button
                        onClick={() => setPlaybackIdx(history.length - 1)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2"
                      >
                        <SkipForward size={16} /> Final
                      </Button>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[10px] text-slate-400">
                          Velocidad:
                        </span>
                        {[1, 5, 10].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                              playbackSpeed === speed
                                ? "bg-cyan-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Current Playback State */}
                  {history[playbackIdx] && (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                      {[
                        {
                          label: "Punto",
                          value: `${playbackIdx + 1}/${history.length}`,
                        },
                        {
                          label: "Hora",
                          value: new Date(
                            history[playbackIdx].timestamp,
                          ).toLocaleTimeString("es-ES"),
                        },
                        {
                          label: "Lat/Lng",
                          value: `${history[playbackIdx].lat.toFixed(4)} / ${history[playbackIdx].lng.toFixed(4)}`,
                        },
                        {
                          label: "Velocidad",
                          value: `${history[playbackIdx].speedKnots?.toFixed(1)} kn`,
                        },
                        {
                          label: "Temperatura",
                          value: `${history[playbackIdx].temperatureCelsius?.toFixed(1)}°C`,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl"
                        >
                          <span className="text-slate-400 block text-[10px] mb-0.5">
                            {item.label}
                          </span>
                          <span className="font-bold text-white">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Playback map */}
                  <div
                    className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative"
                    style={{ height: "200px" }}
                  >
                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 800 200"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <rect width="800" height="200" fill="#020817" />
                      {/* Full path */}
                      {history.length > 1 &&
                        (() => {
                          const pts = history.map((r: any) =>
                            toSvgCoords(r.lat, r.lng),
                          );
                          const d = pts
                            .map(
                              (p: any, i: number) =>
                                `${i === 0 ? "M" : "L"} ${p.x} ${p.y / 2}`,
                            )
                            .join(" ");
                          return (
                            <path
                              d={d}
                              fill="none"
                              stroke="rgba(34,211,238,0.2)"
                              strokeWidth="2"
                            />
                          );
                        })()}
                      {/* Traveled path */}
                      {playbackIdx > 0 &&
                        (() => {
                          const pts = history
                            .slice(0, playbackIdx + 1)
                            .map((r: any) => toSvgCoords(r.lat, r.lng));
                          const d = pts
                            .map(
                              (p: any, i: number) =>
                                `${i === 0 ? "M" : "L"} ${p.x} ${p.y / 2}`,
                            )
                            .join(" ");
                          return (
                            <path
                              d={d}
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth="2.5"
                            />
                          );
                        })()}
                      {/* Current marker */}
                      {history[playbackIdx] &&
                        (() => {
                          const pos = toSvgCoords(
                            history[playbackIdx].lat,
                            history[playbackIdx].lng,
                          );
                          return (
                            <circle
                              cx={pos.x}
                              cy={pos.y / 2}
                              r="6"
                              fill="#22d3ee"
                            />
                          );
                        })()}
                    </svg>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <Clock size={40} className="text-slate-700 mb-3" />
                  <h4 className="text-sm font-bold text-slate-300">
                    Selecciona un activo para cargar la ruta histórica
                  </h4>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

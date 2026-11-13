/**
 * @file LiveSensors.tsx
 * @description Live IoT sensor telemetry HUD and diagnostics calibration tab.
 * @module @atlas/frontend/components/IoTControlTower/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import {
  Activity,
  Battery,
  Droplets,
  MapPin,
  RefreshCw,
  Satellite,
  Shield,
  ShieldAlert,
  Thermometer,
  Zap,
} from "lucide-react";
import type { LiveSensorsTabProps } from "../../../types/iot-control-tower.types";

export function LiveSensors({
  selectedAsset,
  liveReading,
  onSimulateAnomaly,
}: LiveSensorsTabProps) {
  return (
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
            {new Date(liveReading.timestamp).toLocaleTimeString("es-ES")}
          </span>
        )}
      </div>

      {liveReading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Temperature */}
            <div
              className={`p-4 rounded-xl border ${
                selectedAsset?.maxTempCelsius &&
                liveReading.temperatureCelsius > selectedAsset.maxTempCelsius
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
                  liveReading.temperatureCelsius > selectedAsset.maxTempCelsius
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

          {/* Device Telemetry Diagnostics Protocol */}
          <div className="bg-slate-950/40 rounded-xl border border-slate-700/50 p-5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              Verificación Telemétrica de Dispositivo IoT
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => onSimulateAnomaly("TEMPERATURE_EXCURSION", 14.8)}
                className="bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold py-2.5"
              >
                🌡 Diagnóstico Térmico
              </Button>
              <Button
                onClick={() => onSimulateAnomaly("SHOCK_IMPACT", 3.85)}
                className="bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold py-2.5"
              >
                💥 Calibrar Impacto Eje
              </Button>
              <Button
                onClick={() => onSimulateAnomaly("SEAL_TAMPERED")}
                className="bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold py-2.5"
              >
                🔒 Test Precinto ISO
              </Button>
              <Button
                onClick={() => onSimulateAnomaly("NORMALIZE")}
                className="bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold py-2.5 flex items-center gap-1"
              >
                <RefreshCw size={12} /> Recalibrar Sensor
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
  );
}
export default LiveSensors;

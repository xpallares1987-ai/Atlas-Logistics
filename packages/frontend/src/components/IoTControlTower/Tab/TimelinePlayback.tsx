/**
 * @file TimelinePlayback.tsx
 * @description Historical route timeline playback controls and trajectory SVG tab.
 * @module @atlas/frontend/components/IoTControlTower/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { Clock, Pause, Play, SkipForward } from "lucide-react";
import type { TimelinePlaybackTabProps } from "../../../types/iot-control-tower.types";
import { toSvgCoords } from "../hooks/useIoTControlTower";

export function TimelinePlayback({
  selectedAsset,
  history,
  playbackIdx,
  setPlaybackIdx,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
}: TimelinePlaybackTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock size={16} className="text-cyan-400" />
          Reproductor de Ruta Histórica — {selectedAsset?.assetCode ?? ""}
        </h3>
        <span className="text-[10px] text-slate-400">
          {history.length} puntos registrados
        </span>
      </div>

      {history.length > 0 ? (
        <>
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
                {new Date(history[history.length - 1].timestamp).toLocaleString(
                  "es-ES",
                )}
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
                <span className="text-[10px] text-slate-400">Velocidad:</span>
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
                  <span className="font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          )}

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
              {history[playbackIdx] &&
                (() => {
                  const pos = toSvgCoords(
                    history[playbackIdx].lat,
                    history[playbackIdx].lng,
                  );
                  return (
                    <circle cx={pos.x} cy={pos.y / 2} r="6" fill="#22d3ee" />
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
  );
}
export default TimelinePlayback;

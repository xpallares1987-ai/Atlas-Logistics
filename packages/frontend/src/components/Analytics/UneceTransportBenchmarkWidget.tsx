/**
 * @file UneceTransportBenchmarkWidget.tsx
 * @description Reusable embedded UNECE Statistical Database (STAT__40-TRTRANS) benchmark widget
 * displaying real Road, Rail, Inland Waterway freight tonne-km and Transport Infrastructure
 * series with live zero-cost PX-Web sync trigger.
 * @module @atlas/frontend/components/Analytics/UneceTransportBenchmarkWidget
 */

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Train,
  Truck,
  Waves,
} from "lucide-react";
import { authFetch } from "../../lib/api";

interface UneceStatRow {
  id: string;
  datasetCode: string;
  transportMode: string;
  countryCode: string;
  countryName: string;
  year: number;
  metricLabel: string;
  value: number;
  unit: string;
  sourceTableId: string;
  fetchedAt: string;
}

interface UneceResponse {
  success: boolean;
  source: string;
  sourceUrl: string;
  countries: Array<{ code: string; name: string }>;
  countryHighlight: string;
  modalSplit: {
    roadMillionTkm: number;
    railMillionTkm: number;
    inlandWaterwayMillionTkm: number;
    roadSharePct: number;
    railSharePct: number;
    iwwSharePct: number;
    railInfraKm: number;
    motorwayInfraKm: number;
    latestYear: number | null;
  };
  data: UneceStatRow[];
}

export interface UneceTransportBenchmarkWidgetProps {
  variant: "ROAD" | "RAIL" | "MULTIMODAL";
  defaultCountry?: string;
}

export function UneceTransportBenchmarkWidget({
  variant,
  defaultCountry = "ES",
}: UneceTransportBenchmarkWidgetProps) {
  const [country, setCountry] = useState(defaultCountry);
  const [payload, setPayload] = useState<UneceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (targetCountry: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/analytics/unece-transport?country=${encodeURIComponent(targetCountry)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as UneceResponse;
      setPayload(json);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load UNECE transport statistics",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(country);
  }, [country, fetchStats]);

  const handleLiveSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await authFetch("/api/analytics/unece-transport/sync", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Sync failed (HTTP ${res.status})`);
      await fetchStats(country);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Live UNECE PX-Web refresh failed",
      );
    } finally {
      setSyncing(false);
    }
  };

  const title =
    variant === "ROAD"
      ? "UNECE Road Freight Benchmark (STAT__40-TRTRANS)"
      : variant === "RAIL"
        ? "UNECE Rail Freight & Network Benchmark (STAT__40-TRTRANS)"
        : "UNECE Multimodal Macro Freight Split (Road vs. Rail vs. Barge)";

  const primaryDatasetCode =
    variant === "ROAD"
      ? "TRROAD_GOODS_TKM"
      : variant === "RAIL"
        ? "TRRAIL_GOODS_TKM"
        : null;

  const seriesRows = (payload?.data || [])
    .filter((r) =>
      primaryDatasetCode ? r.datasetCode === primaryDatasetCode : true,
    )
    .sort((a, b) => a.year - b.year);

  const recentTrend = primaryDatasetCode ? seriesRows.slice(-6) : [];
  const maxVal = Math.max(1, ...recentTrend.map((r) => r.value));
  const split = payload?.modalSplit;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {variant === "ROAD" ? (
              <Truck className="w-4 h-4" />
            ) : variant === "RAIL" ? (
              <Train className="w-4 h-4" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Official UNECE Open Data
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              SQLite-cached corridor benchmarks synced on-demand from UNECE
              PX-Web REST API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="UNECE corridor country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
          >
            {(
              payload?.countries || [
                { code: "ES", name: "Spain" },
                { code: "DE", name: "Germany" },
                { code: "NL", name: "Netherlands" },
                { code: "FR", name: "France" },
                { code: "BE", name: "Belgium" },
                { code: "IT", name: "Italy" },
                { code: "PL", name: "Poland" },
                { code: "GB", name: "United Kingdom" },
                { code: "US", name: "United States" },
              ]
            ).map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={syncing}
            onClick={handleLiveSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-indigo-500" : ""}`}
            />
            <span>{syncing ? "Syncing..." : "Sync UNECE"}</span>
          </button>

          <a
            href="https://w3.unece.org/PXWeb2015/pxweb/en/STAT/STAT__40-TRTRANS/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-500 transition-colors"
            title="Open official UNECE STAT__40-TRTRANS portal"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          Loading UNECE corridor statistics...
        </div>
      ) : split ? (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {variant !== "RAIL" && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-500" />
                  Road Freight ({split.latestYear || "Latest"})
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-mono">
                  {split.roadMillionTkm.toLocaleString()}{" "}
                  <span className="text-[11px] font-normal text-slate-400">
                    M t-km
                  </span>
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                  {split.roadSharePct}% modal share · Motorways:{" "}
                  {split.motorwayInfraKm.toLocaleString()} km
                </div>
              </div>
            )}

            {variant !== "ROAD" && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Train className="w-3.5 h-3.5 text-emerald-500" />
                  Rail Freight ({split.latestYear || "Latest"})
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-mono">
                  {split.railMillionTkm.toLocaleString()}{" "}
                  <span className="text-[11px] font-normal text-slate-400">
                    M t-km
                  </span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {split.railSharePct}% modal share · Track:{" "}
                  {split.railInfraKm.toLocaleString()} km
                </div>
              </div>
            )}

            {variant === "MULTIMODAL" && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-sky-500" />
                  Inland Waterway / Barge ({split.latestYear || "Latest"})
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-mono">
                  {split.inlandWaterwayMillionTkm.toLocaleString()}{" "}
                  <span className="text-[11px] font-normal text-slate-400">
                    M t-km
                  </span>
                </div>
                <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-0.5">
                  {split.iwwSharePct}% modal share
                </div>
              </div>
            )}

            {variant === "ROAD" && (
              <>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Motorway Infrastructure
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-mono">
                    {split.motorwayInfraKm.toLocaleString()}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      km
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Intermodal Shift Headroom (Rail)
                  </div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                    {split.railSharePct}%{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      rail share
                    </span>
                  </div>
                </div>
              </>
            )}

            {variant === "RAIL" && (
              <>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Railway Lines Operated
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-mono">
                    {split.railInfraKm.toLocaleString()}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      km
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Road Freight Baseline
                  </div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                    {split.roadMillionTkm.toLocaleString()}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      M t-km
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Trend Bars (Road / Rail) or Modal Split Bar (Multimodal) */}
          {variant === "MULTIMODAL" ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Modal Split ({country})</span>
                <span>
                  Road {split.roadSharePct}% · Rail {split.railSharePct}% ·
                  Barge {split.iwwSharePct}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                <div
                  style={{ width: `${split.roadSharePct}%` }}
                  className="bg-amber-500 h-full"
                  title={`Road: ${split.roadSharePct}%`}
                />
                <div
                  style={{ width: `${split.railSharePct}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Rail: ${split.railSharePct}%`}
                />
                <div
                  style={{ width: `${split.iwwSharePct}%` }}
                  className="bg-sky-500 h-full"
                  title={`Inland Waterway: ${split.iwwSharePct}%`}
                />
              </div>
            </div>
          ) : (
            recentTrend.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Historical Freight Volume Trend ({country} · Million tonne-km)
                </div>
                <div className="grid grid-cols-6 gap-2 items-end h-20 pt-2">
                  {recentTrend.map((point) => {
                    const heightPct = Math.max(
                      12,
                      Math.round((point.value / maxVal) * 100),
                    );
                    return (
                      <div
                        key={point.id}
                        className="flex flex-col items-center gap-1 h-full justify-end"
                      >
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {Math.round(point.value).toLocaleString()}
                        </div>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-t-md ${
                            variant === "ROAD"
                              ? "bg-amber-500/80"
                              : "bg-emerald-500/80"
                          }`}
                        />
                        <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {point.year}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      ) : null}
    </section>
  );
}

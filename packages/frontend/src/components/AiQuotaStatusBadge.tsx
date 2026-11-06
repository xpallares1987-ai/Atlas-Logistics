import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  RefreshCw,
  Trash2,
  Database,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface ModelQuotaSnapshot {
  rpmUsed: number;
  rpmLimit: number;
  requestsToday: number;
  dailyLimit: number;
}

interface GeminiStatusPayload {
  configured: boolean;
  keyMasked: string | null;
  mode: string;
  tier: string;
  modelQuotas: Record<string, ModelQuotaSnapshot>;
  cache: {
    keys: number;
    hits: number;
    misses: number;
  };
}

export const AiQuotaStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<GeminiStatusPayload | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/config-status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Ignore network error during initial status check
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const handler = () => {
      fetchStatus();
    };
    window.addEventListener("atlas:ai-quota-updated", handler);
    return () => window.removeEventListener("atlas:ai-quota-updated", handler);
  }, [fetchStatus]);

  const handlePurgeCache = async () => {
    setPurging(true);
    try {
      const res = await fetch("/api/ai/clear-cache", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setStatus(data.status);
        } else {
          await fetchStatus();
        }
        setToastMsg(data.message || "Caché L1 purgada.");
        setTimeout(() => setToastMsg(null), 3000);
      }
    } catch {
      setToastMsg("Error al purgar caché L1.");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setPurging(false);
    }
  };

  const flashQuota = status?.modelQuotas?.["gemini-2.5-flash"];
  const flashLiteQuota = status?.modelQuotas?.["gemini-2.5-flash-lite"];
  const embedQuota = status?.modelQuotas?.["text-embedding-004"];
  const isConfigured = Boolean(status?.configured);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) fetchStatus();
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-indigo-500/30 text-xs text-slate-200 transition-all shadow-sm"
        title="Estado de Cuotas Google AI Studio Free-Tier y Caché L1/L2"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConfigured
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              : "bg-amber-400"
          }`}
        />
        <Sparkles size={13} className="text-indigo-400 shrink-0" />
        <span className="hidden lg:inline font-semibold tracking-tight">
          Gemini Free-Tier
        </span>
        {flashQuota && (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {Math.max(0, flashQuota.rpmLimit - flashQuota.rpmUsed)}/
            {flashQuota.rpmLimit} RPM
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 z-50 overflow-hidden">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-white">
                  Gobernanza Gemini Free-Tier
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  {isConfigured
                    ? `Clave activa: ${status?.keyMasked}`
                    : "Modo Fallback Determinista"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Actualizar métricas de cuota"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-[11px] bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                {isConfigured ? (
                  <CheckCircle2 size={13} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={13} className="text-amber-400" />
                )}
                Modo On-Demand
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold">
                0-Background Calls
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Pools Independientes de Cuota (Por Minuto / Día)
              </div>

              {[
                {
                  label: "Flash (Razonamiento / OCR)",
                  q: flashQuota,
                  defaultLimit: 12,
                },
                {
                  label: "Flash-Lite (JSON Rápido)",
                  q: flashLiteQuota,
                  defaultLimit: 15,
                },
                {
                  label: "Embeddings (Semántica)",
                  q: embedQuota,
                  defaultLimit: 100,
                },
              ].map((pool) => {
                const used = pool.q?.rpmUsed ?? 0;
                const limit = pool.q?.rpmLimit ?? pool.defaultLimit;
                const rpdUsed = pool.q?.requestsToday ?? 0;
                const pct = Math.min(100, Math.round((used / limit) * 100));
                return (
                  <div
                    key={pool.label}
                    className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80"
                  >
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-200">
                        {pool.label}
                      </span>
                      <span className="font-mono text-indigo-300">
                        {used}/{limit} RPM · {rpdUsed} hoy
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-cyan-400" />
                <div>
                  <div className="text-[11px] font-bold text-slate-200">
                    Caché L1 (NodeCache) + L2 (SQLite)
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {status?.cache?.keys ?? 0} claves L1 ·{" "}
                    {status?.cache?.hits ?? 0} hits (0 tokens)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePurgeCache}
                disabled={purging}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 size={11} />
                {purging ? "..." : "Purgar L1"}
              </button>
            </div>

            {toastMsg && (
              <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-center font-medium">
                {toastMsg}
              </div>
            )}

            <div className="pt-1 flex justify-between items-center border-t border-slate-800">
              <Link
                to="/system-panel"
                onClick={() => setOpen(false)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                Abrir Panel de Gobernanza IA
                <ExternalLink size={11} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

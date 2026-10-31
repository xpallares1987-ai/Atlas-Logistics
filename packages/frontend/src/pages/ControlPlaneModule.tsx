import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  Flame,
  Layers,
  Play,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";

export interface ProjectionsHealthReport {
  status: "HEALTHY" | "DEGRADED" | "OUT_OF_SYNC";
  outboxMetrics: {
    pendingCount: number;
    processingCount: number;
    processedCount: number;
    failedCount: number;
    dlqCount: number;
  };
  projectionMetrics: {
    shipment360Count: number;
    cockpitItemsCount: number;
    exceptionsCount: number;
  };
  projectorLagMs: number;
  lastProcessedEventTimestamp: string | null;
  lastOutboxEventTimestamp: string | null;
}

export interface DeadLetterMessage {
  eventId: string;
  aggregateId: string;
  eventType: string;
  retryCount: number;
  error?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  lastAttemptAt?: string;
}

export interface RebuildResult {
  rebuiltAt: string;
  shipmentsRebuiltCount: number;
  cockpitItemsRebuiltCount: number;
  durationMs: number;
}

export default function ControlPlaneModule() {
  const [health, setHealth] = useState<ProjectionsHealthReport | null>(null);
  const [dlqMessages, setDlqMessages] = useState<DeadLetterMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayingEventId, setReplayingEventId] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<RebuildResult | null>(
    null,
  );
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch Control Plane telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      setLoading(true);
      const [healthRes, dlqRes] = await Promise.all([
        fetch("/api/scm/v1/operational/projections/health"),
        fetch("/api/scm/v1/operational/outbox/dlq"),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      if (dlqRes.ok) {
        const dlqData = await dlqRes.json();
        setDlqMessages(dlqData.messages || []);
      }
    } catch (err: unknown) {
      console.error("Control plane fetch error", err);
      setMessage({
        text:
          err instanceof Error ? err.message : "Failed to load telemetry data",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Replay single DLQ message
  const handleReplayDLQ = async (eventId: string) => {
    try {
      setReplayingEventId(eventId);
      setMessage(null);
      const res = await fetch(
        `/api/scm/v1/operational/outbox/dlq/${eventId}/replay`,
        {
          method: "POST",
        },
      );
      if (!res.ok) throw new Error(`Replay failed with HTTP ${res.status}`);
      const data = await res.json();

      if (data.replayed) {
        setMessage({
          text: `Event ${eventId.slice(0, 8)}... successfully replayed into outbox queue.`,
          type: "success",
        });
        await fetchTelemetry();
      } else {
        setMessage({
          text: `Event was not found in DLQ or failed to enqueue.`,
          type: "error",
        });
      }
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error replaying event",
        type: "error",
      });
    } finally {
      setReplayingEventId(null);
    }
  };

  // Rebuild all projections
  const handleRebuildProjections = async () => {
    if (
      !window.confirm(
        "Trigger authoritative rebuild of all CQRS read model projections?",
      )
    )
      return;

    try {
      setRebuilding(true);
      setMessage(null);
      setRebuildResult(null);

      const res = await fetch("/api/scm/v1/operational/projections/rebuild", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Rebuild failed with HTTP ${res.status}`);
      const data = await res.json();
      setRebuildResult(data);
      setMessage({
        text: `Projections successfully rebuilt in ${data.durationMs}ms (${data.shipmentsRebuiltCount} shipments, ${data.cockpitItemsRebuiltCount} work items).`,
        type: "success",
      });
      await fetchTelemetry();
    } catch (err: unknown) {
      setMessage({
        text:
          err instanceof Error ? err.message : "Failed to rebuild projections",
        type: "error",
      });
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Platform Control Plane
              </h1>
              <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Administrative System
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Transactional outbox metrics, Dead Letter Queue (DLQ) replay &
              CQRS projection health
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRebuildProjections}
            disabled={rebuilding}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {rebuilding ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Rebuilding Projections...
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5" />
                Rebuild Projections
              </>
            )}
          </button>

          <button
            onClick={fetchTelemetry}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto flex-1 overflow-y-auto">
        {message && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="font-bold ml-4 hover:opacity-80"
            >
              ✕
            </button>
          </div>
        )}

        {rebuildResult && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Last Rebuild: {rebuildResult.shipmentsRebuiltCount} shipments,{" "}
                {rebuildResult.cockpitItemsRebuiltCount} work items in{" "}
                {rebuildResult.durationMs}ms (
                {new Date(rebuildResult.rebuiltAt).toLocaleTimeString()}).
              </span>
            </div>
            <button
              onClick={() => setRebuildResult(null)}
              className="font-bold ml-4 hover:opacity-80"
            >
              ✕
            </button>
          </div>
        )}

        {/* Runtime Health Hero Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                System Runtime Status
              </span>
              <span
                className={`text-xs px-3 py-1 font-bold rounded-full border flex items-center gap-1.5 ${
                  health?.status === "HEALTHY"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : health?.status === "DEGRADED"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {health?.status || "HEALTHY"}
              </span>
            </div>
            <h2 className="text-xl font-black text-white">
              Event-Driven CQRS Architecture Engine
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic SQLite atomic transaction boundaries with
              transactional outbox message relay.
            </p>
          </div>

          <div className="flex items-center gap-8 bg-slate-950/60 px-6 py-4 rounded-xl border border-slate-800 font-mono">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Projector Lag
              </div>
              <div className="text-2xl font-black text-indigo-400">
                {health?.projectorLagMs !== undefined
                  ? `${health.projectorLagMs} ms`
                  : "0 ms"}
              </div>
            </div>

            <div className="border-l border-slate-800 pl-8">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Dead Letters (DLQ)
              </div>
              <div
                className={`text-2xl font-black ${
                  (health?.outboxMetrics.dlqCount ?? 0) > 0
                    ? "text-rose-400"
                    : "text-emerald-400"
                }`}
              >
                {health?.outboxMetrics.dlqCount ?? dlqMessages.length}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Transactional Outbox Queue Telemetry */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Transactional Outbox Queue Metrics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">
                Pending Relay
              </span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {health?.outboxMetrics.pendingCount ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Awaiting worker pickup
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">
                Processing
              </span>
              <div className="text-2xl font-black text-indigo-400 mt-1">
                {health?.outboxMetrics.processingCount ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Currently executing
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">
                Successfully Processed
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {health?.outboxMetrics.processedCount ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Idempotently applied
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">
                Failed / Retrying
              </span>
              <div
                className={`text-2xl font-black mt-1 ${
                  (health?.outboxMetrics.failedCount ?? 0) > 0
                    ? "text-rose-400"
                    : "text-slate-300"
                }`}
              >
                {health?.outboxMetrics.failedCount ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Subject to backoff retry
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Projections Health & Volume */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            CQRS Read Model Projections
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-400">
                Shipment 360 Materialized Views
              </span>
              <div className="text-2xl font-black text-white">
                {health?.projectionMetrics.shipment360Count ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">
                Authoritative multi-context aggregate summaries
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-400">
                Cockpit Work Queue Items
              </span>
              <div className="text-2xl font-black text-white">
                {health?.projectionMetrics.cockpitItemsCount ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">
                Prioritized action items mapped to operators
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-400">
                Logged Operational Exceptions
              </span>
              <div className="text-2xl font-black text-white">
                {health?.projectionMetrics.exceptionsCount ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">
                Signals degrading health or halting workflows
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Dead Letter Queue (DLQ) Management */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                Dead Letter Queue (DLQ) Inspection & 1-Click Replay
              </h3>
              <p className="text-xs text-slate-400">
                Events that exceeded maximum retry attempts are quarantined here
                without poisoning active pipelines.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {dlqMessages.length} poisoned events in quarantine
            </span>
          </div>

          {dlqMessages.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span>
                Dead letter queue is empty. Zero quarantined messages.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {dlqMessages.map((msg) => (
                <div
                  key={msg.eventId}
                  className="p-5 rounded-2xl bg-slate-900 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-rose-400">
                        {msg.eventType}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Retries: {msg.retryCount}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                        Event: {msg.eventId.slice(0, 16)}...
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                        Target: {msg.aggregateId}
                      </span>
                    </div>

                    {msg.error && (
                      <p className="text-xs text-rose-300 font-sans bg-rose-950/40 p-2 rounded-lg border border-rose-900/40">
                        {msg.error}
                      </p>
                    )}

                    <details className="text-[11px] text-slate-500">
                      <summary className="cursor-pointer hover:text-slate-300 font-sans">
                        Inspect Poison Payload
                      </summary>
                      <pre className="p-3 mt-1.5 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-slate-400">
                        {JSON.stringify(msg.payload, null, 2)}
                      </pre>
                    </details>
                  </div>

                  <div className="flex items-center justify-end shrink-0">
                    <button
                      onClick={() => handleReplayDLQ(msg.eventId)}
                      disabled={replayingEventId === msg.eventId}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition disabled:opacity-50"
                    >
                      {replayingEventId === msg.eventId ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Replaying...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Replay Message
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

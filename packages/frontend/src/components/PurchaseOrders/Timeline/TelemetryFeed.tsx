/**
 * @file TelemetryFeed.tsx
 * @description Real-time live multi-modal carrier telemetry stream widget for Supply Chain POs.
 * Displays normalized DCSA 3.0, IATA Cargo-XML FSU, and satellite AIS events with carrier badges (ADR 0034).
 * @module @atlas/frontend/components/PurchaseOrders/Timeline/TelemetryFeed
 * @see {@link docs/adr/0034-carrier-track-and-trace-async-ingestion-and-predictive-resolution.md}
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Radio,
  Ship,
  Plane,
  Navigation,
  RefreshCw,
  Plus,
  CheckCircle,
} from "lucide-react";
import { SimulateEvent } from "../Modal/SimulateEvent";

export interface TelemetryFeedItem {
  eventId: string;
  eventType: string;
  eventDateTime: string;
  eventTypeCode: string;
  transportMode: string;
  sourceType: string;
  carrierBookingReference?: string | null;
  transportDocumentReference?: string | null;
  airWaybillNumber?: string | null;
  equipmentReference?: string | null;
  locationLocode: string;
  vesselName?: string | null;
  vesselImoNumber?: string | null;
  processedStatus: string;
  resolvedPoId?: string | null;
  matchedMilestoneCode?: string | null;
  createdAt: string | number;
}

interface TelemetryFeedProps {
  currentBookingReference?: string;
  onRefreshParent?: () => void;
}

export const TelemetryFeed: React.FC<TelemetryFeedProps> = ({
  currentBookingReference,
  onRefreshParent,
}) => {
  const [feed, setFeed] = useState<TelemetryFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scm/telemetry/feed?limit=25");
      if (!res.ok) {
        throw new Error(`Failed to load telemetry feed: HTTP ${res.status}`);
      }
      const data = await res.json();
      setFeed(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading telemetry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleEventProcessed = () => {
    fetchFeed();
    if (onRefreshParent) {
      onRefreshParent();
    }
  };

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "AIR":
        return <Plane className="w-3.5 h-3.5 text-sky-400" />;
      case "AIS":
        return <Navigation className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Ship className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Live Carrier & AIS Telemetry
            </h3>
            <p className="text-[11px] text-slate-400">
              DCSA 3.0, IATA FSU & Satellite Position Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFeed}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh Telemetry Feed"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Simulate Telemetry</span>
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
        {error ? (
          <div className="p-4 text-center text-xs text-rose-400">{error}</div>
        ) : feed.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No carrier telemetry events recorded yet. Click &quot;Simulate
            Telemetry&quot; to test.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40 max-h-72 overflow-y-auto">
            {feed.map((item) => {
              const isRelevant =
                currentBookingReference &&
                item.carrierBookingReference === currentBookingReference;

              return (
                <div
                  key={item.eventId}
                  className={`p-3 transition-colors text-xs flex items-start justify-between gap-3 ${
                    isRelevant
                      ? "bg-cyan-950/20 hover:bg-cyan-950/30 border-l-2 border-cyan-500"
                      : "hover:bg-slate-800/60"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-200">
                        {getTransportIcon(item.transportMode)}
                        <span>{item.transportMode}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-950/80 text-blue-300 border border-blue-700/60">
                        {item.matchedMilestoneCode || item.eventTypeCode}
                      </span>

                      <span className="text-[10px] font-mono text-slate-400">
                        @{item.locationLocode}
                      </span>

                      {item.processedStatus === "PROCESSED" && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Processed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                      {item.carrierBookingReference && (
                        <span>
                          BKG:{" "}
                          <span className="font-mono text-slate-300">
                            {item.carrierBookingReference}
                          </span>
                        </span>
                      )}
                      {item.equipmentReference && (
                        <span>
                          CNTR:{" "}
                          <span className="font-mono text-slate-300">
                            {item.equipmentReference}
                          </span>
                        </span>
                      )}
                      {item.airWaybillNumber && (
                        <span>
                          AWB:{" "}
                          <span className="font-mono text-slate-300">
                            {item.airWaybillNumber}
                          </span>
                        </span>
                      )}
                      {item.vesselName && (
                        <span>
                          Vessel:{" "}
                          <span className="text-slate-300">
                            {item.vesselName}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {new Date(item.eventDateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 block">
                      {new Date(item.eventDateTime).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Simulation Modal */}
      <SimulateEvent
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        defaultBookingReference={currentBookingReference}
        onEventProcessed={handleEventProcessed}
      />
    </div>
  );
};

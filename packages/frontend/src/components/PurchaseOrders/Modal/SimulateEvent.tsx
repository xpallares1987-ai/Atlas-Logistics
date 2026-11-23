/**
 * @file SimulateEvent.tsx
 * @description Operator testing modal for simulating and immediately processing
 * multi-modal carrier telemetry events (DCSA, IATA FSU, AIS) against live Fastify endpoints (ADR 0034).
 * @module @atlas/frontend/components/PurchaseOrders/Modal/SimulateEvent
 * @see {@link docs/adr/0034-carrier-track-and-trace-async-ingestion-and-predictive-resolution.md}
 */

import React, { useState } from "react";
import {
  X,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";

export interface SimulateEventProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBookingReference?: string;
  onEventProcessed?: () => void;
}

const CARRIER_OPTIONS = [
  { code: "MSCU", name: "MSC (Mediterranean Shipping Co)", mode: "OCEAN" },
  { code: "MAEU", name: "Maersk Line (A.P. Moller)", mode: "OCEAN" },
  { code: "CMDU", name: "CMA CGM Group", mode: "OCEAN" },
  { code: "HLCU", name: "Hapag-Lloyd", mode: "OCEAN" },
  { code: "LH", name: "Lufthansa Cargo (IATA FSU)", mode: "AIR" },
  { code: "SPIRE", name: "Spire Satellite AIS", mode: "AIS" },
];

const EVENT_CODE_OPTIONS = [
  {
    code: "LOAD",
    label: "LOAD - Container Loaded on Vessel (Ocean)",
    mode: "OCEAN",
  },
  { code: "DEPA", label: "DEPA - Vessel Departed Port (Ocean)", mode: "OCEAN" },
  { code: "ARRI", label: "ARRI - Vessel Arrived Port (Ocean)", mode: "OCEAN" },
  { code: "DISC", label: "DISC - Container Discharged (Ocean)", mode: "OCEAN" },
  { code: "RELE", label: "RELE - Customs Released (Ocean/Air)", mode: "OCEAN" },
  {
    code: "GTIN",
    label: "GTIN - Gate-In at Origin Terminal (Ocean)",
    mode: "OCEAN",
  },
  {
    code: "GTOT",
    label: "GTOT - Gate-Out at Destination (Ocean)",
    mode: "OCEAN",
  },
  { code: "RCS", label: "RCS - Cargo Received at Airport (Air)", mode: "AIR" },
  { code: "DEP", label: "DEP - Flight Departed (Air)", mode: "AIR" },
  { code: "ARR", label: "ARR - Flight Arrived (Air)", mode: "AIR" },
  { code: "DLV", label: "DLV - Delivered to Consignee (Air)", mode: "AIR" },
  { code: "UNDERWAY", label: "UNDERWAY - Vessel Sailing (AIS)", mode: "AIS" },
  {
    code: "BERTHED",
    label: "BERTHED - Vessel Berthed at Port (AIS)",
    mode: "AIS",
  },
];

export const SimulateEvent: React.FC<SimulateEventProps> = ({
  isOpen,
  onClose,
  defaultBookingReference = "",
  onEventProcessed,
}) => {
  const [carrierCode, setCarrierCode] = useState("MSCU");
  const [eventTypeCode, setEventTypeCode] = useState("RELE");
  const [bookingReference, setBookingReference] = useState(
    defaultBookingReference,
  );
  const [containerNumber, setContainerNumber] = useState("MSKU9284712");
  const [locationLocode, setLocationLocode] = useState("ESVLC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<{
    ingressStatus: string;
    eventId: string;
    canonicalMilestoneCode?: string;
    autoResolvedCount?: number;
    poMatched?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSimulationResult(null);

    try {
      const selectedCarrier = CARRIER_OPTIONS.find(
        (c) => c.code === carrierCode,
      );
      const isAir = selectedCarrier?.mode === "AIR";
      const isAis = selectedCarrier?.mode === "AIS";

      const payload = {
        carrierCode,
        transportMode: isAir ? "AIR" : isAis ? "OCEAN" : "OCEAN",
        sourceType: isAir
          ? "CARRIER_AIR_FSU"
          : isAis
            ? "IOT_AIS_TELEMETRY"
            : "CARRIER_DCSA_EDI",
        eventTypeCode,
        carrierBookingReference: bookingReference || undefined,
        equipmentReference: containerNumber || undefined,
        locationLocode,
        eventDateTime: new Date().toISOString(),
        rawPayload: {
          carrierCode,
          eventTypeCode,
          carrierBookingReference: bookingReference || undefined,
          equipmentReference: containerNumber || undefined,
          locationLocode,
          timestamp: new Date().toISOString(),
        },
      };

      const res = await fetch("/api/scm/telemetry/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Simulation failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      setSimulationResult({
        ingressStatus: data.ingress?.status || "UNKNOWN",
        eventId: data.ingress?.eventId || "",
        canonicalMilestoneCode: data.processed?.canonicalMilestoneCode,
        autoResolvedCount: data.processed?.autoResolvedCount || 0,
        poMatched: data.processed?.resolvedContext?.poId,
      });

      if (onEventProcessed) {
        onEventProcessed();
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to simulate telemetry event",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Simulate Carrier Telemetry Event
              </h3>
              <p className="text-xs text-slate-400">
                ADR 0034 Ingress & Live Resolution Test Runner (Zero Mocks)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto flex-1"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Carrier Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Carrier / Telemetry Source
            </label>
            <select
              value={carrierCode}
              onChange={(e) => setCarrierCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              {CARRIER_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.mode})
                </option>
              ))}
            </select>
          </div>

          {/* Event Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Event Type & Milestone Mapping
            </label>
            <select
              value={eventTypeCode}
              onChange={(e) => setEventTypeCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              {EVENT_CODE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Booking & Container Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Booking Reference
              </label>
              <input
                type="text"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value)}
                placeholder="BK-2026-67116"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Container ISO 6346
              </label>
              <input
                type="text"
                value={containerNumber}
                onChange={(e) => setContainerNumber(e.target.value)}
                placeholder="MSKU9284712"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Location Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Location UN/LOCODE
            </label>
            <input
              type="text"
              value={locationLocode}
              onChange={(e) => setLocationLocode(e.target.value)}
              placeholder="ESVLC, CNSHA, FRA"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Simulation Output Banner */}
          {simulationResult && (
            <div className="p-4 rounded-xl bg-slate-800/80 border border-emerald-600/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Processed Successfully
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {simulationResult.ingressStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Milestone Code:
                  </span>
                  <span className="font-mono font-semibold text-blue-400">
                    {simulationResult.canonicalMilestoneCode || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Exceptions Resolved:
                  </span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {simulationResult.autoResolvedCount} alert(s)
                  </span>
                </div>
              </div>
              {simulationResult.poMatched && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
                  Correlated to PO ID:{" "}
                  <span className="font-mono text-cyan-300">
                    {simulationResult.poMatched}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Buffering & Resolving...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Ingress Telemetry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

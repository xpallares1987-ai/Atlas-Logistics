import React, { useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  Radio,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Ship,
  FileCode2,
  Play,
  Zap,
  CheckCircle2,
  Server,
  PlusCircle,
  Copy,
} from "lucide-react";
import { Input, Button } from "@atlas/ui";
import {
  DcsaEventItem,
  DcsaSubscriptionItem,
} from "../../../types/edi-integration.types";
import { DcsaSubscriptionModal } from "../Modal/DcsaSubscription";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export interface EdiDcsaTabProps {
  dcsaEvents: DcsaEventItem[];
  dcsaSubscriptions: DcsaSubscriptionItem[];
  selectedDcsaEvent: DcsaEventItem | null;
  onSelectDcsaEvent: (event: DcsaEventItem | null) => void;
  dcsaFilterType: string;
  onDcsaFilterTypeChange: (filter: string) => void;
  isSimulating: boolean;
  simulationResult: any;
  simCarrier: "MSCU" | "MAEU" | "CMDU" | "HLCU";
  onSimCarrierChange: (carrier: "MSCU" | "MAEU" | "CMDU" | "HLCU") => void;
  simEventType: "EQUIPMENT" | "TRANSPORT" | "SHIPMENT";
  onSimEventTypeChange: (type: "EQUIPMENT" | "TRANSPORT" | "SHIPMENT") => void;
  simEventTypeCode: string;
  onSimEventTypeCodeChange: (code: string) => void;
  simBookingRef: string;
  onSimBookingRefChange: (ref: string) => void;
  simContainerNum: string;
  onSimContainerNumChange: (num: string) => void;
  simLocode: string;
  onSimLocodeChange: (locode: string) => void;
  simIsDisruption: boolean;
  onSimIsDisruptionChange: (disruption: boolean) => void;
  simDisruptionReason: string;
  onSimDisruptionReasonChange: (reason: string) => void;
  onSimulateEvent: () => void;
  onFetchEvents: () => void;
  subCarrier: string;
  onSubCarrierChange: (carrier: string) => void;
  subUrl: string;
  onSubUrlChange: (url: string) => void;
  subSecret: string;
  onSubSecretChange: (secret: string) => void;
  isSubmittingSub: boolean;
  onCreateSubscription: () => void;
  copyToClipboard: (text: string) => void;
}

export const EdiDcsaTab: React.FC<EdiDcsaTabProps> = ({
  dcsaEvents,
  dcsaSubscriptions,
  selectedDcsaEvent,
  onSelectDcsaEvent,
  dcsaFilterType,
  onDcsaFilterTypeChange,
  isSimulating,
  simulationResult,
  simCarrier,
  onSimCarrierChange,
  simEventType,
  onSimEventTypeChange,
  simEventTypeCode,
  onSimEventTypeCodeChange,
  simBookingRef,
  onSimBookingRefChange,
  simContainerNum,
  onSimContainerNumChange,
  simLocode,
  onSimLocodeChange,
  simIsDisruption,
  onSimIsDisruptionChange,
  simDisruptionReason,
  onSimDisruptionReasonChange,
  onSimulateEvent,
  onFetchEvents,
  subCarrier,
  onSubCarrierChange,
  subUrl,
  onSubUrlChange,
  subSecret,
  onSubSecretChange,
  isSubmittingSub,
  onCreateSubscription,
  copyToClipboard,
}) => {
  const [showSubModal, setShowSubModal] = useState(false);

  const filteredDcsaEvents = dcsaEvents.filter((ev) => {
    if (dcsaFilterType === "ALL") return true;
    if (dcsaFilterType === "DISRUPTION") return Boolean(ev.disruptionReason);
    return ev.eventType === dcsaFilterType;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Left: Live DCSA Telemetry Stream */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-7 flex flex-col gap-4"
      >
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Radio size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Telemetría Marítima en Tiempo Real (DCSA 3.0)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Eventos OpenAPI Track & Trace recibidos desde MSC, Maersk, CMA
                  CGM y Hapag-Lloyd
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={onFetchEvents}
                variant="ghost"
                className="text-slate-400 hover:text-white p-2 h-auto"
                title="Actualizar eventos"
              >
                <RefreshCw size={15} />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {["ALL", "EQUIPMENT", "TRANSPORT", "SHIPMENT", "DISRUPTION"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => onDcsaFilterTypeChange(f)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    dcsaFilterType === f
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  {f === "ALL"
                    ? `Todos (${dcsaEvents.length})`
                    : f === "DISRUPTION"
                      ? `Disrupciones (${dcsaEvents.filter((e) => e.disruptionReason).length})`
                      : `${f} (${dcsaEvents.filter((e) => e.eventType === f).length})`}
                </button>
              ),
            )}
          </div>

          {/* Events List */}
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[640px] pr-1">
            {filteredDcsaEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl gap-2">
                <Radio size={32} className="text-slate-600 animate-pulse" />
                <span className="text-xs">
                  No hay eventos DCSA registrados en este filtro.
                </span>
                <span className="text-[11px] text-slate-600">
                  Emita un evento telemático a la derecha para generar una
                  transmisión con firma HMAC.
                </span>
              </div>
            ) : (
              filteredDcsaEvents.map((ev, idx) => {
                const isDisruption = Boolean(ev.disruptionReason);
                const carrierBadgeColor =
                  ev.carrierCode === "MSCU"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : ev.carrierCode === "MAEU"
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                      : ev.carrierCode === "CMDU"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : "bg-orange-500/20 text-orange-300 border-orange-500/30";

                return (
                  <div
                    key={ev.eventId || ev.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDisruption
                        ? "bg-red-950/20 border-red-500/40 shadow-lg shadow-red-950/20"
                        : "bg-slate-950/60 border-slate-800 hover:border-indigo-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${carrierBadgeColor}`}
                        >
                          {ev.carrierCode || "CARRIER"}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-300 px-2 py-0.5 bg-slate-800/80 rounded-md">
                          {ev.eventType}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md ${
                            ev.eventTypeCode === "ROLL" || isDisruption
                              ? "bg-red-500/20 text-red-300 border border-red-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {ev.eventTypeCode}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          [{ev.eventClassifierCode}]
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                        <ShieldCheck size={13} />
                        <span>HMAC OK</span>
                      </div>
                    </div>

                    {/* Disruption Alert if present */}
                    {isDisruption && (
                      <div className="my-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2 text-xs text-red-200">
                        <AlertTriangle
                          size={15}
                          className="text-red-400 shrink-0 mt-0.5"
                        />
                        <div>
                          <div className="font-bold text-red-300 text-[11px] uppercase tracking-wide">
                            Disrupción Naviera Detectada (Bloqueo Operativo SCM)
                          </div>
                          <div className="text-[11px] text-red-200/90 mt-0.5">
                            {ev.disruptionReason}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mt-2 pt-2 border-t border-white/5">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">
                          Booking
                        </span>
                        <span className="font-mono text-indigo-300 font-bold">
                          {ev.carrierBookingReference || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">
                          Contenedor
                        </span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {ev.equipmentReference || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">
                          Puerto / LOCODE
                        </span>
                        <span className="font-mono text-amber-300 font-bold">
                          {ev.unLocationCode || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">
                          Fecha / Hora
                        </span>
                        <span className="text-slate-400 truncate block">
                          {new Date(ev.eventDateTime).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {ev.vesselName && (
                      <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                        <Ship size={12} className="text-indigo-400" />
                        <span>
                          Buque:{" "}
                          <strong className="text-slate-200">
                            {ev.vesselName}
                          </strong>
                        </span>
                        {ev.carrierVoyageNumber && (
                          <span>
                            (Viaje:{" "}
                            <strong className="text-slate-300 font-mono">
                              {ev.carrierVoyageNumber}
                            </strong>
                            )
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end mt-2 pt-1">
                      <button
                        onClick={() => onSelectDcsaEvent(ev)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1"
                      >
                        <FileCode2 size={12} />
                        Ver Payload JSON
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>

      {/* Right: Simulator & Webhook Subscriptions */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-5 flex flex-col gap-4"
      >
        {/* Simulator Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play size={18} className="text-indigo-400" />
              <span className="text-sm font-bold text-white">
                Emisor Telemático Carrier (DCSA 3.0)
              </span>
            </div>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              DCSA 3.0 Standard
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label
                htmlFor="sim-carrier"
                className="text-[11px] font-semibold text-slate-400 mb-1 block"
              >
                Línea Naviera (Carrier)
              </label>
              <select
                id="sim-carrier"
                name="simCarrier"
                value={simCarrier}
                onChange={(e: any) => onSimCarrierChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500/60"
              >
                <option value="MSCU">MSC - Mediterranean Shipping Co</option>
                <option value="MAEU">Maersk Line</option>
                <option value="CMDU">CMA CGM</option>
                <option value="HLCU">Hapag-Lloyd</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sim-event-type"
                className="text-[11px] font-semibold text-slate-400 mb-1 block"
              >
                Categoría de Evento
              </label>
              <select
                id="sim-event-type"
                name="simEventType"
                value={simEventType}
                onChange={(e: any) => onSimEventTypeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500/60"
              >
                <option value="EQUIPMENT">EQUIPMENT (Contenedor)</option>
                <option value="TRANSPORT">TRANSPORT (Buque / Escala)</option>
                <option value="SHIPMENT">SHIPMENT (Conocimiento / BL)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sim-event-type-code"
                className="text-[11px] font-semibold text-slate-400 mb-1 block"
              >
                Código de Hito DCSA
              </label>
              <select
                id="sim-event-type-code"
                name="simEventTypeCode"
                value={simEventTypeCode}
                onChange={(e: any) => onSimEventTypeCodeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500/60 font-mono"
              >
                <option value="LOAD">LOAD - Cargado en Buque</option>
                <option value="DEPA">DEPA - Salida de Puerto (Zarpe)</option>
                <option value="ARRI">ARRI - Llegada a Puerto Destino</option>
                <option value="DISC">DISC - Descargado en Terminal</option>
                <option value="GTIN">
                  GTIN - Entrada en Terminal (Gate-In)
                </option>
                <option value="ROLL">ROLL - Rollover / Disrupción</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sim-locode"
                className="text-[11px] font-semibold text-slate-400 mb-1 block"
              >
                Puerto UN/LOCODE
              </label>
              <Input
                id="sim-locode"
                name="simLocode"
                value={simLocode}
                onChange={(e: any) => onSimLocodeChange(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="sim-booking-ref"
                className="text-[11px] font-semibold text-slate-400 mb-1 block"
              >
                Referencia de Booking
              </label>
              <Input
                id="sim-booking-ref"
                name="simBookingRef"
                value={simBookingRef}
                onChange={(e: any) => onSimBookingRefChange(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="sim-container-num"
                className="text-[11px] font-semibold text-slate-400 mb-1 block"
              >
                Nº Contenedor
              </label>
              <Input
                id="sim-container-num"
                name="simContainerNum"
                value={simContainerNum}
                onChange={(e: any) => onSimContainerNumChange(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Disruption Toggle */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sim-is-disruption"
                className="text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle size={14} className="text-amber-400" />
                Registrar Disrupción Operativa / Rollover
              </label>
              <input
                id="sim-is-disruption"
                name="simIsDisruption"
                type="checkbox"
                checked={simIsDisruption}
                onChange={(e) => {
                  onSimIsDisruptionChange(e.target.checked);
                  if (e.target.checked) onSimEventTypeCodeChange("ROLL");
                }}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
            {simIsDisruption && (
              <Input
                id="sim-disruption-reason"
                name="simDisruptionReason"
                aria-label="Motivo de la disrupción"
                value={simDisruptionReason}
                onChange={(e: any) =>
                  onSimDisruptionReasonChange(e.target.value)
                }
                placeholder="Motivo de la disrupción..."
                className="bg-slate-900 border-red-500/30 text-xs text-red-200 mt-1"
              />
            )}
          </div>

          <Button
            onClick={onSimulateEvent}
            disabled={isSimulating}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
          >
            <Zap size={15} />
            {isSimulating
              ? "Firmando y Transmitiendo..."
              : "Emitir Evento Carrier (con HMAC SHA-256)"}
          </Button>

          {/* Simulation Result Box */}
          {simulationResult && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Evento DCSA Ingerido Exitosamente
                </span>
                <span className="text-[10px] font-mono text-emerald-300">
                  HTTP 200 OK
                </span>
              </div>

              <div className="text-[11px] text-slate-300 font-mono break-all bg-slate-950/70 p-2 rounded-xl border border-white/5">
                <span className="text-slate-500">Signature: </span>
                {simulationResult.verification?.headerReceived ||
                  "sha256 verified"}
              </div>

              <div className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>Integración SCM:</span>
                <span className="font-bold text-indigo-300">
                  {simulationResult.scmIntegration?.action ||
                    "Milestone Synchronized"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Webhook Subscriptions Management */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-indigo-400" />
              <span className="text-sm font-bold text-white">
                Suscripciones Webhook DCSA v3
              </span>
            </div>
            <Button
              onClick={() => setShowSubModal(!showSubModal)}
              className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] px-2.5 py-1 rounded-xl h-auto flex items-center gap-1"
            >
              <PlusCircle size={13} />
              Nueva
            </Button>
          </div>

          <DcsaSubscriptionModal
            isOpen={showSubModal}
            onClose={() => setShowSubModal(false)}
            subCarrier={subCarrier}
            onSubCarrierChange={onSubCarrierChange}
            subUrl={subUrl}
            onSubUrlChange={onSubUrlChange}
            subSecret={subSecret}
            onSubSecretChange={onSubSecretChange}
            isSubmitting={isSubmittingSub}
            onSubmit={() => {
              onCreateSubscription();
              setShowSubModal(false);
            }}
          />

          <div className="flex flex-col gap-2">
            {dcsaSubscriptions.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">
                No hay suscripciones webhook activas. Registre los endpoints de
                sus navieras colaboradoras.
              </div>
            ) : (
              dcsaSubscriptions.map((sub, idx) => (
                <div
                  key={(sub as any).subscriptionId || (sub as any).id || idx}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-400">
                        {sub.carrierCode}
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                        ACTIVO
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-[240px] mt-0.5">
                      {sub.callbackUrl}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono">
                    HMAC SHA-256
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal for inspect DCSA payload */}
      {selectedDcsaEvent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 size={20} className="text-indigo-400" />
                <span className="font-bold text-white text-base">
                  DCSA Event: {selectedDcsaEvent.eventId}
                </span>
              </div>
              <Button
                onClick={() => onSelectDcsaEvent(null)}
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-xs font-mono text-slate-200 overflow-x-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(selectedDcsaEvent, null, 2)}
            </pre>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() =>
                  copyToClipboard(JSON.stringify(selectedDcsaEvent, null, 2))
                }
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Copy size={14} /> Copiar JSON
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

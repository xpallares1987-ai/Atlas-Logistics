/**
 * @file CargoIqTimeline.tsx
 * @description Cargo iQ SLA Milestone Control Tower and live event recorder tab.
 * @module @atlas/frontend/components/IataOneRecord/Tab/CargoIqTimeline
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Clock, CheckCircle2, Check, Plane, AlertTriangle } from "lucide-react";
import { Button } from "@atlas/ui";
import type {
  CargoIqMilestone,
  CargoIqMilestoneCode,
  OneRecordWaybill,
} from "@atlas/shared";

export interface CargoIqTimelineProps {
  selectedWaybill: OneRecordWaybill;
  milestones: CargoIqMilestone[];
  eventCode: CargoIqMilestoneCode;
  setEventCode: (code: CargoIqMilestoneCode) => void;
  eventRemarks: string;
  setEventRemarks: (remarks: string) => void;
  milestoneFeedback: string;
  onRecordMilestoneEvent: () => void;
}

export const CargoIqTimeline: React.FC<CargoIqTimelineProps> = ({
  selectedWaybill,
  milestones,
  eventCode,
  setEventCode,
  eventRemarks,
  setEventRemarks,
  milestoneFeedback,
  onRecordMilestoneEvent,
}) => {
  return (
    <div className="space-y-6">
      {/* Milestone Operational Update Action */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-emerald-400" />
          Registrar Actualización Operativa Cargo iQ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Código de Hito Cargo iQ
            </label>
            <select
              id="milestoneCodeSelect"
              value={eventCode}
              onChange={(e) =>
                setEventCode(e.target.value as CargoIqMilestoneCode)
              }
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="FWB">FWB · e-AWB Capturado</option>
              <option value="FHL">FHL · Manifiesto House Procesado</option>
              <option value="RCS">
                RCS · Carga Recibida (Ready for Carriage)
              </option>
              <option value="DEP">DEP · Salida de Vuelo</option>
              <option value="ARR">ARR · Llegada de Vuelo</option>
              <option value="RCF">RCF · Check-in Almacén Destino</option>
              <option value="NFD">NFD · Aviso de Llegada Emitido</option>
              <option value="DLV">DLV · Entrega Final Realizada</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observaciones Operativas
            </label>
            <input
              id="milestoneRemarksInput"
              type="text"
              value={eventRemarks}
              onChange={(e) => setEventRemarks(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Detalle de rampa, ULD o pesaje..."
            />
          </div>

          <div>
            <Button
              id="btnUpdateMilestone"
              onClick={onRecordMilestoneEvent}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Registrar Evento de Hito
            </Button>
          </div>
        </div>

        {milestoneFeedback && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{milestoneFeedback}</span>
          </div>
        )}
      </div>

      {/* Cargo iQ Pipeline Timeline */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Plane className="w-4 h-4 text-blue-400" />
            Matriz de Cumplimiento Cargo iQ SLA (Vuelo{" "}
            {selectedWaybill.transportMovement.flightNumber})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            AWB {selectedWaybill.fullAwbNumber}
          </span>
        </div>

        <div className="space-y-4">
          {milestones.map((m, idx) => {
            const isCompleted = m.status === "COMPLETED";
            const isBreached = m.status === "SLA_BREACHED";
            const isWarning = m.status === "WARNING_AT_RISK";

            return (
              <div
                key={m.milestoneCode}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-800/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-all gap-3"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full font-bold text-xs bg-slate-800 text-slate-300 border border-slate-700">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400 text-sm">
                        {m.milestoneCode}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {m.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {m.locationAirport}
                      </span>
                    </div>
                    {m.eventRemarks && (
                      <p className="text-xs text-slate-400 mt-1 italic">
                        «{m.eventRemarks}»
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Planificado</span>
                    <span className="text-slate-300 font-mono">
                      {new Date(m.plannedTimestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Límite SLA</span>
                    <span className="text-slate-300 font-mono">
                      {new Date(m.slaLimitTimestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {m.actualTimestamp && (
                    <div>
                      <span className="text-slate-500 block">Real</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {new Date(m.actualTimestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}

                  <div>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3 h-3" />
                        Completado (
                        {m.deltaMinutes !== undefined && m.deltaMinutes >= 0
                          ? `+${m.deltaMinutes}m`
                          : `${m.deltaMinutes}m`}
                        )
                      </span>
                    )}
                    {isBreached && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        SLA Breached
                      </span>
                    )}
                    {isWarning && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        En Riesgo
                      </span>
                    )}
                    {!isCompleted && !isBreached && !isWarning && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Clock className="w-3 h-3" />
                        En Tiempo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

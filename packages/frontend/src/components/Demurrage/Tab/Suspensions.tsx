/**
 * @file Suspensions.tsx
 * @description Statutory clock-pause suspension engine and SQLite suspension declaration form.
 * @module @atlas/frontend/components/Demurrage/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState } from "react";
import { FileCheck, PauseCircle } from "lucide-react";
import { Button } from "@atlas/ui";
import type {
  CarrierInvoiceData,
  ClockSuspension,
  DemurrageAuditResult,
  SuspensionReasonCode,
} from "@atlas/shared";
import type { NewSuspensionInput } from "../../../types/demurrage.types";

interface SuspensionsProps {
  currentInvoice: CarrierInvoiceData;
  currentSuspensions: ClockSuspension[];
  auditResult: DemurrageAuditResult;
  isAddingSuspension: boolean;
  onAddSuspension: (input: NewSuspensionInput) => void;
}

export function Suspensions({
  currentInvoice,
  currentSuspensions,
  auditResult,
  isAddingSuspension,
  onAddSuspension,
}: SuspensionsProps) {
  const [newReasonCode, setNewReasonCode] = useState<SuspensionReasonCode>(
    "TERMINAL_GATE_CLOSED",
  );
  const [newReasonText, setNewReasonText] = useState("");
  const [newStartDate, setNewStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newEndDate, setNewEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newNoticeRef, setNewNoticeRef] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSuspension({
      reasonCode: newReasonCode,
      reasonText: newReasonText,
      startDate: newStartDate,
      endDate: newEndDate,
      noticeRef: newNoticeRef,
    });
    setNewReasonText("");
    setNewNoticeRef("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Suspensions List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Eventos de Pausa de Reloj Registrados (SQLite)
            </h2>
            <p className="text-xs text-slate-400">
              Días legalmente excluidos del cómputo de demurrage para el
              contenedor {currentInvoice.containerNumber}.
            </p>
          </div>
          <div className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-medium">
            Total Pausa: {auditResult.totalSuspendedDays} días
          </div>
        </div>

        <div className="space-y-3">
          {currentSuspensions.map((susp, idx) => (
            <div
              key={susp.id || idx}
              className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 hover:border-slate-600 transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    {susp.code}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {susp.startDate} → {susp.endDate}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  +{susp.suspendedDays} día(s) deducidos
                </span>
              </div>

              <p className="text-sm font-medium text-white">{susp.reason}</p>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-700/50">
                <div className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Referencia Oficial:{" "}
                    <strong>{susp.officialNoticeRef || "Aviso Oficial"}</strong>
                  </span>
                </div>
                <span className="text-emerald-400 font-medium">
                  Certificado y Aprobado
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Register New Suspension Form */}
      <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4 h-fit">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
          <PauseCircle className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">
            Declarar Nueva Suspensión de Reloj (SQLite)
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Causa Reglamentaria (FMC / Puerto)
            </label>
            <select
              value={newReasonCode}
              onChange={(e) =>
                setNewReasonCode(e.target.value as SuspensionReasonCode)
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="TERMINAL_GATE_CLOSED">
                Cierre de Puertas de Terminal (Gate Closed)
              </option>
              <option value="APPOINTMENT_UNAVAILABLE">
                Falta de Citas de Entrada (No Appointments)
              </option>
              <option value="CUSTOMS_PHYSICAL_EXAM">
                Inspección Física Aduana (Circuito Rojo / Exam)
              </option>
              <option value="CUSTOMS_VACIS_SCAN">
                Escáner No Intrusivo VACIS / Rayos X
              </option>
              <option value="CHASSIS_SHORTAGE">
                Déficit de Chasis / Plataformas Autorizadas
              </option>
              <option value="RAIL_EMBARGO">
                Embargo Ferroviario o Avería de Vía (Adif/Rail)
              </option>
              <option value="PORT_STRIKE_FORCE_MAJEURE">
                Huelga Portuaria / Fuerza Mayor
              </option>
              <option value="CARRIER_IT_OUTAGE">
                Caída de Sistemas Informáticos Naviera / TOS
              </option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Descripción de los Hechos
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Terminal Pier 400 sin ventanas de cita habilitadas en eModal..."
              value={newReasonText}
              onChange={(e) => setNewReasonText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Fecha Fin
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Referencia / Boletín Oficial
            </label>
            <input
              type="text"
              placeholder="Ej. Incidencia eModal #APM-400 / DUA Circuito Rojo"
              value={newNoticeRef}
              onChange={(e) => setNewNoticeRef(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isAddingSuspension}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 flex items-center justify-center gap-2"
          >
            <PauseCircle className="w-4 h-4" />
            {isAddingSuspension
              ? "Registrando en SQLite..."
              : "Registrar e Incorporar a la Auditoría"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Suspensions;

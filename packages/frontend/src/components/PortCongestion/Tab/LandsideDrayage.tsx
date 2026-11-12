/**
 * @file LandsideDrayage.tsx
 * @description Landside drayage and intermodal rail appointments rebalance tab.
 * @module @atlas/frontend/components/PortCongestion/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { RefreshCw, Train, Truck } from "lucide-react";
import type { LandsideDrayageTabProps } from "../../../types/port-congestion.types";

export function LandsideDrayage({
  activeDrayage,
  onRebalanceDrayage,
}: LandsideDrayageTabProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-cyan-400" />
            <span>
              Avisos de Acarreo Terrestre & Enlaces Ferroviarios (Hubs
              Intermodales Portuarios)
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Sincronización desatendida entre atraques marítimos y acarreos de
            carretera/tren para suprimir colas en terminal.
          </p>
        </div>
        <Button
          onClick={onRebalanceDrayage}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Rebalancear Citas de Entrada</span>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
            <tr>
              <th className="p-3">ID Cita</th>
              <th className="p-3">Hub & Modalidad</th>
              <th className="p-3">Transportista / Conductor</th>
              <th className="p-3">Contenedor</th>
              <th className="p-3">Buque Destino</th>
              <th className="p-3">Ventana Original</th>
              <th className="p-3">Ventana Ajustada</th>
              <th className="p-3">Espera Puerta</th>
              <th className="p-3">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {activeDrayage.map((apt) => (
              <tr key={apt.appointmentId} className="hover:bg-slate-800/50">
                <td className="p-3 font-mono font-bold text-slate-400">
                  {apt.appointmentId}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    {apt.transportMode === "TREN" ? (
                      <Train className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{apt.corridorHub}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {apt.transportMode === "TREN"
                      ? "Ferrocarril UIC/Ibérico"
                      : "Camión-Lona Carretera"}
                  </span>
                </td>
                <td className="p-3">
                  <span className="font-semibold text-slate-200">
                    {apt.truckingCompany}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono">
                    {apt.licensePlate} ({apt.driverName})
                  </span>
                </td>
                <td className="p-3 font-mono font-bold text-cyan-300">
                  {apt.containerNo}
                </td>
                <td className="p-3 text-slate-200">{apt.vesselName}</td>
                <td className="p-3 font-mono text-slate-400">
                  {new Date(apt.originalSlotStart).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(apt.originalSlotEnd).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="p-3 font-mono font-bold text-amber-400">
                  {new Date(apt.adjustedSlotStart).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(apt.adjustedSlotEnd).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="p-3 font-mono">
                  ~{apt.terminalGateWaitMinutesEstimate} min
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      apt.status === "ADJUSTED_WARNING"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {apt.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default LandsideDrayage;

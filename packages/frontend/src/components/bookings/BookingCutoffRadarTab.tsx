import React from "react";
import {
  Search,
  Clock,
  CheckCircle2,
  Anchor,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Button } from "@atlas/ui";
import type { BookingCutoffRadarTabProps } from "../../types/booking-management.types";

export const BookingCutoffRadarTab: React.FC<BookingCutoffRadarTabProps> = ({
  activeBooking,
  allBookings,
  cutOffEval,
  searchTerm,
  setSearchTerm,
  onSelectBooking,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Radar de Hitos y Fechas Límite (Cut-Off Milestones)
          </h2>
          <p className="text-xs text-slate-400">
            Control en tiempo real de plazos críticos para evitar cargos por
            retraso de documentación o exclusión de carga.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar reserva / booking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Cut-Off Countdown Cards for Active Booking */}
      {activeBooking.cutOffs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">
                SI Cut-Off (Instrucciones)
              </span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold font-mono text-blue-400">
              {cutOffEval?.siHoursRemaining ?? 24}h restantes
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {activeBooking.cutOffs.siCutOff
                .replace("T", " ")
                .replace("Z", "")}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigateTab("SI_STUDIO")}
              className="w-full text-xs mt-1"
            >
              Editar Instrucciones <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">
                VGM Cut-Off (Peso Bruto)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {cutOffEval?.vgmHoursRemaining ?? 36}h restantes
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {activeBooking.cutOffs.vgmCutOff
                .replace("T", " ")
                .replace("Z", "")}
            </div>
            <div className="text-[10px] text-emerald-400 font-medium pt-1">
              ✓ Báscula / SOLAS Certificada
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">
                Cargo Gate-In Cut-Off
              </span>
              <Anchor className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono text-amber-400">
              {cutOffEval?.cargoHoursRemaining ?? 48}h restantes
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {activeBooking.cutOffs.cargoCutOff
                .replace("T", " ")
                .replace("Z", "")}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigateTab("EQUIPMENT_RELEASE")}
              className="w-full text-xs mt-1"
            >
              Ver Pase Depósito <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">
                Export Customs Cut-Off
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold font-mono text-purple-400">
              {cutOffEval?.customsHoursRemaining ?? 40}h restantes
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {activeBooking.cutOffs.customsCutOff
                .replace("T", " ")
                .replace("Z", "")}
            </div>
            <div className="text-[10px] text-purple-300 font-medium pt-1">
              ✓ Levante DUA / Exportación
            </div>
          </div>
        </div>
      )}

      {/* All Active Bookings Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-800/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/90 text-slate-400 border-b border-slate-700 font-semibold uppercase">
            <tr>
              <th className="py-3 px-4">Booking / Referencia</th>
              <th className="py-3 px-4">Naviera / SCAC</th>
              <th className="py-3 px-4">Buque & Viaje</th>
              <th className="py-3 px-4">Ruta (POL → POD)</th>
              <th className="py-3 px-4">Equipo Allotted</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {allBookings.map((bkg) => {
              const isSelected = bkg.id === activeBooking.id;
              return (
                <tr
                  key={bkg.id}
                  className={`hover:bg-slate-800/60 transition-colors ${
                    isSelected ? "bg-blue-900/20" : ""
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-semibold text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{bkg.bookingNumber || bkg.referenceNumber}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Activo
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans font-normal truncate max-w-[200px]">
                      {bkg.commodityDescription}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-white font-medium">
                      {bkg.rateLock.carrierName}
                    </div>
                    <div className="text-slate-400 text-[11px] font-mono">
                      SCAC: {bkg.carrierScac}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-white font-medium">
                      {bkg.vesselName}
                    </div>
                    <div className="text-slate-400 text-[11px] font-mono">
                      Viaje: {bkg.voyageNumber}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                    {bkg.originPort} → {bkg.destinationPort}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="text-blue-300 font-semibold">
                      {bkg.requestedEquipment.quantity}x{" "}
                      {bkg.requestedEquipment.isoType}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> {bkg.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        onSelectBooking(bkg);
                        onNavigateTab("SI_STUDIO");
                      }}
                      className="text-xs"
                    >
                      Gestionar B/L{" "}
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

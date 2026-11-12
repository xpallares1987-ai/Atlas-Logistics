/**
 * @file Radar.tsx
 * @description Real-time free-time and demurrage clocks radar table backed by SQLite invoices.
 * @module @atlas/frontend/components/Demurrage/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import {
  Search,
  Scale,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  calculateDemurrageAudit,
  type CarrierInvoiceData,
} from "@atlas/shared";
import {
  mapDbInvoiceToCarrierData,
  mapDbSuspensionToClockSuspension,
} from "../hooks/demurrageHelpers";

interface RadarProps {
  displayInvoices: any[];
  isLoadingInvoices: boolean;
  activeDbInvoice: any;
  currentInvoice: CarrierInvoiceData;
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  onAuditInvoice: (invoice: any) => void;
}

export function Radar({
  displayInvoices,
  isLoadingInvoices,
  activeDbInvoice,
  currentInvoice,
  searchTerm,
  onSearchTermChange,
  onAuditInvoice,
}: RadarProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Radar de Relojes de Demurrage en Tiempo Real (SQLite)
          </h2>
          <p className="text-xs text-slate-400">
            Monitorización continua de terminales marítimas y ferroviarias, días
            libres y deducción automática de suspensiones.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="demurrage-filter"
            name="demurrageFilter"
            aria-label="Filtrar contenedor / B/L"
            type="text"
            placeholder="Filtrar contenedor / B/L..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-800/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/90 text-slate-400 border-b border-slate-700 font-semibold uppercase">
            <tr>
              <th className="py-3 px-4">Contenedor / B/L</th>
              <th className="py-3 px-4">Naviera / SCAC</th>
              <th className="py-3 px-4">Puerto & Terminal</th>
              <th className="py-3 px-4">
                Días Dwell (Bruto / Suspendido / Neto)
              </th>
              <th className="py-3 px-4">Días Libres</th>
              <th className="py-3 px-4">Estado del Reloj</th>
              <th className="py-3 px-4">Importe Incurrido</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoadingInvoices ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-slate-400 font-mono"
                >
                  Cargando facturas de demurrage desde SQLite...
                </td>
              </tr>
            ) : (
              displayInvoices.map((inv) => {
                const invCarrierData = mapDbInvoiceToCarrierData(inv);
                const invSuspensions = (inv.suspensions || []).map(
                  mapDbSuspensionToClockSuspension,
                );
                const pAudit = calculateDemurrageAudit({
                  invoice: invCarrierData,
                  suspensions: invSuspensions,
                });
                const isSelected =
                  inv.id === activeDbInvoice?.id ||
                  inv.containerNumber === currentInvoice.containerNumber;

                return (
                  <tr
                    key={inv.id || inv.invoiceNumber}
                    className={`hover:bg-slate-800/60 transition-colors ${
                      isSelected ? "bg-blue-900/20" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{inv.containerNumber}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans font-normal">
                        B/L: {inv.billOfLading}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-white font-medium">
                        {inv.carrierName}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        SCAC: {inv.carrierScac}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-white font-medium">{inv.pod}</div>
                      <div className="text-slate-400 text-[11px] truncate max-w-[180px]">
                        {inv.terminalName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200">
                          {pAudit.grossCalendarDwellDays}d brutos
                        </span>
                        <span className="text-amber-400 font-semibold">
                          (-{pAudit.totalSuspendedDays}d pausa)
                        </span>
                        <span className="text-emerald-400 font-bold">
                          = {pAudit.netActualDwellDays}d netos
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-blue-300 font-semibold">
                        {inv.freeDaysGranted ?? 4} días
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.status === "DISPUTED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Scale className="w-3 h-3" /> Disputa FMC
                        </span>
                      ) : pAudit.auditStatus === "FULL_WAIVER_JUSTIFIED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldAlert className="w-3 h-3" /> Exención 100%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> Devengo Excesivo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <div>
                        {(
                          inv.totalInvoicedUsd ??
                          inv.invoicedAmount ??
                          1400
                        ).toLocaleString()}{" "}
                        {inv.currency || "USD"}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-normal">
                        Disputa: {pAudit.disputedWaiverAmount.toLocaleString()}{" "}
                        {inv.currency || "USD"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onAuditInvoice(inv)}
                        className="text-xs"
                      >
                        Auditar <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Regulatory Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-white">
            Regulación FMC 46 CFR § 541 & Estándares Portuarios Europeos:{" "}
          </span>
          Bajo el estándar FMC OSRA 2022, el reloj de días libres (Free Time)
          debe pausarse obligatoriamente siempre que el contenedor no esté
          física u operativamente disponible para su recogida o devolución (ej.
          bloqueo de citas en terminal, inspecciones aduaneras no intrusivas
          VACIS o reconocimientos físicos de circuito rojo, huelgas o averías de
          báscula/OCR).
        </div>
      </div>
    </div>
  );
}

export default Radar;

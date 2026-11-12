/**
 * @file BookingInbox.tsx
 * @description Live 2-Phase Operational Booking Inbox (Booking -> Active Shipment + Draft B/L).
 * @module @atlas/frontend/components/bookings/Panel
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Package, CheckCircle2, Truck, X, Download } from "lucide-react";
import { Button } from "@atlas/ui";
import { downloadDraftBLModalPdf } from "../../../utils/booking-pdf.utils";

export interface BookingInboxProps {
  dbBookings: any[];
  loadingDbBookings: boolean;
  onRefresh: () => void;
  lastConversionResult: any;
  onClearConversionResult: () => void;
  onOpenDrayage: (
    originId?: string,
    bkgRef?: string,
    containerNum?: string,
  ) => void;
  onOpenConfirmModal: (bkg: any) => void;
  onCancelBooking: (bookingId: string) => void;
}

export function BookingInbox({
  dbBookings,
  loadingDbBookings,
  onRefresh,
  lastConversionResult,
  onClearConversionResult,
  onOpenDrayage,
  onOpenConfirmModal,
  onCancelBooking,
}: BookingInboxProps) {
  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Bandeja Operativa de Reservas (Booking-to-Shipment Pipeline)
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
              {dbBookings.length} registros
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fase 1: Solicitudes creadas desde Cotizaciones/Pricing (PENDING) →
            Fase 2: Confirmación Naviera, creación atómica de Expedición
            (Shipment + Hitos) y emisión de Borrador B/L.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={onRefresh}
            className="text-xs py-1.5 px-3"
          >
            {loadingDbBookings ? "Actualizando..." : "Actualizar Bandeja"}
          </Button>
        </div>
      </div>

      {lastConversionResult && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-emerald-300">
                ¡Conversión Operativa Completada!
              </span>{" "}
              Reserva{" "}
              <span className="font-mono font-bold text-white">
                {lastConversionResult.booking?.referenceNumber}
              </span>{" "}
              → Expedición Activa{" "}
              <span className="font-mono font-bold text-emerald-400">
                {lastConversionResult.shipment?.trackingNumber}
              </span>{" "}
              ({lastConversionResult.milestones?.length || 3} hitos creados) y
              Borrador B/L{" "}
              <span className="font-mono font-bold text-indigo-300">
                {lastConversionResult.blDocument?.documentReference}
              </span>
            </div>
          </div>
          <button
            onClick={onClearConversionResult}
            className="text-xs text-slate-400 hover:text-white self-end sm:self-center"
          >
            Cerrar
          </button>
        </div>
      )}

      {dbBookings.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800/80">
          No hay solicitudes de reserva en la base de datos. Cree una desde{" "}
          <strong className="text-indigo-400">/quotes</strong>,{" "}
          <strong className="text-indigo-400">/pricing</strong> o con el botón{" "}
          <strong className="text-white">New Booking</strong> arriba.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Booking Ref</th>
                <th className="py-2.5 px-3">Cliente / Naviera</th>
                <th className="py-2.5 px-3">Ruta (POL → POD)</th>
                <th className="py-2.5 px-3">Equipo & Carga</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Expedición / B/L</th>
                <th className="py-2.5 px-3 text-right">Acción Operativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dbBookings.slice(0, 12).map((bkg) => {
                const details = bkg.parsedCargoDetails || {};
                const isPending = bkg.status === "PENDING";
                const isConfirmed = bkg.status === "CONFIRMED";
                return (
                  <tr
                    key={bkg.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                      {bkg.referenceNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">
                        {details.customerName || "Corporate Client"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {details.carrier || "Ocean Carrier"} ·{" "}
                        {details.incoterm || "FOB"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-slate-200">
                        {bkg.origin}
                      </span>
                      <span className="text-emerald-400 mx-1.5">→</span>
                      <span className="font-mono text-slate-200">
                        {bkg.destination}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono mr-1.5">
                        {bkg.equipment || "40HC"}
                      </span>
                      <span className="text-slate-400">
                        {details.commodity || "General Cargo"} (
                        {Number(details.weight || 18000).toLocaleString()} kg)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isConfirmed
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : isPending
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {bkg.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {details.shipmentTrackingNumber ? (
                        <div>
                          <div className="text-emerald-400 font-bold">
                            {details.shipmentTrackingNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            B/L:{" "}
                            {details.blReference ||
                              `BL-${details.shipmentTrackingNumber}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">
                          Pendiente confirmación
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isPending && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenDrayage(
                                bkg.shipperAddressId || undefined,
                                bkg.referenceNumber,
                                details.containerNumber || undefined,
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-xs transition-colors flex items-center gap-1"
                            title="Cotizar Acarreo Terrestre (Drayage)"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Acarreo
                          </button>
                          <button
                            onClick={() => onOpenConfirmModal(bkg)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar y Generar Expedición
                          </button>
                          <button
                            onClick={() => onCancelBooking(bkg.id)}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 text-xs transition-colors"
                            title="Cancelar Reserva"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {isConfirmed && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenDrayage(
                                bkg.shipperAddressId || undefined,
                                bkg.referenceNumber,
                                details.containerNumber || undefined,
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-xs transition-colors flex items-center gap-1"
                            title="Cotizar Acarreo Terrestre (Drayage)"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Acarreo
                          </button>
                          <button
                            onClick={() =>
                              downloadDraftBLModalPdf({
                                blReference:
                                  details.blReference ||
                                  `BL-${details.shipmentTrackingNumber || bkg.referenceNumber}`,
                                bookingReference: bkg.referenceNumber,
                                carrierBookingNumber:
                                  details.carrierBookingNumber ||
                                  `CR-${bkg.referenceNumber}`,
                                trackingNumber:
                                  details.shipmentTrackingNumber ||
                                  "ATLS-BOOKED",
                                carrier: details.carrier || "Ocean Carrier",
                                shipperName:
                                  details.customerName ||
                                  "Atlas Global Imports S.L.",
                                consigneeName: "European Distribution Hub B.V.",
                                vesselName: bkg.vessel || "MV ATLAS HORIZON",
                                voyageNumber: bkg.voyage || "VY-2026E",
                                origin: bkg.origin,
                                destination: bkg.destination,
                                equipment: bkg.equipment || "40HC",
                                containerNumber:
                                  details.containerNumber || "ATLU4928174",
                                sealNumber:
                                  details.sealNumber || "SL-ATLS-90124",
                                commodity: details.commodity || "General Cargo",
                                weightKg: Number(details.weight) || 18000,
                                incoterm: details.incoterm || "FOB",
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Descargar B/L (PDF)
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

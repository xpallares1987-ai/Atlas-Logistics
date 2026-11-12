import React from "react";
import { Download, Key, Truck, QrCode } from "lucide-react";
import { Button } from "@atlas/ui";
import type { BookingEquipmentReleaseTabProps } from "../../types/booking-management.types";

export const BookingEquipmentReleaseTab: React.FC<
  BookingEquipmentReleaseTabProps
> = ({
  activeBooking,
  onDownloadDepotPass,
  onOpenDrayageModal,
  onGenerateRelease,
  isReleasePending,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Equipment Release Details */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Orden de Liberación de Equipo Vacío (Empty Release)
            </h2>
            <p className="text-xs text-slate-400">
              Autorización oficial para la recogida de contenedores vacíos en el
              depósito del puerto.
            </p>
          </div>
          <Button
            size="sm"
            onClick={onDownloadDepotPass}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar Pase de Depósito (PDF)
          </Button>
        </div>

        {activeBooking.equipmentRelease ? (
          <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <div className="text-slate-400">
                  Número de Orden de Liberación:
                </div>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {activeBooking.equipmentRelease.releaseOrderNumber}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold font-mono">
                ✓ ESTADO: {activeBooking.equipmentRelease.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400">Depósito Autorizado:</span>
                <div className="font-bold text-white text-sm">
                  {activeBooking.equipmentRelease.depotName}
                </div>
                <div className="text-slate-400">
                  {activeBooking.equipmentRelease.depotAddress}
                </div>
                <div className="text-[11px] font-mono text-blue-400 pt-1">
                  Código: {activeBooking.equipmentRelease.depotCode}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400">
                  Equipo & Cantidad Autorizada:
                </span>
                <div className="font-bold text-white text-sm">
                  {activeBooking.equipmentRelease.containerCount}x{" "}
                  {activeBooking.equipmentRelease.isoType} High Cube
                </div>
                <div className="text-slate-400">
                  Validez Hasta:{" "}
                  <strong className="text-slate-200 font-mono">
                    {activeBooking.equipmentRelease.validUntil}
                  </strong>
                </div>
                <div className="text-[11px] text-emerald-400 font-mono pt-1">
                  Precintos Reservados:{" "}
                  {activeBooking.equipmentRelease.sealNumbersAllocated.join(
                    ", ",
                  )}
                </div>
              </div>
            </div>

            {/* Driver PIN Box */}
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                  <Key className="w-4 h-4 text-blue-400" /> PIN de Acceso de
                  Transportista
                </div>
                <div className="text-slate-400 text-xs mt-0.5">
                  Introducir este PIN de 4 dígitos en el quiosco de entrada de
                  la terminal para liberar los contenedores.
                </div>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onOpenDrayageModal(
                        activeBooking.bookingNumber ||
                          activeBooking.referenceNumber,
                      )
                    }
                    className="text-xs flex items-center gap-1.5 text-indigo-300 border-indigo-500/40 hover:bg-indigo-950/40"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Cotizar / Asignar Acarreo Terrestre
                  </Button>
                </div>
              </div>
              <div className="px-6 py-2 rounded-xl bg-blue-600 text-white font-mono font-bold text-2xl tracking-widest text-center shadow-lg shadow-blue-600/30">
                {activeBooking.equipmentRelease.pickupPin}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center space-y-3">
            <QrCode className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="text-sm font-semibold text-white">
              No se ha emitido orden de liberación para esta reserva
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Haga clic en el botón a continuación para generar el pase de
              recogida en depósito con PIN y precintos autorizados.
            </p>
            <Button
              onClick={() => {
                onGenerateRelease({
                  bookingId: activeBooking.id,
                  depotCode: "ESBCN-RAIL-DEPOT",
                  depotName: "Barcelona Intermodal Rail Depot",
                  depotAddress:
                    "Muelle Portuario, Terminal Ferroviaria, Barcelona",
                });
              }}
              disabled={isReleasePending}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              {isReleasePending
                ? "Generando..."
                : "Generar Orden de Liberación"}
            </Button>
          </div>
        )}
      </div>

      {/* Right Column: QR Gate Pass Preview */}
      <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4 h-fit text-xs text-center">
        <div className="flex items-center justify-center gap-2 pb-2 border-b border-slate-700">
          <QrCode className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white">
            Pase Digital de Acceso Gate
          </h3>
        </div>

        <div className="p-6 rounded-xl bg-white text-slate-900 inline-block mx-auto border-4 border-slate-800 shadow-xl">
          <QrCode className="w-32 h-32 text-slate-900" />
          <div className="font-mono font-bold text-xs mt-2 text-slate-700">
            PIN: {activeBooking.equipmentRelease?.pickupPin || "8492"}
          </div>
        </div>

        <div className="text-slate-400 text-[11px] leading-relaxed">
          Escanee en la barrera OCR del depósito de contenedores para apertura
          automática de barrera y pesaje en báscula.
        </div>
      </div>
    </div>
  );
};

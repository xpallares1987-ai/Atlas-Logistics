import React from "react";
import { CheckCircle2, X, Building2, Truck } from "lucide-react";
import { Button, AddressSelector } from "@atlas/ui";
import type { BookingConfirmModalProps } from "../../../types/booking-management.types";

export const BookingConfirmModal: React.FC<BookingConfirmModalProps> = ({
  confirmingBooking,
  onClose,
  confirmForm,
  setConfirmForm,
  onSubmit,
  isSubmitting,
  onOpenDrayage,
}) => {
  if (!confirmingBooking) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Confirmar Reserva y Generar Expedición Activa
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reserva{" "}
              <span className="font-mono font-bold text-indigo-400">
                {confirmingBooking.referenceNumber}
              </span>{" "}
              ({confirmingBooking.origin} → {confirmingBooking.destination})
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Nº Confirmación Naviera (Carrier Booking Ref) *
              </label>
              <input
                type="text"
                required
                value={confirmForm.carrierBookingNumber}
                onChange={(e) =>
                  setConfirmForm({
                    ...confirmForm,
                    carrierBookingNumber: e.target.value,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Buque (Vessel Name) *
              </label>
              <input
                type="text"
                required
                value={confirmForm.vesselName}
                onChange={(e) =>
                  setConfirmForm({
                    ...confirmForm,
                    vesselName: e.target.value,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Viaje (Voyage Number) *
              </label>
              <input
                type="text"
                required
                value={confirmForm.voyageNumber}
                onChange={(e) =>
                  setConfirmForm({
                    ...confirmForm,
                    voyageNumber: e.target.value,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Nº Contenedor Asignado
              </label>
              <input
                type="text"
                value={confirmForm.containerNumber}
                onChange={(e) =>
                  setConfirmForm({
                    ...confirmForm,
                    containerNumber: e.target.value,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
          </div>

          {/* Addresses Hub Integration: B/L 4 Party Boxes */}
          <div className="pt-3 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>
                  Partes Documentales del Conocimiento de Embarque (Addresses
                  Hub)
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenDrayage(
                    confirmForm.shipperAddressId || undefined,
                    confirmingBooking?.referenceNumber,
                    confirmForm.containerNumber || undefined,
                  );
                }}
                className="text-xs flex items-center gap-1.5 text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/40 h-7"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Cotizar Acarreo</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AddressSelector
                id="confirm-bkg-shipper"
                label="1. Shipper / Exportador (B/L)"
                roleType="CUSTOMER"
                selectedAddressId={confirmForm.shipperAddressId}
                onAddressSelect={(addr) => {
                  setConfirmForm((prev) => ({
                    ...prev,
                    shipperAddressId: addr?.id || "",
                    shipperName: addr?.companyName || prev.shipperName,
                  }));
                }}
              />

              <AddressSelector
                id="confirm-bkg-consignee"
                label="2. Consignee / Consignatario (B/L)"
                enableToOrder={true}
                isToOrder={confirmForm.isToOrder}
                orderOf={confirmForm.orderOf}
                onToOrderChange={(toOrder, ord) => {
                  setConfirmForm((prev) => ({
                    ...prev,
                    isToOrder: toOrder,
                    orderOf: ord,
                    consigneeName: toOrder
                      ? `TO ORDER OF ${ord}`
                      : prev.consigneeName,
                  }));
                }}
                roleType={["CUSTOMER", "CONSIGNEE_NOTIFY"]}
                selectedAddressId={confirmForm.consigneeAddressId}
                onAddressSelect={(addr) => {
                  setConfirmForm((prev) => ({
                    ...prev,
                    consigneeAddressId: addr?.id || "",
                    consigneeName: addr?.companyName || prev.consigneeName,
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AddressSelector
                id="confirm-bkg-notify"
                label="3. Notify Party / Notificar a (B/L)"
                roleType="CONSIGNEE_NOTIFY"
                selectedAddressId={confirmForm.notifyAddressId}
                onAddressSelect={(addr) => {
                  setConfirmForm((prev) => ({
                    ...prev,
                    notifyAddressId: addr?.id || "",
                  }));
                }}
              />

              <AddressSelector
                id="confirm-bkg-agent"
                label="4. Delivery / Discharge Agent (B/L)"
                roleType="CARRIER_AGENT"
                suggestedUnLocode={confirmingBooking?.destination}
                suggestedCarrier={
                  confirmingBooking?.carrier ||
                  confirmingBooking?.parsedCargoDetails?.carrier
                }
                selectedAddressId={confirmForm.dischargeAgentAddressId}
                onAddressSelect={(addr) => {
                  setConfirmForm((prev) => ({
                    ...prev,
                    dischargeAgentAddressId: addr?.id || "",
                  }));
                }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={confirmForm.autoDownloadPdf}
              onChange={(e) =>
                setConfirmForm({
                  ...confirmForm,
                  autoDownloadPdf: e.target.checked,
                })
              }
              className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
            />
            <span>
              Emitir y descargar automáticamente el{" "}
              <strong>Borrador Bill of Lading (PDF)</strong> con sello SHA-256
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              {isSubmitting
                ? "Procesando Transacción..."
                : "Confirmar Reserva, Crear Shipment y Emitir B/L"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

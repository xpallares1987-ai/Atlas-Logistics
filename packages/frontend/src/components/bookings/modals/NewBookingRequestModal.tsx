import React from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@atlas/ui";
import type { NewBookingRequestModalProps } from "../../../types/booking-management.types";

export const NewBookingRequestModal: React.FC<NewBookingRequestModalProps> = ({
  isOpen,
  onClose,
  newBookingForm,
  setNewBookingForm,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Nueva Solicitud de Reserva (Phase 1: PENDING)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">
              Shipper / Cliente
            </label>
            <input
              type="text"
              value={newBookingForm.customerName}
              onChange={(e) =>
                setNewBookingForm({
                  ...newBookingForm,
                  customerName: e.target.value,
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Naviera (Carrier)
            </label>
            <input
              type="text"
              value={newBookingForm.carrier}
              onChange={(e) =>
                setNewBookingForm({
                  ...newBookingForm,
                  carrier: e.target.value,
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Port of Loading (Origin)
            </label>
            <input
              type="text"
              value={newBookingForm.origin}
              onChange={(e) =>
                setNewBookingForm({
                  ...newBookingForm,
                  origin: e.target.value,
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Port of Discharge (Destination)
            </label>
            <input
              type="text"
              value={newBookingForm.destination}
              onChange={(e) =>
                setNewBookingForm({
                  ...newBookingForm,
                  destination: e.target.value,
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Equipo & Incoterm
            </label>
            <div className="flex gap-2">
              <select
                value={newBookingForm.equipment}
                onChange={(e) =>
                  setNewBookingForm({
                    ...newBookingForm,
                    equipment: e.target.value,
                  })
                }
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="20GP">20GP</option>
                <option value="40GP">40GP</option>
                <option value="40HC">40HC</option>
              </select>
              <select
                value={newBookingForm.incoterm}
                onChange={(e) =>
                  setNewBookingForm({
                    ...newBookingForm,
                    incoterm: e.target.value,
                  })
                }
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="EXW">EXW</option>
                <option value="DAP">DAP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Mercancía (Commodity)
            </label>
            <input
              type="text"
              value={newBookingForm.commodity}
              onChange={(e) =>
                setNewBookingForm({
                  ...newBookingForm,
                  commodity: e.target.value,
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            {isSubmitting ? "Saving..." : "Save Booking"}
          </Button>
        </div>
      </div>
    </div>
  );
};

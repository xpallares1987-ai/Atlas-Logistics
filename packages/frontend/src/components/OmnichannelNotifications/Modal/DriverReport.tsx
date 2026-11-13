/**
 * @file DriverReport.tsx
 * @description Modal for recording a Telegram driver operational report.
 * @module @atlas/frontend/components/OmnichannelNotifications/Modal/DriverReport
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck } from "lucide-react";
import { Button, Input } from "@atlas/ui";
import { DriverReportType } from "../../../types/omnichannel-notifications.types";

export interface DriverReportProps {
  isOpen: boolean;
  onClose: () => void;
  driverName: string;
  setDriverName: (val: string) => void;
  driverChatId: string;
  setDriverChatId: (val: string) => void;
  driverTruckId: string;
  setDriverTruckId: (val: string) => void;
  driverReportType: DriverReportType;
  setDriverReportType: (val: DriverReportType) => void;
  driverDetails: string;
  setDriverDetails: (val: string) => void;
  driverAmount: number | undefined;
  setDriverAmount: (val: number | undefined) => void;
  driverLocation: string;
  setDriverLocation: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const DriverReport: React.FC<DriverReportProps> = ({
  isOpen,
  onClose,
  driverName,
  setDriverName,
  driverChatId,
  setDriverChatId,
  driverTruckId,
  setDriverTruckId,
  driverReportType,
  setDriverReportType,
  driverDetails,
  setDriverDetails,
  driverAmount,
  setDriverAmount,
  driverLocation,
  setDriverLocation,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100"
          >
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold">
                Registrar Parte de Chofer (Telegram)
              </h3>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Nombre del Chofer
                </label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Telegram Chat ID
                  </label>
                  <Input
                    value={driverChatId}
                    onChange={(e) => setDriverChatId(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Matrícula / Camión
                  </label>
                  <Input
                    value={driverTruckId}
                    onChange={(e) => setDriverTruckId(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Tipo de Evento
                </label>
                <select
                  value={driverReportType}
                  onChange={(e) =>
                    setDriverReportType(e.target.value as DriverReportType)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="GATE_OUT_TIMESTAMP">
                    Salida de Garita Aduanal (Gate-Out)
                  </option>
                  <option value="YARD_DELAY">Retraso / Espera en Patio</option>
                  <option value="FUEL_RECEIPT">
                    Recibo de Combustible / Peaje
                  </option>
                  <option value="POD_SUBMISSION">Entrega Confirmada POD</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Detalle del Reporte
                </label>
                <Input
                  value={driverDetails}
                  onChange={(e) => setDriverDetails(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Minutos / Monto €
                  </label>
                  <Input
                    type="number"
                    value={driverAmount || ""}
                    onChange={(e) =>
                      setDriverAmount(parseFloat(e.target.value) || undefined)
                    }
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Ubicación</label>
                  <Input
                    value={driverLocation}
                    onChange={(e) => setDriverLocation(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-slate-800 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
              >
                Enviar Reporte
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

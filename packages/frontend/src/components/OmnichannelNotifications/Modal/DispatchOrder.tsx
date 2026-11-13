/**
 * @file DispatchOrder.tsx
 * @description Modal for dispatching a new transport order to a Telegram driver.
 * @module @atlas/frontend/components/OmnichannelNotifications/Modal/DispatchOrder
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck } from "lucide-react";
import { Button, Input } from "@atlas/ui";

export interface DispatchOrderProps {
  isOpen: boolean;
  onClose: () => void;
  orderDriverName: string;
  setOrderDriverName: (val: string) => void;
  orderChatId: string;
  setOrderChatId: (val: string) => void;
  orderTruckId: string;
  setOrderTruckId: (val: string) => void;
  orderPickup: string;
  setOrderPickup: (val: string) => void;
  orderDelivery: string;
  setOrderDelivery: (val: string) => void;
  orderCargo: string;
  setOrderCargo: (val: string) => void;
  orderContainer: string;
  setOrderContainer: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const DispatchOrder: React.FC<DispatchOrderProps> = ({
  isOpen,
  onClose,
  orderDriverName,
  setOrderDriverName,
  orderChatId,
  setOrderChatId,
  orderTruckId,
  setOrderTruckId,
  orderPickup,
  setOrderPickup,
  orderDelivery,
  setOrderDelivery,
  orderCargo,
  setOrderCargo,
  orderContainer,
  setOrderContainer,
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
              <Truck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold">
                Despachar Orden de Transporte a Telegram
              </h3>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Chofer Asignado
                </label>
                <Input
                  value={orderDriverName}
                  onChange={(e) => setOrderDriverName(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Telegram Chat ID
                  </label>
                  <Input
                    value={orderChatId}
                    onChange={(e) => setOrderChatId(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Matrícula</label>
                  <Input
                    value={orderTruckId}
                    onChange={(e) => setOrderTruckId(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Lugar de Carga (Origen)
                </label>
                <Input
                  value={orderPickup}
                  onChange={(e) => setOrderPickup(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Lugar de Entrega (Destino)
                </label>
                <Input
                  value={orderDelivery}
                  onChange={(e) => setOrderDelivery(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Descripción de la Carga
                </label>
                <Input
                  value={orderCargo}
                  onChange={(e) => setOrderCargo(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Contenedor (Opcional)
                </label>
                <Input
                  value={orderContainer}
                  onChange={(e) => setOrderContainer(e.target.value)}
                  className="bg-slate-950 border-slate-800 font-mono"
                />
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
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Despachar Orden
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

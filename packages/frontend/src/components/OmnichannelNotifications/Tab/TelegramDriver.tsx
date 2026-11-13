/**
 * @file TelegramDriver.tsx
 * @description Live Telegram Driver feed and assigned transport orders tab.
 * @module @atlas/frontend/components/OmnichannelNotifications/Tab/TelegramDriver
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Plus, Radio, Truck } from "lucide-react";
import { Button } from "@atlas/ui";
import type {
  TelegramDispatchOrder,
  TelegramDriverMessage,
} from "@atlas/shared";

export interface TelegramDriverProps {
  messages: TelegramDriverMessage[];
  orders: TelegramDispatchOrder[];
  onOpenDriverModal: () => void;
  onOpenOrderModal: () => void;
}

export const TelegramDriver: React.FC<TelegramDriverProps> = ({
  messages,
  orders,
  onOpenDriverModal,
  onOpenOrderModal,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Driver Feed & Reports (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">
                Feed en Vivo de Transportistas (Telegram)
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onOpenDriverModal}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Parte de Chofer
              </Button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {messages.map((msg) => (
              <motion.div
                key={msg.messageId}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400">
                      {msg.driverName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {msg.telegramChatId}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                      {msg.truckId}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/60 text-slate-200 leading-relaxed">
                  {msg.details}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-sky-400" />
                    {msg.location || "Terminal Operativo"}
                  </span>
                  <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                    {msg.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Transport Orders Assigned (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Órdenes de Transporte Asignadas
              </h2>
            </div>

            <Button
              size="sm"
              onClick={onOpenOrderModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Orden
            </Button>
          </div>

          {/* Orders List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {orders.map((ord) => (
              <div
                key={ord.orderId}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-400">
                    {ord.orderId}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {ord.status}
                  </span>
                </div>

                <div className="text-slate-300 font-semibold">
                  {ord.cargoDescription}
                </div>

                <div className="space-y-1 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/40">
                  <div>
                    Chofer:{" "}
                    <strong className="text-white">{ord.driverName}</strong> (
                    {ord.truckId})
                  </div>
                  <div>
                    Origen:{" "}
                    <span className="text-slate-300">{ord.pickupLocation}</span>
                  </div>
                  <div>
                    Destino:{" "}
                    <span className="text-slate-300">
                      {ord.deliveryLocation}
                    </span>
                  </div>
                  {ord.containerNumber && (
                    <div>
                      Contenedor:{" "}
                      <span className="font-mono text-indigo-300">
                        {ord.containerNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * @file Sandbox.tsx
 * @description Interactive ERP execution and telemetry simulator for SAP S/4HANA, NetSuite, and Dynamics 365 BC.
 * @module @atlas/frontend/components/ErpIntegrations/Tab/Sandbox
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Send,
  Package,
  DollarSign,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  Building2,
} from "lucide-react";
import { Button } from "@atlas/ui";

export type PresetKey =
  | "sap_automotive_tier1"
  | "netsuite_retail_hightech"
  | "dynamics_bc_intermodal";

export interface ErpPurchaseOrder {
  id: string;
  poNumber: string;
  erpSystem?: string;
  vendorName?: string;
  totalAmount: number;
  currency?: string;
  status?: string;
  [key: string]: unknown;
}

export interface SandboxProps {
  orders: ErpPurchaseOrder[];
  selectedPoNumber: string;
  setSelectedPoNumber: (po: string) => void;
  selectedPresetKey: PresetKey;
  setSelectedPresetKey: (k: PresetKey) => void;
  activeConsoleLog: Record<string, unknown> | null;
  copiedResponse: boolean;
  onCopyJson: () => void;
  onSyncSapPo: () => void;
  onPostSapDelivery: () => void;
  onPostNetSuiteReceipt: () => void;
  onPostDynamicsBcJournal: () => void;
  isSapPoPending: boolean;
  isSapDeliveryPending: boolean;
  isNetSuitePending: boolean;
  isDynamicsPending: boolean;
}

export const Sandbox: React.FC<SandboxProps> = ({
  orders,
  selectedPoNumber,
  setSelectedPoNumber,
  selectedPresetKey,
  setSelectedPresetKey,
  activeConsoleLog,
  copiedResponse,
  onCopyJson,
  onSyncSapPo,
  onPostSapDelivery,
  onPostNetSuiteReceipt,
  onPostDynamicsBcJournal,
  isSapPoPending,
  isSapDeliveryPending,
  isNetSuitePending,
  isDynamicsPending,
}) => {
  return (
    <motion.div
      key="sandbox"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Controls Left Column */}
      <div className="lg:col-span-5 space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Perfil de Conexión & Sincronización
            </h3>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">
              Orden de Compra Relacional (SQLite):
            </label>
            <select
              value={selectedPoNumber}
              onChange={(e) => setSelectedPoNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.poNumber}>
                  {o.erpSystem === "SAP_S4HANA"
                    ? "SAP"
                    : o.erpSystem === "MICROSOFT_DYNAMICS_365_BC"
                      ? "Dynamics BC"
                      : "NetSuite"}
                  : {o.poNumber} — {o.vendorName} (
                  {o.totalAmount.toLocaleString()} {o.currency})
                </option>
              ))}
              <option value="4500891234">
                SAP S/4HANA: 4500891234 (Automotriz)
              </option>
              <option value="SO-2026-9912">
                Oracle NetSuite: SO-2026-9912 (High-Tech)
              </option>
              <option value="ORD-D365-2026-9041">
                MS Dynamics 365 BC: ORD-D365-2026-9041 (Intermodal)
              </option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">
              Perfil de Protocolo ERP:
            </label>
            <select
              value={selectedPresetKey}
              onChange={(e) =>
                setSelectedPresetKey(e.target.value as PresetKey)
              }
              className="w-full bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="sap_automotive_tier1">
                SAP S/4HANA (Automotriz Alemania · OData v4)
              </option>
              <option value="netsuite_retail_hightech">
                Oracle NetSuite (High-Tech Taiwán · SuiteTalk REST)
              </option>
              <option value="dynamics_bc_intermodal">
                MS Dynamics 365 BC (Intermodal & CBAM · OData v4)
              </option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={onSyncSapPo}
              disabled={isSapPoPending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center justify-between py-3"
            >
              <span className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5" />
                1. Ingestar Orden de Compra SAP (OData v4)
              </span>
              {isSapPoPending && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
            </Button>

            <Button
              onClick={onPostSapDelivery}
              disabled={isSapDeliveryPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center justify-between py-3"
            >
              <span className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                2. Generar Entrega Entrante SAP (ASN / BAPI)
              </span>
              {isSapDeliveryPending && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
            </Button>

            <Button
              onClick={onPostNetSuiteReceipt}
              disabled={isNetSuitePending}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs flex items-center justify-between py-3"
            >
              <span className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                3. Postear Item Receipt & Landed Cost en NetSuite
              </span>
              {isNetSuitePending && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
            </Button>

            <Button
              onClick={onPostDynamicsBcJournal}
              disabled={isDynamicsPending}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white text-xs flex items-center justify-between py-3"
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                4. Postear Asiento General en Dynamics 365 BC
              </span>
              {isDynamicsPending && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Console Right Column */}
      <div className="lg:col-span-7 space-y-4">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 min-h-[420px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Consola de Respuesta ERP en Vivo
                </span>
              </div>
              {activeConsoleLog && (
                <button
                  onClick={onCopyJson}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  {copiedResponse ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedResponse ? "Copiado" : "Copiar JSON"}
                </button>
              )}
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-950 font-mono text-xs overflow-auto max-h-[380px] border border-slate-800 text-emerald-400">
              {activeConsoleLog ? (
                <pre>{JSON.stringify(activeConsoleLog, null, 2)}</pre>
              ) : (
                <span className="text-slate-600 italic">
                  Presione una acción de sincronización para ver el payload
                  OData, SuiteTalk o Dynamics BC en tiempo real.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * @file SmartEscrowCard.tsx
 * @description Smart Escrow Financial VM card with milestone tracking and cryptographic oracle triggers.
 * @module @atlas/frontend/components/SmartContracts/Panel
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Radio,
  ShieldCheck,
  Ship,
  Sparkles,
} from "lucide-react";
import type { SmartEscrowCardProps } from "../../../types/smart-contracts.types";

export function SmartEscrowCard({
  escrow,
  ebl,
  isOraclePending,
  onTriggerOracle,
  onOpenDisputeModal,
}: SmartEscrowCardProps) {
  const conditions = escrow?.conditions || [];
  const completedConditionsCount = conditions.filter(
    (c) => c.isCompleted,
  ).length;
  const progressPercent =
    conditions.length > 0
      ? Math.round((completedConditionsCount / conditions.length) * 100)
      : 0;

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <Coins className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">
            Smart Escrow Financial VM
          </h2>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
            escrow.status === "AUTO_RELEASED"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : escrow.status === "DISPUTED"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}
        >
          {escrow.status === "AUTO_RELEASED"
            ? "FONDOS LIBERADOS"
            : escrow.status === "DISPUTED"
              ? "CONGELADO EN DISPUTA"
              : "EN CUSTODIA (HITOS)"}
        </span>
      </div>

      {/* Escrow Financial Data */}
      <div className="grid grid-cols-2 gap-3 my-4">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Monto en Custodia
          </span>
          <span className="text-xl font-extrabold text-emerald-400">
            ${escrow.totalAmountUsd.toLocaleString()}{" "}
            <span className="text-xs text-slate-400">{escrow.currency}</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Monto Liberado
          </span>
          <span className="text-xl font-extrabold text-white">
            ${escrow.releasedAmountUsd.toLocaleString()}{" "}
            <span className="text-xs text-slate-400">{escrow.currency}</span>
          </span>
        </div>
      </div>

      <div className="text-xs text-slate-400 space-y-1 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
        <div className="flex justify-between">
          <span className="text-slate-500">Contrato Escrow ID:</span>
          <span className="font-mono text-slate-300">{escrow.contractId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Ordenante (Pagador):</span>
          <span className="text-slate-200 font-medium">{escrow.payerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Beneficiario (Exportador):</span>
          <span className="text-slate-200 font-medium">
            {escrow.beneficiaryName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Agente Fiduciario / Custodia:</span>
          <span className="text-indigo-400 font-medium">
            {escrow.escrowBankOrVault}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-medium">
            Hitos Contractuales Verificados
          </span>
          <span className="text-emerald-400 font-bold">
            {completedConditionsCount} / {conditions.length} ({progressPercent}
            %)
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              escrow.status === "DISPUTED"
                ? "bg-rose-500"
                : progressPercent === 100
                  ? "bg-emerald-500"
                  : "bg-indigo-500"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Conditions List */}
      <div className="space-y-2 mb-4">
        {conditions.map((condition) => (
          <div
            key={condition.milestoneKey}
            className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
              condition.isCompleted
                ? "bg-emerald-950/20 border-emerald-500/30 text-slate-200"
                : "bg-slate-950/30 border-slate-800 text-slate-400"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {condition.isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <div>
                <p className="font-semibold text-slate-200">
                  {condition.description}
                </p>
                {condition.isCompleted && condition.verificationSource && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Fuente: {condition.verificationSource} • Bloque #
                    {condition.blockNumber}
                  </p>
                )}
              </div>
            </div>

            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                condition.isCompleted
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {condition.isCompleted ? "CUMPLIDO" : "PENDIENTE"}
            </span>
          </div>
        ))}
      </div>

      {/* Auto Settlement alert */}
      {escrow.status === "AUTO_RELEASED" && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 mb-4 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Liquidación Automática Ejecutada
          </div>
          <p className="text-[11px] text-emerald-300/80">
            La máquina virtual DLT ha liberado $
            {escrow.releasedAmountUsd.toLocaleString()} USD directamente al
            beneficiario.
          </p>
          {escrow.settlementTxHash && (
            <p className="font-mono text-[10px] text-emerald-400 truncate">
              Tx: {escrow.settlementTxHash}
            </p>
          )}
        </div>
      )}

      {/* Dispute alert */}
      {escrow.status === "DISPUTED" && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 mb-4 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Escrow Congelado por Disputa
          </div>
          <p className="text-[11px] text-rose-300">
            Razón: {escrow.disputeReason}
          </p>
        </div>
      )}

      {/* Oracle Gateway Trigger Buttons */}
      {escrow.status === "MILESTONES_IN_PROGRESS" && (
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Disparo de Hito por Oráculo Criptográfico (MLETR / IoT)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30 text-xs"
              onClick={() =>
                onTriggerOracle({
                  milestoneKey: "SEAL_VERIFIED",
                  sender: "IoT Smart Lock Gateway",
                  details:
                    "Precinto verificado intacto mediante lectura BLE/NFC en control de acceso.",
                  iotTelemetry: {
                    isoSealNumber: ebl.isoSealNumber,
                    sealStatus: "INTACT",
                    batteryPercent: 91,
                  },
                })
              }
              disabled={isOraclePending}
            >
              <Radio className="w-3.5 h-3.5 mr-1" />
              Oráculo Precinto IoT
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30 text-xs"
              onClick={() =>
                onTriggerOracle({
                  milestoneKey: "CUSTOMS_CLEARED",
                  sender: "Aduana VUCE Oracle (AEAT)",
                  details:
                    "Despacho concedido Canal Verde. Certificado CERT-PRE-RELEASE validado.",
                })
              }
              disabled={isOraclePending}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Oráculo Aduana Verde
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30 text-xs"
              onClick={() =>
                onTriggerOracle({
                  milestoneKey: "DISCHARGED_PORT",
                  sender: "Terminal TOS Port Gate",
                  details:
                    "Contenedor descargado de muelle e inspeccionado en grúa STS.",
                })
              }
              disabled={isOraclePending}
            >
              <Ship className="w-3.5 h-3.5 mr-1" />
              Oráculo Descarga Port
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30 text-xs font-semibold"
              onClick={() =>
                onTriggerOracle({
                  milestoneKey: "PROOF_OF_DELIVERY",
                  sender: "Consignee Digital POD Terminal",
                  details:
                    "Prueba de entrega POD firmada digitalmente por consignatario receptor.",
                })
              }
              disabled={isOraclePending}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Oráculo POD (Settlement)
            </Button>
          </div>

          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full border-rose-500/30 text-rose-300 hover:bg-rose-950/30 text-xs"
              onClick={onOpenDisputeModal}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Declarar Disputa / Congelar Fondos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

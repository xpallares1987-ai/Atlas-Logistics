import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCode2,
  ShieldCheck,
  ShieldAlert,
  Coins,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  FileSignature,
  Ship,
  Sparkles,
  Download,
  Search,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import { useApiQuery, useApiMutation, useQueryClient } from "../hooks/useApiQuery";
import type {
  BlockchainBlock,
  DigitalBillOfLadingMLETR,
  SmartEscrowContract,
  EscrowMilestoneKey,
  BlockchainEventType,
} from "@atlas/shared";

interface LedgerApiResponse {
  success: boolean;
  scenarioId: string;
  title: string;
  description: string;
  ebl: DigitalBillOfLadingMLETR;
  escrow: SmartEscrowContract;
  ledger: BlockchainBlock[];
  chainVerification: {
    isValid: boolean;
    corruptedBlockNumber?: number;
    reason?: string;
  };
}

export default function SmartContractsModule() {
  const queryClient = useQueryClient();
  const [selectedBlock, setSelectedBlock] = useState<BlockchainBlock | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [searchBlockQuery, setSearchBlockQuery] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("ALL");

  // Modals state
  const [isEndorseModalOpen, setIsEndorseModalOpen] = useState(false);
  const [endorseToParty, setEndorseToParty] = useState("");
  const [endorseType, setEndorseType] = useState<"SPECIAL_ENDORSEMENT" | "PLEDGE_TO_BANK" | "BLANK_ENDORSEMENT">("SPECIAL_ENDORSEMENT");
  const [endorseSigner, setEndorseSigner] = useState("");

  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  // Verification banner state
  const [verificationFeedback, setVerificationFeedback] = useState<{
    show: boolean;
    isValid: boolean;
    totalBlocks: number;
    message: string;
  } | null>(null);

  // Queries
  const { data: ledgerData, isLoading } = useApiQuery<LedgerApiResponse>(
    ["smart-contracts-ledger"],
    "/smart-contracts/ledger"
  );

  // Mutations
  const selectPresetMutation = useApiMutation<any, { scenarioId: string }>(
    "/smart-contracts/select-preset",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["smart-contracts-ledger"] });
        setVerificationFeedback(null);
      },
    }
  );

  const oracleEventMutation = useApiMutation<
    any,
    {
      milestoneKey: EscrowMilestoneKey;
      sender: string;
      details: string;
      iotTelemetry?: any;
    }
  >("/smart-contracts/oracle-event", "POST", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-contracts-ledger"] });
    },
  });

  const endorseTitleMutation = useApiMutation<
    any,
    { toParty: string; transferType: string; signerName?: string }
  >("/smart-contracts/endorse-title", "POST", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-contracts-ledger"] });
      setIsEndorseModalOpen(false);
      setEndorseToParty("");
      setEndorseSigner("");
    },
  });

  const triggerDisputeMutation = useApiMutation<any, { reason: string }>(
    "/smart-contracts/trigger-dispute",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["smart-contracts-ledger"] });
        setIsDisputeModalOpen(false);
        setDisputeReason("");
      },
    }
  );

  const verifyChainMutation = useApiMutation<any, void>(
    "/smart-contracts/verify-chain",
    "POST",
    {
      onSuccess: (data) => {
        setVerificationFeedback({
          show: true,
          isValid: data.verification.isValid,
          totalBlocks: data.totalBlocks,
          message: data.verification.isValid
            ? `Cadena criptográfica íntegra: ${data.totalBlocks} bloques validados con hashes SHA-256 y enlaces parentales inalterados.`
            : `Error de integridad: ${data.verification.reason}`,
        });
      },
    }
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadLedger = () => {
    if (!ledgerData) return;
    const blob = new Blob([JSON.stringify(ledgerData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-dlt-ledger-${ledgerData.scenarioId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !ledgerData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">
          Cargando libro mayor distribuido y contratos inteligentes DLT...
        </p>
      </div>
    );
  }

  const { ebl, escrow, ledger, chainVerification } = ledgerData;
  const completedConditionsCount = escrow.conditions.filter((c) => c.isCompleted).length;
  const progressPercent = Math.round((completedConditionsCount / escrow.conditions.length) * 100);

  const filteredBlocks = ledger.filter((block) => {
    const matchesSearch =
      searchBlockQuery === "" ||
      block.txHash.toLowerCase().includes(searchBlockQuery.toLowerCase()) ||
      block.payload.sender.toLowerCase().includes(searchBlockQuery.toLowerCase()) ||
      block.payload.details.toLowerCase().includes(searchBlockQuery.toLowerCase()) ||
      block.payload.event.toLowerCase().includes(searchBlockQuery.toLowerCase());

    const matchesEvent = filterEvent === "ALL" || block.payload.event === filterEvent;
    return matchesSearch && matchesEvent;
  });

  const getEventBadgeClass = (event: BlockchainEventType) => {
    switch (event) {
      case "GENESIS":
        return "bg-slate-700 text-slate-200 border-slate-600";
      case "EBL_ISSUED":
      case "TITLE_ENDORSED":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "ESCROW_DEPOSITED":
      case "SMART_CONTRACT_SETTLEMENT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "SEAL_INSPECTED":
      case "CUSTOMS_CLEARED":
      case "CONTAINER_DISCHARGED":
      case "PROOF_OF_DELIVERY":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "SEAL_TAMPER_ALERT":
      case "ESCROW_DISPUTED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto text-slate-100">
      {/* 1. Header & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Smart Contracts, e-BL MLETR & Escrow
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DLT Merkle DAG
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Ley Modelo CNUDMI/UNCITRAL MLETR • Custodia & Transmisión de Título • Escrow con Oráculos
              </p>
            </div>
          </div>
        </div>

        {/* Global status pills & action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Consenso:</span>
            <span className="font-semibold text-slate-200">Atlas Authority Node 1</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              chainVerification.isValid
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            {chainVerification.isValid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
            <span>{chainVerification.isValid ? "Cadena Íntegra" : "Cadena Corrupta"}</span>
          </div>

          <Button
            variant="outline"
            className="border-slate-700 hover:bg-slate-800 text-xs flex items-center gap-1.5"
            onClick={() => verifyChainMutation.mutate()}
            disabled={verifyChainMutation.isPending}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${verifyChainMutation.isPending ? "animate-spin" : ""}`}
            />
            Verificar Cadena
          </Button>

          <Button
            variant="outline"
            className="border-slate-700 hover:bg-slate-800 text-xs flex items-center gap-1.5"
            onClick={handleDownloadLedger}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Ledger JSON
          </Button>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      <AnimatePresence>
        {verificationFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
              verificationFeedback.isValid
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                : "bg-rose-950/40 border-rose-500/30 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {verificationFeedback.isValid ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{verificationFeedback.message}</span>
            </div>
            <button
              onClick={() => setVerificationFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100 ml-4 underline"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Preset Scenarios Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            id: "shanghai_valencia_full_success",
            title: "1. Shanghai ➔ Valencia ($48,500 USD)",
            subtitle: "Liquidación Automática Exitosa",
            desc: "6 hitos cumplidos. Fondos transferidos automáticamente al exportador tras POD.",
            badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          },
          {
            id: "mletr_bank_endorsement",
            title: "2. e-BL Negociable Bancario ($112,000 USD)",
            subtitle: "Pignoración Carta de Crédito",
            desc: "Título MLETR cedido a Banco Santander bajo UCP 600. Hitos intermedios listos para oráculo.",
            badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          },
          {
            id: "tampered_seal_dispute",
            title: "3. Alerta Precinto & Disputa ($76,000 USD)",
            subtitle: "Congelamiento Smart Escrow",
            desc: "Discrepancia de peso (-1.8 t) y precinto vulnerado. Fondos congelados en garantía.",
            badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          },
        ].map((preset) => {
          const isActive = ledgerData.scenarioId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => selectPresetMutation.mutate({ scenarioId: preset.id })}
              disabled={selectPresetMutation.isPending}
              className={`p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? "bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-200">{preset.title}</span>
                {isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    ACTIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-400 font-medium mb-1">{preset.subtitle}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{preset.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 3. Main Workspace: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Smart Escrow & e-BL MLETR (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Smart Escrow Financial VM Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Smart Escrow Financial VM</h2>
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
                <span className="text-slate-200 font-medium">{escrow.beneficiaryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agente Fiduciario / Custodia:</span>
                <span className="text-indigo-400 font-medium">{escrow.escrowBankOrVault}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Hitos Contractuales Verificados</span>
                <span className="text-emerald-400 font-bold">
                  {completedConditionsCount} / {escrow.conditions.length} ({progressPercent}%)
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
              {escrow.conditions.map((condition) => (
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
                      <p className="font-semibold text-slate-200">{condition.description}</p>
                      {condition.isCompleted && condition.verificationSource && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Fuente: {condition.verificationSource} • Bloque #{condition.blockNumber}
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
                  La máquina virtual DLT ha liberado ${escrow.releasedAmountUsd.toLocaleString()} USD
                  directamente al beneficiario.
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
                <p className="text-[11px] text-rose-300">Razón: {escrow.disputeReason}</p>
              </div>
            )}

            {/* 1-Click Oracle Simulator Action Buttons */}
            {escrow.status === "MILESTONES_IN_PROGRESS" && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Simulador de Oráculos en 1 Clic
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30 text-xs"
                    onClick={() =>
                      oracleEventMutation.mutate({
                        milestoneKey: "SEAL_VERIFIED",
                        sender: "IoT Smart Lock Gateway",
                        details: "Precinto verificado intacto mediante lectura BLE/NFC en control de acceso.",
                        iotTelemetry: {
                          isoSealNumber: ebl.isoSealNumber,
                          sealStatus: "INTACT",
                          batteryPercent: 91,
                        },
                      })
                    }
                    disabled={oracleEventMutation.isPending}
                  >
                    <Radio className="w-3.5 h-3.5 mr-1" />
                    Oráculo Precinto IoT
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30 text-xs"
                    onClick={() =>
                      oracleEventMutation.mutate({
                        milestoneKey: "CUSTOMS_CLEARED",
                        sender: "Aduana VUCE Oracle (AEAT)",
                        details: "Despacho concedido Canal Verde. Certificado CERT-PRE-RELEASE validado.",
                      })
                    }
                    disabled={oracleEventMutation.isPending}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Oráculo Aduana Verde
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30 text-xs"
                    onClick={() =>
                      oracleEventMutation.mutate({
                        milestoneKey: "DISCHARGED_PORT",
                        sender: "Terminal TOS Port Gate",
                        details: "Contenedor descargado de muelle e inspeccionado en grúa STS.",
                      })
                    }
                    disabled={oracleEventMutation.isPending}
                  >
                    <Ship className="w-3.5 h-3.5 mr-1" />
                    Oráculo Descarga Port
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30 text-xs font-semibold"
                    onClick={() =>
                      oracleEventMutation.mutate({
                        milestoneKey: "PROOF_OF_DELIVERY",
                        sender: "Consignee Digital POD Terminal",
                        details: "Prueba de entrega POD firmada digitalmente por consignatario receptor.",
                      })
                    }
                    disabled={oracleEventMutation.isPending}
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
                    onClick={() => setIsDisputeModalOpen(true)}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Declarar Disputa / Congelar Fondos
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* e-BL MLETR Digital Title Tracker */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <FileSignature className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">e-BL Negociable (MLETR)</h2>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  ebl.status === "SURRENDERED"
                    ? "bg-slate-800 text-slate-300 border-slate-700"
                    : ebl.status === "ENDORSED"
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                }`}
              >
                {ebl.status === "SURRENDERED"
                  ? "CARTA DE PORTE ENTREGADA"
                  : ebl.status === "ENDORSED"
                  ? "TÍTULO ENDOSADO"
                  : "EMITIDO"}
              </span>
            </div>

            {/* Current Legal Title Holder */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/40 to-indigo-950/40 border border-sky-500/30 my-4">
              <span className="text-[11px] text-sky-300 font-semibold uppercase tracking-wider block">
                Tenedor Legal Legítimo de la Mercancía (Title Holder)
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-extrabold text-white">
                  {ebl.currentTitleHolder}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                  {ebl.isNegotiable ? "NEGOCIABLE A LA ORDEN" : "NO NEGOCIABLE"}
                </span>
              </div>
            </div>

            {/* e-BL Core Parameters */}
            <div className="text-xs space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">e-BL Number:</span>
                <span className="font-mono text-slate-200">{ebl.eblNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Naviera (Carrier):</span>
                <span className="text-slate-200">{ebl.carrierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Buque / Viaje:</span>
                <span className="text-slate-200">
                  {ebl.vesselName} (Viaje {ebl.voyageNumber})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ruta:</span>
                <span className="text-slate-200">
                  {ebl.portOfLoading} ➔ {ebl.portOfDischarge}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contenedor / Precinto:</span>
                <span className="font-mono text-slate-200">
                  {ebl.containerNumber} / {ebl.isoSealNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hash de Registro MLETR:</span>
                <button
                  onClick={() => copyToClipboard(ebl.electronicRecordHash, "ebl-hash")}
                  className="font-mono text-indigo-400 hover:text-indigo-300 truncate max-w-[200px] flex items-center gap-1"
                >
                  <span className="truncate">{ebl.electronicRecordHash}</span>
                  {copiedHash === "ebl-hash" ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Endorsement History */}
            <div className="space-y-2 mb-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Historial de Endosos Criptográficos ({ebl.endorsements.length})
              </span>
              {ebl.endorsements.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2 rounded bg-slate-950/20">
                  No se han registrado endosos. El título permanece con el emisor original.
                </p>
              ) : (
                ebl.endorsements.map((end, idx) => (
                  <div
                    key={end.endorsementId || idx}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sky-400">
                        Endoso #{idx + 1}: {end.transferType}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(end.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      De: <span className="font-medium text-slate-400">{end.fromParty}</span> ➔ A:{" "}
                      <span className="font-medium text-white">{end.toParty}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 truncate">
                      Sig: {end.digitalSignature}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Transmit Title Button */}
            {ebl.status !== "SURRENDERED" && (
              <Button
                variant="outline"
                className="w-full border-sky-500/40 text-sky-300 hover:bg-sky-950/30 text-xs flex items-center justify-center gap-1.5"
                onClick={() => setIsEndorseModalOpen(true)}
              >
                <FileSignature className="w-4 h-4" />
                Transmitir / Endosar Título MLETR
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Cryptographic Blockchain Ledger Visualizer (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex-1 flex flex-col">
            {/* Ledger Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Libro Mayor Distribuido DLT (Ledger)
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300">
                    {ledger.length} Bloques
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Estructura de Merkle DAG con enlaces criptográficos SHA-256 inmutables
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative w-40 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <Input
                    placeholder="Filtrar tx / evento..."
                    className="pl-8 text-xs py-1.5 h-8 bg-slate-950/80 border-slate-800 text-slate-200"
                    value={searchBlockQuery}
                    onChange={(e) => setSearchBlockQuery(e.target.value)}
                  />
                </div>

                <select
                  aria-label="Filtrar por tipo de evento"
                  value={filterEvent}
                  onChange={(e) => setFilterEvent(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg text-xs py-1 px-2 text-slate-300 h-8"
                >
                  <option value="ALL">Todos los Eventos</option>
                  <option value="GENESIS">GENESIS</option>
                  <option value="EBL_ISSUED">EBL_ISSUED</option>
                  <option value="TITLE_ENDORSED">TITLE_ENDORSED</option>
                  <option value="ESCROW_DEPOSITED">ESCROW_DEPOSITED</option>
                  <option value="VESSEL_DEPARTED">VESSEL_DEPARTED</option>
                  <option value="SEAL_INSPECTED">SEAL_INSPECTED</option>
                  <option value="CUSTOMS_CLEARED">CUSTOMS_CLEARED</option>
                  <option value="CONTAINER_DISCHARGED">CONTAINER_DISCHARGED</option>
                  <option value="PROOF_OF_DELIVERY">PROOF_OF_DELIVERY</option>
                  <option value="SMART_CONTRACT_SETTLEMENT">SMART_CONTRACT_SETTLEMENT</option>
                  <option value="ESCROW_DISPUTED">ESCROW_DISPUTED</option>
                </select>
              </div>
            </div>

            {/* Blocks List */}
            <div className="space-y-3 mt-4 overflow-y-auto max-h-[680px] pr-1">
              {filteredBlocks.map((block) => {
                const isSelected = selectedBlock?.blockNumber === block.blockNumber;
                return (
                  <motion.div
                    key={block.blockNumber}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500"
                        : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                    onClick={() => setSelectedBlock(isSelected ? null : block)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                          #{block.blockNumber}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getEventBadgeClass(
                            block.payload.event
                          )}`}
                        >
                          {block.payload.event}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(block.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(block.txHash, `tx-${block.blockNumber}`);
                          }}
                          className="font-mono text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center gap-1"
                        >
                          <span>tx: {block.txHash.slice(0, 10)}...</span>
                          {copiedHash === `tx-${block.blockNumber}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 mb-2 leading-relaxed">
                      <span className="text-slate-400 font-medium">{block.payload.sender}: </span>
                      {block.payload.details}
                    </div>

                    {/* Telemetry pill if present */}
                    {block.payload.iotTelemetry && (
                      <div className="flex flex-wrap items-center gap-2 mb-2 p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px]">
                        <span className="text-indigo-400 font-semibold flex items-center gap-1">
                          <Radio className="w-3 h-3" /> Telemetría IoT:
                        </span>
                        <span className="text-slate-300">
                          Precinto: <strong>{block.payload.iotTelemetry.isoSealNumber}</strong> (
                          {block.payload.iotTelemetry.sealStatus})
                        </span>
                        {block.payload.iotTelemetry.temperatureCelsius !== undefined && (
                          <span className="text-slate-300">
                            Temp: <strong>{block.payload.iotTelemetry.temperatureCelsius}°C</strong>
                          </span>
                        )}
                        {block.payload.iotTelemetry.batteryPercent !== undefined && (
                          <span className="text-slate-300">
                            Batería: <strong>{block.payload.iotTelemetry.batteryPercent}%</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Cryptographic Link Indicator */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1 truncate max-w-[70%]">
                        <span className="text-slate-600">prevHash:</span>
                        <span className="truncate">{block.prevHash.slice(0, 16)}...</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">Merkle Root:</span>
                        <span>{block.merkleRoot.slice(0, 8)}...</span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-slate-800 text-[11px] space-y-2 bg-slate-950/80 p-3 rounded-lg"
                      >
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hash Completo Tx:</span>
                          <span className="font-mono text-indigo-300 select-all break-all">
                            {block.txHash}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hash Previo:</span>
                          <span className="font-mono text-slate-400 select-all break-all">
                            {block.prevHash}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Raíz de Merkle:</span>
                          <span className="font-mono text-emerald-400 select-all break-all">
                            {block.merkleRoot}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Firma Nodo Autoridad:</span>
                          <span className="font-mono text-slate-400 truncate max-w-[300px]">
                            {block.signature}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Gas Empleado / Nonce:</span>
                          <span className="font-mono text-slate-300">
                            {block.gasUsed} gas • Nonce: {block.nonce}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Endorse Title under MLETR */}
      <AnimatePresence>
        {isEndorseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <FileSignature className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold">Endosar Título de Propiedad (MLETR)</h3>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Transmita legalmente la titularidad del conocimiento de embarque electrónico conforme a
                la Ley Modelo CNUDMI (UNCITRAL MLETR).
              </p>

              <div className="space-y-3.5 mb-6">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nuevo Tenedor Legal (Endosatario)
                  </label>
                  <Input
                    placeholder="Ej. Banco Santander S.A., CMA CGM France..."
                    value={endorseToParty}
                    onChange={(e) => setEndorseToParty(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tipo de Transmisión de Título
                  </label>
                  <select
                    value={endorseType}
                    onChange={(e) => setEndorseType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs p-2 text-slate-200"
                  >
                    <option value="SPECIAL_ENDORSEMENT">
                      Endoso Nominativo (Special Endorsement)
                    </option>
                    <option value="PLEDGE_TO_BANK">
                      Pignoración Bancaria (Pledge to Bank / Carta de Crédito)
                    </option>
                    <option value="BLANK_ENDORSEMENT">Endoso en Blanco (Al Portador)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Firmante Autorizado (Opcional)
                  </label>
                  <Input
                    placeholder={ebl.currentTitleHolder}
                    value={endorseSigner}
                    onChange={(e) => setEndorseSigner(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setIsEndorseModalOpen(false)}
                  className="border-slate-800 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    endorseTitleMutation.mutate({
                      toParty: endorseToParty,
                      transferType: endorseType,
                      signerName: endorseSigner || undefined,
                    })
                  }
                  disabled={!endorseToParty.trim() || endorseTitleMutation.isPending}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                >
                  {endorseTitleMutation.isPending ? "Firmando..." : "Firmar & Endosar Título"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Trigger Dispute */}
      <AnimatePresence>
        {isDisputeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl text-slate-100"
            >
              <div className="flex items-center gap-2.5 mb-3 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Declarar Disputa en Smart Escrow</h3>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                El depósito contractual de ${escrow.totalAmountUsd.toLocaleString()} USD será congelado
                preventivamente en el ledger inmutable hasta resolución pericial.
              </p>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Motivo o Hallazgo de la Disputa
                  </label>
                  <Input
                    placeholder="Ej. Violación de precinto ISO 17712 / Faltante de carga de 2,400 kg..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="border-slate-800 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => triggerDisputeMutation.mutate({ reason: disputeReason })}
                  disabled={!disputeReason.trim() || triggerDisputeMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  {triggerDisputeMutation.isPending ? "Congelando..." : "Congelar Fondos"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

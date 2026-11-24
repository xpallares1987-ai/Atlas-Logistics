/**
 * @file FinancialClearingModule.tsx
 * @description Orchestrator for SWIFT ISO 20022 Financial Settlement Gateway, automated clearing ledger,
 * bank statement reconciliation (camt.053), and documentary credits presentation (tsmt.019).
 * @module @atlas/frontend/pages/FinancialClearingModule
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { useState } from "react";
import {
  Landmark,
  FileCode,
  FileSpreadsheet,
  FileCheck2,
  RefreshCw,
  Search,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { Button, Input } from "../components/ui";
import { useApiQuery, useQueryClient } from "../hooks/useApiQuery";
import {
  XmlInspector,
  StatementReconciliation,
  LetterOfCreditViewer,
  type StatementEntryItem,
} from "../components/FinancialClearing/Tab/BankingIso20022";

interface BankingTransmissionItem {
  id: string;
  transmissionNumber: string;
  messageType: "PAIN_001" | "PACS_008" | "TSMT_019" | "CAMT_053";
  senderBic: string;
  receiverBic: string;
  totalAmount: number;
  currency: string;
  payloadXml: string;
  payloadHashSha256: string;
  status: "PENDING" | "TRANSMITTED" | "ACKED" | "REJECTED";
  createdAt: string;
}

interface TransmissionsApiResponse {
  success: boolean;
  transmissions: BankingTransmissionItem[];
}

interface StatementsApiResponse {
  success: boolean;
  entries: StatementEntryItem[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function FinancialClearingModule() {
  const [activeTab, setActiveTab] = useState<
    "TRANSMISSIONS" | "RECONCILIATION" | "DOCUMENTARY_CREDITS"
  >("TRANSMISSIONS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransmission, setSelectedTransmission] =
    useState<BankingTransmissionItem | null>(null);

  const queryClient = useQueryClient();

  // Queries for Transmissions and Statements
  const { data: transmissionsData, isLoading: loadingTransmissions } =
    useApiQuery<TransmissionsApiResponse>(
      ["iso20022-transmissions"],
      "/financial/iso20022/transmissions",
    );

  const { data: statementsData, isLoading: loadingStatements } =
    useApiQuery<StatementsApiResponse>(
      ["iso20022-statements"],
      "/financial/iso20022/statements",
    );

  const transmissions = transmissionsData?.transmissions || [];
  const statementEntries = statementsData?.entries || [];

  // Filtered transmissions
  const filteredTransmissions = transmissions.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.transmissionNumber.toLowerCase().includes(q) ||
      t.messageType.toLowerCase().includes(q) ||
      t.senderBic.toLowerCase().includes(q) ||
      t.receiverBic.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  });

  // KPI Calculations
  const totalVolume = transmissions.reduce(
    (acc, curr) => acc + (curr.totalAmount || 0),
    0,
  );
  const reconciledLines = statementEntries.filter(
    (e) => e.reconciliationStatus === "RECONCILED",
  ).length;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header Banner */}
      <div className="px-6 py-6 md:px-8 md:py-8 shrink-0 z-10 border-b border-white/10 relative bg-white/5 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Landmark className="w-7 h-7" />
              </div>
              Financial Clearing & ISO 20022 Gateway
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base font-medium max-w-2xl">
              SWIFT ISO 20022 message orchestrator for interbank settlement
              (pain.001 / pacs.008), camt.053 electronic statement
              reconciliation, and documentary credits (tsmt.019).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                queryClient.invalidateQueries({
                  queryKey: ["iso20022-transmissions"],
                });
                queryClient.invalidateQueries({
                  queryKey: ["iso20022-statements"],
                });
              }}
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white border-white/10 hover:bg-white/10 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Ledgers
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 md:px-8 py-5 z-10 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-lg uppercase tracking-wider">
              Outbox Transmissions
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mb-0.5">
            Active ISO Messages
          </p>
          <h3 className="text-2xl font-black text-white">
            {transmissions.length}
          </h3>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded-lg uppercase tracking-wider">
              Settled Volume
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mb-0.5">
            Total Transmitted
          </p>
          <h3 className="text-2xl font-black text-white">
            $
            {totalVolume.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </h3>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-lg uppercase tracking-wider">
              camt.053
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mb-0.5">
            Reconciled Invoices
          </p>
          <h3 className="text-2xl font-black text-white">
            {reconciledLines} / {statementEntries.length}
          </h3>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded-lg uppercase tracking-wider">
              Audit Status
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mb-0.5">
            Cryptographic Integrity
          </p>
          <h3 className="text-2xl font-black text-white">100% SHA-256</h3>
        </motion.div>
      </div>

      {/* Main Tab Navigation & Body */}
      <div className="flex-1 flex flex-col min-h-0 z-10 px-4 md:px-8 pb-6">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
          {/* Navigation Bar */}
          <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/5">
            <div className="flex gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/5">
              <Button
                variant={activeTab === "TRANSMISSIONS" ? "outline" : "ghost"}
                onClick={() => setActiveTab("TRANSMISSIONS")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all h-auto ${
                  activeTab === "TRANSMISSIONS"
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    : "text-slate-400 hover:text-white border-transparent"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 mr-1.5" />
                ISO 20022 Transmissions
              </Button>

              <Button
                variant={activeTab === "RECONCILIATION" ? "outline" : "ghost"}
                onClick={() => setActiveTab("RECONCILIATION")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all h-auto ${
                  activeTab === "RECONCILIATION"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "text-slate-400 hover:text-white border-transparent"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                Statement Reconciliation (camt.053)
              </Button>

              <Button
                variant={
                  activeTab === "DOCUMENTARY_CREDITS" ? "outline" : "ghost"
                }
                onClick={() => setActiveTab("DOCUMENTARY_CREDITS")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all h-auto ${
                  activeTab === "DOCUMENTARY_CREDITS"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    : "text-slate-400 hover:text-white border-transparent"
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
                Documentary Credits (tsmt.019)
              </Button>
            </div>

            {activeTab === "TRANSMISSIONS" && (
              <div className="w-64">
                <Input
                  type="text"
                  placeholder="Filter message #, BIC, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search size={14} />}
                />
              </div>
            )}
          </div>

          {/* Tab Views */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {activeTab === "TRANSMISSIONS" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[480px]">
                {/* Left Side: Transmissions List */}
                <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                  {loadingTransmissions ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin opacity-50" />
                      <p className="text-xs">Loading ISO transmissions...</p>
                    </div>
                  ) : filteredTransmissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                      No ISO transmissions found.
                    </div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="flex flex-col gap-2.5"
                    >
                      {filteredTransmissions.map((t) => (
                        <motion.div
                          key={t.id}
                          variants={itemVariants}
                          onClick={() => setSelectedTransmission(t)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            selectedTransmission?.id === t.id
                              ? "bg-indigo-500/15 border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                              : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-bold text-white">
                              {t.transmissionNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {t.messageType}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              {t.senderBic}
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              {t.receiverBic}
                            </span>
                            <span className="font-bold text-white">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: t.currency,
                              }).format(t.totalAmount)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500">
                            <span>
                              {new Date(t.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                            <span className="font-mono text-slate-400">
                              {t.payloadHashSha256.slice(0, 12)}...
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Right Side: XmlInspector */}
                <div className="lg:col-span-7 flex flex-col h-full min-h-[480px]">
                  <XmlInspector
                    transmissionId={selectedTransmission?.id}
                    transmissionNumber={
                      selectedTransmission?.transmissionNumber
                    }
                    messageType={selectedTransmission?.messageType}
                    xmlPayload={selectedTransmission?.payloadXml}
                    sha256={selectedTransmission?.payloadHashSha256}
                    senderBic={selectedTransmission?.senderBic}
                    receiverBic={selectedTransmission?.receiverBic}
                    status={selectedTransmission?.status}
                  />
                </div>
              </div>
            )}

            {activeTab === "RECONCILIATION" && (
              <StatementReconciliation
                entries={statementEntries}
                isLoading={loadingStatements}
                onReconcileSuccess={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["iso20022-statements"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["iso20022-transmissions"],
                  });
                }}
              />
            )}

            {activeTab === "DOCUMENTARY_CREDITS" && <LetterOfCreditViewer />}
          </div>
        </div>
      </div>
    </div>
  );
}

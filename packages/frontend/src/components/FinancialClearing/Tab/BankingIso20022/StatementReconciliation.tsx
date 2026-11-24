/**
 * @file StatementReconciliation.tsx
 * @description Electronic bank statement ingestion (camt.053) and automated AP/AR clearing reconciler.
 * @module @atlas/frontend/components/FinancialClearing/Tab/BankingIso20022/StatementReconciliation
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import React, { useState } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button, Input } from "../../../ui";

export interface StatementEntryItem {
  id: string;
  statementId: string;
  bookingDate: string;
  valueDate: string;
  creditDebitIndicator: "CRDT" | "DBIT";
  amount: number;
  currency: string;
  accountIban?: string | null;
  accountBic?: string | null;
  endToEndId?: string | null;
  remittanceInformation?: string | null;
  reconciliationStatus:
    "UNMATCHED" | "PARTIALLY_MATCHED" | "RECONCILED" | "DISPUTED";
  matchedInvoiceId?: string | null;
}

export interface StatementReconciliationProps {
  entries?: StatementEntryItem[];
  isLoading?: boolean;
  onReconcileSuccess?: () => void;
}

export const StatementReconciliation: React.FC<
  StatementReconciliationProps
> = ({ entries = [], isLoading = false, onReconcileSuccess }) => {
  const [xmlInput, setXmlInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingestionMessage, setIngestionMessage] = useState<string | null>(null);

  const handleIngestXml = async () => {
    if (!xmlInput.trim()) return;
    setIsSubmitting(true);
    setIngestionMessage(null);

    try {
      const res = await fetch("/api/financial/iso20022/statements/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xmlContent: xmlInput }),
      });

      if (!res.ok) {
        throw new Error(`Reconciliation failed with status ${res.status}`);
      }

      const body = await res.json();
      setIngestionMessage(
        `Successfully ingested statement: ${body.reconciliation?.reconciledCount ?? 0} reconciled, ${body.reconciliation?.unmatchedCount ?? 0} unmatched.`,
      );
      setXmlInput("");
      onReconcileSuccess?.();
    } catch (err) {
      console.error("Statement ingestion failed", err);
      setIngestionMessage(
        `Error ingesting statement: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    const query = searchQuery.toLowerCase();
    return (
      e.statementId.toLowerCase().includes(query) ||
      e.endToEndId?.toLowerCase().includes(query) ||
      e.remittanceInformation?.toLowerCase().includes(query) ||
      e.reconciliationStatus.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Ingestion Dropzone & Manual Input */}
      <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                camt.053 Electronic Bank Statement Ingestion
              </h3>
              <p className="text-xs text-slate-400">
                Paste or import SWIFT ISO 20022 Bank-to-Customer Statement XML
                for automated ledger matching.
              </p>
            </div>
          </div>
          <Button
            onClick={handleIngestXml}
            disabled={!xmlInput.trim() || isSubmitting}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Reconciling...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Process Statement</span>
              </>
            )}
          </Button>
        </div>

        <textarea
          rows={4}
          value={xmlInput}
          onChange={(e) => setXmlInput(e.target.value)}
          placeholder='Paste <Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">...</Document> here...'
          className="w-full bg-slate-950/70 border border-white/10 rounded-xl p-3 font-mono text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-y"
        />

        {ingestionMessage && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
              ingestionMessage.startsWith("Error")
                ? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
            }`}
          >
            {ingestionMessage.startsWith("Error") ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{ingestionMessage}</span>
          </div>
        )}
      </div>

      {/* Statement Entries Reconciled Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              Ingested Bank Statement Lines
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 font-mono">
              {filteredEntries.length} lines
            </span>
          </div>

          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search reference, IBAN, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={14} />}
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto custom-scrollbar">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin opacity-50" />
              <p className="text-xs">
                Loading statement reconciliation lines...
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No statement entries found matching criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-white/5 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Booking Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Account IBAN / BIC</th>
                  <th className="px-4 py-3">End-to-End Ref / Remittance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Matched Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                      {entry.bookingDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {entry.creditDebitIndicator === "CRDT" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> Credit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Debit
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-white">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: entry.currency,
                      }).format(entry.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      <div>{entry.accountIban || "—"}</div>
                      {entry.accountBic && (
                        <div className="text-[10px] text-slate-500">
                          {entry.accountBic}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                      <div className="font-mono text-[11px] text-indigo-300">
                        {entry.endToEndId || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {entry.remittanceInformation || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          entry.reconciliationStatus === "RECONCILED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : entry.reconciliationStatus === "PARTIALLY_MATCHED"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : entry.reconciliationStatus === "DISPUTED"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                        }`}
                      >
                        {entry.reconciliationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-indigo-400">
                      {entry.matchedInvoiceId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

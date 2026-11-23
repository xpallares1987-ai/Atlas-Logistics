/**
 * @file Detail.tsx
 * @description Slide-over detail drawer for sanitized Purchase Order projections in B2B Vendor Portal (ADR 0035).
 * Enforces Zero-Leak masking across Factory Milestones, Line Items, and Operational Alerts.
 * @module @atlas/frontend/components/Portal/Vendor/Drawer/Detail
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  CalendarCheck,
  PlusCircle,
} from "lucide-react";
import type { PortalPoProjectionDto } from "../types";
import { Stepper } from "../Timeline/Stepper";

interface DetailProps {
  isOpen: boolean;
  po: PortalPoProjectionDto | null;
  onClose: () => void;
  onOpenConfirmModal: () => void;
  onOpenRecordModal: () => void;
}

export const Detail: React.FC<DetailProps> = ({
  isOpen,
  po,
  onClose,
  onOpenConfirmModal,
  onOpenRecordModal,
}) => {
  const [activeTab, setActiveTab] = useState<"milestones" | "lines" | "alerts">(
    "milestones",
  );

  if (!isOpen || !po) return null;

  const isPending = po.supplierConfirmationStatus === "PENDING";
  const isConfirmed = po.supplierConfirmationStatus === "CONFIRMED";
  const lines = po.lineItemsSummaryJson || [];
  const milestones = po.milestonesSummaryJson || [];
  const exceptions = po.exceptionsSummaryJson || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slide-left">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-slate-100">
                {po.poNumber}
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-semibold text-xs bg-slate-800 text-slate-200 border border-slate-700">
                {po.incoterm}
              </span>
              {isPending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Confirmation
                </span>
              )}
              {isConfirmed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Buyer:{" "}
              <span className="text-slate-200 font-medium">{po.buyerName}</span>
              {" | "}
              Supplier:{" "}
              <span className="text-slate-200 font-medium">
                {po.supplierName}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Key Dates Bar */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Expected CRD:</span>
            <span className="font-semibold text-slate-200">
              {po.expectedCargoReadyDate}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Promised CRD:</span>
            <span
              className={`font-semibold font-mono ${
                po.promisedCargoReadyDate
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {po.promisedCargoReadyDate || "Unconfirmed"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Last Synced:</span>
            <span className="text-slate-400 font-mono text-[11px]">
              {new Date(po.lastProjectedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("milestones")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "milestones"
                ? "border-indigo-500 text-indigo-400 bg-indigo-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Factory Milestones ({milestones.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lines")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "lines"
                ? "border-indigo-500 text-indigo-400 bg-indigo-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            SKU Items ({lines.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "alerts"
                ? "border-indigo-500 text-indigo-400 bg-indigo-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Alerts ({exceptions.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. FACTORY MILESTONES TAB */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              {/* Visual Stage Stepper */}
              <Stepper
                milestones={milestones}
                onOpenRecordModal={onOpenRecordModal}
                canRecord={true}
              />

              {/* Confirmation Notes if confirmed */}
              {po.confirmationNotes && (
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Supplier Confirmation Statement
                  </div>
                  <p className="text-slate-300 italic">
                    &ldquo;{po.confirmationNotes}&rdquo;
                  </p>
                  {po.confirmedAt && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      Committed on {new Date(po.confirmedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Detailed Recorded Milestones Log */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Chronological Milestone Event Log
                </h4>
                {milestones.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No factory milestones recorded yet. Click &ldquo;Record
                    Milestone&rdquo; to add timestamps.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {milestones.map((m, idx) => (
                      <div
                        key={`${m.milestoneCode}-${idx}`}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-xs flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200 font-mono">
                              {m.milestoneCode}
                            </span>
                            <span className="px-2 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                              {m.status}
                            </span>
                          </div>
                          {m.notes && (
                            <p className="text-slate-400 text-xs italic">
                              &ldquo;{m.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        {m.actualTimestamp && (
                          <div className="text-right text-[11px] font-mono text-emerald-400 whitespace-nowrap">
                            {new Date(m.actualTimestamp).toLocaleDateString()}{" "}
                            {new Date(m.actualTimestamp).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. LINE ITEMS & SKUS TAB */}
          {activeTab === "lines" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Production batch lines and ordered quantities. Internal
                commercial buy rates and forwarder margins are excluded from
                external view.
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">SKU Code</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Allocated</th>
                      <th className="py-2.5 px-3 text-right">Remaining</th>
                      <th className="py-2.5 px-3">HTS Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {lines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 text-center text-slate-500"
                        >
                          No line items found.
                        </td>
                      </tr>
                    ) : (
                      lines.map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-900/60"
                        >
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                            {item.skuCode}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-100">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-indigo-400">
                            {item.allocatedQuantity || "0"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                            {item.remainingQuantity ?? item.quantity}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {item.htsCode || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. OPERATIONAL ALERTS TAB */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Active factory and schedule alerts. Internal penalty and
                commercial damage estimates are strictly omitted.
              </div>

              {exceptions.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800/60 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-200">
                    Zero Active Exceptions
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Factory schedule is fully synchronized without operational
                    variances.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exceptions.map((exc) => (
                    <div
                      key={exc.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className={`w-4 h-4 ${
                              exc.severity === "CRITICAL" ||
                              exc.severity === "HIGH"
                                ? "text-rose-400"
                                : "text-amber-400"
                            }`}
                          />
                          <span className="font-semibold text-slate-200">
                            {exc.title}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            exc.severity === "CRITICAL" ||
                            exc.severity === "HIGH"
                              ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                              : "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                          }`}
                        >
                          {exc.severity}
                        </span>
                      </div>

                      <p className="text-slate-400 text-xs">
                        {exc.description}
                      </p>

                      {exc.delayEstimateHours !== undefined &&
                        exc.delayEstimateHours > 0 && (
                          <div className="text-[11px] text-amber-400 font-mono">
                            Estimated schedule variance: +
                            {exc.delayEstimateHours}h
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenRecordModal}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              Record Milestone
            </button>

            {isPending && (
              <button
                type="button"
                onClick={onOpenConfirmModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors inline-flex items-center gap-1.5"
              >
                <CalendarCheck className="w-4 h-4" />
                Confirm & Lock CRD
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

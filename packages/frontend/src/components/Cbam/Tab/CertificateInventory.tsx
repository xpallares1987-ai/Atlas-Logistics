/**
 * @file CertificateInventory.tsx
 * @description CBAM Definitive Regime (2026+) Certificate Inventory, FIFO lots ledger, EEX EUA auction benchmarks, and ISO 20022 settlement actions.
 * @module @atlas/frontend/components/Cbam/Tab/CertificateInventory
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import React, { useState } from "react";
import {
  Coins,
  TrendingUp,
  PlusCircle,
  Calendar,
  Lock,
  Layers,
  CheckCircle2,
  FileCode,
} from "lucide-react";
import {
  CbamCertificateLot,
  CbamDeclaration,
  CbamEexQuoteRecord,
  CbamInventorySummary,
  CbamSurrenderResult,
} from "../../../types/cbam.types";
import { PurchaseLot as PurchaseLotModal } from "../Modal/PurchaseLot";
import { SurrenderWizard as SurrenderWizardModal } from "../Modal/SurrenderWizard";

export interface CertificateInventoryProps {
  lots: CbamCertificateLot[];
  summary: CbamInventorySummary;
  eexQuotes: CbamEexQuoteRecord[];
  activeEexQuote: CbamEexQuoteRecord | null;
  declarations: CbamDeclaration[];
  onPurchaseLot: (params: {
    lotReference: string;
    purchaseDate: string;
    ncaRegistryAccountId: string;
    quantityPurchased: number;
    unitPriceEur: number;
    generatePaymentOrder: boolean;
    debtorName: string;
    debtorIban: string;
    debtorBic: string;
  }) => Promise<void>;
  onSurrenderCertificates: (params: {
    declarationId: string;
    verifierName: string;
    verifierAccreditationNumber: string;
    verificationReportId: string;
  }) => Promise<CbamSurrenderResult>;
  onDownloadPaymentOrder: (lotId: string) => Promise<void>;
}

export const CertificateInventory: React.FC<CertificateInventoryProps> = ({
  lots,
  summary,
  eexQuotes,
  activeEexQuote,
  declarations,
  onPurchaseLot,
  onSurrenderCertificates,
  onDownloadPaymentOrder,
}) => {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Modals */}
      <PurchaseLotModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        defaultUnitPriceEur={activeEexQuote?.auctionAveragePriceEur || 85.5}
        onConfirmPurchase={onPurchaseLot}
      />

      <SurrenderWizardModal
        isOpen={showSurrenderModal}
        onClose={() => setShowSurrenderModal(false)}
        declarations={declarations}
        certificateLots={lots}
        activeEtsPrice={activeEexQuote?.auctionAveragePriceEur || 85.5}
        onConfirmSurrender={onSurrenderCertificates}
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Inventory Lots & Balance KPIs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top 4 Balance Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase">
                  Total Comprados
                </span>
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-black text-white mt-2">
                {summary.totalPurchased.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                1 cert = 1 tCO2e
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase">
                  Entregados
                </span>
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xl font-black text-blue-400 mt-2">
                {summary.totalSurrendered.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Sello SHA-256 verificado
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase">
                  Remanente
                </span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-black text-amber-300 mt-2">
                {summary.totalAvailable.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary.activeLotsCount} lotes activos
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase">
                  Valoración Cartera
                </span>
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-xl font-black text-teal-300 mt-2">
                {summary.totalValuationEur.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Saldo remanente x precio compra
              </p>
            </div>
          </div>

          {/* Certificate Lots FIFO Table */}
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Lotes de Certificados Electrónicos (Consumo FIFO)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inventario registrado ante el Registro CBAM de la Comisión
                  Europea
                </p>
              </div>
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Nuevo Lote
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3">Lote / Fecha</th>
                    <th className="px-4 py-3">Cuenta NCA</th>
                    <th className="px-4 py-3">Consumo FIFO</th>
                    <th className="px-4 py-3">Precio / Coste</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {lots.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No hay lotes de certificados en cartera. Registra un
                        nuevo lote para comenzar.
                      </td>
                    </tr>
                  ) : (
                    lots.map((lot) => {
                      const percentConsumed =
                        lot.quantityPurchased > 0
                          ? Math.round(
                              (lot.quantitySurrendered /
                                lot.quantityPurchased) *
                                100,
                            )
                          : 0;

                      return (
                        <tr
                          key={lot.id}
                          className="hover:bg-white/5 transition-all"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-white block">
                              {lot.lotReference}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {lot.purchaseDate}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                            {lot.ncaRegistryAccountId}
                          </td>
                          <td className="px-4 py-3 min-w-[160px]">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-slate-400">
                                {lot.quantitySurrendered} /{" "}
                                {lot.quantityPurchased}
                              </span>
                              <span className="font-bold text-amber-300">
                                {lot.quantityAvailable} remanentes
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                style={{ width: `${percentConsumed}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white block">
                              {lot.unitPriceEur.toFixed(2)} €/t
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Total: {lot.totalCostEur.toLocaleString()} €
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {lot.status === "ACTIVE" ? (
                              <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ACTIVO
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-700/60 text-slate-400 border border-slate-600/30">
                                AGOTADO
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => onDownloadPaymentOrder(lot.id)}
                              title="Generar y Descargar Orden ISO 20022 pain.001"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white transition-all inline-flex items-center gap-1 text-[11px]"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              pain.001
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 span): EEX Carbon Auction Benchmarking & Quick Actions */}
        <div className="space-y-6">
          {/* Active EEX Quote Card */}
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-emerald-500/30 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Cotización EEX Oficial Vigente
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {activeEexQuote?.source || "EEX_AUCTION"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">
                {(activeEexQuote?.auctionAveragePriceEur || 85.5).toFixed(2)} €
              </span>
              <span className="text-xs text-slate-400">/ tCO2e</span>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Semana EEX:</span>
                <strong className="text-white font-mono">
                  {activeEexQuote?.quoteWeek || "2026-W43"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Vigencia:</span>
                <span className="text-slate-300">
                  {activeEexQuote?.validFrom || "2026-10-19"} al{" "}
                  {activeEexQuote?.validUntil || "2026-10-25"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Panel */}
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Acciones de Liquidación
            </h4>

            <button
              onClick={() => setShowPurchaseModal(true)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                Adquirir Lote de Certificados
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                + pain.001
              </span>
            </button>

            <button
              onClick={() => setShowSurrenderModal(true)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-200" />
                Asistente de Entrega (Surrender Wizard)
              </span>
              <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">
                Art. 8/22
              </span>
            </button>
          </div>

          {/* Historical EEX Quotes List */}
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Histórico Subastas EEX (Derechos EUA)
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {eexQuotes.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  Sin cotizaciones históricas registradas.
                </p>
              ) : (
                eexQuotes.map((q) => (
                  <div
                    key={q.id}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-200 block">
                        {q.quoteWeek}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {q.validFrom} - {q.validUntil}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      {q.auctionAveragePriceEur.toFixed(2)} €
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

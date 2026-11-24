/**
 * @file PurchaseLotModal.tsx
 * @description Modal dialog for purchasing CBAM certificate lots and generating ISO 20022 pain.001 payment instructions.
 * @module @atlas/frontend/components/Cbam/Modal/PurchaseLotModal
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import React, { useState } from "react";
import {
  X,
  ShoppingCart,
  Download,
  Building,
  ShieldCheck,
  DollarSign,
} from "lucide-react";

export interface PurchaseLotProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUnitPriceEur?: number;
  onConfirmPurchase: (params: {
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
}

export type PurchaseLotModalProps = PurchaseLotProps;

export const PurchaseLot: React.FC<PurchaseLotProps> = ({
  isOpen,
  onClose,
  defaultUnitPriceEur = 85.5,
  onConfirmPurchase,
}) => {
  const [lotReference, setLotReference] = useState(
    () => `LOT-2026-${Date.now().toString().slice(-4)}`,
  );
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [ncaRegistryAccountId, setNcaRegistryAccountId] =
    useState("ES-CBAM-ACC-88319");
  const [quantityPurchased, setQuantityPurchased] = useState(100);
  const [unitPriceEur, setUnitPriceEur] = useState(defaultUnitPriceEur);

  // ISO 20022 Wire Initiation Form
  const [generatePaymentOrder, setGeneratePaymentOrder] = useState(true);
  const [debtorName, setDebtorName] = useState("Atlas Forwarding Customs SL");
  const [debtorIban, setDebtorIban] = useState("ES9121000418450200051332");
  const [debtorBic, setDebtorBic] = useState("CAIXESBBXXX");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCost = Number((quantityPurchased * unitPriceEur).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (quantityPurchased <= 0 || unitPriceEur <= 0) {
      setErrorMessage(
        "La cantidad y el precio unitario deben ser superiores a cero.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmPurchase({
        lotReference,
        purchaseDate,
        ncaRegistryAccountId,
        quantityPurchased,
        unitPriceEur,
        generatePaymentOrder,
        debtorName,
        debtorIban,
        debtorBic,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error al registrar lote",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-emerald-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Adquirir Lote de Certificados CBAM
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Régimen Definitivo 2026+
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Emisión de certificados electrónicos ante la Autoridad
                Competente Nacional (NCA)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Lot & Holding Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Referencia del Lote
              </label>
              <input
                type="text"
                value={lotReference}
                onChange={(e) => setLotReference(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Fecha de Adquisición
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Cantidad (1 cert = 1 tCO2e)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantityPurchased}
                onChange={(e) =>
                  setQuantityPurchased(
                    Math.max(1, parseInt(e.target.value) || 0),
                  )
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Precio Unitario (€ / tCO2e)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={unitPriceEur}
                onChange={(e) =>
                  setUnitPriceEur(
                    Math.max(0.01, parseFloat(e.target.value) || 0),
                  )
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Coste Total Previsto
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                {totalCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Cuenta de Registro NCA (Autoridad Nacional Competente)
            </label>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={ncaRegistryAccountId}
                onChange={(e) => setNcaRegistryAccountId(e.target.value)}
                required
                placeholder="ES-CBAM-ACC-88319"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* ISO 20022 Payment Order Section */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-slate-200">
                  Liquidación Bancaria ISO 20022 pain.001.001.09
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={generatePaymentOrder}
                  onChange={(e) => setGeneratePaymentOrder(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {generatePaymentOrder && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Ordenante
                  </label>
                  <input
                    type="text"
                    value={debtorName}
                    onChange={(e) => setDebtorName(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    IBAN Ordenante
                  </label>
                  <input
                    type="text"
                    value={debtorIban}
                    onChange={(e) => setDebtorIban(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    BIC/SWIFT
                  </label>
                  <input
                    type="text"
                    value={debtorBic}
                    onChange={(e) => setDebtorBic(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
            >
              {generatePaymentOrder ? (
                <>
                  <Download className="w-4 h-4" />
                  Registrar Lote & Descargar pain.001
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Registrar Lote en Inventario
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PurchaseLotModal = PurchaseLot;

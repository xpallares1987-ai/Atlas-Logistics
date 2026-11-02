import React, { useState } from "react";
import {
  Ship,
  Shield,
  FileText,
  CheckCircle2,
  ArrowRight,
  Lock,
  ExternalLink,
  Download,
  Loader2,
  X,
  Anchor,
  Box,
  Calendar,
  Building2,
  Scale,
} from "lucide-react";
import { motion } from "framer-motion";

export interface QuoteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: {
    id?: string;
    quoteNumber?: string;
    origin: string;
    destination: string;
    carrier: string;
    equipment: string;
    sellRateTotal: number;
    buyRateTotal?: number;
    sellMargin?: number;
    currency?: string;
    transitDays?: number;
    validTo?: string;
    serviceLine?: string;
  };
  onSuccess?: (bookingResult: any) => void;
}

export function QuoteBookingModal({
  isOpen,
  onClose,
  quote,
  onSuccess,
}: QuoteBookingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form inputs
  const [shipperName, setShipperName] = useState("Atlas Global Shipper S.A.");
  const [consigneeName, setConsigneeName] = useState(
    "Continental Distribution Hub Ltd",
  );
  const [commodityDescription, setCommodityDescription] = useState(
    "Equipos Electrónicos de Alta Precisión y Repuestos Industriales",
  );
  const [grossWeightKg, setGrossWeightKg] = useState("18500");
  const [specialInstructions, setSpecialInstructions] = useState(
    "Estiba bajo cubierta. Mantener sellos de alta seguridad intactos.",
  );
  const [paymentMode, setPaymentMode] = useState<
    "ESCROW_SMART_CONTRACT" | "NET_30_CREDIT"
  >("ESCROW_SMART_CONTRACT");

  // Success Result
  const [resultData, setResultData] = useState<any | null>(null);

  if (!isOpen) return null;

  const currencySymbol = quote.currency === "EUR" ? "€" : "$";

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleConfirmAndBook = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const quoteIdParam =
        quote.id && quote.id !== "dynamic" ? quote.id : "dynamic";
      const payload = {
        quoteNumber: quote.quoteNumber,
        origin: quote.origin,
        destination: quote.destination,
        carrier: quote.carrier,
        equipment: quote.equipment,
        rateAmount: quote.sellRateTotal,
        buyRateTotal: quote.buyRateTotal,
        sellMargin: quote.sellMargin,
        currency: quote.currency || "USD",
        transitDays: quote.transitDays || 28,
        validTo: quote.validTo,
        shipperName,
        consigneeName,
        commodityDescription,
        grossWeightKg: Number(grossWeightKg) || 18500,
        specialInstructions,
        paymentMode,
      };

      const response = await fetch(
        `/api/quotes/${quoteIdParam}/accept-and-book`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(
          errJson.error ||
            `Error ${response.status}: Error al emitir la reserva.`,
        );
      }

      const data = await response.json();
      setResultData(data);
      setStep(3);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudo procesar la reserva.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateTo = (path: string) => {
    window.dispatchEvent(new CustomEvent("app-navigate", { detail: { path } }));
    onClose();
  };

  const handleDownloadPdf = async () => {
    try {
      const quoteId = resultData?.quote?.id || quote.id;
      if (quoteId) {
        const res = await fetch(`/api/quotes/${quoteId}/pdf`);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Quote-${resultData?.quote?.quoteNumber || quote.quoteNumber || "Confirmation"}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          return;
        }
      }
      // Direct stream fallback
      const directRes = await fetch(`/api/quotes/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteNumber: resultData?.quote?.quoteNumber || quote.quoteNumber,
          customer: shipperName,
          origin: quote.origin,
          destination: quote.destination,
          carrier: quote.carrier,
          equipment: quote.equipment,
          buyRateTotal: quote.buyRateTotal || quote.sellRateTotal * 0.85,
          sellMargin: quote.sellMargin || quote.sellRateTotal * 0.15,
          sellRateTotal: quote.sellRateTotal,
          currency: quote.currency || "USD",
          validTo: quote.validTo,
          transitDays: quote.transitDays || 28,
        }),
      });
      if (directRes.ok) {
        const blob = await directRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Booking-Confirmation-${resultData?.booking?.referenceNumber || "BKG"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error al descargar PDF:", err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl overflow-hidden bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="relative px-8 py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <h2
                id="quote-modal-title"
                className="text-lg font-black tracking-tight text-white flex items-center gap-2"
              >
                Automatización Comercial: Quote-to-Booking
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                  EDI 300 / 301
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Paso {step} de 3 · Cotización #{quote.quoteNumber || "QT-DYN"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal de reserva"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-sm flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between max-w-md mx-auto mb-6">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 1
                    ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                1
              </div>
              <span
                className={`text-xs font-semibold ${step >= 1 ? "text-indigo-400" : "text-slate-500"}`}
              >
                Detalles Operativos
              </span>
            </div>
            <div
              className={`flex-1 h-0.5 mx-3 ${step >= 2 ? "bg-indigo-500" : "bg-slate-800"}`}
            />
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 2
                    ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                2
              </div>
              <span
                className={`text-xs font-semibold ${step >= 2 ? "text-indigo-400" : "text-slate-500"}`}
              >
                Modalidad de Pago
              </span>
            </div>
            <div
              className={`flex-1 h-0.5 mx-3 ${step >= 3 ? "bg-emerald-500" : "bg-slate-800"}`}
            />
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 3
                    ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                3
              </div>
              <span
                className={`text-xs font-semibold ${step >= 3 ? "text-emerald-400" : "text-slate-500"}`}
              >
                Confirmación
              </span>
            </div>
          </div>

          {/* STEP 1: OPERATIONAL DETAILS */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-6">
              {/* Route & Carrier Summary Card */}
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Ruta Marítima
                  </span>
                  <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                    <span>{quote.origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{quote.destination}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Naviera & Equipo
                  </span>
                  <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                    <Ship className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {quote.carrier} · {quote.equipment}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Tránsito Estimado
                  </span>
                  <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{quote.transitDays || 28} días</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Tarifa Acordada
                  </span>
                  <div className="text-base font-black text-emerald-400 font-mono mt-1">
                    {currencySymbol}
                    {quote.sellRateTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="shipperNameInput"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Cargador / Shipper
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="shipperNameInput"
                      name="shipperName"
                      type="text"
                      required
                      value={shipperName}
                      onChange={(e) => setShipperName(e.target.value)}
                      aria-label="Nombre del Cargador o Shipper"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="consigneeNameInput"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Consignatario / Consignee
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="consigneeNameInput"
                      name="consigneeName"
                      type="text"
                      required
                      value={consigneeName}
                      onChange={(e) => setConsigneeName(e.target.value)}
                      aria-label="Nombre del Consignatario o Consignee"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="commodityInput"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Descripción de Mercancía
                  </label>
                  <div className="relative">
                    <Box className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="commodityInput"
                      name="commodityDescription"
                      type="text"
                      required
                      value={commodityDescription}
                      onChange={(e) => setCommodityDescription(e.target.value)}
                      aria-label="Descripción de la mercancía"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="weightInput"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Peso Bruto Estimado (kg)
                  </label>
                  <div className="relative">
                    <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="weightInput"
                      name="grossWeightKg"
                      type="number"
                      required
                      min={100}
                      max={32000}
                      value={grossWeightKg}
                      onChange={(e) => setGrossWeightKg(e.target.value)}
                      aria-label="Peso bruto estimado en kilogramos"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="instructionsInput"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Instrucciones Especiales de Embarque (Opcional)
                  </label>
                  <input
                    id="instructionsInput"
                    name="specialInstructions"
                    type="text"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    aria-label="Instrucciones especiales de embarque"
                    className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  Continuar al Pago
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PAYMENT MODE SELECTION */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">
                  Selecciona la Modalidad de Pago y Custodia
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Atlas Logistics ERP conecta la tesorería corporativa con Smart
                  Contracts en Ethereum/Hyperledger o crédito comercial
                  diferido.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A: Escrow Smart Contract */}
                <div
                  onClick={() => setPaymentMode("ESCROW_SMART_CONTRACT")}
                  className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative ${
                    paymentMode === "ESCROW_SMART_CONTRACT"
                      ? "border-emerald-500 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                      : "border-slate-800 bg-slate-850 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    {paymentMode === "ESCROW_SMART_CONTRACT" && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                        Seleccionado
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    Smart Contract Escrow
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                      Seguridad Máxima
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Bloqueo de fondos en custodia dentro del ledger inmutable
                    con hash SHA-256. Liberación automatizada por oráculo DCSA
                    al completarse los hitos de desembarque y despacho aduanero.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Monto en Custodia:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {currencySymbol}
                      {quote.sellRateTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Option B: Net-30 Credit */}
                <div
                  onClick={() => setPaymentMode("NET_30_CREDIT")}
                  className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative ${
                    paymentMode === "NET_30_CREDIT"
                      ? "border-indigo-500 bg-indigo-950/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                      : "border-slate-800 bg-slate-850 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    {paymentMode === "NET_30_CREDIT" && (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase">
                        Seleccionado
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    Crédito Comercial (Net-30)
                    <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono">
                      Proforma
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Emisión instantánea de factura proforma con condiciones de
                    pago a 30 días de la fecha de embarque (B/L On Board). Sin
                    inmovilización inmediata de capital bancario.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Término de Pago:</span>
                    <span className="font-mono font-bold text-indigo-400">
                      30 Días Vista B/L
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmAndBook}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Emitiendo Reserva y Bloqueando Fondos...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar y Emitir Reserva Oficial
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: INTERACTIVE SUCCESS CARD */}
          {step === 3 && resultData && (
            <div className="space-y-6">
              {/* Emerald Confirmation Banner */}
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Operación Confirmada & Automatizada
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    Reserva Marítima Oficial:{" "}
                    {resultData.booking?.carrierBookingNumber ||
                      resultData.booking?.referenceNumber}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    La cotización fue aceptada, el booking marítimo ha sido
                    emitido ante la naviera y la transacción se ha asegurado en
                    la infraestructura financiera de Atlas.
                  </p>
                </div>
              </div>

              {/* Booking Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Buque & Viaje Asignado
                  </span>
                  <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                    <Anchor className="w-4 h-4 text-indigo-400" />
                    <span>
                      {resultData.booking?.vessel} ·{" "}
                      {resultData.booking?.voyage}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Contenedor & Precinto
                  </span>
                  <div className="text-sm font-bold text-white mt-1 flex items-center gap-2 font-mono">
                    <Box className="w-4 h-4 text-indigo-400" />
                    <span>
                      {resultData.booking?.containerNumber || "MAEU8819201"} /{" "}
                      {resultData.booking?.sealNumber || "SL-48291"}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Fecha de Cut-Off Terminal
                  </span>
                  <div className="text-sm font-bold text-amber-400 mt-1 flex items-center gap-2 font-mono">
                    <Calendar className="w-4 h-4" />
                    <span>{resultData.booking?.cutOffDate}</span>
                  </div>
                </div>
              </div>

              {/* Payment & EDI Status Details */}
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {resultData.payment?.mode === "ESCROW_SMART_CONTRACT"
                        ? `Smart Contract Escrow Bloqueado: #${resultData.payment?.escrowBlock?.blockNumber || 4} (${resultData.payment?.escrowBlock?.txHash?.substring(0, 16)}...)`
                        : `Factura Proforma Emitida: ${resultData.payment?.proformaInvoiceNumber} (Net-30)`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Telemetría DCSA 3.0: Evento{" "}
                      {resultData.edi?.dcsaEvent?.eventTypeCode || "CONF"}{" "}
                      verificado con HMAC-SHA256
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {currencySymbol}
                    {resultData.payment?.amount?.toFixed(2)}{" "}
                    {resultData.payment?.currency}
                  </span>
                </div>
              </div>

              {/* 4 One-Click Deep Links */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                  Accesos Directos Multi-Módulo:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() =>
                      navigateTo(
                        resultData.links?.shipment360Url || "/shipments",
                      )
                    }
                    className="p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Ship className="w-4 h-4" />
                    Shipment 360
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      navigateTo(resultData.links?.ediHubUrl || "/edi")
                    }
                    className="p-3 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    EDI 301 Hub
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      navigateTo(
                        resultData.links?.smartContractsUrl ||
                          "/smart-contracts",
                      )
                    }
                    className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Lock className="w-4 h-4" />
                    Smart Contracts
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  Cerrar Asistente
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

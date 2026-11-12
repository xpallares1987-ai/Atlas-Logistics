import React from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@atlas/ui";
import { generateEDI301Transaction } from "@atlas/shared";
import type { BookingRateLockTabProps } from "../../types/booking-management.types";

export const BookingRateLockTab: React.FC<BookingRateLockTabProps> = ({
  activeBooking,
  rateLockQuotes,
  countdownSeconds,
  formatCountdown,
  onBookRate,
  isBookingPending,
  copiedEdi,
  onCopyEdi,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Comparador de Tarifas Spot en Tiempo Real
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Garantía Rate Lock {formatCountdown(countdownSeconds)}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Ruta: <strong>{activeBooking.originPort}</strong> →{" "}
            <strong>{activeBooking.destinationPort}</strong> | Equipo:{" "}
            <strong>
              {activeBooking.requestedEquipment.quantity}x{" "}
              {activeBooking.requestedEquipment.isoType}
            </strong>
          </p>
        </div>
      </div>

      {/* Carrier Rate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rateLockQuotes.map((quote) => {
          const isSelectedCarrier = activeBooking.carrier === quote.carrier;
          return (
            <div
              key={quote.carrier}
              className={`p-5 rounded-xl border transition-all space-y-4 ${
                isSelectedCarrier
                  ? "bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                  : "bg-slate-800/40 border-slate-700/70 hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-700/60">
                <div>
                  <div className="font-bold text-white text-sm">
                    {quote.carrierName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    SCAC: {quote.carrierScac}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono font-medium border border-blue-500/30">
                  {quote.transitTimeDays}d tránsito
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Flete Marítimo Base:</span>
                  <span className="font-mono">
                    ${quote.oceanFreightUsd.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">
                    Recargo BAF Combustible:
                  </span>
                  <span className="font-mono">
                    ${quote.bafUsd.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">THC Origen & Destino:</span>
                  <span className="font-mono">
                    ${(quote.thcOriginUsd + quote.thcDestUsd).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400">Días Libres Free-Time:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {quote.freeTimeDays} días garantizados
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Total Spot Garantizado
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    ${quote.totalSpotUsd.toLocaleString()} USD
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => onBookRate(quote)}
                  disabled={isBookingPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  {isBookingPending ? "Reservando..." : "Reservar Ahora"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DCSA & EDI 301 Live Payload Preview */}
      <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-sm">
              Transmisión Telemática DCSA v2.0 & EDI 301 Generada
            </h3>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onCopyEdi(generateEDI301Transaction(activeBooking))}
            className="text-xs flex items-center gap-1.5"
          >
            {copiedEdi ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedEdi ? "Copiado!" : "Copiar EDI 301"}
          </Button>
        </div>

        <div className="p-4 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed border border-slate-800">
          {generateEDI301Transaction(activeBooking)}
        </div>
      </div>
    </div>
  );
};

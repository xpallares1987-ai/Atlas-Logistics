import {
  X,
  Navigation,
  Clock,
  Euro,
  Receipt,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import { DrayageRouteMap } from "@atlas/ui";

export interface DrayageRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  drayageQuote: any;
  destinationPort?: string;
}

export default function DrayageRouteModal({
  isOpen,
  onClose,
  drayageQuote,
  destinationPort = "ESBCN",
}: DrayageRouteModalProps) {
  if (!isOpen || !drayageQuote) return null;

  const originPoint = {
    name:
      drayageQuote.originTerminalName ||
      `Hutchison Ports BEST Terminal (${destinationPort})`,
    lat: drayageQuote.originCoords?.lat ?? 41.3195,
    lon: drayageQuote.originCoords?.lon ?? 2.1557,
    city: destinationPort === "ESVLC" ? "Valencia" : "Barcelona",
    unLocode: destinationPort,
    isTerminal: true,
  };

  const destPoint = {
    name:
      drayageQuote.destinationAddressName ||
      drayageQuote.destinationName ||
      "Almacén Logístico Interior (Consignee Hub)",
    lat: drayageQuote.destinationCoords?.lat ?? 41.5284,
    lon: drayageQuote.destinationCoords?.lon ?? 2.4445,
    city: drayageQuote.destinationCity || "Mataró / Barcelona",
    unLocode: "ES",
  };

  const distanceKm = Number(drayageQuote.distanceKm) || 42.5;
  const transitMinutes =
    Number(drayageQuote.estimatedTransitMinutes) ||
    Math.round((distanceKm / 65) * 60);

  const baseRate =
    Number(drayageQuote.baseRate ?? drayageQuote.baseRateEuro) || 280;
  const fuelSurcharge =
    Number(drayageQuote.fuelSurcharge ?? drayageQuote.fuelSurchargeEuro) || 42;
  const tolls =
    Number(drayageQuote.tollsCost ?? drayageQuote.tollsEurovignette) || 12;
  const totalCost =
    Number(drayageQuote.totalGrossCost ?? drayageQuote.totalGross) ||
    baseRate + fuelSurcharge + tolls;

  const co2Wtw =
    Number(drayageQuote.co2WtwKg ?? drayageQuote.conventionalDieselKgCO2e) ||
    38.2;
  const co2Ttw =
    Number(drayageQuote.co2TtwKg) || Number((co2Wtw * 0.8).toFixed(1));
  const co2Wte =
    Number(drayageQuote.co2WteKg) || Number((co2Wtw * 0.2).toFixed(1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Trazado de Ruta Drayage Portuario
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  CARTO / OSRM
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {originPoint.name} ➔ {destPoint.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal de ruta"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Interactive Leaflet/CARTO Map */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <DrayageRouteMap
              origin={originPoint}
              destination={destPoint}
              distanceKm={distanceKm}
              className="h-80 w-full rounded-2xl"
            />
          </div>

          {/* Route Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                Distancia Carretera
              </div>
              <div className="text-xl font-black text-white font-mono">
                {distanceKm.toFixed(1)} km
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Ruta optimizada OSRM
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Tiempo Estimado
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ~{transitMinutes} min
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Tráfico fluido promedio
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Euro className="w-3.5 h-3.5 text-indigo-400" />
                Coste Drayage Total
              </div>
              <div className="text-xl font-black text-white font-mono">
                € {totalCost.toFixed(2)}
              </div>
              <div className="text-[10px] text-indigo-400/80 mt-0.5">
                Base + Fuel + Peajes
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                Emisiones CO₂e (WTW)
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {co2Wtw.toFixed(1)} kg
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                ISO 14083 / GLEC v3.0
              </div>
            </div>
          </div>

          {/* Cost Breakdown & Sustainability details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detailed Surcharges */}
            <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                Desglose Operativo Terrestre
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">
                    Acarreo Portuario Base:
                  </span>
                  <span className="font-mono font-bold">
                    € {baseRate.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">
                    Recargo Combustible BAF Terrestre:
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    € {fuelSurcharge.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">
                    Peajes Eurovignette / Autovía:
                  </span>
                  <span className="font-mono font-bold">
                    € {tolls.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center font-bold">
                  <span className="text-white">Total Acarreo Terrestre:</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    € {totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Environmental Sustainability Card */}
            <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Huella de Carbono Homologada
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">
                    Combustión en Ruta (TTW):
                  </span>
                  <span className="font-mono font-bold">
                    {co2Ttw.toFixed(1)} kg CO₂e
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">
                    Extracción y Refinado (WTE):
                  </span>
                  <span className="font-mono font-bold">
                    {co2Wte.toFixed(1)} kg CO₂e
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Factor de Intensidad:</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {drayageQuote.emissionsIntensityFactor ?? 0.062} kg/t·km
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center font-bold">
                  <span className="text-white">Total Pozo-a-Rueda (WTW):</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    {co2Wtw.toFixed(1)} kg CO₂e
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

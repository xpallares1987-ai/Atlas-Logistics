"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  TrendingUp,
  DollarSign,
  Clock,
  Percent,
  CheckCircle2,
  Shield,
  ChevronRight,
  Globe,
} from "lucide-react";
import { useOpenExchangeRates } from "./hooks/useOpenExchangeRates";

export interface DynamicRateItem {
  id: string;
  carrier: string;
  serviceLine: string;
  transitTime: number; // days
  validTo: string;
  baseOceanFreight: number;
  baf: number; // Bunker Adjustment Factor
  pss: number; // Peak Season Surcharge
  thc: number; // Terminal Handling Charge Origin + Dest
}

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export function DynamicRateEngine() {
  const [ratesData, setRatesData] = useState<DynamicRateItem[]>([]);
  const [_loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState("CNSHA (Shanghai)");
  const [destination, setDestination] = useState("NLRTM (Rotterdam)");
  const [containerSize, setContainerSize] = useState("40HC");

  const [marginType, setMarginType] = useState<"flat" | "percentage">("flat");
  const [marginValue, setMarginValue] = useState<number>(300);

  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const { rates, loading: ratesLoading } = useOpenExchangeRates("USD");

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/rates`);
      const data = await res.json();
      setRatesData(data);
    } catch (err) {
      console.error("Failed to fetch rates", err);
    } finally {
      setLoading(false);
    }
  };

  const calculatedRates = useMemo(() => {
    const exchangeRate = currency === "USD" ? 1 : rates["EUR"] || 0.9; // fallback 0.9

    return ratesData
      .map((rate) => {
        // Convert base costs to selected currency
        const baseOceanFreight = rate.baseOceanFreight * exchangeRate;
        const baf = rate.baf * exchangeRate;
        const pss = rate.pss * exchangeRate;
        const thc = rate.thc * exchangeRate;

        const buyRateTotal = baseOceanFreight + baf + pss + thc;

        let sellMargin = 0;
        if (marginType === "flat") {
          sellMargin = marginValue;
        } else {
          sellMargin = buyRateTotal * (marginValue / 100);
        }

        const sellRateTotal = buyRateTotal + sellMargin;

        return {
          ...rate,
          baseOceanFreight,
          baf,
          pss,
          thc,
          buyRateTotal,
          sellMargin,
          sellRateTotal,
        };
      })
      .sort((a, b) => a.sellRateTotal - b.sellRateTotal); // Sort cheapest first
  }, [ratesData, marginType, marginValue, currency, rates]);

  const generateQuote = async (rate: any) => {
    try {
      const quoteData = {
        quoteNumber: `QT-2026-${Math.floor(Math.random() * 100000)}`,
        customer: "Client From Portal",
        origin,
        destination,
        equipment: containerSize,
        buyRateTotal: rate.buyRateTotal,
        sellMargin: rate.sellMargin,
        sellRateTotal: rate.sellRateTotal,
        status: "DRAFT",
        validTo: rate.validTo,
      };
      
      const res = await fetch(`${API_URL}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteData),
      });
      if (res.ok) {
        alert("Quote saved to DB successfully!");
      } else {
        alert("Error generating quote");
      }
    } catch(err) {
      console.error("Error saving quote", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0B] text-gray-200">
      {/* Top Panel: Search & Pricing Strategy */}
      <div className="p-6 border-b border-gray-800/60 bg-[#111114]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          {/* Search Criteria */}
          <div className="flex-1 bg-[#16161A] border border-gray-800/80 rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-500" />
              Parámetros de Búsqueda
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1 font-medium">
                  Origen (POL)
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1 font-medium">
                  Destino (POD)
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1 font-medium">
                  Equipo
                </label>
                <select
                  value={containerSize}
                  onChange={(e) => setContainerSize(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="20DC">20' Dry</option>
                  <option value="40DC">40' Dry</option>
                  <option value="40HC">40' High Cube</option>
                  <option value="40NOR">40' Non-Op Reefer</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
                <Search className="w-4 h-4" /> Buscar Tarifas
              </button>
            </div>
          </div>

          {/* Pricing Strategy (Markup) */}
          <div className="w-full lg:w-96 bg-gradient-to-br from-indigo-950/40 to-[#16161A] border border-indigo-500/20 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-24 h-24 text-indigo-400" />
            </div>

            <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
              <TrendingUp className="w-4 h-4" />
              Estrategia de Pricing
            </h2>

            <div className="space-y-4 relative z-10">
              <div className="flex p-1 bg-[#0A0A0B] rounded-lg border border-gray-800/80 w-fit">
                <button
                  onClick={() => {
                    setMarginType("flat");
                    setMarginValue(300);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${marginType === "flat" ? "bg-indigo-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}
                >
                  <DollarSign className="w-3.5 h-3.5" /> Valor Fijo
                </button>
                <button
                  onClick={() => {
                    setMarginType("percentage");
                    setMarginValue(15);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${marginType === "percentage" ? "bg-indigo-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}
                >
                  <Percent className="w-3.5 h-3.5" /> Porcentaje
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-indigo-200/60 mb-1 font-medium">
                  Margen a aplicar
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {marginType === "flat" ? (
                      <DollarSign className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Percent className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <input
                    type="number"
                    value={marginValue}
                    onChange={(e) => setMarginValue(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B]/80 border border-indigo-500/30 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-800/80">
                <label className="block text-[11px] text-indigo-200/60 mb-1 font-medium">
                  Divisa (Live via Frankfurter API)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrency("USD")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${currency === "USD" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#0A0A0B] border-gray-800 text-gray-500 hover:text-gray-300"}`}
                  >
                    USD ($)
                  </button>
                  <button
                    onClick={() => setCurrency("EUR")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center justify-center gap-1 ${currency === "EUR" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#0A0A0B] border-gray-800 text-gray-500 hover:text-gray-300"}`}
                  >
                    EUR (€)
                    {ratesLoading && <Globe className="w-3 h-3 animate-pulse" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Results Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Comparador Dinámico
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono uppercase tracking-wider border border-emerald-500/20">
                  {calculatedRates.length} Resultados
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Ruta:{" "}
                <span className="text-gray-200 font-medium">
                  {origin} <ChevronRight className="inline w-3 h-3" />{" "}
                  {destination}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-[#111114] border border-gray-800/80 rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#16161A] border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  <th className="py-4 px-5">Naviera / Servicio</th>
                  <th className="py-4 px-5 text-right">O/F Base</th>
                  <th className="py-4 px-5 text-right group relative cursor-help">
                    <span className="border-b border-dashed border-gray-600">
                      Recargos
                    </span>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-gray-800 text-gray-200 text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Incluye BAF (Bunker), PSS (Peak Season) y THC
                      Origen/Destino.
                    </div>
                  </th>
                  <th className="py-4 px-5 text-right text-indigo-400 bg-indigo-950/20">
                    Margen Profit
                  </th>
                  <th className="py-4 px-5 text-right font-bold text-white bg-blue-950/20">
                    Tarifa Venta (Total)
                  </th>
                  <th className="py-4 px-5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {calculatedRates.map((rate, idx) => (
                  <tr
                    key={rate.id}
                    className={`hover:bg-[#16161A] transition-colors ${idx === 0 ? "bg-emerald-950/10" : ""}`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-inner ${
                            rate.carrier === "Maersk"
                              ? "bg-blue-600"
                              : rate.carrier === "MSC"
                                ? "bg-yellow-600"
                                : rate.carrier === "Hapag-Lloyd"
                                  ? "bg-orange-600"
                                  : "bg-red-600"
                          }`}
                        >
                          {rate.carrier.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-100 flex items-center gap-2">
                            {rate.carrier}
                            {idx === 0 && (
                              <span className="flex items-center gap-1 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Best Price
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                            <span>Línea: {rate.serviceLine}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {rate.transitTime}{" "}
                              días
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right font-mono text-sm text-gray-300">
                      {currency === "USD" ? "$" : "€"}{rate.baseOceanFreight.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="font-mono text-sm text-gray-400">
                        +{currency === "USD" ? "$" : "€"}{(rate.baf + rate.pss + rate.thc).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[9px] text-gray-600 mt-1 uppercase tracking-wider flex justify-end gap-1.5">
                        <span title={`BAF: ${rate.baf}`}>BAF</span>
                        <span title={`PSS: ${rate.pss}`}>PSS</span>
                        <span title={`THC: ${rate.thc}`}>THC</span>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right bg-indigo-950/10">
                      <div className="font-mono text-sm font-bold text-indigo-400">
                        +{currency === "USD" ? "$" : "€"}
                        {rate.sellMargin.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[10px] text-indigo-500/60 mt-0.5">
                        {marginType === "percentage"
                          ? `${marginValue}% markup`
                          : "Flat margin"}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right bg-blue-950/10">
                      <div className="font-mono text-lg font-bold text-white">
                        {currency === "USD" ? "$" : "€"}
                        {rate.sellRateTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[10px] text-blue-400/80 mt-0.5">
                        Válido hasta: {rate.validTo}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => generateQuote(rate)}
                        className="p-2 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-lg transition-colors"
                        title="Generar Cotización PDF"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

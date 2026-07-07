"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, ArrowRight } from "lucide-react";

export interface RateItem {
  id: string;
  carrier: string;
  route: string;
  transitTime: string;
  baseRate: number;
  baf: number;
  pss: number;
  sellMargin: number; // percentage
}

interface RateTableProps {
  rates: RateItem[];
  onSelectRate?: (rate: RateItem, finalSellPrice: number) => void;
}

export function RateTable({ rates, onSelectRate }: RateTableProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "EUR">(
    "USD",
  );
  const exchangeRate = 0.92; // 1 USD = 0.92 EUR (mock)

  const formatCurrency = (amount: number) => {
    const converted =
      selectedCurrency === "EUR" ? amount * exchangeRate : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: selectedCurrency,
    }).format(converted);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="text-emerald-400" size={20} />
            Dynamic Quotation Engine
          </h3>
          <p className="text-sm text-slate-400">
            Compare carrier rates, surcharges, and apply margins.
          </p>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setSelectedCurrency("USD")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${selectedCurrency === "USD" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            USD
          </button>
          <button
            onClick={() => setSelectedCurrency("EUR")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${selectedCurrency === "EUR" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            EUR
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Carrier</th>
              <th className="p-4 font-medium">Routing</th>
              <th className="p-4 font-medium">T/T</th>
              <th className="p-4 font-medium text-right text-blue-400 bg-blue-900/10">
                Base Rate
              </th>
              <th className="p-4 font-medium text-right text-amber-400 bg-amber-900/10">
                Surcharges (BAF+PSS)
              </th>
              <th className="p-4 font-medium text-right text-purple-400 bg-purple-900/10">
                Total Buy
              </th>
              <th className="p-4 font-medium text-right text-emerald-400 bg-emerald-900/10">
                Sell Margin
              </th>
              <th className="p-4 font-medium text-right text-emerald-400 bg-emerald-900/20 font-bold">
                Client Quote
              </th>
              <th className="p-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rates.map((rate) => {
              const surcharges = rate.baf + rate.pss;
              const totalBuy = rate.baseRate + surcharges;
              const marginAmount = totalBuy * (rate.sellMargin / 100);
              const totalSell = totalBuy + marginAmount;

              return (
                <tr
                  key={rate.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-4">
                    <span className="font-bold text-slate-200">
                      {rate.carrier}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      {rate.route.split("->")[0]}
                      <ArrowRight size={12} className="text-slate-500" />
                      {rate.route.split("->")[1]}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-400">
                    {rate.transitTime}
                  </td>

                  {/* Costs */}
                  <td className="p-4 text-sm text-right font-medium text-blue-300 bg-blue-900/5">
                    {formatCurrency(rate.baseRate)}
                  </td>
                  <td className="p-4 text-sm text-right text-amber-300 bg-amber-900/5">
                    <div className="flex flex-col items-end">
                      <span>{formatCurrency(surcharges)}</span>
                      <span className="text-[10px] text-slate-500">
                        BAF: {rate.baf} | PSS: {rate.pss}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-right font-bold text-purple-400 bg-purple-900/5">
                    {formatCurrency(totalBuy)}
                  </td>

                  {/* Margins & Sell */}
                  <td className="p-4 text-sm text-right bg-emerald-900/5">
                    <div className="flex items-center justify-end gap-1 text-emerald-400">
                      {rate.sellMargin}% <TrendingUp size={12} />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      +{formatCurrency(marginAmount)} Profit
                    </div>
                  </td>
                  <td className="p-4 text-right bg-emerald-900/10">
                    <span className="text-lg font-bold text-emerald-400">
                      {formatCurrency(totalSell)}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => onSelectRate?.(rate, totalSell)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

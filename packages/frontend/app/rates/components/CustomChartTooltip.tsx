import React from 'react';
import { CurrencyType } from '../types';

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  displayCurrency: 'ORIGINAL' | CurrencyType;
  formatCurrencySymbol: (type: CurrencyType) => string;
}

export const CustomChartTooltip = ({ active, payload, label, displayCurrency, formatCurrencySymbol }: CustomChartTooltipProps) => {
  if (active && payload && payload.length) {
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const currencySymbol = formatCurrencySymbol(targetCurr);
    return (
      <div className="bg-[#111114] border border-gray-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-bold text-gray-300 border-b border-gray-800 pb-1 mb-1">{label}</p>
        {payload.map((p: any) => {
          const isIndex = p.name.includes('Índice');
          const isBrentOilRaw = p.name.includes('Brent Oil') || p.name.includes('Crudo Brent');
          
          let formattedValue = '';
          if (isIndex) {
            formattedValue = `${p.value.toFixed(1)}%`;
          } else if (isBrentOilRaw && !p.name.includes('Índice')) {
            formattedValue = `$${p.value.toFixed(1)} / bbl`;
          } else {
            formattedValue = `${currencySymbol}${p.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${targetCurr}`;
          }

          return (
            <p key={p.name} style={{ color: p.color }} className="font-semibold flex justify-between gap-4">
              <span>{p.name}:</span>
              <span className="font-mono font-bold">
                {formattedValue}
              </span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

import React from 'react';
import { ContractRate } from '../../types';
import { getExpiryStatus } from '../../utils';
import { Percent } from 'lucide-react';

export const RatesKPI: React.FC<{ rates: ContractRate[] }> = ({ rates }) => {
  const active = rates.filter(r => !getExpiryStatus(r.validTo).isExpired).length;
  const soon = rates.filter(r => getExpiryStatus(r.validTo).isSoon).length;
  
  // KPI: Active vs Soon to expire as a ratio
  const ratio = soon > 0 ? (active / soon) : active;
  
  return (
    <div className="bg-[#0A0A0C] border border-gray-800 rounded-xl p-6 flex flex-col justify-between">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
          <Percent className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-gray-200">Cobertura de Convenios (Activos/Vencimiento)</h3>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-black text-blue-400 font-mono">
          {ratio.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500 font-sans">
          índice de contratos activos por cada uno por vencer
        </span>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        {soon} convenios próximos a vencer frente a {active} activos actualmente.
      </p>
    </div>
  );
};

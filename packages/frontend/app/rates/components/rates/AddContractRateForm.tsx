import React from 'react';
import { Plus } from 'lucide-react';
import { ContractRate, CurrencyType } from '../../types';
import { formatCurrencySymbol } from '../../utils';

interface AddContractRateFormProps {
  newRate: Omit<ContractRate, 'id'>;
  setNewRate: (rate: Omit<ContractRate, 'id'>) => void;
  setShowAddForm: (show: boolean) => void;
  handleAddRate: (e: React.FormEvent) => void;
}

export const AddContractRateForm: React.FC<AddContractRateFormProps> = ({
  newRate,
  setNewRate,
  setShowAddForm,
  handleAddRate
}) => {
  return (
    <form 
      id="add-contract-rate-form"
      onSubmit={handleAddRate}
      className="bg-[#111114] border border-gray-800 p-6 rounded-xl space-y-4 animate-in fade-in duration-250"
    >
      <div className="flex justify-between items-center pb-2 border-b border-gray-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-500" />
          Ingresar Ficha de Tarifa Contractual SCM (Multi-monedas)
        </h3>
        <button 
          type="button"
          onClick={() => setShowAddForm(false)}
          className="text-gray-400 hover:text-white text-xs cursor-pointer"
        >
          Cerrar Formulario
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Carrier / Transportista <span className="text-red-500">*</span></label>
          <input 
            type="text"
            placeholder="Ej. COSCO, Hapag Lloyd, Maersk..."
            value={newRate.carrier}
            onChange={e => setNewRate({ ...newRate, carrier: e.target.value })}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Modalidad de Tránsito</label>
          <select 
            value={newRate.mode}
            onChange={e => setNewRate({ ...newRate, mode: e.target.value as any })}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="FCL">Ocean FCL (Contenedor)</option>
            <option value="LCL">Ocean LCL (Consolidador)</option>
            <option value="AIR">Air Cargo (IATA)</option>
            <option value="ROAD">Terrestre / Camión</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Tipo de Equipo / Tarifario</label>
          <input 
            type="text"
            placeholder="Ej. 40HC, 20GP, Per CBM, Per KG CHW"
            value={newRate.equipment}
            onChange={e => setNewRate({ ...newRate, equipment: e.target.value })}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Divisa de Origin <span className="text-red-500">*</span></label>
          <select 
            value={newRate.currency}
            onChange={e => setNewRate({ ...newRate, currency: e.target.value as CurrencyType })}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none cursor-pointer"
          >
            <option value="USD">USD ($) Dólar Estadounidense</option>
            <option value="EUR">EUR (€) Euro Zona</option>
            <option value="GBP">GBP (£) Libra Esterlina</option>
            <option value="CNY">CNY (¥) Yuan Chino</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Origen (POL) <span className="text-red-500">*</span></label>
          <input 
            type="text"
            placeholder="Ej. CNSHA"
            value={newRate.pol}
            onChange={e => setNewRate({ ...newRate, pol: e.target.value.toUpperCase() })}
            maxLength={5}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white text-mono uppercase"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Destino (POD) <span className="text-red-500">*</span></label>
          <input 
            type="text"
            placeholder="Ej. ESBCN"
            value={newRate.pod}
            onChange={e => setNewRate({ ...newRate, pod: e.target.value.toUpperCase() })}
            maxLength={5}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white text-mono uppercase"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Tarifa de Flete Principal</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs font-bold">{formatCurrencySymbol(newRate.currency)}</span>
            <input 
              type="number"
              value={newRate.baseRate}
              onChange={e => setNewRate({ ...newRate, baseRate: parseFloat(e.target.value) || 0 })}
              className="w-full pl-7 pr-3 bg-[#0A0A0B] border border-gray-800 rounded py-2 text-xs text-white font-mono text-right"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Recargo BAF / Surcharge Comb.</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs font-bold">{formatCurrencySymbol(newRate.currency)}</span>
            <input 
              type="number"
              value={newRate.bafSurcharge}
              onChange={e => setNewRate({ ...newRate, bafSurcharge: parseFloat(e.target.value) || 0 })}
              className="w-full pl-7 pr-3 bg-[#0A0A0B] border border-gray-800 rounded py-2 text-xs text-white font-mono text-right"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Válido Desde</label>
          <input 
            type="date"
            value={newRate.validFrom}
            onChange={e => setNewRate({ ...newRate, validFrom: e.target.value })}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Válido Hasta</label>
          <input 
            type="date"
            value={newRate.validTo}
            onChange={e => setNewRate({ ...newRate, validTo: e.target.value })}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Días de Tránsito (H.T.)</label>
          <input 
            type="number"
            value={newRate.transitTimeDays}
            onChange={e => setNewRate({ ...newRate, transitTimeDays: parseInt(e.target.value) || 1 })}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Allocation / Tráfico (TEUs)</label>
          <input 
            type="number"
            value={newRate.allocationsTeu}
            onChange={e => setNewRate({ ...newRate, allocationsTeu: parseInt(e.target.value) || 0 })}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-3 py-2 text-xs text-white"
          />
        </div>
      </div>

      <button 
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-xs transition cursor-pointer"
      >
        Registrar Ficha de Tarifa Multidivisa Oficial
      </button>
    </form>
  );
};

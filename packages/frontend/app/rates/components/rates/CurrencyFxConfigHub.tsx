import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Globe, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { CurrencyType } from '../../types';

interface CurrencyFxConfigHubProps {
  fxNotification: string | null;
  setFxNotification: (msg: string | null) => void;
  defaultCurrency: 'ORIGINAL' | CurrencyType;
  setDefaultCurrency: (curr: 'ORIGINAL' | CurrencyType) => void;
  displayCurrency: 'ORIGINAL' | CurrencyType;
  setDisplayCurrency: (curr: 'ORIGINAL' | CurrencyType) => void;
  toastNotice: (msg: string) => void;
  addFxLog: (action: string) => void;
  exchangeRates: Record<CurrencyType, number>;
  setExchangeRates: (rates: Record<CurrencyType, number>) => void;
  handleExchangeRateChange: (curr: CurrencyType, val: number) => void;
  fxLogs: {timestamp: string, action: string}[];
}

export const CurrencyFxConfigHub: React.FC<CurrencyFxConfigHubProps> = ({
  fxNotification,
  setFxNotification,
  defaultCurrency,
  setDefaultCurrency,
  displayCurrency,
  setDisplayCurrency,
  toastNotice,
  addFxLog,
  exchangeRates,
  setExchangeRates,
  handleExchangeRateChange,
  fxLogs
}) => {
  return (
    <div id="currency-fx-config-hub" className="bg-[#111114] border border-gray-800 rounded-2xl p-6 space-y-6 font-sans relative overflow-hidden">
      
      {/* Animated Custom Success notification banner */}
      <AnimatePresence>
        {fxNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 right-4 bg-emerald-950/95 border border-emerald-500/30 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold font-sans flex items-center justify-between z-15 shadow-xl shadow-black/80 backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{fxNotification}</span>
            </div>
            <button 
              onClick={() => setFxNotification(null)}
              className="text-emerald-400 hover:text-emerald-300 font-black cursor-pointer px-1.5"
              type="button"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-gray-800/60">
        <div className="space-y-1">
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <Globe className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            Centro de Configuración Cambiaria Flujos Logísticos
          </span>
          <h3 className="text-sm font-extrabold text-white tracking-tight uppercase">
            Configuración de Moneda base y Gestión FX
          </h3>
          <p className="text-[11px] text-gray-400 max-w-2xl leading-relaxed">
            Defina su divisa operativa base predeterminada, configure y asigne las tasas de cambio de referencia de forma permanente, y visualice de forma instantánea el impacto en todas las tarifas FCL, LCL y surcharges del sistema.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => {
              const defaultRates = { USD: 1.0, EUR: 1.08, GBP: 1.25, CNY: 0.14 } as Record<CurrencyType, number>;
              setExchangeRates(defaultRates);
              localStorage.setItem('forwarderos_exchange_rates', JSON.stringify(defaultRates));
              toastNotice('Tipos de cambio restaurados a los valores predeterminados de referencia del BCE (EUR/USD: 1.08).');
              addFxLog('Restauradas tasas de cambio de referencia del Banco Central.');
            }}
            className="bg-[#1C1C22] hover:bg-gray-800 text-gray-300 border border-gray-800 hover:border-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer select-none"
            title="Restaurar tipos de cambio estándar"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            Restablecer Valores BCE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column Left: Base Currency Selection */}
        <div className="lg:col-span-5 bg-[#09090C] border border-gray-800/85 p-5 rounded-xl space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">1. Divisa Base Predeterminada</span>
            <p className="text-[11.5px] text-gray-400 leading-normal">
              Seleccione la moneda predeterminada en la que desea indexar todos sus costos y simulaciones logísticas al iniciar sesión. Esto se aplica a nivel global.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'ORIGINAL', name: 'Original', desc: 'Tarifa Contratada', icon: '🪙' },
              { id: 'USD', name: 'Dólares', desc: 'USD ($)', icon: '💵' },
              { id: 'EUR', name: 'Euros', desc: 'EUR (€)', icon: '💶' },
              { id: 'GBP', name: 'Libras', desc: 'GBP (£)', icon: '💷' },
              { id: 'CNY', name: 'Yuanes', desc: 'CNY (¥)', icon: '💴' }
            ].map((curr: any) => {
              const isSelected = defaultCurrency === curr.id;
              return (
                <button
                  key={curr.id}
                  type="button"
                  onClick={() => {
                    const val = curr.id;
                    setDefaultCurrency(val);
                    setDisplayCurrency(val);
                    localStorage.setItem('forwarderos_default_display_currency', val);
                    toastNotice(`Divisa base predeterminada fijada en: ${curr.name} (${curr.id})`);
                    addFxLog(`Divisa predeterminada de inicio definida en ${curr.id}`);
                  }}
                  className={`p-3 text-left rounded-xl border transition cursor-pointer flex flex-col justify-between h-[82px] select-none ${isSelected ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-900/15' : 'bg-[#121216] border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white'}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm">{curr.icon}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                  </div>
                  <div className="mt-1">
                    <span className="text-[11.5px] font-black block leading-none">{curr.id}</span>
                    <span className="text-[9px] text-gray-400 block mt-0.5 leading-none">{curr.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg flex items-start gap-2 text-[10.5px]">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-blue-100 leading-relaxed">
              <strong>Configuración Persistente:</strong> La opción seleccionada se sincroniza con IndexedDB/LocalState para restaurarse automáticamente en su próxima sesión.
            </div>
          </div>
        </div>

        {/* Column Right: Live FX Rate Management */}
        <div className="lg:col-span-7 bg-[#09090C] border border-gray-800/85 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">2. Tasas de Cambio Manuales (Ref: 1.00 USD)</span>
              <p className="text-[11.5px] text-gray-400 leading-normal">
                Todas las conversiones operan bajo la equivalencia de USD como divisa de clearing. Puede elevar o deprimir el coeficiente cambiario para realizar análisis de riesgo ante fluctuaciones de paridad.
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 bg-[#121216] border border-gray-800 px-2.5 py-1 rounded text-[10px] font-mono shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 font-bold">LIVE FX ACTIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { curr: 'EUR' as CurrencyType, symbol: '€', label: 'Euros a Dólares', desc: '1 EUR = X USD', stdValue: 1.08 },
              { curr: 'GBP' as CurrencyType, symbol: '£', label: 'Libras a Dólares', desc: '1 GBP = X USD', stdValue: 1.25 },
              { curr: 'CNY' as CurrencyType, symbol: '¥', label: 'Yuanes a Dólares', desc: '1 CNY = X USD', stdValue: 0.14 }
            ].map(item => {
              const currentVal = exchangeRates[item.curr] || item.stdValue;
              const inverseVal = currentVal > 0 ? 1 / currentVal : 0;
              return (
                <div key={item.curr} className="bg-[#121216] border border-gray-800/80 p-3 rounded-lg flex flex-col justify-between space-y-2 group hover:border-gray-700 transition duration-150">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">{item.label}</span>
                    <span className="text-[9px] text-gray-500 block mt-0.5">{item.desc}</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#09090C] px-2 py-1 rounded border border-gray-800 focus-within:border-amber-500 transition">
                    <span className="font-mono text-xs text-gray-500 font-bold">{item.symbol}</span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={currentVal}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (v > 0) {
                          handleExchangeRateChange(item.curr, v);
                          addFxLog(`Tasa ${item.curr}/USD modificada a ${v}`);
                        }
                      }}
                      className="w-full bg-transparent text-white rounded px-1 text-right font-mono text-xs font-bold focus:outline-none"
                    />
                    <span className="font-mono text-[9px] text-gray-500">USD</span>
                  </div>

                  {/* Quick increment / decrement testing buttons */}
                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const v = Math.max(0.0001, parseFloat((currentVal - 0.01).toFixed(4)));
                          handleExchangeRateChange(item.curr, v);
                          addFxLog(`Stress test: Tasa ${item.curr} reducida (-0.01) a ${v}`);
                        }}
                        className="px-1.5 py-0.5 bg-gray-950 border border-gray-800 hover:border-gray-700 hover:text-red-400 rounded transition cursor-pointer font-mono font-bold select-none text-[8.5px]"
                        title="Bajar tasa 0.01"
                      >
                        -0.01
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const v = parseFloat((currentVal + 0.01).toFixed(4));
                          handleExchangeRateChange(item.curr, v);
                          addFxLog(`Stress test: Tasa ${item.curr} elevada (+0.01) a ${v}`);
                        }}
                        className="px-1.5 py-0.5 bg-gray-950 border border-gray-800 hover:border-gray-700 hover:text-emerald-400 rounded transition cursor-pointer font-mono font-bold select-none text-[8.5px]"
                        title="Subir tasa 0.01"
                      >
                        +0.01
                      </button>
                    </div>

                    {/* Inverse calculation preview */}
                    <span className="text-[9px] font-mono text-gray-500 block leading-none">
                      1 $ = {item.symbol}{inverseVal.toFixed(3)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulated Live Action Logs / FX Audit Trail */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Historial de Registro de Auditoría FX de la Sesión
            </span>
            <div className="bg-gray-950/40 border border-gray-800 p-2.5 rounded-lg space-y-1 max-h-[72px] overflow-y-auto font-mono text-[9.5px]">
              {fxLogs.length === 0 ? (
                <span className="text-gray-500 block italic text-[9px]">Ninguna modificación realizada en la sesión actual. Las tasas de cambio están sincronizadas.</span>
              ) : (
                [...fxLogs].reverse().map((log, idx) => (
                  <div key={idx} className="flex justify-between text-gray-400 gap-2 border-b border-gray-900 pb-0.5 last:border-b-0 text-[9px]">
                    <span className="text-blue-400 shrink-0">{log.timestamp}</span>
                    <span className="truncate flex-1 text-left">{log.action}</span>
                    <span className="text-emerald-500 shrink-0 font-bold">✓ Activo</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic conversion alert notice */}
      {displayCurrency !== 'ORIGINAL' && (
        <div className="p-3 bg-amber-950/15 border border-amber-900/30 rounded-xl flex items-center justify-between text-[11px] font-sans">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-amber-200">
              Se está aplicando la conversión de moneda obligatoria y tasas personalizadas sobre los contratos. Toda la visualización de costos en el tarifario, gráficos e impacto de BAF está expresada en <strong>{displayCurrency}</strong>.
            </span>
          </div>
          <button
            onClick={() => {
              setDisplayCurrency('ORIGINAL');
              toastNotice('Visualización restaurada a divisas de contrato original.');
            }}
            className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded hover:bg-amber-500/20 text-amber-400 font-bold transition text-[10px] cursor-pointer"
            type="button"
          >
            Ver en Monedas Originales
          </button>
        </div>
      )}
    </div>
  );
};

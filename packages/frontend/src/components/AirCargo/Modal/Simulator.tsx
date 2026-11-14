/**
 * @file Simulator.tsx
 * @description IATA volumetric (1:6000) rating calculator and DGR/TCR compliance screening modal.
 * @module @atlas/frontend/components/AirCargo/Modal
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Scale } from "lucide-react";
import { Input } from "@atlas/ui";
import { AirwayBillPiece } from "../types/index";

export interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  simOrigin: string;
  setSimOrigin: (val: string) => void;
  simDestination: string;
  setSimDestination: (val: string) => void;
  simGoods: string;
  setSimGoods: (val: string) => void;
  simTempRange: string;
  setSimTempRange: (val: string) => void;
  simPieces: AirwayBillPiece[];
  setSimPieces: React.Dispatch<React.SetStateAction<AirwayBillPiece[]>>;
  simActualWeight: number;
  setSimActualWeight: (val: number) => void;
  simUnNumber: string;
  setSimUnNumber: (val: string) => void;
  simTempControlled: boolean;
  setSimTempControlled: (val: boolean) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  simRatingResult: any;
  simDgrResult: any;
}

export function SimulatorModal({
  isOpen,
  onClose,
  simOrigin,
  setSimOrigin,
  simDestination,
  setSimDestination,
  simGoods,
  setSimGoods,
  simTempRange,
  setSimTempRange,
  simPieces,
  setSimPieces,
  simActualWeight,
  setSimActualWeight,
  simUnNumber,
  setSimUnNumber,
  simTempControlled,
  setSimTempControlled,
  onCalculate,
  isCalculating,
  simRatingResult,
  simDgrResult,
}: SimulatorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Calculadora Volumétrica y Tarificación Aérea IATA
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cálculo de peso tarifable (1:6000), recargos MYC/SCC y
                    screening DGR
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Origen (IATA)
                </label>
                <Input
                  type="text"
                  value={simOrigin}
                  onChange={(e) => setSimOrigin(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Destino (IATA)
                </label>
                <Input
                  type="text"
                  value={simDestination}
                  onChange={(e) =>
                    setSimDestination(e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>

            {/* Goods & Cold Chain Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Descripción de Mercancía
                </label>
                <Input
                  type="text"
                  value={simGoods}
                  onChange={(e) => setSimGoods(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Rango Temperatura TCR
                </label>
                <Input
                  type="text"
                  value={simTempRange}
                  onChange={(e) => setSimTempRange(e.target.value)}
                />
              </div>
            </div>

            {/* Piece Dimensions */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">
                Dimensiones de Bultos (cm) y Peso Real
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Largo (cm)</span>
                  <Input
                    type="number"
                    value={simPieces[0].lengthCm}
                    onChange={(e) =>
                      setSimPieces([
                        { ...simPieces[0], lengthCm: Number(e.target.value) },
                      ])
                    }
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Ancho (cm)</span>
                  <Input
                    type="number"
                    value={simPieces[0].widthCm}
                    onChange={(e) =>
                      setSimPieces([
                        { ...simPieces[0], widthCm: Number(e.target.value) },
                      ])
                    }
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Alto (cm)</span>
                  <Input
                    type="number"
                    value={simPieces[0].heightCm}
                    onChange={(e) =>
                      setSimPieces([
                        { ...simPieces[0], heightCm: Number(e.target.value) },
                      ])
                    }
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Cantidad</span>
                  <Input
                    type="number"
                    value={simPieces[0].quantity}
                    onChange={(e) =>
                      setSimPieces([
                        { ...simPieces[0], quantity: Number(e.target.value) },
                      ])
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Peso Bruto Real Total (kg)
                  </label>
                  <Input
                    type="number"
                    value={simActualWeight}
                    onChange={(e) => setSimActualWeight(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Número ONU (DGR si aplica)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: UN3480, UN1845"
                    value={simUnNumber}
                    onChange={(e) =>
                      setSimUnNumber(e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="simTempCheck"
                  checked={simTempControlled}
                  onChange={(e) => setSimTempControlled(e.target.checked)}
                  className="rounded border-white/20 bg-slate-950 text-sky-500 focus:ring-sky-400"
                />
                <label
                  htmlFor="simTempCheck"
                  className="text-xs text-slate-300 font-medium"
                >
                  Requiere Cadena de Frío / Temperatura Controlada (TCR)
                </label>
              </div>
            </div>

            <button
              onClick={onCalculate}
              disabled={isCalculating}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Scale size={16} />
                  Calcular Liquidación Aérea IATA
                </>
              )}
            </button>

            {/* Calculation Results */}
            {simRatingResult && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Volumen Total:</span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {simRatingResult.totalVolumeCbm} m³
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Peso Volumétrico:</span>
                    <p className="text-sm font-bold text-sky-400 mt-0.5">
                      {simRatingResult.volumetricWeightKg} kg
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Peso Tarifable:</span>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">
                      {simRatingResult.chargeableWeightKg} kg
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Liquidación:</span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {simRatingResult.totalFreightPayable?.toFixed(2)} €
                    </p>
                  </div>
                </div>

                {simDgrResult && (
                  <div className="pt-2 border-t border-white/10 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Restricción Aérea:</span>
                      <span className="font-bold text-sky-300">
                        {simDgrResult.aircraftRestriction}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        Códigos SHC Asignados:
                      </span>
                      <span className="font-bold text-emerald-300">
                        {simDgrResult.specialHandlingCodes?.join(", ")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
